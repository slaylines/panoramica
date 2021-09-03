import $ from 'jquery';
import { merge } from 'rxjs';

import * as constants from './constants';
import { data } from './data';

import Axis from './axis';
import VirtualCanvas from './vc';
import Gestures from './gestures';
import ViewportController from './viewport-controller';
import Layout from './layout';
import { VisibleRegion2d, Viewport2d } from './viewport';
import { zoomToElementHandler } from './vccontent';

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

  const viewport = new Viewport2d(1, $vc[0].clientWidth, $vc[0].clientHeight, new VisibleRegion2d(0, 0, 1));

  const loadData = () => {
    const root = $vc.virtualCanvas('getLayerContent');

    root.beginEdit();
    layout.mergeLayouts(data, root);
    root.endEdit(true);

    window.maxPermitedVerticalRange = {
      top: data.y,
      bottom: data.y + data.height
    }
  }

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

  $vc.bind('elementclick', e => {
    controller.moveToVisible(e.newvisible, e.noAnimation);
  });

  $('.link.nature-link').on('click', () => {
    zoomToElementHandler(data.element, 1.0);
  });

  $('.link.socium-link').on('click', () => {
    zoomToElementHandler(data.timelines[data.timelines.length - 1].element, 1.0);
  });

  zoomToElementHandler(data.element, 1.0, true);
});
