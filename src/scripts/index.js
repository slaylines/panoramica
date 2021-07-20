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

  const visibleRegion = new VisibleRegion2d(-1000, 0, 1000);
  const viewport = new Viewport2d(1, $vc[0].clientWidth, $vc[0].clientHeight, visibleRegion);

  const updateAxis = (initial) => {
    const lt = viewport.pointScreenToVirtual(0, 0);
    const rb = viewport.pointScreenToVirtual(viewport.width, viewport.height);

    axis.update({ min: lt.x, max: rb.x });

    if (!initial) {
      axis.updateMarker(viewport);
    }
  };

  const updateVC = () => {
    $vc.virtualCanvas('setVisible', viewport.visible, (controller || {}).activeAnimation);
  };

  updateAxis(true);
  updateVC();

  const canvasGestures = Gestures.getGesturesStream($vc);
  const axisGestures = Gestures.applyAxisBehavior(Gestures.getGesturesStream($axis));

  const allGestures = merge(canvasGestures, axisGestures);

  const controller = new ViewportController(
    visible => {
      viewport.visible.centerX = visible.centerX;
      viewport.visible.centerY = visible.centerY;
      viewport.visible.scale = visible.scale;

      updateAxis();
      updateVC();
    },
    () => viewport,
    allGestures,
    $vc
  );

  $(window).on('resize', () => {
    updateAxis();
  });

});
