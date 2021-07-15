import {
  deeperZoomConstraints,
  maxPermitedTimeRange,
  maxPermitedVerticalRange,
  targetFps,
  panSpeedFactor,
  zoomSpeedFactor,
} from './constants';
import { Viewport2d, VisibleRegion2d } from './viewport';
import { PanZoomAnimation } from './viewport-animation';

//constructs the new instance of the viewportController that handles an animations of the viewport
//@param setVisible (void setVisible(visible))      a callback which is called when controller wants to set intermediate visible regions while animation.
//@param getViewport (Viewport2D getViewport())     a callback which is called when controller wants to get recent state of corresponding viewport.
//@param gestureSource (merged RX gesture stream)   an RX stream of gestures described in gestures.js

export default class ViewportController {
  constructor(setVisible, getViewport, gesturesSource, vc) {
    //currently running animation. undefined if no animation active
    this.activeAnimation;

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
    //is to be set by the page that join the controller and the virtual canvas (number)
    this.effectiveExplorationZoomConstraint;

    //storing screen size to detect window resize
    this.viewportWidth;
    this.viewportHeight;

    //storing callbacks
    this.setVisible = setVisible;
    this.getViewport = getViewport;
    this.gesturesSource = gesturesSource;

    //an estimated viewport state that will be at the and of the ongoing pan/zoom animation
    this.estimatedViewport;

    //a recent copy of the viewport;
    this.recentViewport;

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

    this.FPS;
    this.frames = 0;
    this.oneSecondFrames = 0;

    /*
      Transforms the viewport correcting its visible according to pan gesture passed
      @param viewport     (Viewport2D) The viewport to transform
      @param gesture      (PanGesture) The gesture to apply
    */
    function PanViewport(viewport, panGesture) {
      const virtualOffset = viewport.vectorScreenToVirtual(panGesture.xOffset, panGesture.yOffset);

      viewport.visible.centerX -= virtualOffset.x;
      viewport.visible.centerY -= virtualOffset.y;
    }

    /*
      Transforms the viewport correcting its visible according to zoom gesture passed
      @param viewport     (Viewport2D)  The viewport to transform
      @param gesture      (ZoomGesture) The gesture to apply
    */
    function ZoomViewport(viewport, zoomGesture) {
      const { xOrigin, yOrigin, scaleFactor } = zoomGesture;
      const x = xOrigin + (viewport.width / 2.0 - xOrigin) * scaleFactor;
      const y = yOrigin + (viewport.height / 2.0 - yOrigin) * scaleFactor;
      const newCenter = viewport.pointScreenToVirtual(x, y);

      viewport.visible.centerX = newCenter.x;
      viewport.visible.centerY = newCenter.y;
      viewport.visible.scale *= scaleFactor;
    }

    /*
      Calculates a viewport that will be actual at the end of the gesture handling animation
      @param previouslyEstimatedViewport  (Viewport2D) the state of the viewport that is expacted to be at the end of the ongoing Pan/Zoom animation. undefined if no pan/zoom animation is active
      @param gesture                      (Gesture)    the gesture to handle (only Pan and Zoom gesture)
      @param latestViewport               (Viewport2D) the state of the viewort that is currently observed by the user
      @remarks    The is no checks for gesture type. So make sure that the gestures only of pan and zoom types would be passed to this method
    */
    this.calculateTargetViewport = (latestViewport, gesture, previouslyEstimatedViewport) => {
      const { centerX, centerY, scale } = latestViewport.visible
      let initialViewport;

      if (gesture.Type === 'Zoom') {
        initialViewport = (gesture.Source === 'Touch' ? previouslyEstimatedViewport : null) ||
          new Viewport2d(
            latestViewport.aspectRatio,
            latestViewport.width,
            latestViewport.height,
            new VisibleRegion2d(centerX, centerY, scale)
          );

        ZoomViewport(initialViewport, gesture);
      } else {
        initialViewport = previouslyEstimatedViewport || new Viewport2d(
          latestViewport.aspectRatio,
          latestViewport.width,
          latestViewport.height,
          new VisibleRegion2d(centerX, centerY, scale)
        );

        PanViewport(initialViewport, gesture);
      }

      this.coerceVisible(initialViewport, gesture);

      return initialViewport;
    };

    /*
      Saves the height and the width of the viewport in screen coordinates and recalculates rependant characteristics (e.g. maximumPermitedScale)
      @param viewport  (Viewport2D) a viewport to take parameters from
    */
    this.saveScreenParameters = function (viewport) {
      this.viewportWidth = viewport.width;
      this.viewportHeight = viewport.height;
    };

    /*
      Is used for coercing of the visible regions produced by the controller according to navigation constraints
      Navigation constraints are set in settings.js file
      @param vp (Viewport) the viewport.visible region to coerce
      @param gesture the gesture which caused the viewport to change
      we need the viewport (width, height) and the (zoom)gesture to undo the (zoom)gesture when it exceed the navigation constraints
    */
    this.coerceVisible = function (vp, gesture) {
      this.coerceVisibleInnerZoom(vp, gesture);
      this.coerceVisibleOuterZoom(vp, gesture);
      this.coerceVisibleHorizontalBound(vp);
      this.coerceVisibleVerticalBound(vp);
    };

    /*
      Applys a deeper zoom constraint to the visible region
      Deeper (minimum scale) zoom constraint is set as deeperZoomConstraints array in a settings.js file
      @param vp (Viewport) the viewport.visible region to coerce
      @param gesture the gesture which caused the viewport to change
    */
    this.coerceVisibleInnerZoom = function (vp, gesture) {
      const { centerX, scale } = vp.visible;

      let constr;

      if (this.effectiveExplorationZoomConstraint) {
        constr = this.effectiveExplorationZoomConstraint;
      } else {
        for (let i = 0; i < deeperZoomConstraints.length; i++) {
          const possibleConstr = deeperZoomConstraints[i];

          if (possibleConstr.left <= centerX && possibleConstr.right > centerX) {
            constr = possibleConstr.scale;
            break;
          }
        }
      }

      if (constr && scale < constr) {
        scale = constr;
      }
    };

    this.coerceVisibleOuterZoom = function (vp, gesture) {
      if (gesture.Type !== "Zoom") return;

      // TODO: not working for now: maxPermitedScale is always undefined
      /*
      const { scale } = vp.visible;

      if (Common.maxPermitedScale && scale > Common.maxPermitedScale) {
        gesture.scaleFactor = Common.maxPermitedScale / scale;

        ZoomViewport(vp, gesture);
      }
      */
    };

    /*
      Applys out of bounds constraint to the visible region (Preventing the user from observing the future time and the past before set treshold)
      The bounds are set as maxPermitedTimeRange variable in a constants.js file
      @param vp (Viewport) the viewport.visible region to coerce
    */
    this.coerceVisibleHorizontalBound = function (vp) {
      if (maxPermitedTimeRange) {
        if (vp.visible.centerX > maxPermitedTimeRange.right) {
          vp.visible.centerX = maxPermitedTimeRange.right;
        } else if (vp.visible.centerX < maxPermitedTimeRange.left) {
          vp.visible.centerX = maxPermitedTimeRange.left;
        }
      }
    };

    /*
      Applys out of bounds constraint to the visible region (Preventing the user from observing the future time and the past before set treshold)
      The bounds are set as maxPermitedTimeRange variable in a constants.js file
      @param vp (Viewport) the viewport.visible region to coerce
    */
    this.coerceVisibleVerticalBound = function (vp) {
      if (maxPermitedVerticalRange) {
        if (vp.visible.centerY > maxPermitedVerticalRange.bottom) {
          vp.visible.centerY = maxPermitedVerticalRange.bottom;
        } else if (vp.visible.centerY < maxPermitedVerticalRange.top) {
          vp.visible.centerY = maxPermitedVerticalRange.top;
        }
      }
    };

    this.updateRecentViewport = function () {
      const vp = getViewport();
      const { centerX, centerY, scale } = vp.visible;

      this.recentViewport = new Viewport2d(
        vp.aspectRatio,
        vp.width,
        vp.height,
        new VisibleRegion2d(centerX, centerY, scale)
      );
    };

    this.stopAnimation = function () {
      this.estimatedViewport = null;

      if (this.activeAnimation) {
        this.activeAnimation.isForciblyStoped = true;
        this.activeAnimation.isActive = false;

        this.animationUpdated(this.activeAnimation.ID);
      }
    };

    // Notify all subscribers that the ongoiung animation is updated (or halted)
    this.animationUpdated = function (oldId, newId) {
      this.onAnimationUpdated.forEach(animation => {
        animation(oldId, newId);
      });
    };

    // Notify all subscribers that the animation is started
    this.animationStarted = function (newId) {
      this.onAnimationStarted.forEach(animation => {
        animation(newId);
      });
    };

    // Sets visible and schedules a new call of animation step if the animation still active and needs more frames
    this.animationStep = function (self) {
      if (this.activeAnimation) {
        if (this.activeAnimation.isActive) {
          window.requestAnimFrame(() => this.animationStep(this));
        } else {
          const id = this.activeAnimation.ID;
          const { centerX, centerY, scale } = this.recentViewport.visible;

          this.updateRecentViewport();
          this.setVisible(new VisibleRegion2d(centerX, centerY, scale));

          if (!this.activeAnimation.isForciblyStoped) {
            this.onAnimationComplete.forEach(animation => {
              animation(id);
            });
          }

          this.activeAnimation = null;
          this.estimatedViewport = null;

          return;
        }

        const { width, height } = this.recentViewport;

        if (this.viewportWidth !== width || this.viewportHeight !== height) {
          this.stopAnimation();
        }

        this.setVisible(this.activeAnimation.produceNextVisible(this.recentViewport));
      }

      this.frames += 1;
      this.oneSecondFrames += 1;

      // DONE: need access to virtualCanvas to call these methods 
      const event = vc.virtualCanvas('getLastEvent');
      if (event != null) vc.virtualCanvas("mouseMove", event);
    };

    // an animation frame enqueueing function. It is used to schedula a new animation frame
    if (!window.requestAnimFrame) {
      window.requestAnimFrame = callback => {
        window.setTimeout(callback, 1000 / targetFps);
      };
    }

    window.setInterval(() => {
      this.FPS = this.oneSecondFrames;
      this.oneSecondFrames = 0;
    }, 1000);

    // Preforms an elliptical zoom to the passed visible region
    // Param visible (Visible2D) a visible region to zoom into
    // Param noAnimation (bool) - method performs instant transition without any animation if true
    this.moveToVisible = function (visible, noAnimation) {
      if (noAnimation) {
        this.stopAnimation();
        this.setVisible(visible);
        return;
      }

      const wasAnimationActive = this.activeAnimation ? this.activeAnimation.isActive : false;
      const oldId = this.activeAnimation ? this.activeAnimation.ID : null;

      this.updateRecentViewport();

      this.estimatedViewport = null;
      this.activeAnimation = new CZ.ViewportAnimation.EllipticalZoom(this.recentViewport.visible, visible);

      this.viewportWidth = this.recentViewport.width;
      this.viewportHeight = this.recentViewport.height;

      if (!wasAnimationActive) {
        if (this.activeAnimation.isActive) {
          this.animationStarted(this.activeAnimation.ID);
        }
        setTimeout(() => this.animationStep(self), 0);
      } else {
        this.animationUpdated(oldId, this.activeAnimation.ID);
      }

      return this.activeAnimation ? this.activeAnimation.ID : null;
    };

    this.gesturesSource.subscribe(gesture => {
      if (typeof gesture !== 'undefined') {
        const oldId = this.activeAnimation ? this.activeAnimation.ID : null;

        this.updateRecentViewport();

        if (gesture.Type === 'Pin') {
          this.stopAnimation();
          return;
        }

        if (gesture.Type === 'Pan' || gesture.Type === 'Zoom') {
          const newViewport = this.calculateTargetViewport(this.recentViewport, gesture, this.estimatedViewport);

          if (!this.estimatedViewport) {
            this.activeAnimation = new PanZoomAnimation(this.recentViewport);
            this.saveScreenParameters(this.recentViewport);
          }

          this.activeAnimation.velocity = gesture.Type === 'Pan'
            ? panSpeedFactor * 0.001
            : zoomSpeedFactor * 0.0025;


          this.activeAnimation.setTargetViewport(newViewport);
          this.estimatedViewport = newViewport;
        }

        if (oldId) {
          this.animationUpdated(oldId, this.activeAnimation.ID);
        } else {
          this.animationStarted(this.activeAnimation.ID);
        }

        // TODO: check why do we need this if
        // in original, skip on first step of gestures DO NOT KNOW WHY
        // if (!this.activeAnimation)
        this.animationStep(this);
      }
    });

    this.updateRecentViewport();
    this.saveScreenParameters(this.recentViewport);

    //requests to stop any ongoing animation
    this.stopAnimation = function () {
      this.estimatedViewport = null;
      if (this.activeAnimation) {
        this.activeAnimation.isForciblyStoped = true;
        this.activeAnimation.isActive = false;

        this.animationUpdated(this.activeAnimation.ID, null);
      }
    };
  }
}
