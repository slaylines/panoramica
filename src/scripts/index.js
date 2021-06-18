import $ from 'jquery';

import Axis from './axis';
import VirtualCanvas from './vc';
import Gestures from './gestures';

import { VisibleRegion2d, Viewport2d } from './viewport';

$(document).ready(() => {
  const $axis = $('#axis');
  const axis = new Axis($axis);

  const $vc = $('#vc');

  VirtualCanvas();
  $vc.virtualCanvas();

  const center = { x: -1000, y: 0 };

  const visibleRegion = new VisibleRegion2d(center.x, center.y, 10);
  const viewport = new Viewport2d(1, $vc[0].clientWidth, $vc[0].clientHeight, visibleRegion);

  const updateAxis = () => {
    const lt = viewport.pointScreenToVirtual(0, 0);
    const rb = viewport.pointScreenToVirtual(viewport.width, viewport.height);

    axis.update({ min: lt.x, max: rb.x });
  }

  updateAxis();

  const canvasGestures = Gestures.getGesturesStream($vc);

  // TODO: обрабатывать touch жесты и zoom
  // TODO: обрабатывать жесты на оси
  // TODO: починить переключение оси на другой режим
  // TODO: включить плавные жесты через viewport-controller

  // TODO: обновлять маркер текущего значения

  canvasGestures.subscribe(val => {
    if (val.Type === 'Pan') {
      const virtualOffset = viewport.vectorScreenToVirtual(val.xOffset, val.yOffset);

      viewport.visible.centerX = center.x - virtualOffset.x;
      viewport.visible.centerY = center.y - virtualOffset.y;

      updateAxis();
    } else if (val.Type === 'PanEnd') {
      center.x = viewport.visible.centerX;
      center.y = viewport.visible.centerY;
    }
  });
});


/*
*/
