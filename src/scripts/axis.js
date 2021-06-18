import $ from 'jquery';
import * as constants from './constants';
import * as dates from './dates';
import * as utils from './utils';

export default class Axis {
  constructor(container) {
    // Input parameter must be jQuery object, DIV element or ID. Convert it to jQuery object.
    if (!container) {
      throw 'Container parameter is undefined';
    }
    if (container.tagName !== undefined && container.tagName.toLowerCase() === 'div') {
      container = $(container);
    } else if (typeof (container) === 'string') {
      container = $(`#${container}`);
      if (container.length === 0 || !container.is('div')) {
        throw 'There are no DIV elements with such ID';
      }
    } else if (!(container instanceof $ && container.is('div'))) {
      throw 'Container parameter is invalid! It should be DIV, or ID of DIV, or jQuery instance of DIV';
    }

    let mouse_clicked = false;
    let mouse_hovered = false;

    const parent = container.parent();

    parent.mouseup(e => {
      mouse_clicked = false;
    });
    parent.mousedown(e => {
      mouse_clicked = true;
    });
    parent.mousemove(e => {
      mouse_hovered = true;
      this.mouseMove(e);
    });
    parent.mouseleave(e => {
      mouse_hovered = false;
      mouse_clicked = false;
    });

    this.container = container;
    this.range = { min: 0, max: 1 };
    this.ticks = [];
    this.ticksInfo = [];
    this.mode = 'cosmos';
    this.position = 'top';
    
    this.deltaRange;
    this.size;
    this.width;
    this.height;
    this.canvasHeight;
    this.markerPosition;

    this.tickSources = {
      cosmos: new CosmosTickSource(),
      calendar: new CalendarTickSource(),
      date: new DateTickSource()
    };

    this.isHorizontal = this.position === 'bottom' || this.position === 'top';
    this.canvas = $('<canvas></canvas>');
    this.labelsDiv = $('<div></div>');

    this.container.addClass(['cz-timescale', 'unselectable']);
    this.labelsDiv.addClass('cz-timescale-labels-container');

    let marker = $("<div id='timescale_marker' class='cz-timescale-marker'></div>");
    let markerText = $("<div id='marker-text' class='cz-timescale-marker-text'></div>");
    let markerTriangle = $("<div id='marker-triangle' class='cz-timescale-marker-triangle'></div>");

    marker[0].appendChild(markerText[0]);
    marker[0].appendChild(markerTriangle[0]);

    this.container[0].appendChild(this.labelsDiv[0]);
    this.container[0].appendChild(this.canvas[0]);
    this.container[0].appendChild(marker[0]);

    this.canvasSize = constants.tickLength + constants.timescaleThickness;
    this.canvas[0].height = this.canvasSize;

    this.textSize = -1;
    this.fontSize = 45;

    this.strokeStyle = this.container ? this.container.css('color') : 'black';

    this.ctx = this.canvas[0].getContext('2d');

    if (this.container.currentStyle) {
      this.fontSize = this.container.currentStyle['font-size'];
      this.ctx.font = this.fontSize + this.container.currentStyle['font-family'];
    } else if (document.defaultView && document.defaultView.getComputedStyle) {
      const computedStyle = document.defaultView.getComputedStyle(this.container[0], null);
      this.fontSize = computedStyle.getPropertyValue('font-size');
      this.ctx.font = this.fontSize + computedStyle.getPropertyValue('font-family');
    } else if (this.container.style) {
      this.fontSize = this.container.style['font-size'];
      this.ctx.font = this.fontSize + this.container.style['font-family'];
    }

    /*
     * Renders marker.
    */
    this.setTimeMarker = (time, vcGesture) => {
      if (typeof vcGesture === 'undefined') vcGesture = false;

      if (!mouse_clicked && (!vcGesture || (vcGesture && !mouse_hovered))) {
        if (time > constants.maxPermitedTimeRange.right) time = constants.maxPermitedTimeRange.right;
        if (time < constants.maxPermitedTimeRange.left) time = constants.maxPermitedTimeRange.left;

        const k = (this.range.max - this.range.min) / this.width;
        const point = (time - this.range.max) / k + this.width;
        const text = this.tickSources[this.mode].getMarkerLabel(this.range, time);

        this.markerPosition = point;
        markerText.text(text);
        marker.css('left', point - marker.width() / 2);
      }
    };

    /*
     * Clears container DIV.
    */
    this.destroy = () => {
      this.container[0].innerHTML = '';
      this.container.removeClass(['cz-timescale', 'unselectable']);
    };

    /*
     * Destroys timescale and removes it from parend node.
    */
    this.remove = () => {
      const parent = this.container[0].parentElement;

      if (parent) {
        parent.removeChild(this.container[0]);
      }
      this.destroy();
    };
  }

  mouseMove(e) {
    const point = utils.getXBrowserMouseOrigin(this.container, e);
    const k = (this.range.max - this.range.min) / this.width;
    const time = this.range.max - k * (this.width - point.x);

    this.setTimeMarker(time);
  }

  /*
   * Get screen coordinates of tick.
   * @param  {number} x [description]
   * @return {[type]}   [description]
  */
  getCoordinateFromTick(x) {
    const k = this.size / (this.range.max - this.range.min);

    let x1 = k * (x - this.range.min);

    if (this.range.min >= -10000) {
      const beta = Math.log(this.range.max - this.range.min) * (1 / Math.log(10));
      const firstYear = dates.getCoordinateFromYMD(0, 0, 1);

      if (beta >= 0) {
        x1 += k * firstYear;
      }
    }

    return isFinite(this.deltaRange) ? x1 : this.size / 2;
  };

  /*
   * Updates timescale size or its embedded elements' sizes.
  */
  updateSize() {
    // Updates container's children sizes if container's size is changed.
    const prevSize = this.size;

    this.width = this.container.outerWidth(true);
    this.height = this.container.outerHeight(true);

    if (this.isHorizontal) {
      this.size = this.width;
      if (this.size !== prevSize) {
        this.canvas[0].width = this.size;
        this.labelsDiv.css('width', this.size);
      }
    } else {
      this.size = this.height;
      if (this.size !== prevSize) {
        this.canvas[0].height = this.size;
        this.labelsDiv.css('height', this.size);
      }
    }

    this.deltaRange = (this.size - 1) / (this.range.max - this.range.min);
    this.canvasHeight = this.canvas[0].height;

    // Updates container's size according to text size in labels.
    if (this.isHorizontal) {
      // NOTE: No need to calculate max text size of all labels.
      this.textSize = (this.ticksInfo[0] && this.ticksInfo[0].height !== this.textSize)
        ? this.ticksInfo[0].height
        : 0;

      if (this.textSize !== 0) {
        this.canvas[0].height = this.canvasSize;
      }
    } else {
      this.textSize = (this.ticksInfo[0] && this.ticksInfo[0].width !== this.textSize)
        ? this.ticksInfo[0].width
        : 0;

      if (this.textSize !== 0) {
        this.canvas[0].width = this.canvasSize;
        this.width = this.textSize + this.canvasSize;

        this.container.css('width', this.width);
      }
    }
  }

  /*
   * Sets mode of timescale according to zoom level.
   * In different zoom levels it allows to use different
   * ticksources.
  */
  setMode() {
    if (this.range.min <= -10000) {
      this.mode = 'cosmos';
    } else {
      const beta = Math.floor(Math.log(this.range.max - this.range.min) * (1 / Math.log(10)));

      // BCE or CE years
      this.mode = beta < 0 ? 'date' : 'calendar';
    }

    this.tickSources[this.mode].hideDivs();
  }

  /*
   * Calculates and caches positions of ticks and labels' size.
  */
  getTicksInfo() {
    const { length } = this.ticks;
    const h = this.isHorizontal ? this.canvasHeight : 0;

    this.ticksInfo = new Array(length);

    for (let i = 0; i < length; i++) {
      const tick = this.ticks[i];

      if (tick.label) {
        const size = tick.label._size;
        let { width, height } = size;

        if (!width) width = this.ctx.measureText(tick.label[0].textContent).width * 1.5;
        if (!height) height = (this.isHorizontal ? h : parseFloat(this.fontSize)) + 8;

        this.ticksInfo[i] = {
          position: this.getCoordinateFromTick(tick.position),
          width: width,
          height: height,
          hasLabel: true,
        };
      } else {
        this.ticksInfo[i] = {
          position: this.getCoordinateFromTick(tick.position),
          width: 0,
          height: 0,
          hasLabel: false,
        };
      }
    }
  }

  /*
   * Adds new labels to container and apply this.styles to them.
  */
  addNewLabels() {
    for (let i = 0, len = this.ticks.length; i < len; i++) {
      const label = this.ticks[i].label;

      if (label && !label.hasClass('cz-timescale-label')) {
        const labelDiv = label[0];

        label.addClass('cz-timescale-label');
        label._size = { width: labelDiv.offsetWidth, height: labelDiv.offsetHeight };

        this.labelsDiv[0].appendChild(labelDiv);
      }
    }
  }

  /*
   * Checks whether labels are overlayed or not.
   * @return {[type]} [description]
  */
  checkLabelsArrangement() {
    let delta;
    let deltaSize;

    const length = this.ticks.length - 1;

    if (length === -1) return false;

    for (let i1 = 0, i2 = 1; i2 < length; i1 = i2, i2++) {
      while (i2 < length + 1 && !this.ticksInfo[i2].hasLabel) i2++;

      if (i2 > length) break;

      if (this.ticksInfo[i1].hasLabel) {
        delta = Math.abs(this.ticksInfo[i2].position - this.ticksInfo[i1].position);

        if (delta < constants.minTickSpace) return true;

        if (this.isHorizontal) {
          deltaSize = (this.ticksInfo[i1].width + this.ticksInfo[i2].width) / 2;

          if (i1 === 0 && (this.ticksInfo[i1].position - this.ticksInfo[i1].width / 2 < 0)) {
            deltaSize -= this.ticksInfo[i1].width / 2;
          } else if (i2 === length - 1 && (this.ticksInfo[i2].position - this.ticksInfo[i2].width / 2 > this.size)) {
            deltaSize -= this.ticksInfo[i2].width / 2;
          }
        } else {
          deltaSize = (this.ticksInfo[i1].height + this.ticksInfo[i2].height) / 2;

          if (i1 === 0 && (this.ticksInfo[i1].position - this.ticksInfo[i1].height / 2 < 0)) {
            deltaSize -= this.ticksInfo[i1].height / 2;
          } else if (i2 === length - 1 && (this.ticksInfo[i2].position - this.ticksInfo[i2].height / 2 > this.size)) {
            deltaSize -= this.ticksInfo[i2].height / 2;
          }
        }

        if (delta - deltaSize < constants.minLabelSpace) return true;
      }
    }

    return false;
  }

  /*
   * Updates collection of major ticks.
   * Iteratively insert new ticks and stops when ticks are overlayed.
   * Or decrease number of ticks until ticks are not overlayed.
  */
  updateMajorTicks() {
    // Get ticks from current ticksource.
    this.ticks = this.tickSources[this.mode].getTicks(this.range);

    // Adjust number of labels and ticks in timescale.
    this.addNewLabels();
    this.getTicksInfo();

    if (this.checkLabelsArrangement()) {
      for (let i = 0; i < constants.maxTickArrangeIterations; ++i) {
        this.ticks = this.tickSources[this.mode].decreaseTickCount();
        this.addNewLabels();
        this.getTicksInfo();

        if (!this.checkLabelsArrangement())
          break;
      }
    } else {
      for (let i = 0; i < constants.maxTickArrangeIterations; ++i) {
        this.ticks = this.tickSources[this.mode].increaseTickCount();
        this.addNewLabels();
        this.getTicksInfo();

        // There is no more space to insert new ticks. Decrease number of ticks.
        if (this.checkLabelsArrangement()) {
          this.ticks = this.tickSources[this.mode].decreaseTickCount();
          this.getTicksInfo();
          this.addNewLabels();
          break;
        }
      }
    }
  }

  /*
   * Render base line of timescale.
  */
  renderBaseLine() {
    if (this.position === 'bottom') {
      this.ctx.fillRect(0, 0, this.size, constants.timescaleThickness);
    } else if (this.position === 'top') {
      this.ctx.fillRect(0, constants.tickLength, this.size, constants.timescaleThickness);
    } else if (this.position === 'right') {
      this.ctx.fillRect(0, 0, constants.timescaleThickness, this.size);
    } else if (this.position === 'left') {
      this.ctx.fillRect(constants.tickLength, 0, constants.timescaleThickness, this.size);
    }
  }

  /*
   * Renders ticks and labels. If range is a single point then renders
   * only label in the middle of timescale.
  */
  renderMajorTicks() {
    this.ctx.beginPath();

    for (let i = 0, len = this.ticks.length; i < len; i++) {
      const position = this.ticksInfo[i].position;

      if (this.isHorizontal) {
        let shift = this.ticksInfo[i].width / 2;

        if (i === 0 && position < shift) {
          shift = 0;
        } else if (i === len - 1 && position + shift > this.size) {
          shift *= 2;
        }

        this.ctx.moveTo(position, 1);
        this.ctx.lineTo(position, 1 + constants.tickLength);

        if (this.ticks[i].label) {
          this.ticks[i].label.css('left', position - shift);
        }
      } else {
        position = (this.size - 1) - position;
        shift = this.ticksInfo[i].height / 2;

        if (i === 0 && position + shift > this.size) {
          shift *= 2;
        } else if (i === len - 1 && position < shift) {
          shift = 0;
        }

        this.ctx.moveTo(1, position);
        this.ctx.lineTo(1 + constants.tickLength, position);

        if (this.ticks[i].label) {
          this.ticks[i].label.css('top', position - shift);
          if (this.position == 'left') {
            this.ticks[i].label.css(
              'left',
              this.textSize - (this.rotateLabels ? this.ticksInfo[i].height : this.ticksInfo[i].width)
            );
          }
        }
      }
    }

    this.ctx.stroke();
    this.ctx.closePath();
  }

  /*
   * Gets and renders small ticks between major ticks.
  */
  renderSmallTicks() {
    const smallTicks = this.tickSources[this.mode].getSmallTicks(this.ticks);

    let minDelta;
    let i;
    let length;
    let coord;

    this.ctx.beginPath();

    if (smallTicks && smallTicks.length > 0) {
      // check for enough space
      minDelta = Math.abs(this.getCoordinateFromTick(smallTicks[1]) - this.getCoordinateFromTick(smallTicks[0]));
      length = smallTicks.length;

      for (i = 1; i < length - 1; i++) {
        minDelta = Math.min(
          minDelta,
          Math.abs(this.getCoordinateFromTick(smallTicks[i + 1]) - this.getCoordinateFromTick(smallTicks[i]))
        );
      }

      if (minDelta >= constants.minSmallTickSpace) {
        switch (this.position) {
          case 'bottom':
            for (i = 0; i < length; i++) {
              coord = this.getCoordinateFromTick(smallTicks[i]);
              this.ctx.moveTo(coord, 1);
              this.ctx.lineTo(coord, 1 + constants.smallTickLength);
            }
            break;
          case 'top':
            for (i = 0; i < length; i++) {
              coord = this.getCoordinateFromTick(smallTicks[i]);
              this.ctx.moveTo(coord, constants.tickLength - constants.smallTickLength);
              this.ctx.lineTo(coord, 1 + constants.tickLength);
            }
            break;
          case 'left':
            for (i = 0; i < length; i++) {
              coord = this.getCoordinateFromTick(smallTicks[i]);
              this.ctx.moveTo(constants.tickLength - constants.smallTickLength, this.size - coord - 1);
              this.ctx.lineTo(constants.tickLength, this.size - coord - 1);
            }
            break;
          case 'right':
            for (i = 0; i < length; i++) {
              coord = this.getCoordinateFromTick(smallTicks[i]);
              this.ctx.moveTo(1, this.size - coord - 1);
              this.ctx.lineTo(1 + constants.smallTickLength, this.size - coord - 1);
            }
            break;
        }
      }
    }

    this.ctx.stroke();
    this.ctx.closePath();
  }

  /*
   * Rerender timescale with new ticks.
   * @param  {object} range { min, max } values of new range.
  */
  update(range) {
    this.range = range;
    this.render();
  }

  /*
   * Main function for timescale rendering.
   * Updates timescale's visual state.
  */
  render() {
    // Update size of timescale and its embedded elements.
    this.updateSize();

    // Set mode of timescale. Enabled mode depends on zoom level.
    this.setMode();

    // Update major ticks collection.
    this.updateMajorTicks();

    // Setup canvas context before rendering.
    this.ctx.strokeStyle = this.strokeStyle;
    this.ctx.fillStyle = this.strokeStyle;
    this.ctx.lineWidth = constants.timescaleThickness;

    if (this.isHorizontal) {
      this.ctx.clearRect(0, 0, this.size, this.canvasSize);
    } else {
      this.ctx.clearRect(0, 0, this.canvasSize, this.size);
    }

    // Render timescale.
    this.renderBaseLine();
    this.renderMajorTicks();
    this.renderSmallTicks();
  }
}

class TickSource {
  constructor() {
    this.delta;
    this.beta;

    this.range = { min: -1, max: 0 };

    this.log10 = 1 / Math.log(10);

    this.startDate = null;
    this.endDate = null;
    this.firstYear = null;

    // cosmos: Ga/Ma/ka, calendar: BCE/CE, date: Date
    this.regime = '';

    // divider for each regime
    this.level = 1;
    this.present;

    this.divPool = [];
    this.isUsedPool = [];
    this.inners = [];
    this.styles = [];

    this.length = 0;

    this.start;
    this.finish;
    this.width = 900;

    // gets first available div (not used) or creates new one
    this.getDiv = x => {
      const inner = this.getLabel(x);
      let i = this.inners.indexOf(inner);

      if (i !== -1) {
        this.isUsedPool[i] = true;
        this.styles[i].display = 'block';

        return this.divPool[i];
      } else {
        i = this.isUsedPool.indexOf(false);

        if (i !== -1) {
          this.isUsedPool[i] = true;
          this.styles[i].display = 'block';
          this.inners[i] = inner;

          const div = this.divPool[i][0];

          div.innerHTML = inner;
          this.divPool[i]._size = { width: div.offsetWidth, height: div.offsetHeight };

          return this.divPool[i];
        } else {
          const div = $(`<div>${inner}</div>`);

          this.isUsedPool[this.length] = true;
          this.divPool[this.length] = div;
          this.inners[this.length] = inner;
          this.styles[this.length] = div[0].style;

          div._size = undefined;
          this.length += 1;

          return div;
        }
      }
    };

    // make all not used divs invisible (final step)
    this.refreshDivs = () => {
      for (let i = 0; i < this.length; i++) {
        if (this.isUsedPool[i]) {
          this.isUsedPool[i] = false;
        } else {
          this.styles[i].display = 'none';
        }
      }
    };

    this.getLabel = x => x;

    this.initRegime = range => {};

    this.createTicks = range => {};

    this.getSmallTicks = ticks => (
      ticks.length ? this.createSmallTicks(ticks) : []
    )

    this.createSmallTicks = ticks => [];

    this.decreaseTickCount = () => {
      if (this.delta === 1) {
        this.delta = 2;
      } else if (this.delta === 2) {
        this.delta = 5;
      } else if (this.delta === 5) {
        this.delta = 1;
        this.beta += 1;
      }

      return this.createTicks(this.range);
    };

    this.increaseTickCount = () => {
      if (this.delta === 1) {
        this.delta = 5;
        this.beta -= 1;
      } else if (this.delta === 2) {
        this.delta = 1;
      } else if (this.delta === 5) {
        this.delta = 2;
      }

      return this.createTicks(this.range);
    };

    this.round = (x, n) => {
      let pow = 1;
      let i;

      if (n <= 0) {
        n = Math.max(0, Math.min(-n, 15));
        pow = 1;

        for (i = 0; i > n; i--) pow /= 10;

        return Math.round(x * pow) / pow;
      } else {
        pow = 1;

        for (i = 0; i < n; i++) pow *= 10;

        return pow * Math.round(x / pow);
      }
    };

    this.getMarkerLabel = (range, time) => time;

    this.getVisibleForElement = (element, scale, viewport, useMargin) => {
      const margin = 2 * (useMargin && constants.contentScaleMargin ? constants.contentScaleMargin : 0);

      let width = viewport.width - margin;
      let height = viewport.height - margin;

      if (width < 0) width = viewport.width;
      if (height < 0) height = viewport.height;

      const scaleX = scale * element.width / width;
      const scaleY = scale * element.height / height;

      return {
        centerX: element.x + element.width / 2.0,
        centerY: element.y + element.height / 2.0,
        scale: Math.min(scaleX, scaleY),
      };
    };
  }

  hideDivs() {
    for (let i = 0; i < this.length; i++) {
      this.styles[i].display = 'none';
    }
  }

  getTicks(range) {
    this.initRegime(range);
    return this.createTicks(range);
  }
}

class CosmosTickSource extends TickSource {
  constructor() {
    super();

    this.getLabel = x => {
      // maximum number of decimal digits
      const n = Math.max(
        Math.floor(Math.log(this.delta * Math.pow(10, this.beta) / this.level) * this.log10),
        -4
      );

      // divide tick coordinate by level of cosmos zoom
      let text = Math.abs(x) / this.level;

      if (n < 0) {
        text = text.toFixed(-n);
      }

      text += ` ${x < 0 ? this.regime : this.regime[0]}`;

      return text;
    };

    this.initRegime = ({ min, max }) => {
      if (min < max) {
        this.range.min = min;
        this.range.max = max;
      } else {
        // default range
        this.range.min = constants.maxPermitedTimeRange.left;
        this.range.max = constants.maxPermitedTimeRange.right;
      }
      if (this.range.min < constants.maxPermitedTimeRange.left)
        this.range.min = constants.maxPermitedTimeRange.left;
      if (this.range.max > constants.maxPermitedTimeRange.right)
        this.range.max = constants.maxPermitedTimeRange.right;

      // set present date
      const localPresent = dates.getPresent();

      this.present = {
        year: localPresent.getUTCFullYear(),
        month: localPresent.getUTCMonth(),
        day: localPresent.getUTCDate()
      };

      // set default constant for arranging ticks
      this.delta = 1;
      this.beta = Math.floor(Math.log(this.range.max - this.range.min) * this.log10);

      if (this.range.min <= -10000000000) {
        // billions of years ago
        this.regime = 'Ga';
        this.level = 1000000000;
        if (this.beta < 7) {
          this.regime = 'Ma';
          this.level = 1000000;
        }
      } else if (this.range.min <= -10000000) {
        // millions of years ago
        this.regime = 'Ma';
        this.level = 1000000;
      } else if (this.range.min <= -10000) {
        // thousands of years ago
        this.regime = 'ka';
        this.level = 1000;
      }
    };

    this.createTicks = range => {
      const ticks = [];

      // prevent zooming deeper than 4 decimal digits
      if (this.regime == 'Ga' && this.beta < 7) {
        this.beta = 7;
      } else if (this.regime == 'Ma' && this.beta < 2) {
        this.beta = 2;
      } else if (this.regime == 'ka' && this.beta < -1) {
        this.beta = -1;
      }

      const dx = this.delta * Math.pow(10, this.beta);

      // calculate count of ticks to create
      const min = Math.floor(this.range.min / dx);
      const max = Math.floor(this.range.max / dx);

      let count = max - min + 1;

      // calculate rounded ticks values — they are in virtual coordinates (years from present date)
      let num = 0;

      if (dx === 2) count += 1;

      for (let i = 0; i < count + 1; i++) {
        const tickPosition = this.round((min + i) * dx, this.beta);

        if (tickPosition >= this.range.min && tickPosition <= this.range.max && tickPosition != ticks[ticks.length - 1]) {
          ticks[num] = {
            position: tickPosition,
            label: this.getDiv(tickPosition),
          };
          num += 1;
        }
      }

      this.refreshDivs();

      return ticks;
    };

    this.createSmallTicks = ticks => {
      const minors = [];
      const count = 4;

      const k = this.width / (this.range.max - this.range.min);
      const l = ticks.length > 1 ? ticks[1].position - ticks[0].position : 0;
      const step = l / (count + 1);

      if (k * step < constants.minSmallTickSpace) return null;

      let tick = ticks[0].position - step;

      while (tick > this.range.min) {
        minors.push(tick);
        tick -= step;
      }

      for (let i = 0; i < ticks.length - 1; i++) {
        const t = ticks[i].position;

        for (let j = 1; j <= count; j++) {
          tick = t + step * j;
          minors.push(tick);
        }
      }

      // create little ticks after last big tick
      tick = ticks[ticks.length - 1].position + step;

      while (tick < this.range.max) {
        minors.push(tick);
        tick += step;
      }

      return minors;
    };

    this.getMarkerLabel = (range, time) => {
      this.initRegime(range);

      const digitsCount = Math.max(
        Math.floor(Math.log(this.delta * Math.pow(10, this.beta) / this.level) * this.log10),
        -4) - 1;

      let labelText = (Math.abs(time / this.level)).toFixed(Math.abs(digitsCount));

      const { presentYear, presentMonth, presentDay } = dates.getPresent();
      const presentDate = dates.getCoordinateFromYMD(presentYear, presentMonth, presentDay);

      if (time === presentDate) {
        labelText = this.regime === 'ka' ? 2 : 0;
      }

      labelText += ` ${time < 0 ? this.regime : this.regime[0]}`;

      return labelText;
    };
  }
}

class CalendarTickSource extends TickSource {
  constructor() {
    super();

    this.getLabel = x => {
      const { year } = dates.getYMDFromCoordinate(x);
      const text = year <= 0
        ? `${-year} BCE`
        : `${year} CE`;

      return text;
    };

    this.initRegime = ({ min, max }) => {
      if (min < max) {
        this.range.min = min;
        this.range.max = max;
      } else {
        // default range
        this.range.min = constants.maxPermitedTimeRange.left;
        this.range.max = constants.maxPermitedTimeRange.right;
      }

      if (this.range.min < constants.maxPermitedTimeRange.left)
        this.range.min = constants.maxPermitedTimeRange.left;
      if (this.range.max > constants.maxPermitedTimeRange.right)
        this.range.max = constants.maxPermitedTimeRange.right;

      // set present date
      const localPresent = dates.getPresent();

      this.present = {
        year: localPresent.getUTCFullYear(),
        month: localPresent.getUTCMonth(),
        day: localPresent.getUTCDate()
      };

      // remember value in virtual coordinates when 1CE starts
      this.firstYear = dates.getCoordinateFromYMD(0, 0, 1);
      this.range.max -= this.firstYear;
      this.range.min -= this.firstYear;

      this.startDate = this.present;
      this.endDate = this.present;

      if (this.range.min < 0) {
        this.startDate = dates.getYMDFromCoordinate(this.range.min);
      }
      if (this.range.max < 0) {
        this.endDate = dates.getYMDFromCoordinate(this.range.max);
      }

      // set default constant for arranging ticks
      this.delta = 1;
      this.beta = Math.floor(Math.log(this.range.max - this.range.min) * this.log10);

      this.regime = 'BCE/CE';
      this.level = 1;
    };

    this.createTicks = range => {
      const ticks = [];

      // shift range limits as in calendar mode we count from present year
      // prevent zooming deeper than 1 year span
      if (this.beta < 0) this.beta = 0;

      const dx = this.delta * Math.pow(10, this.beta);

      // calculate count of ticks to create
      const min = Math.floor(this.range.min / dx);
      const max = Math.floor(this.range.max / dx);

      let count = max - min + 1;

      // calculate rounded ticks values — they are in virtual coordinates (years from present date)
      let num = 0;

      if (dx === 2) count++;

      for (let i = 0; i < count + 1; i++) {
        let tickPosition = dates.getCoordinateFromYMD((min + i) * dx, 0, 1);

        // Move tick from 1BCE to 1CE
        if (tickPosition === 0 && dx > 1) tickPosition += 1;
        if (tickPosition >= this.range.min && tickPosition <= this.range.max && tickPosition !== ticks[ticks.length - 1]) {
          ticks[num] = {
            position: tickPosition,
            label: this.getDiv(tickPosition),
          };
          num += 1;
        }
      }
      this.refreshDivs();

      return ticks;
    };

    this.createSmallTicks = ticks => {
      const minors = [];
      const { min, max } = this.range;

      let count = 4;

      if (Math.floor(Math.log(max - min) * this.log10) <= 0.3) {
        count = 3;
      }

      const k = this.width / (max - min);

      const l = ticks.length > 1 ? ticks[1].position - ticks[0].position : 0;
      const step = l / (count + 1);

      if (k * step < constants.minSmallTickSpace) return null;

      let tick = ticks[0].position - step;

      while (tick > min) {
        minors.push(tick);
        tick -= step;
      }

      for (let i = 0; i < ticks.length - 1; i++) {
        let t = ticks[i].position;

        // Count minor ticks from 1BCE, not from 1CE if step between large ticks greater than 1
        if (step > 1e-10 + 1 / (count + 1) && Math.abs(t - 1.0) < 1e-10) t = 0;

        for (let k = 1; k <= count; k++) {
          tick = t + step * k;
          minors.push(tick);
        }
      }

      // create little ticks after last big tick
      tick = ticks[ticks.length - 1].position + step;

      while (tick < max) {
        minors.push(tick);
        tick += step;
      }

      return minors;
    };

    this.getMarkerLabel = (range, time) => {
      this.initRegime(range);

      let currentDate = parseFloat((time - this.firstYear).toFixed(2));

      currentDate += Math.round(currentDate > 0 ? -0.5 : -1.5);

      if (currentDate < 0) {
        currentDate = -currentDate;
      } else if (currentDate === 0) {
        currentDate = 1;
      }

      return currentDate.toString() + (time < this.firstYear + 1 ? ' BCE' : ' CE');
    };
  }
}

class DateTickSource extends TickSource {
  constructor() {
    super();

    let year, month, day;

    // span between two rendering neighboring days
    let tempDays = 0;

    this.initRegime = ({ min, max }) => {
      if (min < max) {
        this.range.min = min;
        this.range.max = max;
      } else {
        // default range
        this.range.min = constants.maxPermitedTimeRange.left;
        this.range.max = constants.maxPermitedTimeRange.right;
      }

      if (this.range.min < constants.maxPermitedTimeRange.left)
        this.range.min = constants.maxPermitedTimeRange.left;
      if (this.range.max > constants.maxPermitedTimeRange.right)
        this.range.max = constants.maxPermitedTimeRange.right;

      // set present date
      const localPresent = dates.getPresent();

      this.present = {
        year: localPresent.getUTCFullYear(),
        month: localPresent.getUTCMonth(),
        day: localPresent.getUTCDate()
      };

      // remember value in virtual coordinates when 1CE starts
      this.firstYear = dates.getCoordinateFromYMD(0, 0, 1);

      this.startDate = dates.getYMDFromCoordinate(this.range.min);
      this.endDate = dates.getYMDFromCoordinate(this.range.max);

      // set default constant for arranging ticks
      this.delta = 1;
      this.beta = Math.log(this.range.max - this.range.min) * this.log10;

      if (this.beta >= -0.2) this.regime = 'Quarters_Month';
      if (this.beta <= -0.2 && this.beta >= -0.8) this.regime = 'Month_Weeks';
      if (this.beta <= -0.8 && this.beta >= -1.4) this.regime = 'Weeks_Days';
      if (this.beta <= -1.4) this.regime = 'Days_Quarters';

      this.level = 1;
    };

    this.getLabel = x => {
      let text = dates.months[month];
      let year_temp = year;

      if (year === 0) year_temp -= 1;
      if (text === 'January') text += ` ${year_temp}`;
      if (tempDays === 1) text += `${day} ${dates.months[month]}`;
      if (this.regime === 'Weeks_Days' && day === 3)  text += `, ${year_temp}`;
      if (this.regime === 'Days_Quarters' && day === 1) text += `, ${year_temp}`;

      return text;
    };

    this.getMinTicks = () => {
      this.initRegime(this.range);
      return this.createTicks(this.range);
    };

    this.createTicks = range => {
      tempDays = 0;

      const ticks = [];

      let num = 0;

      // count number of months to render
      let countMonths = 0;

      // count number of days to render
      let countDays = 0;

      //current year and month to start counting
      let tempYear = this.startDate.year;
      let tempMonth = this.startDate.month;

      const endMonth = this.endDate.month;
      const endYear = this.endDate.year;

      while (tempYear < endYear || (tempYear === endYear && tempMonth <= endMonth)) {
        countMonths += 1;
        tempMonth += 1;

        if (tempMonth >= 12) {
          tempMonth = 0;
          tempYear++;
        }
      }

      // calculate ticks values — they are in virtual coordinates (years from present date)
      year = this.startDate.year;

      // create month ticks
      month = this.startDate.month - 1;

      let month_step = 1;
      let date_step = 1;

      for (let j = 0; j <= countMonths + 2; j += month_step) {
        month += month_step;

        if (month >= 12) {
          month = 0;
          year += 1;
        }

        if (this.regime === 'Quarters_Month' || this.regime === 'Month_Weeks') {
          const tick = dates.getCoordinateFromYMD(year, month, 1);

          if (tick >= this.range.min && tick <= this.range.max) {
            if (tempDays != 1) {
              if (month % 3 === 0 || this.regime === 'Month_Weeks') {
                ticks[num] = {
                  position: tick,
                  label: this.getDiv(tick),
                };
                num += 1;
              }
            }
          }
        }

        // create days ticks for this month
        if ((this.regime === 'Weeks_Days') || (this.regime === 'Days_Quarters')) {
          countDays = Math.floor(dates.daysInMonth[month]);

          if (month === 1 && dates.isLeapYear(year)) countDays += 1;

          tempDays = 1;

          for (let k = 1; k <= countDays; k += date_step) {
            day = k;
            tick = dates.getCoordinateFromYMD(year, month, day);

            if (tick >= this.range.min && tick <= this.range.max) {
              ticks[num] = {
                position: tick,
                label: this.getDiv(tick)
              };
              num += 1;
            }
          }
        }
      }
      this.refreshDivs();

      return ticks;
    };

    this.createSmallTicks = ticks => {
      // function to create minor ticks
      const minors = [];

      let k = this.width / (this.range.max - this.range.min);
      let step;

      let count;
      let tick = ticks[0].position;
      let date = dates.getYMDFromCoordinate(tick);

      if (this.regime === 'Quarters_Month') {
        count = 2;
      } else if (this.regime === 'Month_Weeks') {
        count = dates.daysInMonth[date.month];
      } else if (this.regime === 'Weeks_Days') {
        count = 7;
      } else if (this.regime === 'Days_Quarters') {
        count = 4;
      }

      if (this.regime === 'Quarters_Month') {
        step = Math.floor(2 * dates.daysInMonth[date.month] / count);
      } else if (this.regime === 'Month_Weeks' || this.regime === 'Weeks_Days') {
        step = 1;
      } else if (this.regime === 'Days_Quarters') {
        step = 0.25;
      }

      if (k * step < constants.minSmallTickSpace) {
        return null;
      }

      date.day -= step;
      tick = dates.getCoordinateFromYMD(date.year, date.month, date.day);

      if (this.regime !== 'Month_Weeks') {
        while (tick > this.range.min) {
          minors.push(tick);
          date.day -= step;
          tick = dates.getCoordinateFromYMD(date.year, date.month, date.day);
        }
      } else {
        let j = dates.daysInMonth[date.month];

        while (tick > this.range.min) {
          if ([2, 9, 16, 23, 27].includes(j)) {
            minors.push(tick);
          }
          date.day -= step;
          tick = dates.getCoordinateFromYMD(date.year, date.month, date.day);
          j -= 1;
        }
      }

      for (let i = 0; i < ticks.length - 1; i++) {
        tick = ticks[i].position;

        date = dates.getYMDFromCoordinate(tick);
        step = 1;

        for (let j = 1; j <= count; j += step) {
          date.day += step;
          tick = dates.getCoordinateFromYMD(date.year, date.month, date.day);

          if (this.regime !== 'Month_Weeks' || [2, 9, 16, 23, 28].includes(j)) {
            if (!minors.length || k * (ticks[i + 1].position - tick) > constants.minSmallTickSpace)
              minors.push(tick);
          }
        }
      }

      tick = ticks[ticks.length - 1].position;
      date = dates.getYMDFromCoordinate(tick);

      date.day += step;
      tick = dates.getCoordinateFromYMD(date.year, date.month, date.day);

      if (this.regime !== 'Month_Weeks') {
        while (tick < this.range.max) {
          minors.push(tick);
          date.day += step;
          tick = dates.getCoordinateFromYMD(date.year, date.month, date.day);
        }
      } else {
        let j = 0;

        while (tick < this.range.max) {
          if ([2, 9, 16, 23, 28].includes(j)) {
            minors.push(tick);
          }
          date.day += step;
          tick = dates.getCoordinateFromYMD(date.year, date.month, date.day);
          j += 1;
        }
      }

      return minors;
    };

    this.getMarkerLabel = (range, time) => {
      this.initRegime(range);

      const date = dates.getYMDFromCoordinate(time, true);
      const labelText = `${date.year}.${date.month + 1}.${date.day}`;

      return labelText;
    };
  }
}
