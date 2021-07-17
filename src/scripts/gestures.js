import $ from 'jquery';
import { fromEvent, zip, merge } from 'rxjs';
import { skip, map, flatMap, takeUntil, tap, filter, bufferCount } from 'rxjs/operators';

import * as constants from './constants';
import * as utils from './utils';

// Gesture for performing Pan operation
// Takes horizontal and vertical offset in screen coordinates
const PanGesture = (xOffset, yOffset, src) => ({
  Type: 'Pan',
  Source: src,
  xOffset: xOffset,
  yOffset: yOffset,
});

// Gesture for perfoming Zoom operation
// Takes zoom origin point in screen coordinates and scale value
const ZoomGesture = (xOrigin, yOrigin, scaleFactor, src) => ({
  Type: 'Zoom',
  Source: src,
  xOrigin: xOrigin,
  yOrigin: yOrigin,
  scaleFactor: scaleFactor,
});

// Gesture for performing Stop of all current transitions and starting to performing new
const PinGesture = (src) => ({
  Type: 'Pin',
  Source: src,
});

export default class Gestures {
  /*****************************************
   * Gestures for non touch based devices   *
   * mousedown, mousemove, mouseup          *
   * xbrowserwheel                          *
   ******************************************/

  // Subject that converts input mouse events into Pan gestures
  static createPanSubject(vc) {
    const mouseDowns = fromEvent(vc, 'mousedown');
    const mouseMoves = fromEvent(vc, 'mousemove');
    const mouseUps = fromEvent($(document), 'mouseup');

    return mouseDowns.pipe(flatMap(mouseDown =>
      mouseMoves.pipe(
        bufferCount(2),
        map(([first, second]) =>
          PanGesture(
            second.clientX - first.clientX,
            second.clientY - first.clientY,
            'Mouse'
          )
        ),
        takeUntil(mouseUps)
      ))
    );
  }

  // Subject that converts input mouse events into Pin gestures
  static createPinSubject(vc) {
    const mouseDowns = fromEvent(vc, 'mousedown');

    return mouseDowns.pipe(map((_) => PinGesture('Mouse')));
  }

  // Subject that converts input mouse events into Zoom gestures
  static createZoomSubject(vc) {
    vc.bind('wheel', event => {
      const xevent = $.Event('xbrowserwheel');
      const delta = event.originalEvent.deltaY;

      xevent.delta = delta;
      xevent.origin = utils.getXBrowserMouseOrigin(vc, event);

      vc.trigger(xevent);
    });

    const mouseWheels = fromEvent(vc, 'xbrowserwheel');
    const { zoomLevelFactor } = constants;

    return mouseWheels.pipe(
      map(mouseWheel =>
        ZoomGesture(
          mouseWheel.origin.x,
          mouseWheel.origin.y,
          mouseWheel.delta > 0 ? 1 / zoomLevelFactor : 1 * zoomLevelFactor,
          'Mouse'
      ))
    );
  }

  /*********************************************************
   * Gestures for iPad (or any webkit based touch browser)  *
   * touchstart, touchmove, touchend, touchcancel           *
   * gesturestart, gesturechange, gestureend                *
   **********************************************************/

  // Subject that converts input touch events into Pan gestures
  static createTouchPanSubject(vc) {
    const touchStarts = fromEvent(vc, 'touchstart');
    const touchMoves = fromEvent(vc, 'touchmove');
    const touchEnds = fromEvent($(document), 'touchend');
    const touchCancels = fromEvent($(document), 'touchcancel');

    return touchStarts.pipe(flatMap(touchStart =>
      touchMoves.pipe(
        map(touchMove => 
          PanGesture(
            touchMove.touches[0].pageX - touchStart.touches[0].pageX,
            touchMove.touches[0].pageY - touchStart.touches[0].pageY,
            'Touch'
          )
        ),
        takeUntil(merge(touchEnds, touchCancels))
      ))
    );
  }

  // Subject that converts input touch events into Pin gestures
  static createTouchPinSubject(vc) {
    const touchStarts = fromEvent(vc, 'touchstart');

    return touchStarts.pipe(map((_) => PinGesture('Touch')));
  }

  // Subject that converts input touch events into Zoom gestures
  static createTouchZoomSubject(vc) {
    const gestureStarts = fromEvent(vc, 'gesturestart');
    const gestureChanges = fromEvent(vc, 'gesturechange');
    const gestureEnds = fromEvent($(document), 'gestureend');
    const touchCancels = fromEvent($(document), 'touchcancel');

    return gestureStarts.pipe(flatMap(gestureStart =>
      gestureChanges.pipe(
        filter(gestureChange =>
          (gestureChange.originalEvent.scale !== gestureStart.originalEvent.scale) &&
          (gestureStart.originalEvent.scale !== 0)
        ),
        map(gestureChange =>
          ZoomGesture(
            gestureStart.originalEvent.layerX,
            gestureStart.originalEvent.layerY,
            1 / (gestureChange.originalEvent.scale / gestureStart.originalEvent.scale),
            'Touch'
          )
        ),
        takeUntil(merge(gestureEnds, touchCancels))
      ))
    )
  }

  // Creates gestures stream for specified jQuery element
  static getGesturesStream(source) {
    let panController;
    let zoomController;
    let pinController;

    if ('ontouchstart' in document.documentElement) {
      // webkit browser
      panController = this.createTouchPanSubject(source);
      zoomController = this.createTouchZoomSubject(source);
      pinController = this.createTouchPinSubject(source);
    } else {
      // no touch support, only mouse events
      panController = this.createPanSubject(source);
      zoomController = this.createZoomSubject(source);
      pinController = this.createPinSubject(source);
    }

    return merge(pinController, panController, zoomController);
  }

  // Modify the gesture stream to apply the logic of gesture handling by the axis
  static applyAxisBehavior(source) {
    return source.pipe(
      filter(el => el.Type != 'Zoom'),
      map(el => {
        if (el.Type === 'Pan') el.yOffset = 0;
        return el;
      })
    );
  }
}
