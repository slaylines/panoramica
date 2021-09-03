const $ = require('jquery');
window.jQuery = $;
require('jquery-ui');

import * as constants from './constants';
import * as dates from './dates';
import * as utils from './utils';
import Layout from './layout';

/*
  Adds a CanvasElement instance to the children array of this element.
  @param  element     (CanvasElement) new child of this element
  @returns    the added element
  @remarks    Bounding box of element must be included in bounding box of the this element. Otherwise, throws an exception.
  The method must be called within the BeginEdit/EndEdit of the root item.
*/
const addChild = (parent, element, suppresCheck) => {
  const isWithin = parent.width === Infinity ||
    (element.x >= parent.x && element.x + element.width <= parent.x + parent.width) &&
    (element.y >= parent.y && element.y + element.height <= parent.y + parent.height);

  parent.children.push(element);
  element.parent = parent;

  return element;
};

/* Looks up an element with given id in the children of this element and removes it with its children.
@param id   (any) id of an element
@returns    true, if element found and removed; otherwise, false.
@remarks    The method must be called within the BeginEdit/EndEdit of the root item.
If a child has onRemove() method, it is called right after removing of the child and clearing of all its children (recursively).
*/
const removeChild = (vc, parent, id) => {
  for (var i = 0; i < parent.children.length; i++) {
    const child = parent.children[i];

    if (child.id === id) {
      // remove element from hash map of animating elements in dynamic layout animation
      if (typeof vc.layout.animatingElements[child.id] !== 'undefined') {
        delete vc.layout.animatingElements[child.id];
        vc.layout.animatingElements.length--;
      }

      parent.children.splice(i, 1);
      clear(vc, child);

      if (child.onRemove) child.onRemove();
      child.parent = null;
      return true;
    }
  }
  return false;
};

/* Removes all children elements of this object (recursively).
@remarks    The method must be called within the BeginEdit/EndEdit of the root item.
For each descendant element that has onRemove() method, the method is called right after its removing and clearing of all its children (recursively).
*/
const clear = (vc, element) => {
  for (var i = 0; i < element.children.length; i++) {
    const child = element.children[i];

    // remove element from hash map of animating elements in dynamic layout animation
    if (typeof vc.layout.animatingElements[child.id] !== 'undefined') {
      delete vc.layout.animatingElements[child.id];
      vc.layout.animatingElements.length--;
    }

    clear(vc, child);
    child.parent = null;
    if (child.onRemove) child.onRemove();
  }
  element.children = [];
};

const turnIsRenderedOff = (element) => {
  element.isRendered = false;

  if (element.onIsRenderedChanged) element.onIsRenderedChanged();

  let { length } = element.children;

  for (; --length >= 0;) {
    if (element.children[length].isRendered)
      turnIsRenderedOff(element.children[length]);
  }
};

const getVisibleForElement = (element, scale, viewport, useMargin) => {
  var margin = 2 * (constants.contentScaleMargin && useMargin ? constants.contentScaleMargin : 0);
  var width = viewport.width - margin;
  if (width < 0)
    width = viewport.width;
  var scaleX = scale * element.width / width;

  var height = viewport.height - margin;
  if (height < 0)
    height = viewport.height;
  var scaleY = scale * element.height / height;
  var vs = {
    centerX: element.x + element.width / 2.0,
    centerY: element.y + element.height / 2.0,
    scale: Math.max(scaleX, scaleY)
  };
  return vs;
};

/*
  Renders a CanvasElement recursively
  @param element          (CanvasElement) element to render
  @param contexts         (map<layerid,context2d>) Contexts for layers' canvases.
  @param visibleBox_v     ({Left,Right,Top,Bottom}) describes visible region in the virtual space
  @param viewport2d       (Viewport2d) current viewport
  @param opacity          (float in [0,1]) 0 means transparent, 1 means opaque.
*/
const render = (element, contexts, visibleBox_v, viewport2d, opacity) => {
  if (!element.isVisible(visibleBox_v)) {
    if (element.isRendered)
      turnIsRenderedOff(element);
    return;
  }

  const sz = viewport2d.vectorVirtualToScreen(element.width, element.height);

  if (sz.y <= constants.renderThreshold || (element.width !== 0 && sz.x <= constants.renderThreshold)) {
    if (element.isRendered) turnIsRenderedOff(element);
    return;
  }

  if (element.opacity) opacity *= element.opacity;

  if (!element.isRendered) {
    element.isRendered = true;

    if (element.onIsRenderedChanged) element.onIsRenderedChanged();
  }

  element.render(contexts[element.layerid], visibleBox_v, viewport2d, sz, opacity);

  element.children.forEach(child => {
    render(child, contexts, visibleBox_v, viewport2d, opacity);
  });
};

/*
  Draws text by scaling canvas to match fontsize rather than change fontsize.
  This behaviour minimizes text shaking in chrome.
*/
const drawText = (text, ctx, x, y, fontSize, fontName) => {
  const baseFontSize = 12;
  const targetFontSize = fontSize;
  const s = targetFontSize / baseFontSize;

  ctx.scale(s, s);
  ctx.font = `${baseFontSize}pt ${fontName}`;
  ctx.fillText(text, x / s, y / s);
  ctx.scale(1 / s, 1 / s);
};

/* 
  Gets the zoom level for the given size of an element (in pixels).
  @param size_p       ({x,y}) size of bounding box of this element in pixels
  @returns (number)   zoom level which minimum natural number or zero zl so that max(size_p.x,size_p.y) <= 2^zl
*/
const getZoomLevel = (size_p) => {
  var sz = Math.max(size_p.x, size_p.y);
  if (sz <= 1)
    return 0;
  var zl = (sz & 1) ? 1 : 0;
  for (var i = 1; i < 32; i++) {
    sz = sz >>> 1;
    if (sz & 1) {
      if (zl > 0)
        zl = i + 1;
      else
        zl = i;
    }
  }
  return zl;
}

const buildVcContentItems = (contentItems, xc, yc, rad, vc, layerid) => {
  var n = contentItems.length;
  if (n <= 0)
    return null;

  var _rad = 450.0 / 2.0;
  var k = 1.0 / _rad;
  var _wc = 260.0 * k;
  var _hc = 270.0 * k;

  var _xlc = -_wc / 2 - 38.0 * k;
  var _xrc = -_xlc;
  var _lw = 60.0 * k;
  var _lh = _lw;
  var lw = _lw * rad;
  var lh = _lh * rad;

  var _ytc = -_hc / 2 - 9.0 * k - _lh / 2;
  var _ybc = -_ytc;

  var arrangeLeft = arrangeContentItemsInField(3, _lh);
  var arrangeRight = arrangeContentItemsInField(3, _lh);
  var arrangeBottom = arrangeContentItemsInField(3, _lw);

  var xl = xc + rad * (_xlc - _lw / 2);
  var xr = xc + rad * (_xrc - _lw / 2);
  var yb = yc + rad * (_ybc - _lh / 2);

  // build content items
  var vcitems = [];

  for (var i = 0, len = Math.min(constants.infodotMaxContentItemsCount, n); i < len; i++) {
    var ci = contentItems[i];
    if (i === 0) {
      vcitems.push(new ContentItem(vc, layerid, ci.id, -_wc / 2 * rad + xc, -_hc / 2 * rad + yc, _wc * rad, _hc * rad, ci));
    } else if (i >= 1 && i <= 3) {
      vcitems.push(new ContentItem(vc, layerid, ci.id, xl, yc + rad * arrangeLeft[(i - 1) % 3], lw, lh, ci));
    } else if (i >= 4 && i <= 6) {
      vcitems.push(new ContentItem(vc, layerid, ci.id, xr, yc + rad * arrangeRight[(i - 1) % 3], lw, lh, ci));
    } else if (i >= 7 && i <= 9) {
      vcitems.push(new ContentItem(vc, layerid, ci.id, xc + rad * arrangeBottom[(i - 1) % 3], yb, lw, lh, ci));
    }
  }

  return vcitems;
}

/* 
  Arranges given number of content items in a single part of an infodot, along a single coordinate axis (either x or y).
  @param n    (number) Number of content items to arrange
  @param dx   (number) Size of content item along the axis on which we arrange content items.
  @returns null, if n is 0; array of lefts (tops) for each coordinate item. 
*/
const arrangeContentItemsInField = (n, dx) => {
  if (n == 0)
    return null;
  var margin = 0.05 * dx;
  var x1, x2, x3, x4;
  if (n % 2 == 0) {
    // 3 1 2 4
    x1 = -margin / 2 - dx;
    x2 = margin / 2;
    if (n == 4) {
      x3 = x1 - dx - margin;
      x4 = x2 + margin + dx;
      return [x3, x1, x2, x4];
    }
    return [x1, x2];
  } else {
    // 3 1 2
    x1 = -dx / 2;
    if (n > 1) {
      x2 = dx / 2 + margin;
      x3 = x1 - dx - margin;
      return [x3, x1, x2];
    }
    return [x1];
  }
}

export const zoomToElementHandler = (sender, scale /* n [time units] / m [pixels] */, noAnimation) => {
  const elementclick = $.Event('elementclick');
  const vp = sender.vc.getViewport()
  const visible = getVisibleForElement(sender, scale, vp, true);

  elementclick.newvisible = visible;
  elementclick.element = sender;
  elementclick.noAnimation = noAnimation;
  sender.vc.element.trigger(elementclick);

  return true;
};

/*
  Adds a timeline composite element into a virtual canvas.
  @param element   (CanvasElement) Parent element, whose children is to be new timeline.
  @param layerid   (any type) id of the layer for this element
  @param id        (any type) id of an element
  @param timelineinfo  ({ timeStart (minus number of years BP), timeEnd (minus number of years BP), top (number), height (number),
  header (string), fillStyle (color) })
  @returns root of the timeline tree
*/
export const addTimeline = (element, layerid, id, timelineinfo) => {
  const width = timelineinfo.timeEnd - timelineinfo.timeStart;
  const timeline = addChild(
    element,
    new CanvasTimeline(
      element.vc,
      layerid,
      id,
      timelineinfo.timeStart,
      timelineinfo.top,
      width,
      timelineinfo.height,
      {
        strokeStyle: timelineinfo.strokeStyle ? timelineinfo.strokeStyle : constants.timelineStrokeStyle,
        lineWidth: constants.timelineLineWidth,
        fillStyle: constants.timelineColor ? constants.timelineColor : timelineinfo.fillStyle,
        opacity: typeof timelineinfo.opacity !== 'undefined' ? timelineinfo.opacity : 1,
      },
      timelineinfo
    ),
    true
  );

  return timeline;
};

/* Adds an infodot composite element into a virtual canvas.
@param vc        (VirtualCanvas) VirtualCanvas hosting this element
@param element   (CanvasElement) Parent element, whose children is to be new timeline.
@param layerid   (any type) id of the layer for this element
@param id        (any type) id of an element
@param contentItems (array of { id, date (string), title (string), description (string), mediaUrl (string), mediaType (string) }) content items of the infodot, first is central.
@returns         root of the content item tree
*/
export const addInfodot = (element, layerid, id, time, vyc, radv, contentItems, infodotDescription) => {
  const infodot = new CanvasInfodot(
    element.vc, 
    layerid, 
    id, 
    time, 
    vyc, 
    radv, 
    contentItems, 
    infodotDescription
  );
  return addChild(element, infodot, true);
};

/*
  Adds a text element as a child of the given virtual canvas element.
  @param element   (CanvasElement) Parent element, whose children is to be new element.
  @param layerid   (any type) id of the layer for this element
  @param id   (any type) id of an element
  @param vx   (number) x of left top corner in virtual space
  @param vy   (number) y of left top corner in virtual space
  @param baseline (number) y coordinate of the baseline in virtual space
  @param vh   (number) height of a bounding box in virtual space
  @param settings     ({ fillStyle, fontName }) Parameters of the text appearance
  @param vw (number) optional width of the text; if undefined, it is automatically asigned to width of the given text line.
  @remarks
  Text width is adjusted using measureText() on first render call.
*/
export const addText = (element, layerid, id, vx, vy, baseline, vh, text, settings, vw) => {
  return addChild(element, new CanvasText(element.vc, layerid, id, vx, vy, baseline, vh, text, settings, vw), false);
};

export const addScrollText = (element, layerid, id, vx, vy, vw, vh, text, z, settings) => {
  return addChild(element, new CanvasScrollTextItem(element.vc, layerid, id, vx, vy, vw, vh, text, z), false);
};

/*
  Adds a rectangle as a child of the given virtual canvas element.
  @param element   (CanvasElement) Parent element, whose children is to be new element.
  @param layerid   (any type) id of the layer for this element
  @param id   (any type) id of an element
  @param vx   (number) x of left top corner in virtual space
  @param vy   (number) y of left top corner in virtual space
  @param vw   (number) width of a bounding box in virtual space
  @param vh   (number) height of a bounding box in virtual space
  @param settings  ({strokeStyle,lineWidth,fillStyle}) Parameters of the rectangle appearance
*/
export const addRectangle = (element, layerid, id, vx, vy, vw, vh, settings) => {
  return addChild(element, new CanvasRectangle(element.vc, layerid, id, vx, vy, vw, vh, settings), false);
};

/* Adds an image as a child of the given virtual canvas element.
@param element   (CanvasElement) Parent element, whose children is to be new element.
@param layerid   (any type) id of the layer for this element
@param id   (any type) id of an element
@param vx   (number) x of left top corner in virtual space
@param vy   (number) y of left top corner in virtual space
@param vw   (number) width of a bounding box in virtual space
@param vh   (number) height of a bounding box in virtual space
@param z    (number) z-index
@param imgSrc (string) image URI
@param onload (optional callback function) called when image is loaded
@param parent (CanvasElement) Parent element, whose children is to be new element.
*/
export const addImage = (element, layerid, id, vx, vy, vw, vh, imgSrc) => {
  if (vw <= 0 || vh <= 0) throw "Image size must be positive";
  return addChild(element, new CanvasImage(element.vc, layerid, id, imgSrc, vx, vy, vw, vh), false);
};

/* Adds a video as a child of the given virtual canvas element.
@param element   (CanvasElement) Parent element, whose children is to be new element.
@param layerid   (any type) id of the layer for this element
@param id   (any type) id of an element
@param videoSource (string) video URI
@param vx   (number) x of left top corner in virtual space
@param vy   (number) y of left top corner in virtual space
@param vw   (number) width of a bounding box in virtual space
@param vh   (number) height of a bounding box in virtual space
@param z (number) z-index
*/
export const addVideo = (element, layerid, id, videoSource, vx, vy, vw, vh, z) => {
  return addChild(element, new CanvasVideoItem(element.vc, layerid, id, videoSource, vx, vy, vw, vh, z), false);
};

/* Adds a pdf as a child of the given virtual canvas element.
@param element   (CanvasElement) Parent element, whose children is to be new element.
@param layerid   (any type) id of the layer for this element
@param id   (any type) id of an element
@param pdfSource (string) pdf URI
@param vx   (number) x of left top corner in virtual space
@param vy   (number) y of left top corner in virtual space
@param vw   (number) width of a bounding box in virtual space
@param vh   (number) height of a bounding box in virtual space
@param z (number) z-index
*/
export const addPdf = (element, layerid, id, pdfSource, vx, vy, vw, vh, z) => {
  return addChild(element, new CanvasPdfItem(element.vc, layerid, id, pdfSource, vx, vy, vw, vh, z), false);
};

/*  Represents a base element that can be added to the VirtualCanvas.
@remarks CanvasElement has extension in virtual space, that enables to check visibility of an object and render it.
@param vc   (jquery to virtual canvas) note that vc.element[0] is the virtual canvas object
@param layerid   (any type) id of the layer for this object
@param id   (any type) id of the object
@param vx   (number) x of left top corner in virtual space
@param vy   (number) y of left top corner in virtual space
@param vw   (number) width of a bounding box in virtual space
@param vh   (number) height of a bounding box in virtual space
@remarks
If element.isRendered defined and true, the element was actually rendered on a canvas.
If element.onIsRenderedChanged defined, it is called when isRendered changes.
*/
export class CanvasElement {
  constructor(vc, layerid, id, vx, vy, vw, vh) {
    this.vc = vc;
    this.id = id;
    this.layerid = layerid;
    this.x = vx;
    this.y = vy;
    this.newY = vy;
    this.width = vw;
    this.height = vh;
    this.newHeight = vh;

    this.children = [];
    this.fadeIn = false; // indicates whether element has had fade in animation or not

    /* Checks whether this object is visible in the given visible box (in virtual space)
    @param visibleBox_v   ({Left,Top,Right,Bottom}) Visible region in virtual space
    @returns    True, if visible.
    */
    this.isVisible = function (visibleBox_v) {
      var objRight = this.x + this.width;
      var objBottom = this.y + this.height;
      return Math.max(this.x, visibleBox_v.Left) <= Math.min(objRight, visibleBox_v.Right) && Math.max(this.y, visibleBox_v.Top) <= Math.min(objBottom, visibleBox_v.Bottom);
    };

    /* Checks whether the given point (virtual) is inside the object
    (should take into account the shape) */
    this.isInside = function (point_v) {
      return point_v.x >= this.x && point_v.x <= this.x + this.width && point_v.y >= this.y && point_v.y <= this.y + this.height;
    };

    /* Renders a CanvasElement.
    @param ctx              (context2d) Canvas context2d to render on.
    @param visibleBox_v     ({Left,Right,Top,Bottom}) describes visible region in the virtual space
    @param viewport2d       (Viewport2d) current viewport
    @param size_p           ({x,y}) size of bounding box of this element in pixels
    @param opacity          (float in [0,1]) 0 means transparent, 1 means opaque.
    @remarks The method is implemented for each particular VirtualCanvas element.
    */
    this.render = function (ctx, visibleBox_v, viewport2d, size_p, opacity) { };
  }
}

/* A base class for elements those support different content for different zoom levels.
@remarks
Property "removeWhenInvisible" is optional. If set, the content is completely removed every time when isRendered changes from true to false.
*/
class CanvasDynamicLOD extends CanvasElement {
  constructor(vc, layerid, id, vx, vy, vw, vh) {
    super(vc, layerid, id, vx, vy, vw, vh);
    this.zoomLevel = 0;
    this.prevContent = null;
    this.newContent = null;
    this.asyncContent = null;
    this.lastRenderTime = 0;

    var self = this;

    /* Returns new content elements tree for the given zoom level, if it should change, or null.
    @returns { zoomLevel: number, content: CanvasElement}, or null.
    */
    this.changeZoomLevel = function (currentZoomLevel, newZoomLevel) {
      return null;
    };

    var startTransition = function (newContent) {
      self.lastRenderTime = new Date();

      self.prevContent = self.content;
      self.content = newContent.content;
      addChild(self, self.content, false);

      if (self.prevContent) {
        if (!self.prevContent.opacity)
          self.prevContent.opacity = 1.0;
        self.content.opacity = 0.0;
      }
      self.zoomLevel = newContent.zoomLevel;
    };

    var onAsyncContentLoaded = function () {
      if (self.asyncContent) {
        startTransition(self.asyncContent);
        self.asyncContent = null;
        delete this.onLoad;
        self.vc.requestInvalidate();
      }
    };

    /* Renders a rectangle.
    @param ctx              (context2d) Canvas context2d to render on.
    @param visibleBox_v     ({Left,Right,Top,Bottom}) describes visible region in the virtual space
    @param viewport2d       (Viewport2d) current viewport
    @param size_p           ({x,y}) size of bounding box of this element in pixels
    @remarks The method is implemented for each particular VirtualCanvas element.
    */
    this.render = function (ctx, visibleBox, viewport2d, size_p, opacity) {
      if (this.asyncContent)
        return;
      if (!this.prevContent) {
        var newZoomLevel = getZoomLevel(size_p);
        if (this.zoomLevel != newZoomLevel) {
          var newContent = this.changeZoomLevel(this.zoomLevel, newZoomLevel);
          if (newContent) {
            if (newContent.content.isLoading) {
              this.asyncContent = newContent;
              newContent.content.onLoad = onAsyncContentLoaded;
            } else {
              startTransition(newContent);
            }
          }
        }
      }
      if (this.prevContent) {
        var renderTime = new Date();
        var renderTimeDiff = renderTime.getTime() - this.lastRenderTime;
        this.lastRenderTime = renderTime.getTime();

        // Override the default contentAppearanceAnimationStep,
        // instead of being a constant it now depends on the time,
        // such that each transition animation takes about 1.6 sec.
        var contentAppearanceAnimationStep = renderTimeDiff / 1600;

        var doInvalidate = false;
        var lopacity = this.prevContent.opacity;
        lopacity = Math.max(0.0, lopacity - contentAppearanceAnimationStep);
        if (lopacity != this.prevContent.opacity)
          doInvalidate = true;
        if (lopacity == 0) {

          removeChild(vc, this, this.prevContent.id);
          this.prevContent = null;
        } else {
          this.prevContent.opacity = lopacity;
        }

        lopacity = this.content.opacity;
        lopacity = Math.min(1.0, lopacity + contentAppearanceAnimationStep);
        if (!doInvalidate && lopacity != this.content.opacity)
          doInvalidate = true;
        this.content.opacity = lopacity;

        if (doInvalidate)
          this.vc.requestInvalidate();
      }
    };

    this.onIsRenderedChanged = function () {
      if (typeof this.removeWhenInvisible === 'undefined' || !this.removeWhenInvisible)
        return;
      if (!this.isRendered) {
        if (this.asyncContent) {
          this.asyncContent = null;
        }
        if (this.prevContent) {
          removeChild(vc, this, this.prevContent.id);
          this.prevContent = null;
        }
        if (this.newContent) {
          removeChild(vc, this, this.newContent.id);
          this.newContent.content.onLoad = null;
          this.newContent = null;
        }
        if (this.content) {
          removeChild(vc, this, this.content.id);
          this.content = null;
        }

        /* Set hasContentItems to false for parent infodot.
        if (this.parent.hasContentItems != null || this.parent.hasContentItems)
        this.parent.hasContentItems = false; */
        this.zoomLevel = 0;
      }
    };
  }
}

/*****************************************************************************************/
/* Root element                                                                          */
/*  A root of an element tree of a VirtualCanvas.
@param vc   (VirtualCanvas) A virtual canvas that own this element tree.
@param layerid   (any type) id of the layer for this object
@param id   (any type) id of the object
@param vx   (number) x of left top corner in virtual space
@param vy   (number) y of left top corner in virtual space
@param vw   (number) width of a bounding box in virtual space
@param vh   (number) height of a bounding box in virtual space
*/
export class CanvasRootElement extends CanvasElement {
  constructor(vc, layerid, id, vx, vy, vw, vh) {
    super(vc, layerid, id, vx, vy, vw, vh);

    this.opacity = 0;

    // Overrides base function. Root element is visible when it has at least one child
    this.isVisible = function (visibleBox_v) {
      return this.children.length !== 0;
    };

    /*
      Begins editing of the element tree.
      @returns This element.
      @remarks Call BeginEdit prior to modify an element tree. The EndEdit method must be called, when editing is to be completed.
      The VirtualCanvas is invalidated on EndEdit only.
    */
    this.beginEdit = function () {
      return this;
    };

    /*
      Ends editing of the element tree.
      @param dontRender   (number) if zero (default value), invalidates and renders the virtual canvas content.
      @returns This element.
      @remarks Call BeginEdit prior to modify an element tree. The EndEdit method must be called, when editing is to be completed.
      The VirtualCanvas is invalidated on EndEdit only, if dontRender is false.
    */
    this.endEdit = function (dontRender) {
      if (!dontRender) this.vc.invalidate();
    };

    // Checks whether the given point (virtual) is inside the object (should take into account the shape)
    this.isInside = function (point_v) {
      return true;
    };

    /*
      Renders a CanvasElement recursively
      @param contexts         (map<layerid,context2d>) Contexts for layers' canvases.
      @param visibleBox_v     ({Left,Right,Top,Bottom}) describes visible region in the virtual space
      @param viewport2d       (Viewport2d) current viewport
    */
    this.render = function (contexts, visibleBox_v, viewport2d) {
      //this.vc.breadCrumbs = [];

      if (!this.isVisible(visibleBox_v)) return;

      this.children.forEach(child => {
        render(child, contexts, visibleBox_v, viewport2d, 1.0);
      });

      /*if (this.vc.breadCrumbs.length && (!this.vc.recentBreadCrumb || this.vc.breadCrumbs[vc.breadCrumbs.length - 1].vcElement.id !== this.vc.recentBreadCrumb.vcElement.id)) {
        this.vc.recentBreadCrumb = this.vc.breadCrumbs[vc.breadCrumbs.length - 1];
        this.vc.breadCrumbsChanged();
      } else if (!this.vc.breadCrumbs.length && this.vc.recentBreadCrumb) {
        this.vc.recentBreadCrumb = undefined;
        this.vc.breadCrumbsChanged();
      }*/
    };
  }
}

/*****************************************************************************************/
/* Primitive elements                                                                    */
/*  An element which doesn't have visual representation, but can contain other elements.
@param vx   (number) x of left top corner in virtual space
@param vy   (number) y of left top corner in virtual space
@param vw   (number) width of a bounding box in virtual space
@param vh   (number) height of a bounding box in virtual space
*/
class ContainerElement extends CanvasElement {
  constructor(vc, layerid, id, vx, vy, vw, vh) {
    super(vc, layerid, id, vx, vy, vw, vh);

    this.render = function (ctx, visibleBox, viewport2d, size_p, opacity) {};
  }
}

/*  A rectangle element that can be added to a VirtualCanvas.
@param layerid   (any type) id of the layer for this element
@param id   (any type) id of an element
@param vx   (number) x of left top corner in virtual space
@param vy   (number) y of left top corner in virtual space
@param vw   (number) width of a bounding box in virtual space
@param vh   (number) height of a bounding box in virtual space
@param settings  ({strokeStyle,lineWidth,fillStyle,outline:boolean}) Parameters of the rectangle appearance
*/
class CanvasRectangle extends CanvasElement {
  constructor(vc, layerid, id, vx, vy, vw, vh, settings) {
    super(vc, layerid, id, vx, vy, vw, vh);

    this.settings = settings;
    this.type = "rectangle";

    /*
      Renders a rectangle.
      @param ctx              (context2d) Canvas context2d to render on.
      @param visibleBox_v     ({Left,Right,Top,Bottom}) describes visible region in the virtual space
      @param viewport2d       (Viewport2d) current viewport
      @param size_p           ({x,y}) size of bounding box of this element in pixels
      @remarks The method is implemented for each particular VirtualCanvas element.
    */
    this.render = function (ctx, visibleBox, viewport2d, size_p, opacity) {
      var p = viewport2d.pointVirtualToScreen(this.x, this.y);
      var p2 = viewport2d.pointVirtualToScreen(this.x + this.width, this.y + this.height);

      var left = Math.max(0, p.x);
      var top = Math.max(0, p.y);
      var right = Math.min(viewport2d.width, p2.x);
      var bottom = Math.min(viewport2d.height, p2.y);
      if (left < right && top < bottom) {
        if (this.settings.fillStyle) {
          ctx.globalAlpha = this.settings.gradientOpacity ? opacity * (1 - this.settings.gradientOpacity) : opacity;
          ctx.fillStyle = this.settings.fillStyle;
          ctx.fillRect(left, top, right - left, bottom - top);

          if (this.settings.gradientOpacity && this.settings.gradientFillStyle) {
            var lineargradient = ctx.createLinearGradient(left, bottom, right, top);
            var transparent = "rgba(0, 0, 0, 0)";
            lineargradient.addColorStop(0, this.settings.gradientFillStyle);
            lineargradient.addColorStop(1, transparent);

            ctx.globalAlpha = opacity * this.settings.gradientOpacity;
            ctx.fillStyle = lineargradient;
            ctx.fillRect(left, top, right - left, bottom - top);
          }
        }

        ctx.globalAlpha = opacity;
        if (this.settings.strokeStyle) {
          ctx.strokeStyle = this.settings.strokeStyle;
          if (this.settings.lineWidth) {
            if (this.settings.isLineWidthVirtual) {
              ctx.lineWidth = viewport2d.widthVirtualToScreen(this.settings.lineWidth);
            } else {
              ctx.lineWidth = this.settings.lineWidth; // in pixels
            }
          } else
            ctx.lineWidth = 1;
          var lineWidth2 = ctx.lineWidth / 2.0;
          if (this.settings.outline) {
            p.x += lineWidth2;
            p.y += lineWidth2;
            top += lineWidth2;
            bottom -= lineWidth2;
            left += lineWidth2;
            right -= lineWidth2;
            p2.x -= lineWidth2;
            p2.y -= lineWidth2;
          }

          if (p.x > 0) {
            ctx.beginPath();
            ctx.moveTo(p.x, top - lineWidth2);
            ctx.lineTo(p.x, bottom + lineWidth2);
            ctx.stroke();
          }
          if (p.y > 0) {
            ctx.beginPath();
            ctx.moveTo(left - lineWidth2, p.y);
            ctx.lineTo(right + lineWidth2, p.y);
            ctx.stroke();
          }
          if (p2.x < viewport2d.width) {
            ctx.beginPath();
            ctx.moveTo(p2.x, top - lineWidth2);
            ctx.lineTo(p2.x, bottom + lineWidth2);
            ctx.stroke();
          }
          if (p2.y < viewport2d.height) {
            ctx.beginPath();
            ctx.moveTo(left - lineWidth2, p2.y);
            ctx.lineTo(right + lineWidth2, p2.y);
            ctx.stroke();
          }
        }
      }
    };

    this.intersects = function (rect) {
      return !(this.x + this.width < rect.x || this.x > rect.x + rect.width || this.y + this.height < rect.y || this.y > rect.y + rect.height);
    };

    this.contains = function (rect) {
      return (rect.x > this.x && rect.x + rect.width < this.x + this.width && rect.y > this.y && rect.y + rect.height < this.y + this.height);
    };

    this.isVisibleOnScreen = function (scale) {
      return this.width / scale >= constants.minTimelineWidth;
    };
  }
}

/*  A Timeline element that can be added to a VirtualCanvas (Rect + caption + bread crumbs tracing).
@param layerid   (any type) id of the layer for this element
@param id   (any type) id of an element
@param vx   (number) x of left top corner in virtual space
@param vy   (number) y of left top corner in virtual space
@param vw   (number) width of a bounding box in virtual space
@param vh   (number) height of a bounding box in virtual space
@param settings  ({strokeStyle,lineWidth,fillStyle}) Parameters of the rectangle appearance
*/
class CanvasTimeline extends CanvasRectangle {
  constructor(vc, layerid, id, vx, vy, vw, vh, settings, timelineinfo) {
    super(vc, layerid, id, vx, vy, vw, vh, settings);

    this.guid = timelineinfo.guid;
    this.type = 'timeline';

    this.isBuffered = timelineinfo.isBuffered;
    this.settings = settings;
    this.parent = undefined;
    this.currentlyObservedTimelineEvent = vc.currentlyObservedTimelineEvent;
    this.settings.outline = true;
    this.type = 'timeline';

    this.endDate = timelineinfo.endDate;

    this.fromIsCirca = timelineinfo.fromIsCirca || false;
    this.toIsCirca = timelineinfo.toIsCirca || false;
    this.backgroundUrl = timelineinfo.backgroundUrl || '';
    this.aspectRatio = timelineinfo.aspectRatio || null;

    this.offsetY = timelineinfo.offsetY;
    this.initHeight = timelineinfo.initHeight;

    this.settings.showFromCirca = this.fromIsCirca;
    this.settings.showToCirca = this.toIsCirca;
    this.settings.showInfinite = (timelineinfo.endDate == 9999);

    this.regime = timelineinfo.regime;
    this.settings.gradientOpacity = 0;

    if (constants.timelineGradientFillStyle) {
      this.settings.gradientFillStyle = constants.timelineGradientFillStyle;
    } else {
      this.settings.gradientFillStyle = timelineinfo.gradientFillStyle || timelineinfo.strokeStyle
        ? timelineinfo.strokeStyle
        : constants.timelineBorderColor;
    }

    this.reactsOnMouse = true;
    this.tooltipEnabled = true;
    this.tooltipIsShown = false;

    this.onmouseclick = () => {
      return zoomToElementHandler(this, 1.0);
    };

    this.onmousehover = function (pv, e) {
      // previous timeline also hovered and mouse leave don't appear, hide it
      // if infodot is null or undefined, we should stop animation
      // if it's ok, infodot's tooltip don't wink
      if (this.vc.currentlyHoveredTimeline && this.vc.currentlyHoveredTimeline.id !== id) {
        this.vc.hideTooltip();
        this.vc.currentlyHoveredTimeline.tooltipIsShown = false;
      } else if (!timelineinfo.header) {
        this.vc.hideTooltip();
      }

      this.vc.currentlyHoveredTimeline = this;

      this.settings.strokeStyle = constants.timelineHoveredBoxBorderColor;
      this.settings.lineWidth = constants.timelineHoveredLineWidth;
      this.settings.hoverAnimationDelta = constants.timelineHoverAnimation;
      this.vc.requestInvalidate();

      if (this.vc.tooltipMode !== 'infodot') {
        this.vc.tooltipMode = 'timeline';

        if (!this.tooltipIsShown && timelineinfo.header) {
          const tooltip = $('.vc-tooltip');

          tooltip.find('span').text(timelineinfo.header);
          tooltip.addClass('visible');

          this.panelWidth = tooltip.outerWidth();
          this.panelHeight = tooltip.outerHeight();
          this.tooltipIsShown = true;
        }
      }
    };
    this.onmouseunhover = function (pv, e) {
      if (this.vc.currentlyHoveredTimeline) {
        this.vc.currentlyHoveredTimeline = null;

        if (this.tooltipIsShown && this.vc.tooltipMode === 'timeline') {
          this.vc.tooltipMode = 'default';
          this.vc.hideTooltip();
          this.tooltipIsShown = false;
        }
      }

      this.settings.strokeStyle = timelineinfo.strokeStyle ? timelineinfo.strokeStyle : constants.timelineBorderColor;
      this.settings.lineWidth = constants.timelineLineWidth;
      this.settings.hoverAnimationDelta = -constants.timelineHoverAnimation;;
      this.vc.requestInvalidate();
    };

    this.base_render = this.render;

    /* Renders a timeline.
    @param ctx              (context2d) Canvas context2d to render on.
    @param visibleBox_v     ({Left,Right,Top,Bottom}) describes visible region in the virtual space
    @param viewport2d       (Viewport2d) current viewport
    @param size_p           ({x,y}) size of bounding box of this element in pixels
    @remarks The method is implemented for each particular VirtualCanvas element.
    */
    this.render = function (ctx, visibleBox, viewport2d, size_p, opacity) {
      if (this.settings.hoverAnimationDelta) {
        this.settings.gradientOpacity = Math.min(1, Math.max(0, this.settings.gradientOpacity + this.settings.hoverAnimationDelta));
      }

      if (!timelineinfo.hideBorder) {
        this.base_render(ctx, visibleBox, viewport2d, size_p, opacity);
      }

      if (this.settings.hoverAnimationDelta) {
        if (this.settings.gradientOpacity == 0 || this.settings.gradientOpacity == 1)
          this.settings.hoverAnimationDelta = undefined;
        else
          this.vc.requestInvalidate();
      }
    };
  }
}

/*  A circle element that can be added to a VirtualCanvas.
@param layerid   (any type) id of the layer for this element
@param id        (any type) id of an element
@param vxc       (number) center x in virtual space
@param vyc       (number) center y in virtual space
@param vradius   (number) radius in virtual space
@param settings  ({strokeStyle,lineWidth,fillStyle}) Parameters of the circle appearance
@remarks
The element is always rendered as a circle and ignores the aspect ratio of the viewport.
For this, circle radius in pixels is computed from its virtual width.
*/
class CanvasCircle extends CanvasElement {
  constructor(vc, layerid, id, vxc, vyc, vradius, settings) {
    super(vc, layerid, id, vxc - vradius, vyc - vradius, 2.0 * vradius, 2.0 * vradius);

    this.settings = settings;
    this.isObservedNow = false; //whether the circle is the largest circle under exploration,


    //that takes large enough rendering space according to infoDotAxisFreezeThreshold var in settings.js
    this.type = "circle";

    /* Renders a circle.
    @param ctx              (context2d) Canvas context2d to render on.
    @param visibleBox_v     ({Left,Right,Top,Bottom}) describes visible region in the virtual space
    @param viewport2d       (Viewport2d) current viewport
    @param size_p           ({x,y}) size of bounding box of this element in pixels
    @remarks The method is implemented for each particular VirtualCanvas element.
    */
    this.render = function (ctx, visibleBox, viewport2d, size_p, opacity) {
      var rad = this.width / 2.0;
      var xc = this.x + rad;
      var yc = this.y + rad;
      var p = viewport2d.pointVirtualToScreen(xc, yc);
      var radp = viewport2d.widthVirtualToScreen(rad);

      if (this.settings.showCirca && ctx.setLineDash) {
        ctx.setLineDash([6, 3]);
      }

      ctx.globalAlpha = opacity;
      ctx.beginPath();
      ctx.arc(p.x, p.y, radp, 0, Math.PI * 2, true);

      if (this.settings.strokeStyle) {
        ctx.strokeStyle = this.settings.strokeStyle;
        if (this.settings.lineWidth) {
          if (this.settings.isLineWidthVirtual) {
            ctx.lineWidth = viewport2d.widthVirtualToScreen(this.settings.lineWidth);
          } else {
            ctx.lineWidth = this.settings.lineWidth; // in pixels
          }
        } else
          ctx.lineWidth = 1;
        ctx.stroke();
      }

      if (this.settings.fillStyle) {
        ctx.fillStyle = this.settings.fillStyle;
        ctx.fill();
      }

      if (ctx.setLineDash) {
        ctx.setLineDash([]);
      }
    };

    /* Checks whether the given point (virtual) is inside the object
    (should take into account the shape) */
    this.isInside = function (point_v) {
      var len2 = utils.sqr(point_v.x - vxc) + utils.sqr(point_v.y - this.y - this.height / 2);
      return len2 <= vradius * vradius;
    };
  }
}

/*  A text element on a virtual canvas.
@param layerid   (any type) id of the layer for this element
@param id   (any type) id of an element
@param vx   (number) x of left top corner in virtual space
@param vy   (number) y of left top corner in virtual space
@param baseline (number) y coordinate of the baseline in virtual space
@param vw   (number) width of a bounding box in virtual space
@param vh   (number) height of a bounding box in virtual space
@param settings     ({ fillStyle, fontName, textAlign, textBaseLine, wrapText, numberOfLines, adjustWidth }) Parameters of the text appearance
@param vw (number) optional width of the text; if undefined, it is automatically asigned to width of the given text line.
@remarks
Text width is adjusted using measureText() on first render call.
If textAlign is center, then width must be provided.
*/
class CanvasText extends CanvasElement {
  constructor(vc, layerid, id, vx, vy, baseline, vh, text, settings, wv) {
    super(vc, layerid, id, vx, vy, wv ? wv : 0, vh);

    this.text = text;
    this.baseline = baseline;
    this.newBaseline = baseline;
    this.settings = settings;
    this.opacity = settings.opacity || 0;
    this.type = 'text';

    if (typeof this.settings.textBaseline !== 'undefined' && this.settings.textBaseline === 'middle') {
      this.newBaseline = this.newY + this.newHeight / 2;
    }

    this.initialized = false;
    this.screenFontSize = 0;

    /*
      Renders text.
      @param ctx              (context2d) Canvas context2d to render on.
      @param visibleBox_v     ({Left,Right,Top,Bottom}) describes visible region in the virtual space
      @param viewport2d       (Viewport2d) current viewport
      @param size_p           ({x,y}) size of bounding box of this element in pixels
      @remarks The method is implemented for each particular VirtualCanvas element.
    */
    this.render = function (ctx, visibleBox, viewport2d, size_p, opacity) {
      var p = viewport2d.pointVirtualToScreen(this.x, this.newY);
      var bp = viewport2d.pointVirtualToScreen(this.x, this.newBaseline).y;

      ctx.globalAlpha = opacity;
      ctx.fillStyle = this.settings.fillStyle;
      var fontSize = size_p.y;
      var k = 1.5;

      if (this.screenFontSize != fontSize)
        this.screenFontSize = fontSize;

      if (!this.initialized) {
        if (this.settings.wrapText) {
          var numberOfLines = this.settings.numberOfLines || 1;
          this.settings.numberOfLines = numberOfLines;
          fontSize = size_p.y / numberOfLines / k;

          while (true) {
            ctx.font = `${fontSize}pt ${this.settings.fontName}`;

            // Splitting the text into lines
            var mlines = this.text.split('\n');
            var textHeight = 0;
            var lines = [];

            for (var il = 0; il < mlines.length; il++) {
              var words = mlines[il].split(' ');
              var lineWidth = 0;
              var currentLine = '';
              var wsize;
              var space = ctx.measureText(' ').width;
              for (var iw = 0; iw < words.length; iw++) {
                wsize = ctx.measureText(words[iw]);
                var newWidth = lineWidth == 0 ? lineWidth + wsize.width : lineWidth + wsize.width + space;
                if (newWidth > size_p.x && lineWidth > 0) {
                  lines.push(currentLine);
                  lineWidth = 0;
                  textHeight += fontSize * k;
                  iw--;
                  currentLine = '';
                } else {
                  // we're still within the limit
                  if (currentLine === '')
                    currentLine = words[iw];

                  else
                    currentLine += ' ' + words[iw];
                  lineWidth = newWidth;
                }
                var NewWordWidth;
                if ((words.length == 1) && (wsize.width > size_p.x)) {
                  var NewWordWidth = wsize.width;
                  while (NewWordWidth > size_p.x) {
                    fontSize /= 1.5;
                    NewWordWidth /= 1.5;
                  }
                }
              }
              lines.push(currentLine);
              textHeight += fontSize * k;
            }

            if (textHeight > size_p.y) {
              fontSize /= 1.5;
            } else {
              this.text = lines;
              var fontSizeVirtual = viewport2d.heightScreenToVirtual(fontSize);
              this.settings.fontSizeVirtual = fontSizeVirtual;
              break;
            }
          }

          this.screenFontSize = fontSize;
        } else {
          ctx.font = `${fontSize}pt ${this.settings.fontName}`;

          this.screenFontSize = fontSize;

          if (this.width === 0) {
            var size = ctx.measureText(this.text);
            size_p.x = size.width;
            this.width = viewport2d.widthScreenToVirtual(size.width);
          } else {
            var size = ctx.measureText(this.text);
            if (size.width > size_p.x) {
              this.height = this.width * size_p.y / size.width;
              if (this.settings.textBaseline === 'middle') {
                this.newY = this.newBaseline - this.newHeight / 2;
              }
              fontSize = viewport2d.heightVirtualToScreen(this.height);

              this.screenFontSize = fontSize; // try to save fontSize
            } else if (typeof this.settings.adjustWidth && this.settings.adjustWidth) {
              var nwidth = viewport2d.widthScreenToVirtual(size.width);

              if (this.settings.textAlign === 'center') {
                this.x = this.x + (this.width - nwidth) / 2;
              } else if (this.settings.textAlign === 'right') {
                this.x = this.x + this.width - nwidth;
              }
              this.width = nwidth;

              p = viewport2d.pointVirtualToScreen(this.x, this.newY);
              size_p.x = viewport2d.widthVirtualToScreen(this.width);
            }
          }
        }
        this.initialized = true;
      }

      // Rendering text
      if (this.settings.textAlign) {
        ctx.textAlign = this.settings.textAlign;
        if (this.settings.textAlign === 'center')
          p.x = p.x + size_p.x / 2.0;
        else if (this.settings.textAlign === 'right')
          p.x = p.x + size_p.x;
      }

      if (!this.settings.wrapText) {
        if (this.settings.textBaseline)
          ctx.textBaseline = this.settings.textBaseline;

        drawText(this.text, ctx, p.x, bp, fontSize, this.settings.fontName);
      } else {
        fontSize = viewport2d.heightVirtualToScreen(this.settings.fontSizeVirtual);
        this.screenFontSize = fontSize; // try to save fontSize
        ctx.textBaseline = 'middle';

        var bp = p.y + fontSize * k / 2;
        for (var i = 0; i < this.text.length; i++) {
          drawText(this.text[i], ctx, p.x, bp, fontSize, this.settings.fontName);
          bp += fontSize * k;
        }
      }
    };

    this.isVisible = function (visibleBox_v) {
      var objBottom = this.y + this.height;
      if (this.width > 0) {
        var objRight = this.x + this.width;
        return Math.max(this.x, visibleBox_v.Left) <= Math.min(objRight, visibleBox_v.Right) && Math.max(this.y, visibleBox_v.Top) <= Math.min(objBottom, visibleBox_v.Bottom);
      }
      return Math.max(this.y, visibleBox_v.Top) <= Math.min(objBottom, visibleBox_v.Bottom);
    };
  }
}

/*  A multiline text element on a virtual canvas.
@param layerid   (any type) id of the layer for this element
@param id   (any type) id of an element
@param vx   (number) x of left top corner in virtual space
@param vy   (number) y of left top corner in virtual space
@param vh   (number) height of a text
@param lineWidth (number) width of a line to text output
@param settings     ({ fillStyle, fontName }) Parameters of the text appearance
@remarks
Text width is adjusted using measureText() on first render call.
*/
class CanvasMultiLineTextItem extends CanvasElement {
  constructor(vc, layerid, id, vx, vy, vh, text, lineWidth, settings) {
    super(vc, layerid, id, vx, vy, vh * 10, vh); // todo: measure properly text width

    this.settings = settings;
    this.text = text;

    this.render = function (ctx, visibleBox, viewport2d, size_p) {
      function textOutput(context, text, x, y, lineHeight, fitWidth) {
        fitWidth = fitWidth || 0;

        if (fitWidth <= 0) {
          context.fillText(text, x, y);
          return;
        }
        var words = text.split(' ');
        var currentLine = 0;
        var idx = 1;
        while (words.length > 0 && idx <= words.length) {
          var str = words.slice(0, idx).join(' ');
          var w = context.measureText(str).width;
          if (w > fitWidth) {
            if (idx == 1) {
              idx = 2;
            }
            context.fillText(words.slice(0, idx - 1).join(' '), x, y + (lineHeight * currentLine));
            currentLine++;
            words = words.splice(idx - 1);
            idx = 1;
          } else {
            idx++;
          }
        }
        if (idx > 0)
          context.fillText(words.join(' '), x, y + (lineHeight * currentLine));
      };

      var p = viewport2d.pointVirtualToScreen(this.x, this.y);
      ctx.fillStyle = settings.fillStyle;
      ctx.font = size_p.y + "pt " + settings.fontName;
      ctx.textBaseline = 'top';
      var height = viewport2d.heightVirtualToScreen(this.height);
      textOutput(ctx, this.text, p.x, p.y, height, lineWidth * height);
      // ctx.fillText(this.text, p.x, p.y);
    };
  }
}

/*  Represents an image on a virtual canvas.
@param layerid   (any type) id of the layer for this element
@param id   (any type) id of an element
@param vx   (number) x of left top corner in virtual space
@param vy   (number) y of left top corner in virtual space
@param vw   (number) width of a bounding box in virtual space
@param vh   (number) height of a bounding box in virtual space
@param onload (optional callback function) called when image is loaded
@remarks
optional property onLoad() is called if defined when the image is loaded and the element is completely initialized.
*/
class CanvasImage extends CanvasElement {
  constructor(vc, layerid, id, imageSource, vx, vy, vw, vh) {
    super(vc, layerid, id, vx, vy, vw, vh);

    this.img = new Image();
    this.img.setAttribute('crossOrigin', '');
    this.img.src = imageSource;

    const onCanvasImageLoad = () => {
      this.img.isLoading = false;
      if (!this.img.isRemoved) {
        // adjusting aspect ratio
        if (this.img.naturalHeight) {
          var ar0 = this.width / this.height;
          var ar1 = this.img.naturalWidth / this.img.naturalHeight;
          if (ar0 > ar1) {
            // vh ~ img.height, vw is to be adjusted
            var imgWidth = ar1 * this.height;
            var offset = (this.width - imgWidth) / 2.0;
            this.x += offset;
            this.width = imgWidth;
          } else if (ar0 < ar1) {
            // vw ~ img.width, vh is to be adjusted
            var imgHeight = this.width / ar1;
            var offset = (this.height - imgHeight) / 2.0;
            this.y += offset;
            this.height = imgHeight;
          }
        }

        this.img.isLoaded = true;
        vc.requestInvalidate();
      } else {
        delete this.img.isRemoved;
        delete this.img.isLoaded;
      }
    };

    const onCanvasImageError = () => {
      if (!this.img['isFallback']) {
        this.img['isFallback'] = true;
        this.img.src = constants.fallbackImageUri;
      } else {
        throw "Cannot load an image!";
      }
    };

    this.img.addEventListener("load", onCanvasImageLoad, false);
    this.img.addEventListener("error", onCanvasImageError, false);

    this.render = function (ctx, visibleBox, viewport2d, size_p, opacity) {
      if (!this.img.isLoaded)
        return;
      var p = viewport2d.pointVirtualToScreen(this.x, this.y);
      ctx.globalAlpha = opacity;
      ctx.drawImage(this.img, p.x, p.y, size_p.x, size_p.y);
    };

    this.onRemove = function () {
      this.img.removeEventListener("load", onCanvasImageLoad, false);
      this.img.removeEventListener("error", onCanvasImageError, false);
      this.img.isRemoved = true;
      delete this.img;
    };
  }
}

/* A canvas element which can host any of HTML elements.
@param vc        (jquery to virtual canvas) note that vc.element[0] is the virtual canvas object
@param layerid   (any type) id of the layer for this element
@param id        (any type) id of an element
@param vx        (number)   x of left top corner in virtual space
@param vy        (number)   y of left top corner in virtual space
@param vw        (number)   width of in virtual space
@param vh        (number)   height of in virtual space
@param z         (number) z-index
*/
class CanvasDomItem extends CanvasElement {
  constructor(vc, layerid, id, vx, vy, vw, vh, z) {
    super(vc, layerid, id, vx, vy, vw, vh);

    /* Initializes content of the CanvasDomItem.
    @param content          HTML element to add to virtual canvas
    @remarks The method assigns this.content property and sets up the styles of the content. */
    this.initializeContent = function (content) {
      this.content = content; // todo: ref to DOM potentially causes memory leak.
      if (content) {
        content.style.position = 'absolute';
        content.style.overflow = 'hidden';
        content.style.zIndex = z;
      }
    };

    /* This function is called when isRendered changes, i.e. when we stop or start render this element. */
    this.onIsRenderedChanged = function () {
      if (!this.content)
        return;

      if (this.isRendered) {
        if (!this.content.isAdded) {
          this.vc.element[0].appendChild(this.content);
          this.content.isAdded = true;
        }
        this.content.style.display = 'block';
      } else {
        /* If we stop render it, we make it invisible */
        this.content.style.display = 'none';
      }
    };
    this.render = function (ctx, visibleBox, viewport2d, size_p, opacity) {
      if (!this.content) return;

      const p = viewport2d.pointVirtualToScreen(this.x, this.y);

      //Define screen rectangle
      const screenTop = 0;
      const screenBottom = viewport2d.height;
      const screenLeft = 0;
      const screenRight = viewport2d.width;

      //Define clip rectangle. By default, video is not clipped. If video element crawls from screen rect, clip it
      let clipRectTop = 0;
      let clipRectLeft = 0;
      let clipRectBottom = size_p.y;
      let clipRectRight = size_p.x;

      //Vertical intersection ([a1,a2] are screen top and bottom, [b1,b2] are iframe top and bottom)
      var a1 = screenTop;
      var a2 = screenBottom;
      var b1 = p.y;
      var b2 = p.y + size_p.y;
      var c1 = Math.max(a1, b1);
      var c2 = Math.min(a2, b2);
      if (c1 <= c2) {
        clipRectTop = c1 - p.y;
        clipRectBottom = c2 - p.y;
      }

      //Horizontal intersection ([a1,a2] are screen left and right, [b1,b2] are iframe left and right)
      a1 = screenLeft;
      a2 = screenRight;
      b1 = p.x;
      b2 = p.x + size_p.x;
      c1 = Math.max(a1, b1);
      c2 = Math.min(a2, b2); //[c1,c2] is intersection
      if (c1 <= c2) {
        clipRectLeft = c1 - p.x;
        clipRectRight = c2 - p.x;
      }

      //Finally, reset iframe style.
      this.content.style.left = `${p.x}px`;
      this.content.style.top = `${p.y}px`;
      this.content.style.width = `${size_p.x}px`;
      this.content.style.height = `${size_p.y}px`;
      this.content.style.clip = `rect(${clipRectTop}px,${clipRectRight}px,${clipRectBottom}px,${clipRectLeft}px)`;
      this.content.style.opacity = opacity;
      this.content.style.filter = `alpha(opacity=${opacity * 100})`;
    };

    /* The functions is called when the canvas element is removed from the elements tree */
    this.onRemove = function () {
      if (!this.content)
        return;
      try {
        if (this.content.isAdded) {
          if (this.content.src)
            this.content.src = ""; // Stop loading content
          this.vc.element[0].removeChild(this.content);
          this.content.isAdded = false;
        }
      } catch (ex) {
        alert(ex.Description);
      }
    };
  }
}

/*Represents Text block with scroll*/
/*  Represents an image on a virtual canvas.
@param videoSrc     video source
@param vx           x of left top corner in virtual space
@param vy           y of left top corner in virtual space
@param vw           width of in virtual space
@param vh           height of in virtual space
@param z            z-index
@param settings     Parameters of the appearance
*/
class CanvasScrollTextItem extends CanvasDomItem {
  constructor(vc, layerid, id, vx, vy, vw, vh, text, z) {
    super(vc, layerid, id, vx, vy, vw, vh, z);

    //Creating content element
    //Our text will be drawn on div
    //To enable overflow:auto effect in IE, we have to use position:relative
    //But in vccontent we use position:absolute
    //So, we create "wrapping" div elemWrap, with position:absolute
    //Inside elemWrap, create child div with position:relative
    var elem = $("<div></div>", {
      id: "citext_" + id,
      class: "vc-content-item-description"
    }).appendTo(vc.element);

    elem[0].addEventListener("mousemove", utils.preventBubble, false);
    elem[0].addEventListener("mousedown", utils.preventBubble, false);
    elem[0].addEventListener("DOMMouseScroll", utils.preventBubble, false);
    elem[0].addEventListener("mousewheel", utils.preventBubble, false);

    var textElem = $("<div style='position:relative;' class='text'></div>");
    textElem.html(text).appendTo(elem);

    //Initialize content
    this.initializeContent(elem[0]);

    this.base_render = this.render;
    this.render = function (ctx, visibleBox, viewport2d, size_p, opacity) {
      var fontSize = size_p.y / constants.contentItemDescriptionNumberOfLines;
      elem.css('font-size', fontSize + "px");

      this.base_render(ctx, visibleBox, viewport2d, size_p, opacity);
    };

    this.onRemove = () => {
      elem[0].removeEventListener("mousemove", utils.preventBubble, false);
      elem[0].removeEventListener("mouseup", utils.preventBubble, false);
      elem[0].removeEventListener("mousedown", utils.preventBubble, false);
      elem[0].removeEventListener("DOMMouseScroll", utils.preventBubble, false);
      elem[0].removeEventListener("mousewheel", utils.preventBubble, false);

      elem = undefined;
    };
  }
}

/*Represents PDF element
@param pdfSrc     pdf source
@param vx           x of left top corner in virtual space
@param vy           y of left top corner in virtual space
@param vw           width of in virtual space
@param vh           height of in virtual space
@param z            z-index
*/
class CanvasPdfItem extends CanvasDomItem {
  constructor(vc, layerid, id, pdfSrc, vx, vy, vw, vh, z) {
    super(vc, layerid, id, vx, vy, vw, vh, z);

    var pdfViewer = "http://docs.google.com/viewer?url=";

    var elem = document.createElement('iframe');
    elem.setAttribute("id", id);

    if (!pdfSrc.match("/^" + pdfViewer + "/")) {
      pdfSrc = pdfViewer + pdfSrc;
    }

    if (pdfSrc.indexOf('?') == -1)
      pdfSrc += '?&embedded=true&wmode=opaque';
    else
      pdfSrc += '&embedded=true&wmode=opaque';

    elem.setAttribute("src", pdfSrc);
    elem.setAttribute("visible", 'true');
    elem.setAttribute("controls", 'true');

    this.initializeContent(elem);
  }
}

/*Represents video element
@param videoSrc     video source
@param vx           x of left top corner in virtual space
@param vy           y of left top corner in virtual space
@param vw           width of in virtual space
@param vh           height of in virtual space
@param z            z-index
*/
class CanvasVideoItem extends CanvasDomItem {
  constructor(vc, layerid, id, videoSrc, vx, vy, vw, vh, z) {
    super(vc, layerid, id, vx, vy, vw, vh, z);

    var elem = document.createElement('iframe');
    elem.setAttribute("id", id);
    if (videoSrc.indexOf('?') == -1)
      videoSrc += '?wmode=opaque';
    else
      videoSrc += '&wmode=opaque';

    elem.setAttribute("src", videoSrc);
    elem.setAttribute("visible", 'true');
    elem.setAttribute("controls", 'true');
    this.initializeContent(elem);
  }
}

/*******************************************************************************************************/
/* Infodots & content items                                                                            */
/*******************************************************************************************************/

/*  
  Represents an image on a virtual canvas with support of dynamic level of detail.
  @param layerid   (any type) id of the layer for this element
  @param id   (any type) id of an element
  @param vx   (number) x of left top corner in virtual space
  @param vy   (number) y of left top corner in virtual space
  @param vw   (number) width of a bounding box in virtual space
  @param vh   (number) height of a bounding box in virtual space
  @param contentItem ({ id, guid, date (string), title (string), description (string), mediaUrl (string), mediaType (string) }) describes content of this content item
  @remarks Supported media types (contentItem.mediaType) are:
  - image
  - video
  - audio
  - pdf
*/
class ContentItem extends CanvasDynamicLOD {
  constructor(vc, layerid, id, vx, vy, vw, vh, contentItem){
    super(vc, layerid, id, vx, vy, vw, vh);
    
    this.guid = contentItem.id;
    this.type = 'contentItem';
    this.contentItem = contentItem;

    // Building content of the item
    var titleHeight = vh * constants.contentItemTopTitleHeight * 0.8;
    var descrHeight = vh * constants.contentItemFontHeight;
    var mediaHeight = contentItem.description
      ? vh * constants.contentItemMediaHeight
      : vh * constants.contentItemMediaHeightFull;

    if (!contentItem.description) descrHeight = 0;

    var contentWidth = vw * constants.contentItemContentWidth;
    var leftOffset = (vw - contentWidth) / 2.0;
    var verticalMargin = vh * constants.contentItemVerticalMargin;

    var mediaTop = vy + verticalMargin;
    var sourceVertMargin = verticalMargin * 0.4;
    var sourceTop = mediaTop + mediaHeight + sourceVertMargin;
    var sourceRight = vx + vw - leftOffset;
    var sourceHeight = vh * constants.contentItemSourceHeight * 0.8;
    var titleTop = sourceTop + verticalMargin + sourceHeight;

    // Bounding rectangle
    var rect = addRectangle(this, layerid, id + "__rect__", vx, vy, vw, vh, {
      strokeStyle: constants.contentItemBoundingBoxBorderColor,
      lineWidth: constants.contentItemBoundingBoxBorderWidth * vw,
      fillStyle: constants.contentItemBoundingBoxFillColor,
      isLineWidthVirtual: true
    });
    this.reactsOnMouse = true;

    this.onmouseenter = function (e) {
      rect.settings.strokeStyle = constants.contentItemBoundingHoveredBoxBorderColor;
      this.vc.currentlyHoveredContentItem = this;
      this.vc.requestInvalidate();
    };

    this.onmouseleave = function (e) {
      rect.settings.strokeStyle = constants.contentItemBoundingBoxBorderColor;
      this.vc.currentlyHoveredContentItem = null;
      this.isMouseIn = false;
      this.vc.requestInvalidate();
    };

    this.onmouseclick = function () {
      return zoomToElementHandler(this, 1.0);
    };

    this.changeZoomLevel = function (curZl, newZl) {
      var vy = this.newY;
      var mediaTop = vy + verticalMargin;
      var sourceTop = mediaTop + mediaHeight + sourceVertMargin;
      var titleTop = sourceTop + verticalMargin + sourceHeight;

      if (newZl >= constants.contentItemShowContentZoomLevel) {
        if (curZl >= constants.contentItemShowContentZoomLevel)
          return null;

        const container = new ContainerElement(vc, layerid, id + "__content", vx, vy, vw, vh);

        const mediaID = id + "__media__";
        const { uri, title, content } = this.contentItem;
        const mediaType = this.contentItem.mediaType.toLowerCase();

        if (mediaType === 'image' || mediaType === 'picture') {
          addImage(container, layerid, mediaID, vx + leftOffset, mediaTop, contentWidth, mediaHeight, uri);
        } else if (mediaType === 'video') {
          addVideo(container, layerid, mediaID, uri, vx + leftOffset, mediaTop, contentWidth, mediaHeight, constants.mediaContentElementZIndex);
        } else if (mediaType === 'pdf') {
          addPdf(container, layerid, mediaID, uri, vx + leftOffset, mediaTop, contentWidth, mediaHeight, constants.mediaContentElementZIndex);
        } else if (mediaType === 'text') {
          addScrollText(container, layerid, mediaID, vx + leftOffset, mediaTop, contentWidth, mediaHeight, content, constants.mediaContentElementZIndex);
        }

        // Title
        addText(container, layerid, id + "__title__", vx + leftOffset, titleTop, titleTop + titleHeight / 2.0, 0.9 * titleHeight, title, {
          fontName: constants.contentItemHeaderFontName,
          fillStyle: constants.contentItemHeaderFontColor,
          textBaseline: 'middle',
          textAlign: 'center',
          opacity: 1,
          wrapText: true,
          numberOfLines: 1
        }, contentWidth);

        // Source
        var sourceText = this.contentItem.attribution;
        var mediaSource = this.contentItem.mediaSource;
        if (sourceText) {
          var addSourceText = function (sx, sw, sy) {
            var sourceItem = addText(container, layerid, id + "__source__", sx, sy, sy + sourceHeight / 2.0, 0.9 * sourceHeight, sourceText, {
              fontName: constants.contentItemHeaderFontName,
              fillStyle: constants.contentItemSourceFontColor,
              textBaseline: 'middle',
              textAlign: 'center',
              opacity: 1,
              adjustWidth: true
            }, sw);

            if (mediaSource) {
              sourceItem.reactsOnMouse = true;
              sourceItem.onmouseclick = function (e) {
                vc.element.css('cursor', 'default');
                window.open(mediaSource);
                return true;
              };
              sourceItem.onmouseenter = function (pv, e) {
                this.settings.fillStyle = constants.contentItemSourceHoveredFontColor;
                this.vc.requestInvalidate();
                this.vc.element.css('cursor', 'pointer');
              };
              sourceItem.onmouseleave = function (pv, e) {
                this.settings.fillStyle = constants.contentItemSourceFontColor;
                this.vc.requestInvalidate();
                this.vc.element.css('cursor', 'default');
              };
            }
          };

          addSourceText(vx + leftOffset, contentWidth, sourceTop);
        }

        // Description
        if (this.contentItem.description) {
          var descrTop = titleTop + titleHeight + verticalMargin;
          var descr = addScrollText(container, layerid, id + "__description__", vx + leftOffset, descrTop, contentWidth, descrHeight, this.contentItem.description, 30, {});
        }

        return {
          zoomLevel: constants.contentItemShowContentZoomLevel,
          content: container
        };
      } else {
        var zl = newZl;
        if (zl >= constants.contentItemThumbnailMaxLevel) {
          if (curZl >= constants.contentItemThumbnailMaxLevel && curZl < constants.contentItemShowContentZoomLevel)
            return null;
          zl = constants.contentItemThumbnailMaxLevel;
        } else if (zl <= constants.contentItemThumbnailMinLevel) {
          if (curZl <= constants.contentItemThumbnailMinLevel && curZl > 0)
            return null;
          zl = constants.contentItemThumbnailMinLevel;
        }
        var sz = 1 << zl;
        var thumbnailUri = contentItem.thumbnail || contentItem.uri;
        return {
          zoomLevel: newZl,
          content: new CanvasImage(vc, layerid, id + "@" + 1, thumbnailUri, vx, vy, vw, vh)
        };
      }
    };
  }
}

/*  An Infodot element that can be added to a VirtualCanvas.
@param layerid   (any type) id of the layer for this element
@param id   (any type) id of an element
@param vx   (number) x of left top corner in virtual space
@param vy   (number) y of left top corner in virtual space
@param vw   (number) width of a bounding box in virtual space
@param vh   (number) height of a bounding box in virtual space
@param infodotDescription  ({title})
*/
class CanvasInfodot extends CanvasCircle {
  constructor(vc, layerid, id, time, vyc, radv, contentItems, infodotDescription) {
    super(vc, layerid, id, time, vyc, radv, {
      strokeStyle: constants.infoDotBorderColor,
      lineWidth: constants.infoDotBorderWidth * radv,
      fillStyle: constants.infoDotFillColor,
      isLineWidthVirtual: true,
      showCirca: infodotDescription.isCirca
    });

    this.guid = infodotDescription.guid;
    this.type = 'infodot';

    this.isBuffered = infodotDescription.isBuffered;
    this.contentItems = contentItems;
    this.hasContentItems = false;
    this.infodotDescription = infodotDescription;
    this.title = infodotDescription.title;
    this.isCirca = infodotDescription.isCirca;
    this.offsetY = infodotDescription.offsetY;
    this.opacity = typeof infodotDescription.opacity !== 'undefined' ? infodotDescription.opacity : 1;

    contentItems.sort(function (a, b) {
      if (typeof a.order !== 'undefined' && typeof b.order === 'undefined')
        return -1;
      else if (typeof a.order === 'undefined' && typeof b.order !== 'undefined')
        return 1;
      else if (typeof a.order === 'undefined' && typeof b.order === 'undefined')
        return 0;
      else if (a.order < b.order)
        return -1;
      else if (a.order > b.order)
        return 1;

      else
        return 0;
    });

    for (var i = 0; i < contentItems.length; i++) {
      contentItems[i].order = i;
    }

    var vyc = this.newY + radv;
    var innerRad = radv - constants.infoDotHoveredBorderWidth * radv;
    this.outerRad = radv;

    this.reactsOnMouse = true;

    this.tooltipEnabled = true; // indicates whether tooltip is enabled for this infodot at this moment or not
    this.tooltipIsShown = false; // indicates whether tooltip is shown or not

    this.onmousehover = function (pv, e) {
      this.vc.currentlyHoveredInfodot = this;
      this.vc.requestInvalidate();
    };

    this.onmouseclick = function () {
      return zoomToElementHandler(this, 1.0);
    };

    this.onmouseenter = function (e) {
      this.settings.strokeStyle = constants.infoDotHoveredBorderColor;
      this.settings.lineWidth = constants.infoDotHoveredBorderWidth * radv;
      this.vc.requestInvalidate();

      // clear tooltipIsShown flag for currently hovered timeline
      // it can be null because of mouse events sequence: mouseenter for infodot -> mousehover for timeline -> mouseunhover for timeline
      if (this.vc.currentlyHoveredTimeline != null) {
        // stop active tooltip fadein animation and hide tooltip
        this.vc.hideTooltip();
        this.vc.currentlyHoveredTimeline.tooltipIsShown = false;
      }

      const tooltip = $('.vc-tooltip');

      tooltip.find('span').text(infodotDescription.title);

      this.panelWidth = tooltip.outerWidth(); // complete width of tooltip panel
      this.panelHeight = tooltip.outerHeight(); // complete height of tooltip panel

      this.vc.tooltipMode = 'infodot';

      if (this.tooltipEnabled && !this.tooltipIsShown) {
        this.tooltipIsShown = true;
        tooltip.addClass('visible');
      }

      this.vc.cursorPosition = time;
      this.vc.currentlyHoveredInfodot = this;
      this.vc.setConstraintsByInfodotHover(this);
      this.vc.raiseCursorChanged();
    };

    this.onmouseleave = function (e) {
      this.isMouseIn = false;
      this.settings.strokeStyle = constants.infoDotBorderColor;
      this.settings.lineWidth = constants.infoDotBorderWidth * radv;
      this.vc.requestInvalidate();

      if (this.tooltipIsShown)
        this.vc.hideTooltip();

      this.tooltipIsShown = false;
      this.vc.tooltipMode = 'default';

      this.vc.currentlyHoveredInfodot = undefined;
      this.vc.setConstraintsByInfodotHover(undefined);
      this.vc.raiseCursorChanged();
    };

    this.onmouseclick = function () {
      return zoomToElementHandler(this, 1.0);
    };

    // Building dynamic LOD content
    var root = new CanvasDynamicLOD(vc, layerid, id + "_dlod", time - innerRad, vyc - innerRad, 2 * innerRad, 2 * innerRad);
    root.removeWhenInvisible = true;
    addChild(this, root, false);

    root.firstLoad = true;
    root.changeZoomLevel = function (curZl, newZl) {
      var vyc = this.newY + radv;

      // Showing only thumbnails for every content item of the infodot
      if (newZl >= constants.infodotShowContentThumbZoomLevel && newZl < constants.infodotShowContentZoomLevel) {
        if (curZl >= constants.infodotShowContentThumbZoomLevel && curZl < constants.infodotShowContentZoomLevel)
          return null;

        // Tooltip is enabled now.
        this.tooltipEnabled = true;

        var contentItem = null;
        if (contentItems.length > 0) {
          contentItem = new ContainerElement(vc, layerid, id + "__contentItems", root.x, root.newY, 2 * innerRad, 2 * innerRad);
          var items = buildVcContentItems(contentItems, time, vyc, innerRad, vc, layerid);
          if (items)
            for (var i = 0; i < items.length; i++)
              addChild(contentItem, items[i], false);
        }

        if (contentItem) {
          this.hasContentItems = true;
          return {
            zoomLevel: newZl,
            content: contentItem
          };
        }
        else
          return null;
      } else if (newZl >= constants.infodotShowContentZoomLevel) {
        if (curZl >= constants.infodotShowContentZoomLevel)
          return null;

        // Tooltip is disabled now.
        this.tooltipEnabled = false;

        // stop active fadein animation and hide tooltip
        if (this.tooltipIsShown == true) {
          this.vc.hideTooltip();
          this.tooltipIsShown = false;
        }

        var contentItem = null;

        if (contentItems.length > 0) {
          contentItem = new ContainerElement(vc, layerid, id + "__contentItems", root.x, root.y, 2 * innerRad, 2 * innerRad);
          var items = buildVcContentItems(contentItems, time, vyc, innerRad, vc, layerid);
          if (items)
            for (var i = 0; i < items.length; i++)
              addChild(contentItem, items[i], false);
        }
        if (contentItem == null)
          return null;

        var titleWidth = constants.infodotTitleWidth * radv * 2;
        var titleHeight = constants.infodotTitleHeight * radv * 2;
        var centralSquareSize = (270 / 2 + 5) / 450 * 2 * radv;
        var titleTop = vyc - centralSquareSize - titleHeight;
        var title = '';

        if (infodotDescription && infodotDescription.title && infodotDescription.date) {
          var exhibitDate = dates.convertCoordinateToYear(infodotDescription.date);
          if ((exhibitDate.regime == "CE") || (exhibitDate.regime == "BCE")) {
            var date_number = Number(infodotDescription.date);
            var exhibitDate = dates.convertCoordinateToYear(date_number);
            var exhibitYMD = dates.getYMDFromCoordinate(date_number);
            date_number = Math.abs(date_number);
            if (date_number == Math.floor(date_number)) {
              title = infodotDescription.title + '\n(' + parseFloat((date_number).toFixed(2)) + ' ' + exhibitDate.regime + ')';
            } else {
              title = infodotDescription.title + '\n(' + exhibitYMD.year + "." + (exhibitYMD.month + 1) + "." + exhibitYMD.day + ' ' + exhibitDate.regime + ')';
            }
          } else {
            // Format year title with fixed precision
            title = infodotDescription.title + '\n(' + parseFloat(exhibitDate.year.toFixed(2)) + ' ' + exhibitDate.regime + ')';
          }
        }

        var infodotTitle = addText(contentItem, layerid, id + "__title", time - titleWidth / 2, titleTop, titleTop, titleHeight, title, {
          fontName: constants.contentItemHeaderFontName,
          fillStyle: constants.contentItemHeaderFontColor,
          textBaseline: 'middle',
          textAlign: 'center',
          opacity: 1,
          wrapText: true,
          numberOfLines: 2
        }, titleWidth);

        var imageSize = (titleTop - this.y) * 0.75;

        if (contentItem) {
          this.hasContentItems = true;
          return {
            zoomLevel: newZl,
            content: contentItem
          };
        }
      } else {
        // Tooltip is enabled now.
        this.tooltipEnabled = true;

        this.hasContentItems = false;
        if (contentItems.length == 0)
          return null;

        var zl = newZl;

        if (zl <= constants.contentItemThumbnailMinLevel) {
          if (curZl <= constants.contentItemThumbnailMinLevel && curZl > 0)
            return null;
        }
        if (zl >= constants.contentItemThumbnailMaxLevel) {
          if (curZl >= constants.contentItemThumbnailMaxLevel && curZl < constants.infodotShowContentZoomLevel)
            return null;
          zl = constants.contentItemThumbnailMaxLevel;
        }
        if (zl < constants.contentItemThumbnailMinLevel) {
          return {
            zoomLevel: zl,
            content: new ContainerElement(vc, layerid, id + "__empty", time, vyc, 0, 0)
          };
        }
        var contentItem = contentItems[0];
        var sz = 1 << zl;
        var thumbnailUri = contentItem.uri;
        var l = innerRad * 260 / 225;
        return {
          zoomLevel: zl,
          content: new CanvasImage(vc, layerid, id + "@" + zl, thumbnailUri, time - l / 2.0, vyc - l / 2.0, l, l)
        };
      }
    };

    // Applying Jessica's proportions
    var _rad = 450.0 / 2.0;
    var k = 1.0 / _rad;
    var _wc = (252.0 + 0) * k;
    var _hc = (262.0 + 0) * k;
    var strokeWidth = 3 * k * radv;
    var strokeLength = 24.0 * k * radv;
    var xlt0 = -_wc / 2 * radv + time;
    var ylt0 = -_hc / 2 * radv + vyc;
    var xlt1 = _wc / 2 * radv + time;
    var ylt1 = _hc / 2 * radv + vyc;

    /* Renders an infodot.
    @param ctx              (context2d) Canvas context2d to render on.
    @param visibleBox_v     ({Left,Right,Top,Bottom}) describes visible region in the virtual space
    @param viewport2d       (Viewport2d) current viewport
    @param size_p           ({x,y}) size of bounding box of this element in pixels
    @remarks The method is implemented for each particular VirtualCanvas element.
    */
    this.render = function (ctx, visibleBox, viewport2d, size_p, opacity) {
      this.prototype.render.call(this, ctx, visibleBox, viewport2d, size_p, opacity); // rendering the circle

      var sw = viewport2d.widthVirtualToScreen(strokeWidth);
      if (sw < 0.5)
        return;

      var vyc = this.y + radv;
      var xlt0 = -_wc / 2 * radv + time;
      var ylt0 = -_hc / 2 * radv + vyc;
      var xlt1 = _wc / 2 * radv + time;
      var ylt1 = _hc / 2 * radv + vyc;

      var rad = this.width / 2.0;
      var xc = this.x + rad;
      var yc = this.y + rad;
      var radp = size_p.x / 2.0;

      var sl = viewport2d.widthVirtualToScreen(strokeLength);
      var pl0 = viewport2d.pointVirtualToScreen(xlt0, ylt0);
      var pl1 = viewport2d.pointVirtualToScreen(xlt1, ylt1);

      ctx.lineWidth = sw;
      ctx.strokeStyle = constants.contentItemBoundingBoxFillColor;
    };

    /* Checks whether the given point (virtual) is inside the object
    (should take into account the shape) */
    this.isInside = function (point_v) {
      var len2 = utils.sqr(point_v.x - this.x - (this.width / 2)) + utils.sqr(point_v.y - this.y - (this.height / 2));
      var rad = this.width / 2.0;
      return len2 <= rad * rad;
    };

    this.prototype = new CanvasCircle(vc, layerid, id, time, vyc, radv, {
      strokeStyle: constants.infoDotBorderColor,
      lineWidth: constants.infoDotBorderWidth * radv,
      fillStyle: constants.infoDotFillColor,
      isLineWidthVirtual: true
    });
  }
}
