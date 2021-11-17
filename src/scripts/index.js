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

const translations = {
  nature: { ru: 'Природа', en: 'Nature' },
  socium: { ru: 'Социум', en: 'Socium' },
};

$(document).ready(() => {
  // Used in viewport-animation.js
  window.globalAnimationID = 1;

  let language = 'ru';

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

  const natureLink = $('.link.nature-link');
  const sociumLink = $('.link.socium-link');

  natureLink.on('click', () => zoomToElementHandler(data.element, 1.0));
  sociumLink.on('click', () => zoomToElementHandler(data.timelines[data.timelines.length - 1].element, 1.0));

  const onLanguageChange = lang => {
    language = lang;
    natureLink.text(translations.nature[lang]);
    sociumLink.text(translations.socium[lang]);

    // TODO: чтобы перевести лейблы оси надо
    // - передавать язык в ось и перерисовывать её при его изменениях
    // - сделать маппинг для всех режимов
    // - использовать язык в getMarkerLabel и getLabel
  };

  const ruLink = $('.languages [name="ru"]');
  const enLink = $('.languages [name="en"]');

  ruLink.on('click', () => {
    if (language === 'ru') return;
    onLanguageChange('ru');
    enLink.removeClass('active');
    ruLink.addClass('active');
  });

  enLink.on('click', () => {
    if (language === 'en') return;
    onLanguageChange('en');
    ruLink.removeClass('active');
    enLink.addClass('active');
  });

  zoomToElementHandler(data.element, 1.0, true);
});
