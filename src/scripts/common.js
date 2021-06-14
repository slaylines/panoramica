// Using require here for jQuery-ui to work with jQuery: need global variable
const $ = require('jquery');
window.jQuery = $;
require('jquery-ui');

//import CZ from './cz';

import constants from './constants'
import initWidgetVC from './vc';
import Axis from './axis'
import Data from './data'
import Layout from './layout'
import Service from './service'
import UrlNav from './urlnav'

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
  //Common.compareVisibles = compareVisibles;

  /*
      Is called by direct user actions like links, bread crumbs clicking, etc.
      */
  /*function setVisibleByUserDirectly(visible) {
    CZ.Tours.pauseTourAtAnyAnimation = false;
    if (CZ.Tours.tour != undefined && CZ.Tours.tour.state == 'play')
      CZ.Tours.tourPause();
    return setVisible(visible);
  }*/

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

  // Reload the data.
  reloadData() {
    return Data.getTimelines(null).then(function (response) {
      if (!response) {
        return;
      }

      var root = vc.virtualCanvas('getLayerContent');
      root.beginEdit();
      Layout.Merge(response, root);
      root.endEdit(true);
      this.vc.virtualCanvas('updateViewport');
    });
  }

  ProcessContent(content) {
    var root = vc.virtualCanvas('getLayerContent');
    root.beginEdit();
    Layout.Merge(content, root);
    root.endEdit(true);

    InitializeRegimes(content);

    if (startHash) {
      visReg = UrlNav.navStringToVisible(
        this.startHash.substring(1),
        this.vc
      );
    }

    if (!visReg && cosmosVisible) {
      window.location.hash = cosmosVisible;
      visReg = UrlNav.navStringToVisible(cosmosVisible, vc);
    }

    if (visReg) {
      controller.moveToVisible(visReg, true);
      updateAxis(vc, ax);
      var vp = vc.virtualCanvas('getViewport');

      if (startHash && window.location.hash !== startHash) {
        hashChangeFromOutside = false;
        window.location.hash = startHash; // synchronizing
      }
    }
  }

  InitializeRegimes(content) {
    var f = function (timeline) {
      if (!timeline) return null;
      var v = vc.virtualCanvas('findElement', 't' + timeline.id);
      regimes.push(v);
      if (v) v = UrlNav.vcelementToNavString(v);
      return v;
    };

    var cosmosTimeline = content;
    cosmosVisible = f(cosmosTimeline);
    UrlNav.navigationAnchor = vc.virtualCanvas(
      'findElement',
      't' + cosmosTimeline.id
    );
    $('#regime-link-cosmos').click(function () {
      var visible = UrlNav.navStringToVisible(
        Common.cosmosVisible,
        Common.vc
      );
      setVisible(visible);
    });

    var earthTimeline = Layout.FindChildTimeline(
      cosmosTimeline,
      constants.earthTimelineID,
      true
    );
    if (typeof earthTimeline !== 'undefined') {
      earthVisible = f(earthTimeline);
      $('#regime-link-earth').click(function () {
        var visible = UrlNav.navStringToVisible(
          earthVisible,
          vc
        );
        setVisible(visible);
      });

      var lifeTimeline = Layout.FindChildTimeline(
        earthTimeline,
        constants.lifeTimelineID,
        false
      );
      if (typeof lifeTimeline !== 'undefined') {
        lifeVisible = f(lifeTimeline);
        $('#regime-link-life').click(function () {
          var visible = UrlNav.navStringToVisible(
            lifeVisible,
            vc
          );
          setVisible(visible);
        });

        var prehistoryTimeline = Layout.FindChildTimeline(
          lifeTimeline,
          constants.prehistoryTimelineID,
          false
        );
        if (typeof prehistoryTimeline !== 'undefined') {
          prehistoryVisible = f(prehistoryTimeline);
          $('#regime-link-prehistory').click(function () {
            var visible = UrlNav.navStringToVisible(
              Common.prehistoryVisible,
              Common.vc
            );
            setVisible(visible);
          });

          var humanityTimeline = Layout.FindChildTimeline(
            prehistoryTimeline,
            constants.humanityTimelineID,
            true
          );
          if (typeof humanityTimeline !== 'undefined') {
            humanityVisible = f(humanityTimeline);
            $('#regime-link-humanity').click(function () {
              var visible = UrlNav.navStringToVisible(
                Common.humanityVisible,
                Common.vc
              );
              setVisible(visible);
            });
          }
        }
      }
    }

    maxPermitedVerticalRange = {
      top: cosmosTimeline.y,
      bottom: cosmosTimeline.y + cosmosTimeline.height,
    };

    // update virtual canvas horizontal borders
    constants.maxPermitedTimeRange = {
      left: cosmosTimeline.left,
      right: cosmosTimeline.right,
    };

    maxPermitedScale = UrlNav.navStringToVisible(cosmosVisible, vc).scale * 1.1;
  }


  setCookie(c_name, value, exdays) {
    var exdate = new Date();
    exdate.setDate(exdate.getDate() + exdays);
    var c_value =
      escape(value) +
      (exdays == null ? '' : '; expires=' + exdate.toUTCString());
    document.cookie = c_name + '=' + c_value;
  }
  //Common.setCookie = setCookie;

  getCookie(c_name) {
    var i,
      x,
      y,
      ARRcookies = document.cookie.split(';');
    for (i = 0; i < ARRcookies.length; i++) {
      x = ARRcookies[i].substr(0, ARRcookies[i].indexOf('='));
      y = ARRcookies[i].substr(ARRcookies[i].indexOf('=') + 1);
      x = x.replace(/^\s+|\s+$/g, '');
      if (x == c_name) {
        return unescape(y);
      }
    }
    return null;
  }
  //Common.getCookie = getCookie;

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

  // Initialize the JQuery UI Widgets
  initialize() {
    this.ax = $('#axis');
    this.axis = new Axis(this.ax);


    /*VirtualCanvas.initialize();
    var vc = $('#vc');
    vc.virtualCanvas();*/
    initWidgetVC();
    this.vc = $('#vc');
    this.vc.virtualCanvas();
  }

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

  //loading the data from the service
  loadData() {
    return Data.getTimelines(null).then(
      function (response) {
        //console.log(response);
        if (!response) {
          return;
        }

        ProcessContent(response);
        this.vc.virtualCanvas('updateViewport');

        if (initialContent) {
          Service.getContentPath(initialContent).then(
            function (response) {
              window.location.hash = response;
            },
            function (error) {
              console.log(
                'Error connecting to service:\n' + error.responseText
              );
            }
          );
        }

        /*CZ.Service.getTours().then(
        	function (response) {
        		CZ.Tours.parseTours(response);
        		CZ.Tours.initializeToursContent();
        	},
        	function (error) {
        		console.log(
        			'Error connecting to service:\n' + error.responseText
        		);
        	}
        );*/
      },
      function (error) {
        console.log('Error connecting to service:\n' + error.responseText);
      }
    );
  }

  // Retrieves the URL to download the data from
  loadDataUrl() {
    // The following regexp extracts the pattern dataurl=url from the page hash to enable loading timelines from arbitrary sources.
    var match = /dataurl=([^\/]*)/g.exec(window.location.hash);
    if (match) {
      return unescape(match[1]);
    } else {
      switch (constants.czDataSource) {
        case 'db':
          return '/api/get';
        case 'relay':
          return 'ChronozoomRelay';
        case 'dump':
          return '/dumps/beta-get.json';
        default:
          return null;
      }
    }
  }
}
