import $ from 'jquery';
import { merge } from 'rxjs';

import * as constants from './constants';

import Axis from './axis';
import VirtualCanvas from './vc';
import Gestures from './gestures';
import ViewportController from './viewport-controller';
import Layout from './layout';
import { VisibleRegion2d, Viewport2d } from './viewport';

$(document).ready(() => {
  // Used in viewport-animation.js
  window.globalAnimationID = 1;

  const $axis = $('#axis');
  const axis = new Axis($axis);

  const $vc = $('#vc');

  const layout = new Layout();

  VirtualCanvas();
  $vc.virtualCanvas();
  $vc.virtualCanvas('setLayout', layout);

  const loadData = () => {
    const data = {
      id: "00000000-0000-0000-0000-000000000000",
      start: -13800000000,
      end: 9999,
      title: 'Cosmos',
      regime: 'Cosmos',
      exhibits: [],
      timelines: [],
    };

    const root = $vc.virtualCanvas('getLayerContent');

    root.beginEdit();
    layout.mergeLayouts(data, root);
    root.endEdit(true);
  }

  const visibleRegion = new VisibleRegion2d(0, 0, 25000000);
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

  loadData();

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
