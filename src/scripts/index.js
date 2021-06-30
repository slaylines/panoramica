import $ from 'jquery';
import { merge } from 'rxjs';

import * as constants from './constants';

import Axis from './axis';
import VirtualCanvas from './vc';
import Gestures from './gestures';
import ViewportController from './viewport-controller';

import { VisibleRegion2d, Viewport2d } from './viewport';

$(document).ready(() => {
  // Used in viewport-animation.js
  window.globalAnimationID = 1;

  const $axis = $('#axis');
  const axis = new Axis($axis);

  const $vc = $('#vc');

  VirtualCanvas();
  $vc.virtualCanvas();

  const center = { x: -1000, y: 0 };

  const visibleRegion = new VisibleRegion2d(center.x, center.y, 1000);
  const viewport = new Viewport2d(1, $vc[0].clientWidth, $vc[0].clientHeight, visibleRegion);

  const updateAxis = () => {
    const lt = viewport.pointScreenToVirtual(0, 0);
    const rb = viewport.pointScreenToVirtual(viewport.width, viewport.height);

    axis.update({ min: lt.x, max: rb.x });
    axis.updateMarker(viewport);
  }

  updateAxis();

  const canvasGestures = Gestures.getGesturesStream($vc);
  const axisGestures = Gestures.applyAxisBehavior(Gestures.getGesturesStream($axis));

  const allGestures = merge(canvasGestures, axisGestures);

  const controller = new ViewportController(
    visible => {
      console.log(visible);
      /*
      var vp = CZ.Common.vc.virtualCanvas("getViewport");
      var markerPos = CZ.Common.axis.markerPosition;
      var oldMarkerPosInScreen = vp.pointVirtualToScreen(markerPos, 0).x;

      CZ.Common.vc.virtualCanvas("setVisible", visible, CZ.Common.controller.activeAnimation);
      CZ.Common.updateAxis(CZ.Common.vc, CZ.Common.ax);
      vp = CZ.Common.vc.virtualCanvas("getViewport");
      if (CZ.Tours.pauseTourAtAnyAnimation) {
          CZ.Tours.tourPause();
          CZ.Tours.pauseTourAtAnyAnimation = false;
      }

      var hoveredInfodot = CZ.Common.vc.virtualCanvas("getHoveredInfodot");
      var actAni = CZ.Common.controller.activeAnimation != undefined;

      if (actAni) {
          var newMarkerPos = vp.pointScreenToVirtual(oldMarkerPosInScreen, 0).x;
          CZ.Common.updateMarker();
      }

      updateTimeSeriesChart(vp);
      */
    },
    () => viewport,
    allGestures
  );

  // TODO: улучшить ограничения для глубины зума

  // TODO: обрабатывать touch жесты
  // TODO: включить плавные жесты через viewport-controller

  /*
  allGestures.subscribe(value => {
    if (value.Type === 'Pan') {
      const virtualOffset = viewport.vectorScreenToVirtual(value.xOffset, value.yOffset);

      viewport.visible.centerX = center.x - virtualOffset.x;
      viewport.visible.centerY = center.y - virtualOffset.y;

      updateAxis();
    } else if (value.Type === 'PanEnd') {
      center.x = viewport.visible.centerX;
      center.y = viewport.visible.centerY;
    } else if (value.Type === 'Zoom') {
      const x = value.xOrigin + (viewport.width / 2.0 - value.xOrigin) * value.scaleFactor;
      const y = value.yOrigin + (viewport.height / 2.0 - value.yOrigin) * value.scaleFactor;

      const newCenter = viewport.pointScreenToVirtual(x, y);

      center.x = newCenter.x;
      center.y = newCenter.y;

      viewport.visible.centerX = newCenter.x;
      viewport.visible.centerY = newCenter.y;
      viewport.visible.scale *= value.scaleFactor;

      // Zoom constraints
      let constraint;
      for (let i = 0; i < constants.deeperZoomConstraints.length; i++) {
        const zc = constants.deeperZoomConstraints[i];
        if (zc.left <= newCenter.x && zc.right > newCenter.x) {
          constraint = zc.scale;
          break;
        }
      }
      if (constraint && viewport.visible.scale < constraint) {
        viewport.visible.scale = constraint;
      }

      updateAxis();
    }
  });
  */
});
