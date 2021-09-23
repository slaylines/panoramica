const $ = require('jquery');
window.jQuery = $;
require('jquery-ui');

import * as constants from './constants';
import * as utils from './utils';

import { VisibleRegion2d, Viewport2d } from './viewport';
import { CanvasRootElement } from './vccontent';
import Layout from './layout';

/*
  Defines a Virtual Canvas widget (based on jQuery ui).
  @remarks The widget renders different objects defined in a virtual space within a <div> element.
  The widget allows to update current visible region, i.e. perform panning and zooming.

  Technically, the widget uses a <canvas> element to render most types of objects; some of elements
  can be positioned using CSS on a top of the canvas.

  The widget is split into layers, each layer corresponds to a <div> within a root <div> element.
  Next <div> is rendered on the top of previous one.
*/

export default function VirtualCanvas() {
  $.widget('ui.virtualCanvas', {
    // Root element of the widget content. Element of type CanvasItemsRoot.
    layersContent: undefined,

    // Array layer div elements
    layers: [],

    options: {
      aspectRatio: 1,
      visible: {
        centerX: 0,
        centerY: 0,
        scale: 1
      }
    },

    _create: function () {
      this.element.addClass('vc-canvas');

      const size = this.getClientSize();

      this.lastEvent = null;

      this.canvasWidth = null;
      this.canvasHeight = null;

      this.requestNewFrame = false;
      this.tooltipMode = 'default';

      this.cursorPositionChangedEvent = $.Event('cursorPositionChanged');
      this.breadCrumbsChangedEvent = $.Event('breadCrumbsChanged');
      this.innerZoomConstraintChangedEvent = $.Event('innerZoomConstraintChanged');

      this.currentlyHoveredInfodot = undefined;
      this.breadCrumbs = [];
      this.recentBreadCrumb = {
        vcElement: { title: 'initObject' },
      };

      this.cursorPosition = 0.0;

      this.topCloak = $('.root-cloak-top');
      this.rightCloak = $('.root-cloak-right');
      this.bottomCloak = $('.root-cloak-bottom');
      this.leftCloak = $('.root-cloak-left');

      this.showCloak = false;

      this.element.children('div').each((index, div) => {
        const $div = $(div);

        $div.addClass('vc-layer-div unselectable').css('z-index', index * 3);

        const layerCanvasJq = $('<canvas></canvas>')
          .appendTo($div)
          .addClass('vc-layer-canvas')
          .css('z-index', index * 3 + 1);

        const ctx = layerCanvasJq[0].getContext('2d');
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

        this.layers.push($div);
      });

      this.layout = null;

      this.layersContent = new CanvasRootElement(
        this, undefined, '__root__',
        -Infinity, -Infinity, Infinity, Infinity
      );

      this.options.visible = new VisibleRegion2d(0, 0, 1);
      this.updateViewport();

      this.element.bind(`mousemove.${this.widgetName}`, event => {
        this.mouseMove(event);
      });

      this.element.bind(`mousedown.${this.widgetName}`, event => {
        if (event.which === 1) { this.mouseDown(event); }
      });

      this.element.bind(`mouseup.${this.widgetName}`, event => {
        if (event.which === 1) { this.mouseUp(event); }
      });

      this.element.bind(`mouseleave.${this.widgetName}`, event => {
        this.mouseLeave(event);
      });
    },

    _destroy: function () {
      this.element.removeClass('vc-canvas');
      this.element.children('.vc-layer-div').each((index) => {
        $(this).removeClass(['vc-layer-div', 'unselectable']);
        $(this).remove('.vc-layer-canvas');
      });
      this.element.unbind(`.${this.widgetName}`);
      this.layers = undefined;
      this.layersContent = undefined;

      return this;
    },

    mouseDown: function (event) {
      const origin = utils.getXBrowserMouseOrigin(this.element, event);

      this.lastClickPosition = { x: origin.x, y: origin.y };
    },

    mouseUp: function (event) {
      const viewport = this.getViewport();
      const origin = utils.getXBrowserMouseOrigin(this.element, event);

      if (this.lastClickPosition && this.lastClickPosition.x === origin.x && this.lastClickPosition.y === origin.y) {
        this.mouseClick(event);
      }
    },

    mouseLeave: function (event) {
      if (this.currentlyHoveredContentItem && this.currentlyHoveredContentItem.onmouseleave)
        this.currentlyHoveredContentItem.onmouseleave(event);

      if (this.currentlyHoveredInfodot && this.currentlyHoveredInfodot.onmouseleave)
        this.currentlyHoveredInfodot.onmouseleave(event);

      if (this.currentlyHoveredTimeline && this.currentlyHoveredTimeline.onmouseunhover)
        this.currentlyHoveredTimeline.onmouseunhover(null, event);

      this.lastEvent = null;
    },

    mouseClick: function (event) {
      const viewport = this.getViewport();
      const origin = utils.getXBrowserMouseOrigin(this.element, event);
      const point = viewport.pointScreenToVirtual(origin.x, origin.y);

      const mouseClickNode = (contentItem, pv) => {
        const inside = contentItem.isInside(pv);

        if (!inside) return false;

        for (var i = 0; i < contentItem.children.length; i++) {
          const child = contentItem.children[i];
          if (mouseClickNode(child, point)) return true;
        }

        if (contentItem.reactsOnMouse && contentItem.onmouseclick) {
          return contentItem.onmouseclick(pv, event);
        }

        return false;
      };

      mouseClickNode(this.layersContent, point);
    },

    getHoveredTimeline: function () { return this.currentlyHoveredTimeline; },
    getHoveredInfodot: function () { return this.currentlyHoveredInfodot; },
    getCursorPosition: function () { return this.cursorPosition; },

    setConstraintsByInfodotHover: function (infodot) {
      const recentVP = this.getViewport();
      const value = infodot
        ? infodot.outerRad * constants.infoDotZoomConstraint / recentVP.width
        : null;

      this.raiseInnerZoomConstraintChanged(value);
    },

    raiseInnerZoomConstraintChanged: function (zoom) {
      this.innerZoomConstraintChangedEvent.zoomValue = zoom;
      this.element.trigger(this.innerZoomConstraintChangedEvent);
    },

    raiseCursorChanged: function () {
      this.cursorPositionChangedEvent.Time = this.cursorPosition;
      this.element.trigger(this.cursorPositionChangedEvent);
    },

    updateTooltipPosition: function (position) {
      if (this.tooltipMode !== 'infodot' && this.tooltipMode !== 'timeline') return;

      const screenPoint = this.viewport.pointVirtualToScreen(position.x, position.y);
      const offset = 20;

      const obj = this.tooltipMode == 'infodot'
        ? this.currentlyHoveredInfodot
        : this.currentlyHoveredTimeline;

      if (!obj) return;

      const tooltip = $('.vc-tooltip');
      const width = tooltip.width() + offset;
      const height = tooltip.height() + offset;

      // tooltip goes beyond right edge of canvas
      if (screenPoint.x + width > this.canvasWidth) {
        screenPoint.x = this.canvasWidth - width;
      }

      // tooltip goes beyond bottom edge of canvas
      if (screenPoint.y + height > this.canvasHeight) {
        screenPoint.y = this.canvasHeight - height;
      }

      // Update tooltip position.
      tooltip.css({ top: screenPoint.y, left: screenPoint.x });
    },

    mouseMove: function (event) {
      const viewport = this.getViewport();
      const origin = utils.getXBrowserMouseOrigin(this.element, event, true);
      const position = viewport.pointScreenToVirtual(origin.x, origin.y);

      // triggers an event that handles current mouse position
      if (!this.currentlyHoveredInfodot || !this.currentlyHoveredTimeline) {
        this.cursorPosition = position.x;
        this.raiseCursorChanged();
      }

      const mouseInStack = [];

      const mouseMoveNode = (contentItem, forceOutside, pointVS) => {
        // leave if outside and previously mouse was inside content item
        if (forceOutside && contentItem.reactsOnMouse && contentItem.isMouseIn && contentItem.onmouseleave) {
          contentItem.onmouseleave(pointVS, event);
          contentItem.isMouseIn = false;
        } else {
          const inside = contentItem.isInside(pointVS);

          forceOutside = !inside;

          if (contentItem.reactsOnMouse) {
            if (inside) {
              if (contentItem.isMouseIn) {
                if (contentItem.onmousemove) contentItem.onmousemove(pointVS, event);
                if (contentItem.onmousehover) mouseInStack.push(contentItem);
              } else {
                contentItem.isMouseIn = true;
                if (contentItem.onmouseenter) contentItem.onmouseenter(pointVS, event);
              }
            } else {
              if (contentItem.isMouseIn) {
                contentItem.isMouseIn = false;
                if (contentItem.onmouseleave) contentItem.onmouseleave(pointVS, event);
              } else {
                if (contentItem.onmousemove) contentItem.onmousemove(pointVS, event);
              }
            }
          }
          contentItem.isMouseIn = inside;
        }

        contentItem.children.forEach(child => {
          if (!forceOutside || child.isMouseIn) {
             // call mouseleave or do nothing within that branch of the tree.
            mouseMoveNode(child, forceOutside, pointVS);
          }
        });
      };

      // Start handling the event from root element
      mouseMoveNode(this.layersContent, false, position);

      // Notifying the deepest timeline which has mouse hover
      if (!mouseInStack.length && this.hovered && this.hovered.onmouseunhover) {
        this.hovered.onmouseunhover(position, event);
        this.hovered = null;
      }

      for (let n = mouseInStack.length; --n >= 0;) {
        if (mouseInStack[n].onmousehover) {
          mouseInStack[n].onmousehover(position, event);

          if (this.hovered && this.hovered !== mouseInStack[n] && this.hovered.onmouseunhover)
            if (!this.currentlyHoveredInfodot || (this.currentlyHoveredInfodot && this.currentlyHoveredInfodot.parent && this.currentlyHoveredInfodot.parent !== this.hovered))
              this.hovered.onmouseunhover(position, event);
          if (this.currentlyHoveredContentItem) this.hovered = this.currentlyHoveredContentItem;
          else this.hovered = mouseInStack[n];
          break;
        }
      }

      // update tooltip for currently tooltiped infodot or timeline if tooltip is enabled for this infodot or timeline
      if ((this.currentlyHoveredInfodot && this.currentlyHoveredInfodot.tooltipEnabled) || (this.currentlyHoveredTimeline && this.currentlyHoveredTimeline.tooltipEnabled && this.tooltipMode !== 'infodot')) {
        let obj = null;

        if (this.tooltipMode === 'infodot') obj = this.currentlyHoveredInfodot;
        else if (this.tooltipMode === 'timeline') obj = this.currentlyHoveredTimeline;

        if (obj && !obj.tooltipIsShown) {
          obj.tooltipIsShown = true;
          $('.vc-tooltip').addClass('visible');
        }

        this.updateTooltipPosition(position);
      }

      this.lastEvent = event;
    },

    setLayout: function (layout) { this.layout = layout; },

    getLastEvent: function () { return this.lastEvent; },
    getLayerContent: function () { return this.layersContent; },

    // Recursively finds and returns an element with given id.
    findElement: function (id) {
      const find = (el, id) => {
        if (el.id === id) return el;
        if (!el.children) return null;

        return el.children.find(c => (c.id === id || find(c, id)));
      };

      return find(this.layersContent, id);
    },

    // Recursively iterates over all elements.
    forEachElement: function (callback) {
      const find = (el, callback) => {
        callback(el);

        if (!el.children) return;

        el.children.forEach(child => {
          find(child, callback);
        });
      };

      return find(this.layersContent, callback);
    },

    // Produces { Left,Right,Top,Bottom } object which corresponds to visible region in virtual space, using current viewport.
    visibleToViewBox: function (visible) {
      const view = this.getViewport();
      const width = view.widthScreenToVirtual(view.width);
      const height = view.heightScreenToVirtual(view.height);

      const x = visible.centerX - width / 2;
      const y = visible.centerY - height / 2;

      return { Left: x, Right: x + width, Top: y, Bottom: y + height };
    },

    /*
      Updates and renders a visible region in virtual space that corresponds to a physical window.
      @param newVisible   (VisibleRegion2d) New visible region.
      @remarks Rebuilds the current viewport.
    */
    setVisible: function (newVisible, isInAnimation) {
      delete this.viewport;
      this.options.visible = newVisible;
      this.isInAnimation = isInAnimation && isInAnimation.isActive;

      const visibleViewbox = this.visibleToViewBox(newVisible);
      const viewport = this.getViewport();

      this.renderCanvas(this.layersContent, visibleViewbox, viewport);
    },

    /*
      Update viewport's physical width and height in correspondence with the <div> element.
      @remarks The method should be called when the <div> element, which hosts the virtual canvas, resizes.
      It sets width and height attributes of layers' <div> and <canvas> to width and height of the widget's <div>, and
      then updates visible region and (render)s the content.
    */
    updateViewport: function () {
      const { width, height } = this.getClientSize();
      const { length } = this.layers;

      this.layers.forEach(layer => {
        layer.width(width).height(height);

        const canvas = layer.children('.vc-layer-canvas').first()[0];

        if (canvas) {
          // CTX увеличивается в 2 раза, чтобы избежать размытия линий
          // Размер канваса равен контейнеру, размер ctx в 2 раза больше
          // Все параметры всех элементов умножаются на 2
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;

          const ctx = canvas.getContext('2d');

          ctx.canvas.width = width * window.devicePixelRatio;
          ctx.canvas.height = height * window.devicePixelRatio;
        }
      });

      this.canvasWidth = this.element[0].clientWidth;
      this.canvasHeight = this.element[0].clientHeight;

      this.setVisible(this.options.visible);
    },

    getClientSize: function () {
      return {
        width: this.element[0].clientWidth,
        height: this.element[0].clientHeight,
      };
    },

    /*
      Gets current viewport.
      @remarks The widget caches viewport as this.viewport property and rebuilds it only when it is invalidated, i.e. this.viewport=undefined.
      Viewport is currently invalidated by setVisible and updateViewport methods.
    */
    getViewport: function () {
      if (!this.viewport) {
        const { width, height } = this.getClientSize();
        const { aspectRatio, visible } = this.options;

        this.viewport = new Viewport2d(aspectRatio, width, height, visible);
      }

      return this.viewport;
    },

    /*
      Renders elements tree on all layers' canvases.
      @param elementsRoot     (CanvasItemsRoot) Root of widget's elements tree
      @param visibleBox       ({Left,Right,Top,Bottom}) describes visible region in virtual space
      @param viewport         (Viewport2d) current viewport
    */
    renderCanvas: function (elementsRoot, visibleBox, viewport) {
      if (!this.layers.length) return;

      const contexts = this.layers.reduce((res, layer) => {
        const canvas = layer.children('.vc-layer-canvas').first()[0];
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, viewport.width * 2, viewport.height * 2);
        res[layer[0].id] = ctx;

        return res;
      }, {});

      elementsRoot.render(contexts, visibleBox, viewport);

      this.updateCloakPosition(viewport);
    },

    // Renders the virtual canvas content.
    invalidate: function () {
      const viewbox = this.visibleToViewBox(this.options.visible);
      const viewport = this.getViewport();
      this.renderCanvas(this.layersContent, viewbox, viewport);
    },

    // Fires the trigger that currently observed (the visible region is inside this timeline) timeline is changed
    breadCrumbsChanged: function () {
      this.breadCrumbsChangedEvent.breadCrumbs = this.breadCrumbs;
      this.element.trigger(this.breadCrumbsChangedEvent);
    },

    // If virtual canvas is during animation now, the method does nothing;
    // otherwise, it sets the timeout to invalidate the image.
    requestInvalidate: function () {
      this.requestNewFrame = false;

      // update parameters of animating elements and require new frame if needed
      if (!this.layout.animatingElements.length) {
        for (let id in this.layout.animatingElements)
          if (this.layout.animatingElements[id].animation && this.layout.animatingElements[id].animation.isAnimating) {
            this.layout.animatingElements[id].calculateNewFrame();
            this.requestNewFrame = true;
          }
      }

      if (this.isInAnimation) return;

      this.isInAnimation = true;

      setTimeout(() => {
        this.isInAnimation = false;
        this.invalidate();

        if (this.requestNewFrame) this.requestInvalidate();
      }, 1000 / constants.targetFps);
    },

    // Finds the LCA(Lowest Common Ancestor) timeline which contains wnd
    findLca: function (wnd) {
      const rootTimeline = this.layersContent.children[0];

      const eps = 1;
      const cosmosLeft = rootTimeline.x + eps;
      const cosmosRight = rootTimeline.x + rootTimeline.width - eps;
      const cosmosTop = rootTimeline.y + eps;
      const cosmosBottom = rootTimeline.y + rootTimeline.height - eps;

      wnd.left = Math.max(cosmosLeft, Math.min(cosmosRight, wnd.x));
      wnd.right = Math.max(cosmosLeft, Math.min(cosmosRight, wnd.x + wnd.width));
      wnd.top = Math.max(cosmosTop, Math.min(cosmosBottom, wnd.y));
      wnd.bottom = Math.max(cosmosTop, Math.min(cosmosBottom, wnd.y + wnd.height));

      wnd.x = wnd.left;
      wnd.y = wnd.top;

      wnd.width = Math.max(0, wnd.right - wnd.left);
      wnd.height = Math.max(0, wnd.bottom - wnd.top);

      const find = (tl, wnd) => {
        for (let i = 0; i < tl.children.length; i++) {
          if (tl.children[i].type === 'timeline' && tl.children[i].contains(wnd)) {
            return find(tl.children[i], wnd);
          }
        }
        return tl;
      };

      return find(rootTimeline, wnd);
    },

    // Checks if we have all the data to render wnd at scale
    inBuffer: function (wnd, scale) {
      const rootTimeline = this.layersContent.children[0];

      const cosmosLeft = rootTimeline.x;
      const cosmosRight = rootTimeline.x + rootTimeline.width;
      const cosmosTop = rootTimeline.y;
      const cosmosBottom = rootTimeline.y + rootTimeline.height;

      wnd.left = Math.max(cosmosLeft, Math.min(cosmosRight, wnd.x));
      wnd.right = Math.max(cosmosLeft, Math.min(cosmosRight, wnd.x + wnd.width));
      wnd.top = Math.max(cosmosTop, Math.min(cosmosBottom, wnd.y));
      wnd.bottom = Math.max(cosmosTop, Math.min(cosmosBottom, wnd.y + wnd.height));

      wnd.x = wnd.left;
      wnd.y = wnd.top;

      wnd.width = Math.max(0, wnd.right - wnd.left);
      wnd.height = Math.max(0, wnd.bottom - wnd.top);

      const find = (tl, wnd, scale) => {
        if (tl.intersects(wnd) && tl.isVisibleOnScreen(scale)) {
          if (!tl.isBuffered) {
            return false;
          } else {
            let b = true;

            for (var i = 0; i < tl.children.length; i++) {
              if (tl.children[i].type === 'timeline')
                b = b && find(tl.children[i], wnd, scale);
            }
            return b;
          }
        }
        return true;
      };

      return find(rootTimeline, wnd, scale);
    },

    // Shows top, right, bottom & left cloaks that hide empty space between root timeline's borders and canvas edges.
    cloakNonRootVirtualSpace: function () {
      this.showCloak = true;

      const viewport = this.getViewport();

      this.updateCloakPosition(viewport);

      this.topCloak.addClass('visible');
      this.rightCloak.addClass('visible');
      this.bottomCloak.addClass('visible');
      this.leftCloak.addClass('visible');
    },

    // Hides top, right, bottom & left cloaks that hide empty space between root timeline's borders and canvas edges.
    showNonRootVirtualSpace: function () {
      this.showCloak = false;

      this.topCloak.removeClass('visible');
      this.rightCloak.removeClass('visible');
      this.bottomCloak.removeClass('visible');
      this.leftCloak.removeClass('visible');
    },

    // Updates width and height of top, right, bottom & left cloaks that hide empty space between root timeline's borders and canvas edges.
    updateCloakPosition: function (viewport) {
      if (!this.showCloak) return;

      const rootTimeline = this.layersContent.children[0];

      let top = rootTimeline.y;
      let right = rootTimeline.x + rootTimeline.width;
      let bottom = rootTimeline.y + rootTimeline.height;
      let left = rootTimeline.x;

      top = Math.max(0, viewport.pointVirtualToScreen(0, top).y);
      right = Math.max(0, viewport.pointVirtualToScreen(right, 0).x);
      bottom = Math.max(0, viewport.pointVirtualToScreen(0, bottom).y);
      left = Math.max(0, viewport.pointVirtualToScreen(left, 0).x);

      this.rightCloak.css('width', `${Math.max(0, viewport.width - right)}px`);
      this.leftCloak.css('width', `${left}px`);

      this.topCloak.css('left', `${left}px`);
      this.topCloak.css('right', `${Math.max(0, viewport.width - right)}px`);
      this.topCloak.css('height', `${top}px`);

      this.bottomCloak.css('left', `${left}px`);
      this.bottomCloak.css('right', `${Math.max(0, viewport.width - right)}px`);
      this.bottomCloak.css('height', `${Math.max(0, viewport.height - bottom)}px`);
    },

    hideTooltip: function () {
      $('.vc-tooltip').removeClass('visible');
    },
  });
}
