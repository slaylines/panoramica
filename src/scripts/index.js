// Using require here for jQuery-ui to work with jQuery: need global variable
const $ = require('jquery');
window.jQuery = $;
require('jquery-ui');

import Axis from './axis';
import initWidgetVC from './vc';
import Common from './common'
import {VCContent} from './vccontent'
import * as constants from './constants';
import Service from './service';
import UILoader from './uiloader'
import UrlNav from './urlnav'
import LineChart from './linechart'
import TimeSeriesDataForm from './timeseriesdataform'
//import {Viewport2d, VisibleRegion2d} from './viewport'
import Gestures from './gestures'
import ViewportController2 from './viewport-controller'
import Dates from './dates'

/*$(document).ready(() => {

  //var timeSeriesChart;
  //var leftDataSet;
  //var rightDataSet;

  /*var defaultRootTimeline = {
    title: "My Timeline",
    x: 1950,
    endDate: 9999,
    offsetY: null,
    Height: null,
    children: [],
    parent: {
      guid: null
    }
  };

  var common = new Common();
  common.initialize();

  constants.isCosmosCollection = common.isInCosmos();

  //common.updateLayout();


  /*Service.getCollection().done(function (collection) {
    if (collection != null) {
      common.collectionTitle = collection.Title || '';
      constants.collectionOwner = collection.User.DisplayName;
    }

    //  set the canvas edit collection icon title
    //$('#editCollectionButton').find('.title').text(common.collectionTitle);
  });*/


/*Service.getProfile().done(function (data) {
    if (data !== '') {
      //constants.isAuthorized = true;
      //CZ.Menus.isSignedIn = true;
      //CZ.Menus.Refresh();
      constants.userSuperCollectionName = data.DisplayName || '';
      constants.userCollectionName = data.DisplayName || '';
      constants.userDisplayName = data.DisplayName || '';
      /*CZ.Authoring.timer = setTimeout(function () {
        CZ.Authoring.showSessionForm();
      }, (constants.sessionTime - 60) * 1000);*/
//}

//CZ.Authoring.isEnabled = UserCanEditCollection(data);
//InitializeToursUI(data, forms);
//})
//.fail(function (error) {
//var canEdit = UserCanEditCollection(null);
//CZ.Authoring.isEnabled = canEdit;
//constants.isAuthorized = canEdit;

//InitializeToursUI(null, forms);
//})
/*.always(function () {
  // *****************************
  // *** Collection Load Logic ***
  // *****************************

  // load the entire collection
  common.loadData().then(function (response) {
    // if collection is empty
    if (!response) {
      // if user has edit rights
      /*if (CZ.Authoring.isEnabled) {
        // show a form to create the root timeline
        if (CZ.Authoring.showCreateRootTimelineForm) {
          CZ.Authoring.showCreateRootTimelineForm(defaultRootTimeline);
        }
      } else {
        // tell the user there is no content
        CZ.Authoring.showMessageWindow(
          'There is no content in this collection yet. ' +
          'Please click on the ChronoZoom logo, (found just above this message,) ' +
          'to see some other collections that you can view.',
          "Collection Has No Content"
        );
      }*/
//}
//});

// get and store the collection title and owner
/*Service.getCollection().done(function (collection) {
  console.log(collection);
  if (collection != null) {
    common.collectionTitle = collection.Title || '';
    constants.collectionOwner = collection.User.DisplayName;
  }

  //  set the canvas edit collection icon title
  $('#editCollectionButton').find('.title').text(common.collectionTitle);
});*/


// **************************************
// *** Start-Up Overlay Display Logic ***
// **************************************

// if user can edit collection then unhide the canvas edit collection icon
//if (CZ.Authoring.isEnabled) $('#editCollectionButton').find('.hidden').removeClass('hidden');

// if logged in and user hasn't completed profile
/*if (CZ.Menus.isSignedIn && constants.userSuperCollectionName === '') {
  // show profile form on top of home page overlay
  CZ.Overlay.Show();
  profileForm.show();
  $('#username').focus();
}*/
// else if logged in and my collections was requested
/*else if (CZ.Menus.isSignedIn && sessionStorage.getItem('showMyCollections') === 'requested') {
  // show my collections overlay
  CZ.Overlay.Show(true);
} else {
  if // if no auto-tour and collection is Big History collection
  (
    CZ.Tours.getAutoTourGUID() === '' // <--  Always check first as fn must fire.
    && //      This fn sets up tours.js's parseTours
    ( //      to auto-start a tour, if specified.
      (constants.isCosmosCollection && window.location.hash === '') ||*/
//window.location.hash === '#/t00000000-0000-0000-0000-000000000000'
/*)
        ) {
          // show home page overlay
          CZ.Overlay.Show();
        }
      }*/

// remove any my collections queued request
//sessionStorage.removeItem('showMyCollections');

// remove splash screen
//$('#splash').fadeOut('slow');
//});

/*$(window).bind('resize', function () {
  if (timeSeriesChart) {
      timeSeriesChart.updateCanvasHeight();
  }

  сommon.updateLayout();

  //updating timeSeries chart
  var vp = сommon.vc.virtualCanvas("getViewport");
  updateTimeSeriesChart(vp);
});

var vp = Common.vc.virtualCanvas("getViewport");
var vccontent = new VCContent();

Common.vc.virtualCanvas("setVisible", vccontent.getVisibleForElement({
  x: -13700000000,
  y: 0,
  width: 13700000000,
  height: 5535444444.444445
}, 1.0, vp, false), true);
common.updateAxis(Common.vc, Common.ax);


//finishLoad();

/*const ax = $('#axis');
const axis = new Axis(ax);

const range = { min: -10000000000, max: 50 };
axis.update(range);

const vc = $('#vc');
initWidgetVC();
vc.virtualCanvas();*/
//});


$(document).ready(function () {
  // ensures there will be no 'console is undefined' errors
  /*window.console = window.console || (function () {
    var c = {};
    c.log = c.warn = c.debug = c.info = c.log = c.error = c.time = c.dir = c.profile = c.clear = c.exception = c.trace = c.assert = function () {};
    return c;
  })();*/

  //$('.bubbleInfo').hide();

  // auto-hourglass
  //$('#wait').hide();

  /*$(document).ajaxStart(function () {
    $('#wait').show();
  });
  $(document).ajaxStop(function () {
    $('#wait').hide();
  });*/

  // overlay & general wrapper theme
  /*var theme = localStorage.getItem('theme') || '';
  if (theme === '') {
  	theme = 'theme-linen'; // initial
  	localStorage.setItem('theme', theme);
  }
  $('body').addClass(theme);*/
  var common = new Common();
  var homepage = new HomePageViewModel();

  // populate collection names from URL
  var url = UrlNav.getURL();
  homepage.rootCollection = url.superCollectionName === undefined;
  Service.superCollectionName = url.superCollectionName;
  Service.collectionName = url.collectionName;
  common.initialContent = url.content;

  // register ChronoZoom extensions
  //CZ.Extensions.registerExtensions();

  // register ChronoZoom media pickers
  //CZ.Media.SkyDriveMediaPicker.isEnabled = true;
  //CZ.Media.initialize();
  common.initialize();

  // hook logo click
  /*$('.header-logo').click(function () {
    //window.location.href = '/';
    CZ.Overlay.Show(false); // false = home page overlay
  });*/

  // ensure we have a supercollection for getCanEdit and other API calls.
  if (typeof Service.superCollectionName === 'undefined' && common.isInCosmos())
    Service.superCollectionName = 'chronozoom';

  // check if current user has edit permissions before continuing with load
  // since other parts of load need to know if can display edit buttons etc.
  Service.getCanEdit().done(function (result) {
    Service.canEdit = (result === true);
    finishLoad();
  });

  function finishLoad() {
    // only invoked after user's edit permissions are checked (AJAX callback)
    UILoader.loadAll(homepage.uiMap).done(function () {
      var forms = arguments;
  
      //constants.isCosmosCollection = common.isInCosmos();
      if (constants.isCosmosCollection) $('.header-regimes').show();
  
      //CZ.Menus.isEditor = Service.canEdit;
      //CZ.Menus.Refresh();
      //CZ.Overlay.Initialize();
      
      HomePageViewModel.timeSeriesChart = new LineChart(forms[0]);
      //HomePageViewModel.timeSeriesChart = new LineChart(forms[11]);
  
      /*HomePageViewModel.panelToggleTimeSeries = function () {
        //CZ.Overlay.Hide();
        var tsForm = getFormById('#timeSeriesDataForm');
        if (tsForm === false) {
          closeAllForms();
  
          var timeSeriesDataFormDiv = forms[1];
          var timeSeriesDataForm = new TimeSeriesDataForm(
            timeSeriesDataFormDiv, {
              activationSource: $(),
              closeButton: ".cz-form-close-btn > .cz-form-btn"
            }
          );
          timeSeriesDataForm.show();
        } else {
          if (tsForm.isFormVisible) {
            tsForm.close();
          } else {
            closeAllForms();
            tsForm.show();
          }
        }
      };*/
  
      /*CZ.HomePageViewModel.panelToggleSearch = function () {
        var searchForm = getFormById("#header-search-form");
        if (searchForm === false) {
          closeAllForms();
          var form = new CZ.UI.FormHeaderSearch(
            forms[14], {
              activationSource: $(this),
              navButton: ".cz-form-nav",
              closeButton: ".cz-form-close-btn > .cz-form-btn",
              titleTextblock: ".cz-form-title",
              searchTextbox: ".cz-form-search-input",
              searchResultsBox: ".cz-form-search-results",
              progressBar: ".cz-form-progress-bar",
              resultSections: ".cz-form-search-results > .cz-form-search-section",
              resultsCountTextblock: ".cz-form-search-results-count"
            }
          );
          form.show();
        } else {
          if (searchForm.isFormVisible) {
            searchForm.close();
          } else {
            closeAllForms();
            searchForm.show();
          }
        }
      };*/
  
      /*("#editCollectionButton img").click(function () {
        closeAllForms();
        var form = new CZ.UI.FormEditCollection(forms[19], {
          activationSource: $(),
          navButton: ".cz-form-nav",
          closeButton: ".cz-form-close-btn > .cz-form-btn",
          deleteButton: '.cz-form-delete',
          titleTextblock: ".cz-form-title",
          saveButton: ".cz-form-save",
          errorMessage: '.cz-form-errormsg',
          collectionName: '#cz-collection-name',
          collectionPath: '#cz-collection-path',
          collectionTheme: constants.theme,
          backgroundInput: $(".cz-form-collection-background"),
          kioskmodeInput: $(".cz-form-collection-kioskmode"),
          mediaListContainer: ".cz-form-medialist",
          timelineBackgroundColorInput: $(".cz-form-timeline-background"),
          timelineBackgroundOpacityInput: $(".cz-form-timeline-background-opacity"),
          timelineBorderColorInput: $(".cz-form-timeline-border"),
          exhibitBackgroundColorInput: $(".cz-form-exhibit-background"),
          exhibitBackgroundOpacityInput: $(".cz-form-exhibit-background-opacity"),
          exhibitBorderColorInput: $(".cz-form-exhibit-border"),
          chkDefault: '#cz-form-collection-default',
          chkPublic: '#cz-form-public-search',
          chkEditors: '#cz-form-multiuser-enable',
          btnEditors: '#cz-form-multiuser-manage'
        });
        form.show();
      });*/
  
      /*$('body').on('click', '#cz-form-multiuser-manage', function (event) {
        var form = new CZ.UI.FormManageEditors(forms[20], {
          activationSource: $(this),
          navButton: ".cz-form-nav",
          titleTextblock: ".cz-form-title",
          closeButton: ".cz-form-close-btn > .cz-form-btn",
          saveButton: ".cz-form-save"
        });
        form.show();
      });*/
  
      /*CZ.Authoring.initialize(CZ.Common.vc, {
        showMessageWindow: function (message, title, onClose) {
          var wnd = new CZ.UI.MessageWindow(forms[13], message, title);
          if (onClose)
            wnd.container.bind("close", function () {
              wnd.container.unbind("close", onClose);
              onClose();
            });
          wnd.show();
        },
        hideMessageWindow: function () {
          var wnd = forms[13].data("form");
          if (wnd)
            wnd.close();
        },
        showEditTourForm: function (tour) {
          CZ.Tours.removeActiveTour();
          var form = new CZ.UI.FormEditTour(forms[7], {
            activationSource: $(),
            navButton: ".cz-form-nav",
            closeButton: ".cz-form-close-btn > .cz-form-btn",
            titleTextblock: ".cz-form-title",
            saveButton: ".cz-form-save",
            deleteButton: ".cz-form-delete",
            addStopButton: ".cz-form-tour-addstop",
            titleInput: ".cz-form-title",
            tourStopsListBox: "#stopsList",
            tourStopsTemplate: forms[8],
            context: tour
          });
          form.show();
        },
        showCreateTimelineForm: function (timeline) {
          //CZ.Authoring.hideMessageWindow();
          //CZ.Authoring.mode = "createTimeline";
          var form = new CZ.UI.FormEditTimeline(forms[1], {
            activationSource: $(),
            navButton: ".cz-form-nav",
            closeButton: ".cz-form-close-btn > .cz-form-btn",
            titleTextblock: ".cz-form-title",
            startDate: ".cz-form-time-start",
            endDate: ".cz-form-time-end",
            mediaListContainer: ".cz-form-medialist",
            backgroundUrl: ".cz-form-background-url",
            saveButton: ".cz-form-save",
            deleteButton: ".cz-form-delete",
            titleInput: ".cz-form-item-title",
            offsetLabels: ".cz-form-offset-label",
            topBoundInput: ".cz-form-item-offset",
            bottomBoundInput: ".cz-form-item-bottom-bound-offset",
            errorMessage: ".cz-form-errormsg",
            context: timeline
          });
          form.show();
        },
        showCreateRootTimelineForm: function (timeline) {
          CZ.Authoring.mode = "createRootTimeline";
          var form = new CZ.UI.FormEditTimeline(forms[1], {
            activationSource: $(),
            navButton: ".cz-form-nav",
            closeButton: ".cz-form-close-btn > .cz-form-btn",
            titleTextblock: ".cz-form-title",
            startDate: ".cz-form-time-start",
            endDate: ".cz-form-time-end",
            mediaListContainer: ".cz-form-medialist",
            backgroundUrl: ".cz-form-background-url",
            saveButton: ".cz-form-save",
            deleteButton: ".cz-form-delete",
            titleInput: ".cz-form-item-title",
            offsetLabels: ".cz-form-offset-label",
            topBoundInput: ".cz-form-item-top-bound-offset",
            bottomBoundInput: ".cz-form-item-bottom-bound-offset",
            errorMessage: ".cz-form-errormsg",
            context: timeline
          });
          form.show();
        },
        showEditTimelineForm: function (timeline) {
          var form = new CZ.UI.FormEditTimeline(forms[1], {
            activationSource: $(),
            navButton: ".cz-form-nav",
            closeButton: ".cz-form-close-btn > .cz-form-btn",
            titleTextblock: ".cz-form-title",
            startDate: ".cz-form-time-start",
            endDate: ".cz-form-time-end",
            mediaListContainer: ".cz-form-medialist",
            backgroundUrl: ".cz-form-background-url",
            saveButton: ".cz-form-save",
            deleteButton: ".cz-form-delete",
            titleInput: ".cz-form-item-title",
            offsetLabels: ".cz-form-offset-label",
            topBoundInput: ".cz-form-item-top-bound-offset",
            bottomBoundInput: ".cz-form-item-bottom-bound-offset",
            errorMessage: ".cz-form-errormsg",
            context: timeline
          });
          form.show();
        },
        showCreateExhibitForm: function (exhibit) {
          CZ.Authoring.hideMessageWindow();
          var form = new CZ.UI.FormEditExhibit(forms[2], {
            activationSource: $(),
            navButton: ".cz-form-nav",
            closeButton: ".cz-form-close-btn > .cz-form-btn",
            titleTextblock: ".cz-form-title",
            titleInput: ".cz-form-item-title",
            offsetInput: ".cz-form-item-offset",
            datePicker: ".cz-form-time",
            createArtifactButton: ".cz-form-create-artifact",
            contentItemsListBox: ".cz-listbox",
            errorMessage: ".cz-form-errormsg",
            saveButton: ".cz-form-save",
            deleteButton: ".cz-form-delete",
            contentItemsTemplate: forms[4],
            context: exhibit
          });
          form.show();
        },
        showEditExhibitForm: function (exhibit) {
          var form = new CZ.UI.FormEditExhibit(forms[2], {
            activationSource: $(),
            navButton: ".cz-form-nav",
            closeButton: ".cz-form-close-btn > .cz-form-btn",
            titleTextblock: ".cz-form-title",
            titleInput: ".cz-form-item-title",
            offsetInput: ".cz-form-item-offset",
            offsetCheckbox: ".cz-form-item-offset-checkbox",
            datePicker: ".cz-form-time",
            createArtifactButton: ".cz-form-create-artifact",
            contentItemsListBox: ".cz-listbox",
            errorMessage: ".cz-form-errormsg",
            saveButton: ".cz-form-save",
            deleteButton: ".cz-form-delete",
            contentItemsTemplate: forms[4],
            context: exhibit
          });
          form.show();
        },
        showEditContentItemForm: function (ci, e, prevForm, noAnimation) {
          var form = new CZ.UI.FormEditCI(forms[3], {
            activationSource: $(),
            prevForm: prevForm,
            navButton: ".cz-form-nav",
            closeButton: ".cz-form-close-btn > .cz-form-btn",
            titleTextblock: ".cz-form-title",
            errorMessage: ".cz-form-errormsg",
            saveButton: ".cz-form-save",
            titleInput: ".cz-form-item-title",
            mediaSourceInput: ".cz-form-item-mediasource",
            mediaInput: ".cz-form-item-mediaurl",
            descriptionInput: ".cz-form-item-descr",
            attributionInput: ".cz-form-item-attribution",
            mediaTypeInput: ".cz-form-item-media-type",
            mediaListContainer: ".cz-form-medialist",
            context: {
              exhibit: e,
              contentItem: ci
            }
          });
          form.show(noAnimation);
        }
      });*/
  
      /*HomePageViewModel.sessionForm = new CZ.UI.FormHeaderSessionExpired(forms[15], {
        activationSource: $(),
        navButton: ".cz-form-nav",
        closeButton: ".cz-form-close-btn > .cz-form-btn",
        titleTextblock: ".cz-form-title",
        titleInput: ".cz-form-item-title",
        context: "",
        sessionTimeSpan: "#session-time",
        sessionButton: "#session-button"
      });*/
  
      /*var loginForm = new CZ.UI.FormLogin(
        forms[6], {
          activationSource: $(),
          navButton: ".cz-form-nav",
          closeButton: ".cz-form-close-btn > .cz-form-btn",
          titleTextblock: ".cz-form-title",
          titleInput: ".cz-form-item-title",
          context: ""
        }
      );
      HomePageViewModel.panelToggleLogin = function () {
        if (loginForm.isFormVisible) {
          loginForm.close();
        } else {
          closeAllForms();
          loginForm.show();
        }
      };
  
      var profileForm = new CZ.UI.FormEditProfile(
        forms[5], {
          activationSource: $(),
          navButton: ".cz-form-nav",
          closeButton: ".cz-form-close-btn > .cz-form-btn",
          titleTextblock: ".cz-form-title",
          saveButton: "#cz-form-save",
          logoutButton: "#cz-form-logout",
          titleInput: ".cz-form-item-title",
          usernameInput: ".cz-form-username",
          emailInput: ".cz-form-email",
          agreeInput: ".cz-form-agree",
          loginPanel: "#login-panel",
          profilePanel: "#profile-panel",
          loginPanelLogin: "#profile-panel.auth-panel-login",
          context: "",
          allowRedirect: true
        }
      );

      HomePageViewModel.panelToggleProfile = function () {
        if (profileForm.isFormVisible) {
          profileForm.close();
        } else {
          closeAllForms();
          profileForm.show();
        }
      };*/
  
      /*Service.getProfile().done(function (data) {
          if (data !== '') {
            constants.isAuthorized = true;
            //CZ.Menus.isSignedIn = true;
            //CZ.Menus.Refresh();
            constants.userSuperCollectionName = data.DisplayName || '';
            constants.userCollectionName = data.DisplayName || '';
            constants.userDisplayName = data.DisplayName || '';
            /*CZ.Authoring.timer = setTimeout(function () {
              CZ.Authoring.showSessionForm();
            }, (constants.sessionTime - 60) * 1000);*/
          //}
  
          //CZ.Authoring.isEnabled = UserCanEditCollection(data);
          //InitializeToursUI(data, forms);
        /*})
        .fail(function (error) {
          var canEdit = UserCanEditCollection(null);
          //CZ.Authoring.isEnabled = canEdit;
          constants.isAuthorized = canEdit;
  
          //InitializeToursUI(null, forms);
        })
        .always(function () {
          // *****************************
          // *** Collection Load Logic ***
          // *****************************
  
          // load the entire collection
          Common.loadData().then(function (response) {
            // if collection is empty
            if (!response) {
              // if user has edit rights
              if (CZ.Authoring.isEnabled) {
                // show a form to create the root timeline
                if (CZ.Authoring.showCreateRootTimelineForm) {
                  CZ.Authoring.showCreateRootTimelineForm(defaultRootTimeline);
                }
              } else {
                // tell the user there is no content
                CZ.Authoring.showMessageWindow(
                  'There is no content in this collection yet. ' +
                  'Please click on the ChronoZoom logo, (found just above this message,) ' +
                  'to see some other collections that you can view.',
                  "Collection Has No Content"
                );
              }
            }
          });*/
  
          // get and store the collection title and owner
          /*Service.getCollection().done(function (collection) {
            if (collection != null) {
              Common.collectionTitle = collection.Title || '';
              constants.collectionOwner = collection.User.DisplayName;
            }
  
            //  set the canvas edit collection icon title
            $('#editCollectionButton').find('.title').text(Common.collectionTitle);
          });*/
  
  
          // **************************************
          // *** Start-Up Overlay Display Logic ***
          // **************************************
  
          // if user can edit collection then unhide the canvas edit collection icon
          //if (CZ.Authoring.isEnabled) $('#editCollectionButton').find('.hidden').removeClass('hidden');
  
          // if logged in and user hasn't completed profile
          /*if (CZ.Menus.isSignedIn && constants.userSuperCollectionName === '') {
            // show profile form on top of home page overlay
            CZ.Overlay.Show();
            profileForm.show();
            $('#username').focus();
          }
          // else if logged in and my collections was requested
          else if (CZ.Menus.isSignedIn && sessionStorage.getItem('showMyCollections') === 'requested') {
            // show my collections overlay
            CZ.Overlay.Show(true);
          } else {
            if // if no auto-tour and collection is Big History collection
            (
              CZ.Tours.getAutoTourGUID() === '' // <--  Always check first as fn must fire.
              && //      This fn sets up tours.js's parseTours
              ( //      to auto-start a tour, if specified.
                (constants.isCosmosCollection && window.location.hash === '') ||
                window.location.hash === '#/t00000000-0000-0000-0000-000000000000'
              )
            ) {
              // show home page overlay
              CZ.Overlay.Show();
            }
          }*/
  
          // remove any my collections queued request
          //sessionStorage.removeItem('showMyCollections');
  
          // remove splash screen
          //$('#splash').fadeOut('slow');
        //});
  
    });
  
    /*Service.getServiceInformation().then(function (response) {
      constants.contentItemThumbnailBaseUri = response.thumbnailsPath;
      constants.signinUrlMicrosoft = response.signinUrlMicrosoft;
      constants.signinUrlGoogle = response.signinUrlGoogle;
      constants.signinUrlYahoo = response.signinUrlYahoo;
    });*/
  
    //constants.applyTheme(null, Service.superCollectionName != null);
  
    // If not the default supercollection's default collection then look up the appropriate collection's theme
    /*if (Service.superCollectionName) {
      Service.getCollections(Service.superCollectionName).then(function (response) {
        $(response).each(function (index) {
          if (
            response[index] &&
            (
              (response[index].Default && ((typeof Service.collectionName) === 'undefined')) ||
              (response[index].Path === Service.collectionName)
            )
          ) {
            var themeData = null;
            try {
              themeData = JSON.parse(response[index].theme);
            } catch (e) {}
  
            //constants.applyTheme(themeData, false);
          }
        });
      });
    }*/
  
    //$('#breadcrumbs-nav-left').click(CZ.BreadCrumbs.breadCrumbNavLeft);
    //$('#breadcrumbs-nav-right').click(CZ.BreadCrumbs.breadCrumbNavRight);
  
    /*$('#biblCloseButton').mouseout(function () {
      Common.toggleOffImage('biblCloseButton', 'png');
    }).mouseover(function () {
      Common.toggleOnImage('biblCloseButton', 'png');
    });*/
  
    /*if (navigator.userAgent.match(/(iPhone|iPod|iPad)/)) {
      // Suppress the default iOS elastic pan/zoom actions.
      document.addEventListener('touchmove', function (e) {
        e.preventDefault();
      });
    }*/
  
    /*if (navigator.userAgent.indexOf('Mac') != -1) {
      // Disable Mac OS Scrolling Bounce Effect
      var body = document.getElementsByTagName('body')[0];
      body.style.overflow = "hidden";
    }*/
  
    // init seadragon. set path to image resources for nav buttons
    //Seadragon.Config.imagePath = constants.seadragonImagePath;
  
    //if (window.location.hash)
      //common.startHash = window.location.hash; // to be processes after the data is loaded
  
    //CZ.Search.initializeSearch();
    //CZ.Bibliography.initializeBibliography();
  
    /*var canvasGestures = Gestures.getGesturesStream(common.vc);
    var axisGestures = Gestures.applyAxisBehavior(Gestures.getGesturesStream(common.ax));
    var timeSeriesGestures = Gestures.getPanPinGesturesStream($("#timeSeriesContainer"));
    var jointGesturesStream = canvasGestures.Merge(axisGestures.Merge(timeSeriesGestures));*/
  
    /*common.controller = new ViewportController2(function (visible) {
      var vp = common.vc.virtualCanvas("getViewport");
      var markerPos = common.axis.markerPosition;
      var oldMarkerPosInScreen = vp.pointVirtualToScreen(markerPos, 0).x;
  
      common.vc.virtualCanvas("setVisible", visible, common.controller.activeAnimation);
      common.updateAxis(common.vc, common.ax);
      vp = common.vc.virtualCanvas("getViewport");
      /*if (CZ.Tours.pauseTourAtAnyAnimation) {
        CZ.Tours.tourPause();
        CZ.Tours.pauseTourAtAnyAnimation = false;
      }*/
  
      /*var hoveredInfodot = common.vc.virtualCanvas("getHoveredInfodot");
      var actAni = common.controller.activeAnimation != undefined;
  
      if (actAni) {
        var newMarkerPos = vp.pointScreenToVirtual(oldMarkerPosInScreen, 0).x;
        common.updateMarker();
      }
  
      updateTimeSeriesChart(vp);
    }, function () {
      return common.vc.virtualCanvas("getViewport");
    }, /*jointGesturesStream*//*);*/
  
    //var hashChangeFromOutside = true;
  
    // URL Nav: update URL when animation is complete
    /*common.controller.onAnimationComplete.push(function (id) {
      hashChangeFromOutside = false;
      if (common.setNavigationStringTo && common.setNavigationStringTo.bookmark) {
        UrlNav.navigationAnchor = UrlNav.navStringTovcElement(common.setNavigationStringTo.bookmark, common.vc.virtualCanvas("getLayerContent"));
        window.location.hash = common.setNavigationStringTo.bookmark;
      } else {
        if (common.setNavigationStringTo && common.setNavigationStringTo.id == id)
          UrlNav.navigationAnchor = common.setNavigationStringTo.element;
  
        var vp = common.vc.virtualCanvas("getViewport");
        window.location.hash = UrlNav.vcelementToNavString(UrlNav.navigationAnchor, vp);
      }
      common.setNavigationStringTo = null;
    });*/
  
    // URL Nav: handle URL changes from outside
    /*window.addEventListener("hashchange", function () {
      if (window.location.hash && hashChangeFromOutside && common.hashHandle) {
        var hash = window.location.hash;
        var visReg = UrlNav.navStringToVisible(window.location.hash.substring(1), common.vc);
        if (visReg) {
          common.isAxisFreezed = true;
          common.controller.moveToVisible(visReg, true);
  
          // to make sure that the hash is correct (it can be incorrectly changed in onCurrentlyObservedInfodotChanged)
          if (window.location.hash != hash) {
            hashChangeFromOutside = false;
            window.location.hash = hash;
          }
        }
        common.hashHandle = true;
      } else
        hashChangeFromOutside = true;
    });*/
  
    /*
    // Axis: enable showing thresholds
    CZ.Common.controller.onAnimationComplete.push(function () {
        //CZ.Common.ax.axis("enableThresholds", true);
        //if (window.console && console.log("thresholds enabled"));
    });
    //Axis: disable showing thresholds
    CZ.Common.controller.onAnimationStarted.push(function () {
        //CZ.Common.ax.axis("enableThresholds", true);
        //if (window.console && console.log("thresholds disabled"));
    });
    // Axis: enable showing thresholds
    CZ.Common.controller.onAnimationUpdated.push(function (oldId, newId) {
        if (oldId != undefined && newId == undefined) {
            setTimeout(function () {
                //CZ.Common.ax.axis("enableThresholds", true);
                //if (window.console && console.log("thresholds enabled"));
            }, 500);
        }
    });
    */
  
    //Tour: notifyng tour that the bookmark is reached
    /*CZ.Common.controller.onAnimationComplete.push(function (id) {
      if (CZ.Tours.tourBookmarkTransitionCompleted != undefined)
        CZ.Tours.tourBookmarkTransitionCompleted(id);
      if (CZ.Tours.tour != undefined && CZ.Tours.tour.state != "finished")
        CZ.Tours.pauseTourAtAnyAnimation = true;
    });*/
  
    //Tour: notifyng tour that the transition was interrupted
    /*CZ.Common.controller.onAnimationUpdated.push(function (oldId, newId) {
      if (CZ.Tours.tour != undefined) {
        if (CZ.Tours.tourBookmarkTransitionInterrupted != undefined) {
          var prevState = CZ.Tours.tour.state;
          CZ.Tours.tourBookmarkTransitionInterrupted(oldId);
          var alteredState = CZ.Tours.tour.state;
  
          if (prevState == "play" && alteredState == "pause")
            CZ.Tours.tourPause();
  
          CZ.Common.setNavigationStringTo = null;
        }
      }
    });*/
  
    common.updateLayout();
  
    /*common.vc.bind("elementclick", function (e) {
      CZ.Search.navigateToElement(e);
    });*/
  
    common.vc.bind('cursorPositionChanged', function (cursorPositionChangedEvent) {
      common.updateMarker();
    });
  
    /*common.ax.bind('thresholdBookmarkChanged', function (thresholdBookmark) {
      var bookmark = UrlNav.navStringToVisible(thresholdBookmark.Bookmark, CZ.Common.vc);
      if (bookmark != undefined) {
        CZ.Common.controller.moveToVisible(bookmark, false);
      }
    });*/
  
    // Reacting on the event when one of the infodot exploration causes inner zoom constraint
    common.vc.bind("innerZoomConstraintChanged", function (constraint) {
      common.controller.effectiveExplorationZoomConstraint = constraint.zoomValue; // applying the constraint
      common.axis.allowMarkerMovesOnHover = !constraint.zoomValue;
    });
  
    /*common.vc.bind("breadCrumbsChanged", function (breadCrumbsEvent) {
      CZ.BreadCrumbs.updateBreadCrumbsLabels(breadCrumbsEvent.breadCrumbs);
    });*/
  
    /*$(window).bind('resize', function () {
      if (HomePageViewModel.timeSeriesChart) {
        HomePageViewModel.timeSeriesChart.updateCanvasHeight();
      }
  
      common.updateLayout();
  
      //updating timeSeries chart
      var vp = common.vc.virtualCanvas("getViewport");
      updateTimeSeriesChart(vp);
    });*/
  
    /*var vp = common.vc.virtualCanvas("getViewport");
    var vccontent = new VCContent();
    common.vc.virtualCanvas("setVisible", vccontent.getVisibleForElement({
      x: -13700000000,
      y: 0,
      width: 13700000000,
      height: 5535444444.444445
    }, 1.0, vp, false), true);
    common.updateAxis(common.vc, common.ax);*/
  
    /*var bid = window.location.hash.match("b=([a-z0-9_\-]+)");
    if (bid) {
      //bid[0] - source string
      //bid[1] - found match
      $("#bibliography .sources").empty();
      $("#bibliography .title").append($("<span></span>", {
        text: "Loading..."
      }));
      $("#bibliographyBack").css("display", "block");
    }*/

  }
});


export class HomePageViewModel {
  constructor() {
    var timeSeriesChart;
    var leftDataSet;
    var rightDataSet;
    // Contains mapping of jQuery selector to HTML file, which is used to initialize the various panels via CZ.UILoader.
    var _uiMap = {
      //"#header-edit-form": "/ui/header-edit-form.html",
      //"#auth-edit-timeline-form": "/ui/auth-edit-timeline-form.html",
      //"#auth-edit-exhibit-form": "/ui/auth-edit-exhibit-form.html",
      //"#auth-edit-contentitem-form": "/ui/auth-edit-contentitem-form.html",
      //"$('<div></div>')": "/ui/contentitem-listbox.html",
      //"#toursList": "/ui/contentitem-listbox.html",
      //"#profile-form": "/ui/header-edit-profile-form.html",
      //"#login-form": "/ui/header-login-form.html",
      //"#auth-edit-tours-form": "/ui/auth-edit-tour-form.html",
      //"$('<div><!--Tours Authoring--></div>')": "/ui/tourstop-listbox.html",
      //"#toursList": "/ui/tourstop-listbox.html",
      //"#toursList": "/ui/tourslist-form.html",
      //"$('<div><!--Tours list item --></div>')": "/ui/tour-listbox.html",
      //"#toursList": "/ui/tour-listbox.html",
      "#timeSeriesContainer": "/ui/timeseries-graph-form.html",
      "#timeSeriesDataForm": "/ui/timeseries-data-form.html",
      //"#message-window": "/ui/message-window.html",
      //"#header-search-form": "/ui/header-search-form.html",
      //"#header-session-expired-form": "/ui/header-session-expired-form.html",
      //"#tour-caption-form": "/ui/tour-caption-form.html",
      //"#mediapicker-form": "/ui/mediapicker-form.html",
      //"#overlay": "/ui/overlay.html",
      //"#auth-edit-collection-form": "/ui/auth-edit-collection-form.html",
      //"#auth-edit-collection-editors": "/ui/auth-edit-collection-editors.html"
    };

    var sessionForm;
    var rootCollection;

    /*var defaultRootTimeline = {
      title: "My Timeline",
      x: 1950,
      endDate: 9999,
      offsetY: null,
      Height: null,
      children: [],
      parent: {
        guid: null
      }
    };*/

    Object.defineProperties(this, {
			uiMap: {
				configurable: false,
				get: function () {
					return _uiMap;
				}
			},
      timeSeriesChart: {
				configurable: false,
				get: function () {
					return timeSeriesChart;
				},
				set: function (value) {
					timeSeriesChart = value;
				}
			},
      leftDataSet: {
				configurable: false,
				get: function () {
					return leftDataSet;
				},
				set: function (value) {
					leftDataSet = value;
				}
			},
      rightDataSet: {
				configurable: false,
				get: function () {
					return rightDataSet;
				},
				set: function (value) {
					rightDataSet = value;
				}
			}
		});
  }

  /*UserCanEditCollection(profile) {
    // can't edit if no profile, no display name or no supercollection
    if (!profile || !profile.DisplayName || !Service.superCollectionName) {
      return false;
    }

    // override - anyone can edit the sandbox
    if (Service.superCollectionName.toLowerCase() === "sandbox") {
      return true;
    }

    // if here then logged in and on a page (other than sandbox) with a supercollection and collection
    // so return canEdit Boolean, which was previously set after looking up permissions in db.
    return Service.canEdit;
  }*/

  /*InitializeToursUI(profile, forms) {
  	CZ.Tours.tourCaptionFormContainer = forms[16];
  	var allowEditing = UserCanEditCollection(profile);

  	CZ.Tours.takeTour = function (tour) {
  		CZ.HomePageViewModel.closeAllForms();
  		CZ.Tours.tourCaptionForm = new CZ.UI.FormTourCaption(
  			CZ.Tours.tourCaptionFormContainer, {
  				activationSource: $(),
  				navButton: ".cz-form-nav",
  				closeButton: ".cz-tour-form-close-btn > .cz-form-btn",
  				titleTextblock: ".cz-tour-form-title",
  				contentContainer: ".cz-form-content",
  				minButton: ".cz-tour-form-min-btn > .cz-form-btn",
  				captionTextarea: ".cz-form-tour-caption",
  				tourPlayerContainer: ".cz-form-tour-player",
  				bookmarksCount: ".cz-form-tour-bookmarks-count",
  				narrationToggle: ".cz-toggle-narration",
  				context: tour
  			}
  		);
  		CZ.Tours.tourCaptionForm.show();
  		CZ.Tours.removeActiveTour();
  		CZ.Tours.activateTour(tour, undefined);
  	};*/

  /*panelShowToursList (canEdit) {
  	// canEdit undefined    = use allowEditing
  	// canEdit false        = read only rendering
  	// canEdit true         = edit rights rendering
  	if (typeof canEdit == 'undefined') canEdit = allowEditing;


  	if (canEdit && CZ.Tours.tours) {
  		if (CZ.Tours.tours.length === 0) {
  			// if there are no tours to show and user has tour editing rights, lets fire off the add a tour dialog instead
  			CZ.Overlay.Hide();
  			CZ.HomePageViewModel.closeAllForms();
  			CZ.Authoring.UI.createTour();
  			return;
  		}
  	}

  	var toursListForm = getFormById("#toursList");
  	if (toursListForm.isFormVisible) {
  		toursListForm.close();
  	} else {
  		CZ.Overlay.Hide();
  		closeAllForms();
  		var form = new CZ.UI.FormToursList(
  			forms[9], {
  				activationSource: $(this),
  				navButton: ".cz-form-nav",
  				closeButton: ".cz-form-close-btn > .cz-form-btn",
  				titleTextblock: ".cz-form-title",
  				tourTemplate: forms[10],
  				tours: CZ.Tours.tours,
  				takeTour: CZ.Tours.takeTour,
  				editTour: canEdit ? function (tour) {
  						if (CZ.Authoring.showEditTourForm) CZ.Authoring.showEditTourForm(tour);
  					} :
  					null,
  				createTour: ".cz-form-create-tour"
  			}
  		);
  		form.show();
  	}
  };*/


  closeAllForms() {
    $('.cz-major-form').each(function (i, f) {
      var form = $(f).data('form');
      if (form && form.isFormVisible === true) {
        form.close();
      }
    });
  }

  getFormById(name) {
    var form = $(name).data("form");
    if (form)
      return form;
    else
      return false;
  }

  showTimeSeriesChart() {
    $('#timeSeriesContainer').height('30%');
    $('#timeSeriesContainer').show();
    $('#vc').height('70%');
    console.log(this.timeSeriesChart);
    this.timeSeriesChart.updateCanvasHeight();
    common.updateLayout();
  }

  hideTimeSeriesChart() {
    this.leftDataSet = undefined;
    this.rightDataSet = undefined;
    $('#timeSeriesContainer').height(0);
    $('#timeSeriesContainer').hide();
    $('#vc').height('100%');
    common.updateLayout();
  }

  updateTimeSeriesChart(vp) {
    var left = vp.pointScreenToVirtual(0, 0).x;
    if (left < constants.maxPermitedTimeRange.left)
      left = constants.maxPermitedTimeRange.left;
    var right = vp.pointScreenToVirtual(vp.width, vp.height).x;
    if (right > constants.maxPermitedTimeRange.right)
      right = constants.maxPermitedTimeRange.right;

    if (this.timeSeriesChart !== undefined) {
      var leftCSS = vp.pointVirtualToScreen(left, 0).x;
      var rightCSS = vp.pointVirtualToScreen(right, 0).x;
      var leftPlot = Dates.getYMDFromCoordinate(left).year;
      var rightPlot = Dates.getYMDFromCoordinate(right).year;

      this.timeSeriesChart.clear(leftCSS, rightCSS);
      this.timeSeriesChart.clearLegend("left");
      this.timeSeriesChart.clearLegend("right");

      var chartHeader = "Time Series Chart";

      if (this.rightDataSet !== undefined || this.leftDataSet !== undefined) {
        this.timeSeriesChart.drawVerticalGridLines(leftCSS, rightCSS, leftPlot, rightPlot);
      }

      var screenWidthForLegend = rightCSS - leftCSS;
      if (this.rightDataSet !== undefined && this.leftDataSet !== undefined) {
        screenWidthForLegend /= 2;
      }
      var isLegendVisible = this.timeSeriesChart.checkLegendVisibility(screenWidthForLegend);

      if (this.leftDataSet !== undefined) {
        var padding = this.leftDataSet.getVerticalPadding() + 10;

        var plotBottom = Number.MAX_VALUE;
        var plotTop = Number.MIN_VALUE;

        this.leftDataSet.series.forEach(function (seria) {
          if (seria.appearanceSettings !== undefined && seria.appearanceSettings.yMin !== undefined && seria.appearanceSettings.yMin < plotBottom) {
            plotBottom = seria.appearanceSettings.yMin;
          }

          if (seria.appearanceSettings !== undefined && seria.appearanceSettings.yMax !== undefined && seria.appearanceSettings.yMax > plotTop) {
            plotTop = seria.appearanceSettings.yMax;
          }
        });

        if ((plotTop - plotBottom) === 0) {
          var absY = Math.max(0.1, Math.abs(plotBottom));
          var offsetConstant = 0.01;
          plotTop += absY * offsetConstant;
          plotBottom -= absY * offsetConstant;
        }

        var axisAppearence = {
          labelCount: 4,
          tickLength: 10,
          majorTickThickness: 1,
          stroke: 'black',
          axisLocation: 'left',
          font: '16px Calibri',
          verticalPadding: padding
        };
        var tickForDraw = this.timeSeriesChart.generateAxisParameters(leftCSS, rightCSS, plotBottom, plotTop, axisAppearence);
        this.timeSeriesChart.drawHorizontalGridLines(tickForDraw, axisAppearence);
        this.timeSeriesChart.drawDataSet(this.leftDataSet, leftCSS, rightCSS, padding, leftPlot, rightPlot, plotTop, plotBottom);
        this.timeSeriesChart.drawAxis(tickForDraw, axisAppearence);

        if (isLegendVisible) {
          for (var i = 0; i < this.leftDataSet.series.length; i++) {
            this.timeSeriesChart.addLegendRecord("left", this.leftDataSet.series[i].appearanceSettings.stroke, this.leftDataSet.series[i].appearanceSettings.name);
          }
        }

        chartHeader += " (" + this.leftDataSet.name;
      }

      if (this.rightDataSet !== undefined) {
        var padding = this.rightDataSet.getVerticalPadding() + 10;

        var plotBottom = Number.MAX_VALUE;
        var plotTop = Number.MIN_VALUE;

        this.rightDataSet.series.forEach(function (seria) {
          if (seria.appearanceSettings !== undefined && seria.appearanceSettings.yMin !== undefined && seria.appearanceSettings.yMin < plotBottom) {
            plotBottom = seria.appearanceSettings.yMin;
          }

          if (seria.appearanceSettings !== undefined && seria.appearanceSettings.yMax !== undefined && seria.appearanceSettings.yMax > plotTop) {
            plotTop = seria.appearanceSettings.yMax;
          }
        });

        if ((plotTop - plotBottom) === 0) {
          var absY = Math.max(0.1, Math.abs(plotBottom));
          var offsetConstant = 0.01;
          plotTop += absY * offsetConstant;
          plotBottom -= absY * offsetConstant;
        }

        var axisAppearence = {
          labelCount: 4,
          tickLength: 10,
          majorTickThickness: 1,
          stroke: 'black',
          axisLocation: 'right',
          font: '16px Calibri',
          verticalPadding: padding
        };
        var tickForDraw = this.timeSeriesChart.generateAxisParameters(rightCSS, leftCSS, plotBottom, plotTop, axisAppearence);
        this.timeSeriesChart.drawHorizontalGridLines(tickForDraw, axisAppearence);
        this.timeSeriesChart.drawDataSet(this.rightDataSet, leftCSS, rightCSS, padding, leftPlot, rightPlot, plotTop, plotBottom);
        this.timeSeriesChart.drawAxis(tickForDraw, axisAppearence);

        if (isLegendVisible) {
          for (var i = 0; i < this.rightDataSet.series.length; i++) {
            this.timeSeriesChart.addLegendRecord("right", this.rightDataSet.series[i].appearanceSettings.stroke, this.rightDataSet.series[i].appearanceSettings.name);
          }
        }

        var str = chartHeader.indexOf("(") > 0 ? ", " : " (";
        chartHeader += str + this.rightDataSet.name + ")";
      } else {
        chartHeader += ")";
      }

      $("#timeSeriesChartHeader").text(chartHeader);
    }
  }
}