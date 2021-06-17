import $ from 'jquery';
import constants from './constants'
import Layout from './layout';

export default class Common {
  constructor() {
    var maxPermitedScale;
    var maxPermitedVerticalRange = {
      top: 0,
      bottom: 10000000
    };

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

    //var initialize = initialize;

    Object.defineProperties(this, {
      /*vc: {
      	configurable: false,
      	get: function () {
      		return vc;
      	},
      	set: function (value) {
      		vc = value;
      	}
      },*/
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
  /* Calculates local offset of mouse cursor in specified jQuery element.
    @param jqelement  (JQuery to Dom element) jQuery element to get local offset for.
    @param event   (Mouse event args) mouse event args describing mouse cursor.
    */
  getXBrowserMouseOrigin(jqelement, event) {
    var offsetX;

    ///if (!event.offsetX)
    offsetX = event.pageX - jqelement[0].offsetLeft;

    //else
    //    offsetX = event.offsetX;
    var offsetY;

    //if (!event.offsetY)
    offsetY = event.pageY - jqelement[0].offsetTop;

    //else
    //    offsetY = event.offsetY;
    return {
      x: offsetX,
      y: offsetY,
    };
  }

  sqr(d) {
    return d * d;
  }

  // Prevents the event from bubbling.
  // In non IE browsers, use e.stopPropagation() instead.
  // To cancel event bubbling across browsers, you should check for support for e.stopPropagation(), and proceed accordingly:
  preventbubble(e) {
    if (e && e.stopPropagation) e.stopPropagation();
    else e.cancelBubble = true;
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

  showFooter() {
    $('#footerBack').show('clip', {}, 'slow');
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

  setVisible(visible) {
    if (visible) {
      return controller.moveToVisible(visible);
    }
  }

  updateMarker() {
    axis.setTimeMarker(
      vc.virtualCanvas('getCursorPosition'),
      true
    );
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
    //CZ.BreadCrumbs.visibleAreaWidth = $('.breadcrumbs-container').width();
    //CZ.BreadCrumbs.updateHiddenBreadCrumbs();

    this.vc.virtualCanvas('updateViewport');

    //ax.axis("updateWidth");
    this.updateAxis(this.vc, this.ax);

    //CZ.BreadCrumbs.updateBreadCrumbsLabels();
  }

  updateAxis(vc, ax) {
    var vp = this.vc.virtualCanvas('getViewport');
    var lt = vp.pointScreenToVirtual(0, 0);
    var rb = vp.pointScreenToVirtual(vp.width, vp.height);
    var newrange = {
      min: lt.x,
      max: rb.x
    };
    this.axis.update(newrange);
  }

  isInCosmos(url) {
    if (typeof url != 'string') url = window.location.pathname;

    var path = url.toLowerCase().replace('/czmin', '').split('#')[0];
    var matches = [
      '/',
      '/chronozoom',
      '/chronozoom/',
      '/chronozoom/cosmos',
      '/chronozoom/cosmos/',
    ];

    return $.inArray(path, matches) > -1;
  }
}
