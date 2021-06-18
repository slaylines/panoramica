import * as constants from './constants';
import Common from './common';
import VCContent from './vccontent';
import { Viewport2d, VisibleRegion2d } from './viewport';

//constructs the new instance of the viewportController that handles an animations of the viewport
//@param setVisible (void setVisible(visible))      a callback which is called when controller wants to set intermediate visible regions while animation.
//@param getViewport (Viewport2D getViewport())     a callback which is called when controller wants to get recent state of corresponding viewport.
//@param gestureSource (merged RX gesture stream)   an RX stream of gestures described in gestures.js
export default class ViewportController {
  constructor(setVisible, getViewport /*, gesturesSource*/ ) {
    this.activeAnimation; //currently running animation. undefined if no animation active


    //recent FPS value
    this.FPS;

    //the outer visible scale that is permitied to observe.
    //it is automaticly adjusted on each viewport resize event not to let the user observe the interval
    //greater that "maxPermitedTimeRange" interval in settings.cs
    this.maximumPermitedScale;

    //the range that are permited to navigate
    //these values are automaticly updated at each new gesture handling according to present scale of the viewport
    //to adjust an offset in virtual coords that is specified in a settings.cs in a pixels
    //through updatePermitedBounds function
    this.leftPermitedBound;
    this.rightPermitedBound;
    this.topPermitedBound;
    this.bottomPermitedBound;

    //a scale constraint value to prevent the user from zooming too deep into the infodot, contentItem, etc
    //is used in coerceVisibleInnerZoom, and overrides the timelines zooming constraints
    //is to be set by the page that join the controller and the virtual canvas
    //(number)
    this.effectiveExplorationZoomConstraint = undefined;

    // an animation frame enqueueing function. It is used to schedula a new animation frame
    if (!window.requestAnimFrame)
      window.requestAnimFrame = function (callback) {
        window.setTimeout(callback, 1000 / constants.targetFps); // scheduling frame rendering timer
      };

    //storing screen size to detect window resize
    this.viewportWidth;
    this.viewportHeight;

    //storing callbacks
    this.setVisible = setVisible;
    this.getViewport = getViewport;

    //the latest known state of the viewport
    var self = this;

    //an estimated viewport state that will be at the and of the ongoing pan/zoom animation
    this.estimatedViewport = undefined;

    //a recent copy of the viewport;
    this.recentViewport = undefined;

    //callbacks array. each element will be invoked when animation is completed (viewport took the required state)
    //callback has one argument - the id of complete animation
    this.onAnimationComplete = [];

    //callbacks array. each element will be invoked when the animation parameters are updated or new animation activated
    //callback has two arguments - (the id of interupted animation,the id of newly created animation)
    //if animation is interrapted and no new animation obect is created, a newly created animation id is undefined
    //if anumation is updated and no new animation object is created, a created id is the same as an interrupted id
    this.onAnimationUpdated = [];

    //callbacks array. each element will be invoked when the animation starts
    //callback has one argument - (the id of started animation)
    this.onAnimationStarted = [];

    /*Transforms the viewport correcting its visible according to pan gesture passed
    @param viewport     (Viewport2D)    The viewport to transform
    @param gesture      (PanGesture) The gesture to apply
    */
    function PanViewport(viewport, panGesture) {
      var virtualOffset = viewport.vectorScreenToVirtual(panGesture.xOffset, panGesture.yOffset);
      var oldVisible = viewport.visible;
      viewport.visible.centerX = oldVisible.centerX - virtualOffset.x;
      viewport.visible.centerY = oldVisible.centerY - virtualOffset.y;
    }

    /*Transforms the viewport correcting its visible according to zoom gesture passed
    @param viewport     (Viewport2D)    The viewport to transform
    @param gesture      (ZoomGesture) The gesture to apply
    */
    function ZoomViewport(viewport, zoomGesture) {
      var oldVisible = viewport.visible;
      var x = zoomGesture.xOrigin + (viewport.width / 2.0 - zoomGesture.xOrigin) * zoomGesture.scaleFactor;
      var y = zoomGesture.yOrigin + (viewport.height / 2.0 - zoomGesture.yOrigin) * zoomGesture.scaleFactor;
      var newCenter = viewport.pointScreenToVirtual(x, y);
      viewport.visible.centerX = newCenter.x;
      viewport.visible.centerY = newCenter.y;
      viewport.visible.scale = oldVisible.scale * zoomGesture.scaleFactor;
    }

    /*calculates a viewport that will be actual at the end of the gesture handling animation
    @param previouslyEstimatedViewport       (Viewport2D)    the state of the viewport that is expacted to be at the end of the ongoing Pan/Zoom animation. undefined if no pan/zoom animation is active
    @param gesture                  (Gesture)       the gesture to handle (only Pan and Zoom gesture)
    @param latestViewport           (Viewport2D)    the state of the viewort that is currently observed by the user
    @remarks    The is no checks for gesture type. So make shure that the gestures only of pan and zoom types would be passed to this method
    */
    function calculateTargetViewport(latestViewport, gesture, previouslyEstimatedViewport) {
      var latestVisible = latestViewport.visible;
      var initialViewport;
      if (gesture.Type == "Zoom") {
        if (gesture.Source == "Touch") {
          if (previouslyEstimatedViewport)
            initialViewport = previouslyEstimatedViewport;
          else {
            initialViewport = new Viewport2d(latestViewport.aspectRatio, latestViewport.width, latestViewport.height, new VisibleRegion2d(latestVisible.centerX, latestVisible.centerY, latestVisible.scale));
          }
        } else {
          initialViewport = new Viewport2d(latestViewport.aspectRatio, latestViewport.width, latestViewport.height, new VisibleRegion2d(latestVisible.centerX, latestVisible.centerY, latestVisible.scale));
        }

        //calculating changed viewport according to the gesture
        ZoomViewport(initialViewport, gesture);
      } else {
        if (previouslyEstimatedViewport)
          initialViewport = previouslyEstimatedViewport;
        else {
          //there is no previously estimated viewport and there is no currently active Pan/Zoom animation. Cloning latest viewport (deep copy)
          initialViewport = new Viewport2d(latestViewport.aspectRatio, latestViewport.width, latestViewport.height, new VisibleRegion2d(latestVisible.centerX, latestVisible.centerY, latestVisible.scale));
        }

        //calculating changed viewport according to the gesture
        PanViewport(initialViewport, gesture);
      }

      self.coerceVisible(initialViewport, gesture); //applying navigaion constraints
      return initialViewport;
    }

    /*
    Saves the height and the width of the viewport in screen coordinates and recalculates rependant characteristics (e.g. maximumPermitedScale)
    @param viewport  (Viewport2D) a viewport to take parameters from
    */
    this.saveScreenParameters = function (viewport) {
      self.viewportWidth = viewport.width;
      self.viewportHeight = viewport.height;
    };

    /*
    Is used for coercing of the visible regions produced by the controller according to navigation constraints
    Navigation constraints are set in settings.js file
    @param vp (Viewport) the viewport.visible region to coerce
    @param gesture the gesture which caused the viewport to change
    we need the viewport (width, height) and the (zoom)gesture to
    undo the (zoom)gesture when it exceed the navigation constraints
    */
    this.coerceVisible = function (vp, gesture) {
      this.coerceVisibleInnerZoom(vp, gesture);
      this.coerceVisibleOuterZoom(vp, gesture);
      this.coerceVisibleHorizontalBound(vp);
      this.coerceVisibleVerticalBound(vp);
    };

    this.coerceVisibleOuterZoom = function (vp, gesture) {
      if (gesture.Type === "Zoom") {
        var visible = vp.visible;
        if (typeof Common.maxPermitedScale !== 'undefined' && Common.maxPermitedScale) {
          if (visible.scale > Common.maxPermitedScale) {
            gesture.scaleFactor = Common.maxPermitedScale / visible.scale;
            ZoomViewport(vp, gesture);
          }
        }
      }
    };

    /*
    Applys out of bounds constraint to the visible region (Preventing the user from observing the future time and the past before set treshold)
    The bounds are set as maxPermitedTimeRange variable in a constants.js file
    @param vp (Viewport) the viewport.visible region to coerce
    */
    this.coerceVisibleHorizontalBound = function (vp) {
      var visible = vp.visible;
      if (constants.maxPermitedTimeRange) {
        if (visible.centerX > constants.maxPermitedTimeRange.right)
          visible.centerX = constants.maxPermitedTimeRange.right;
        else if (visible.centerX < constants.maxPermitedTimeRange.left)
          visible.centerX = constants.maxPermitedTimeRange.left;
      }
    };

    /*
    Applys out of bounds constraint to the visible region (Preventing the user from observing the future time and the past before set treshold)
    The bounds are set as maxPermitedTimeRange variable in a constants.js file
    @param vp (Viewport) the viewport.visible region to coerce
    */
    this.coerceVisibleVerticalBound = function (vp) {
      var visible = vp.visible;
      if (Common.maxPermitedVerticalRange) {
        if (visible.centerY > Common.maxPermitedVerticalRange.bottom)
          visible.centerY = Common.maxPermitedVerticalRange.bottom;
        else if (visible.centerY < Common.maxPermitedVerticalRange.top)
          visible.centerY = Common.maxPermitedVerticalRange.top;
      }
    };

    /*
    Applys a deeper zoom constraint to the visible region
    Deeper (minimum scale) zoom constraint is set as deeperZoomConstraints array in a settings.js file
    @param vp (Viewport) the viewport.visible region to coerce
    @param gesture the gesture which caused the viewport to change
    */
    this.coerceVisibleInnerZoom = function (vp, gesture) {
      var visible = vp.visible;
      var x = visible.centerX;
      var scale = visible.scale;
      var constr = undefined;
      if (this.effectiveExplorationZoomConstraint)
        constr = this.effectiveExplorationZoomConstraint;

      else
        for (var i = 0; i < constants.deeperZoomConstraints.length; i++) {
          var possibleConstr = constants.deeperZoomConstraints[i];
          if (possibleConstr.left <= x && possibleConstr.right > x) {
            constr = possibleConstr.scale;
            break;
          }
        }
      if (constr) {
        if (scale < constr) {
          visible.scale = constr;
        }
      }
    };

    self.updateRecentViewport = function () {
      var vp = getViewport();
      var vis = vp.visible;
      self.recentViewport = new Viewport2d(vp.aspectRatio, vp.width, vp.height, new VisibleRegion2d(vis.centerX, vis.centerY, vis.scale));
    };

    var requestTimer = null;

    self.updateRecentViewport();
    this.saveScreenParameters(self.recentViewport);

    //requests to stop any ongoing animation
    this.stopAnimation = function () {
      self.estimatedViewport = undefined;
      if (self.activeAnimation) {
        self.activeAnimation.isForciblyStoped = true;
        self.activeAnimation.isActive = false;

        animationUpdated(self.activeAnimation.ID, undefined);
      }
    };

    /*
    Notify all subscribers that the ongoiung animation is updated (or halted)
    */
    function animationUpdated(oldId, newId) {
      for (var i = 0; i < self.onAnimationUpdated.length; i++)
        self.onAnimationUpdated[i](oldId, newId);
    }

    /*
    Notify all subscribers that the animation is started
    */
    function AnimationStarted(newId) {
      for (var i = 0; i < self.onAnimationStarted.length; i++)
        self.onAnimationStarted[i](newId);
    }

    //sets visible and schedules a new call of animation step if the animation still active and needs more frames
    this.animationStep = function (self) {
      if (self.activeAnimation) {
        if (self.activeAnimation.isActive)
          window.requestAnimFrame(function () {
            self.animationStep(self);
          });
        else {
          var stopAnimationID = self.activeAnimation.ID;

          self.updateRecentViewport();
          setVisible(new VisibleRegion2d(self.recentViewport.visible.centerX, self.recentViewport.visible.centerY, self.recentViewport.visible.scale)); //other components may suppose that it would be more frames by looking at activeAnimation property, so draw the last frame
          if (!self.activeAnimation.isForciblyStoped)
            for (var i = 0; i < self.onAnimationComplete.length; i++)
              self.onAnimationComplete[i](stopAnimationID);
          self.activeAnimation = undefined;
          self.estimatedViewport = undefined;
          return;
        }

        var vp = self.recentViewport;
        if (self.viewportWidth != vp.width || self.viewportHeight != vp.height)
          self.stopAnimation();

        var vis = self.activeAnimation.produceNextVisible(vp);
        setVisible(vis); //redrawing new visible region
      }

      this.frames++;
      this.oneSecondFrames++;

      var e = Common.vc.virtualCanvas("getLastEvent");
      if (e != null) {
        Common.vc.virtualCanvas("mouseMove", e);
      }
    };

    //FrameRate calculation related
    this.frames = 0;
    this.oneSecondFrames = 0;
    window.setInterval(function () {
      self.FPS = self.oneSecondFrames;
      self.oneSecondFrames = 0;
    }, 1000); //one call per second


    //tests related accessors
    this.PanViewportAccessor = PanViewport;

    //preforms an elliptical zoom to the passed visible region
    //param visible (Visible2D) a visible region to zoom into
    //param noAnimation (bool) - method performs instant transition without any animation if true
    this.moveToVisible = function (visible, noAnimation) {
      var currentViewport = getViewport();
      var targetViewport = new Viewport2d(currentViewport.aspectRatio, currentViewport.width, currentViewport.height, visible);
      var vbox = Common.viewportToViewBox(targetViewport);
      var wnd = new VCContent.CanvasRectangle(null, null, null, vbox.left, vbox.top, vbox.width, vbox.height, null);

      if (noAnimation) {
        self.stopAnimation();
        self.setVisible(visible);
        return;
      }

      var wasAnimationActive = false;
      var oldId = undefined;
      if (this.activeAnimation) {
        wasAnimationActive = this.activeAnimation.isActive;
        oldId = this.activeAnimation.ID;
      }

      self.updateRecentViewport();
      var vp = self.recentViewport;
      this.estimatedViewport = undefined;
      this.activeAnimation = new CZ.ViewportAnimation.EllipticalZoom(vp.visible, visible);

      //storing size to handle window resize
      self.viewportWidth = vp.width;
      self.viewportHeight = vp.height;

      if (!wasAnimationActive) {
        if (this.activeAnimation.isActive)
          AnimationStarted(this.activeAnimation.ID);

        setTimeout(function () {
          return self.animationStep(self);
        }, 0);
      } else {
        animationUpdated(oldId, this.activeAnimation.ID);
      }

      return (this.activeAnimation) ? this.activeAnimation.ID : undefined;
    };
  }
}
