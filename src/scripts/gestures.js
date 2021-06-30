import $ from 'jquery';
import { fromEvent, zip, merge } from 'rxjs';
import { skip, map, flatMap, takeUntil, tap, filter } from 'rxjs/operators';

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

// Gesture for ending panning
const PanEndGesture = (src) => ({
  Type: 'PanEnd',
  Source: src,
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

    return merge(
      mouseDowns.pipe(flatMap(mouseDown =>
        mouseMoves.pipe(
          map(mouseMove =>
            PanGesture(
              mouseMove.clientX - mouseDown.clientX,
              mouseMove.clientY - mouseDown.clientY,
              'Mouse'
            )
          ),
          takeUntil(mouseUps)
        ))
      ),
      mouseUps.pipe(map(mouseUp => PanEndGesture('Mouse')))
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

    return mouseWheels.pipe(map((mouseWheel) => ZoomGesture(
      mouseWheel.origin.x,
      mouseWheel.origin.y,
      mouseWheel.delta > 0 ? 1 / zoomLevelFactor : 1 * zoomLevelFactor,
      'Mouse'
    )));
  }

  /*********************************************************
   * Gestures for iPad (or any webkit based touch browser)  *
   * touchstart, touchmove, touchend, touchcancel           *
   * gesturestart, gesturechange, gestureend                *
   **********************************************************/

  // Subject that converts input touch events into Pan gestures
  static createTouchPanSubject(vc) {
    const $doc = $(document);

    const touchStart = vc.toObservable('touchstart');
    const touchMove = vc.toObservable('touchmove');
    const touchEnd = $doc.toObservable('touchend');
    const touchCancel = $doc.toObservable('touchcancel');

    const gestures = touchStart.SelectMany(o => {
      return touchMove
        .TakeUntil(touchEnd.Merge(touchCancel))
        .Skip(1)
        .Zip(touchMove, (left, right) => ({
          left: left.originalEvent,
          right: right.originalEvent,
        }))
        .Where(g => g.left.scale === g.right.scale)
        .Select(g => new PanGesture(
          g.left.pageX - g.right.pageX,
          g.left.pageY - g.right.pageY,
          'Touch'
        ));
    });

    return gestures;
  }

  // Subject that converts input touch events into Pin gestures
  static createTouchPinSubject(vc) {
    const touchStart = vc.toObservable('touchstart');

    return touchStart.Select(ts => new PinGesture('Touch'));
  }

  // Subject that converts input touch events into Zoom gestures
  static createTouchZoomSubject(vc) {
    const $doc = $(document);

    const gestureStart = vc.toObservable('gesturestart');
    const gestureChange = vc.toObservable('gesturechange');
    const gestureEnd = $doc.toObservable('gestureend');
    const touchCancel = $doc.toObservable('touchcancel');

    const gestures = gestureStart.SelectMany(o =>
      gestureChange
        .TakeUntil(gestureEnd.Merge(touchCancel))
        .Skip(1)
        .Zip(gestureChange, (left, right) => ({
          left: left.originalEvent,
          right: right.originalEvent
        }))
        .Where(g => g.left.scale !== g.right.scale && g.right.scale !== 0)
        .Select(g => {
          const delta = g.left.scale / g.right.scale;
          return new ZoomGesture(o.originalEvent.layerX, o.originalEvent.layerY, 1 / delta, 'Touch');
        })
    );

    return gestures;
  }

  // Creates gestures stream for specified jQuery element
  static getGesturesStream(source) {
    let panController;
    let zoomController;
    let pinController;

    if ('ontouchstart' in document.documentElement) {
      // webkit browser
      /*
      panController = this.createTouchPanSubject(source);
      zoomController = this.createTouchZoomSubject(source);
      pinController = this.createTouchPinSubject(source);
      */
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
      filter(el => el.Type != "Zoom"),
      map(el => {
        if (el.Type === "Pan") el.yOffset = 0;
        return el;
      })
    );
  }
}
