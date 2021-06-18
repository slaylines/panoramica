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

  const visibleRegion = new VisibleRegion2d(center.x, center.y, 1000000);
  const viewport = new Viewport2d(1, $vc[0].clientWidth, $vc[0].clientHeight, visibleRegion);

  const updateAxis = () => {
    const lt = viewport.pointScreenToVirtual(0, 0);
    const rb = viewport.pointScreenToVirtual(viewport.width, viewport.height);

    axis.update({ min: lt.x, max: rb.x });
  }

  updateAxis();

  const canvasGestures = Gestures.getGesturesStream($vc);

  // TODO: обрабатывать touch жесты
  // TODO: обрабатывать жесты на оси
  // TODO: починить переключение оси на другой режим
  // TODO: включить плавные жесты через viewport-controller
  // TODO: ограничивать глубину зума
  // TODO: обновлять маркер текущего значения

  canvasGestures.subscribe(value => {
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

      updateAxis();
    }
  });
});


/*
*/
