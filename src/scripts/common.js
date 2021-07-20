import $ from 'jquery';
import constants from './constants'
import Layout from './layout';

export default class Common {
  constructor() {
    var maxPermitedScale;

    var controller;
    var isAxisFreezed = true;
    var startHash;

    /*
        Array for logging of inners messages and exceptions
        */
    var searchString;
    var ax;
    var axis;
    var vc;
    var visReg;
    var cosmosVisible;
    var earthVisible;
    var lifeVisible;
    var prehistoryVisible;
    var humanityVisible;
    var content;
    var breadCrumbs;

    var firstTimeWelcomeChecked = true;

    var regimes = [];

    var k = 1000000000;
    var setNavigationStringTo;
    var hashHandle = true;

    var supercollection = '';
    var collection = '';
    var collectionTitle = '';

    // Initial Content contains the identifier (e.g. ID or Title) of the content that should be loaded initially.
    var initialContent = null;

    var width;

    Object.defineProperties(this, {
      startHash: {
        configurable: false,
        get: function () {
          return startHash;
        },
        set: function (value) {
          startHash = value;
        }
      },
      width: {
        configurable: false,
        get: function () {
          return width;
        },
        set: function (value) {
          width = value;
        }
      }
    });
  }

  toggleOffImage(elemId, ext) {
    if (!ext) ext = 'jpg';
    var imageSrc = $('#' + elemId).attr('src');
    var len = imageSrc.length;
    var prefix = imageSrc.substring(0, len - 7);
    if (imageSrc.substring(len - 6, len - 4) == 'on') {
      var newSrc = prefix + '_off.' + ext;
      $('#' + elemId).attr('src', newSrc);
    }
  }

  toggleOnImage(elemId, ext) {
    if (!ext) ext = 'jpg';
    var imageSrc = $('#' + elemId).attr('src');
    var len = imageSrc.length;
    var prefix = imageSrc.substring(0, len - 7);
    if (imageSrc.substring(len - 6, len - 4) == 'ff') {
      var newSrc = prefix + 'on.' + ext;
      $('#' + elemId).attr('src', newSrc);
    }
  }

  // Compares 2 visibles. Returns true if they are equal with an allowable imprecision
  compareVisibles(vis1, vis2) {
    return vis2 != null ?
      Math.abs(vis1.centerX - vis2.centerX) <
      constants.allowedVisibileImprecision &&
      Math.abs(vis1.centerY - vis2.centerY) <
      constants.allowedVisibileImprecision &&
      Math.abs(vis1.scale - vis2.scale) <
      constants.allowedVisibileImprecision :
      false;
  }

  viewportToViewBox(vp) {
    var w = vp.widthScreenToVirtual(vp.width);
    var h = vp.heightScreenToVirtual(vp.height);
    var x = vp.visible.centerX - w / 2;
    var y = vp.visible.centerY - h / 2;
    return {
      left: x,
      right: x + w,
      top: y,
      bottom: y + h,
      width: w,
      height: h,
      centerX: vp.visible.centerX,
      centerY: vp.visible.centerY,
      scale: vp.visible.scale,
    };
  }
  //Common.viewportToViewBox = viewportToViewBox;

  updateLayout() {
    this.vc.virtualCanvas('updateViewport');

    this.updateAxis(this.vc, this.ax);
  }
}
