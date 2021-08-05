import * as constants from './constants';
import * as dates from './dates';
import { VisibleRegion2d } from './viewport';
import { VCContent, CanvasRootElement, addTimeline, addInfodot } from './vccontent';
import { animationEase } from './viewport-animation';

export default class Layout {
  constructor() {
    var isLayoutAnimation = true;

    this.animatingElements = { length: 0 };
    this.timelineHeightRate = 0.4;

    function Timeline(title, left, right, childTimelines, exhibits) {
      this.Title = title;
      this.left = left;
      this.right = right;
      this.ChildTimelines = childTimelines;
      this.Exhibits = exhibits;
    }

    function Infodot(x, contentItems) {
      this.x = x;
      this.ContentItems = contentItems;
    }

    function titleObject(name) {
      this.name = name;
    }

    function Prepare(timeline) {
      timeline.left = dates.getCoordinateFromDecimalYear(timeline.start);
      timeline.right = dates.getCoordinateFromDecimalYear(timeline.end);

      // save timeline end date in case if it is '9999'
      timeline.endDate = timeline.end;

      if (timeline.exhibits instanceof Array) {
        timeline.exhibits.forEach(function (exhibit) {
          exhibit.x = dates.getCoordinateFromDecimalYear(exhibit.time);
        });
      }

      if (timeline.timelines instanceof Array) {
        timeline.timelines.forEach(function (childTimeline) {
          childTimeline.ParentTimeline = timeline;
          Prepare(childTimeline);
        });
      }

      GenerateAspect(timeline);

      if (timeline.initHeight) timeline.initHeight /= 100;
      else if (!timeline.AspectRatio && !timeline.initHeight)
        timeline.initHeight = this.timelineHeightRate;
    }

    function GenerateAspect(timeline) {
      timeline.AspectRatio = timeline.aspectRatio || 10;
    }

    function LayoutTimeline(timeline, parentWidth, measureContext) {
      var headerPercent = constants.timelineHeaderSize + 2 * constants.timelineHeaderMargin;
      var timelineWidth = timeline.right - timeline.left;
      timeline.width = timelineWidth;

      // Set content margin
      timeline.heightEps = parentWidth * constants.timelineContentMargin;

      // If child timeline has fixed aspect ratio, calculate its height according to it
      if (timeline.AspectRatio && !timeline.height) {
        timeline.height = timelineWidth / timeline.AspectRatio;
      }

      if (timeline.timelines instanceof Array) {
        timeline.timelines.forEach(function (tl) {
          // If child timeline has fixed aspect ratio, calculate its height according to it
          if (tl.AspectRatio) {
            tl.height = (tl.right - tl.left) / tl.AspectRatio;
          } else if (timeline.height && tl.initHeight) {
            // If Child timeline has height in percentage of parent, calculate it before layout pass
            tl.height = Math.min(
              timeline.height * tl.initHeight,
              (tl.right - tl.left) * constants.timelineMinAspect
            );
            if (tl.offsetY && tl.initHeight) {
              tl.height = timeline.height * tl.initHeight;
            }
          }

          // Calculate layout for each child timeline
          LayoutTimeline(tl, timelineWidth, measureContext);
        });
      }

      if (!timeline.height) {
        // Searching for timeline with the biggest ratio between its height percentage and real height
        let scaleCoef = undefined;

        if (timeline.timelines instanceof Array) {
          timeline.timelines.forEach(tl => {
            if (tl.initHeight && !tl.AspectRatio) {
              const localScale = tl.height / tl.initHeight;

              if (!scaleCoef || scaleCoef < localScale) scaleCoef = localScale;
            }
          });
        }

        // Scaling timelines to make their percentages corresponding to each other
        if (scaleCoef) {
          if (timeline.timelines instanceof Array) {
            timeline.timelines.forEach(tl => {
              if (tl.initHeight && !tl.AspectRatio) {
                const scaleParam = (scaleCoef * tl.initHeight) / tl.height;

                if (scaleParam > 1) {
                  tl.realY *= scaleParam;
                  Scale(tl, scaleParam, measureContext);
                }
              }
            });
          }

          // Set final timelineHeight
          timeline.height = scaleCoef;
        }
      }

      // Now positioning child content and title
      let exhibitSize = CalcInfodotSize(timeline);

      timeline.realY = 0;

      // Layout only timelines to check that they fit into parent timeline
      const tlRes = LayoutChildTimelinesOnly(timeline, null, headerPercent);
      const hFlag = timeline.initHeight & timeline.offsetY ? true : false;

      let res = LayoutContent(
        timeline,
        exhibitSize,
        hFlag,
        timeline.height,
        headerPercent,
        exhibitSize
      );

      if (timeline.height) {
        if (timeline.exhibits.length > 0 && tlRes.max - tlRes.min < timeline.height) {
          while (res.max - res.min > timeline.height && exhibitSize >= timelineWidth / 20.0) {
            exhibitSize /= 1.5;
            res = LayoutContent(
              timeline,
              exhibitSize,
              hFlag,
              timeline.height,
              headerPercent
            );
          }
        }

        if (res.max - res.min > timeline.height) {
          timeline.height = res.max - res.min;
        }
      } else {
        const minAspect = 1.0 / constants.timelineMinAspect;
        const minHeight = timelineWidth / minAspect;

        timeline.height = Math.max(minHeight, res.max - res.min);
      }

      timeline.realHeight = timeline.initHeight && timeline.offsetY
        ? timeline.height
        : timeline.height + 2 * timeline.heightEps;

      if (timeline.exhibits instanceof Array) {
        timeline.exhibits.forEach(infodot => infodot.realY -= res.min);
      }

      if (timeline.timelines instanceof Array) {
        timeline.timelines.forEach(tl => tl.realY -= res.min);
      }
    }

    function PositionContent(contentArray, arrangedArray, intersectionFunc) {
      contentArray.forEach(function (el) {
        var usedY = [];

        arrangedArray.forEach(function (ael) {
          if (intersectionFunc(el, ael)) {
            usedY.push({ top: ael.realY + ael.realHeight, bottom: ael.realY });
          }
        });

        var y = 0;

        if (usedY.length > 0) {
          //Find free segments
          var segmentPoints = [];
          usedY.forEach(function (segment) {
            segmentPoints.push({ type: 'bottom', value: segment.bottom });
            segmentPoints.push({ type: 'top', value: segment.top });
          });

          segmentPoints.push({ type: 'bottom', value: 0 });
          segmentPoints.push({ type: 'top', value: 0 });

          segmentPoints.sort(function (l, r) {
            return l.value - r.value;
          });

          var freeSegments = [];
          var count = 0;
          for (i = 0; i < segmentPoints.length - 1; i++) {
            if (segmentPoints[i].type == 'top') count++;
            else count--;

            if (count == 0 && segmentPoints[i + 1].type == 'bottom')
              freeSegments.push({
                bottom: segmentPoints[i].value,
                top: segmentPoints[i + 1].value,
              });
          }

          //Find suitable free segment
          var foundPlace = false;
          for (var i = 0; i < freeSegments.length; i++) {
            if (freeSegments[i].top - freeSegments[i].bottom > el.realHeight) {
              y = freeSegments[i].bottom;
              foundPlace = true;
              break;
            }
          }

          if (!foundPlace) {
            y = segmentPoints[segmentPoints.length - 1].value;
          }
        }

        el.realY = y;

        arrangedArray.push(el);
      });
    }

    function PositionContentAutoManual(
      manualArray,
      sequencedArray,
      unsequencedArray,
      arrangedArray,
      tlHFlag,
      tlHeight,
      headerPercent,
      infodotSize
    ) {
      var arranged = false;

      var max;
      var tempArrArray;
      var arrangedManually = 0;

      while (!arranged) {
        tempArrArray = [];

        //We do so if we are sure that the manual objects do not intersect.
        //Otherwise, we need to pass a temporary array to PositionContent separately
        tempArrArray = tempArrArray.concat(arrangedArray);

        PositionContent(sequencedArray, tempArrArray, function (el, ael) {
          return el.left < ael.right;
        });

        PositionContent(unsequencedArray, tempArrArray, function (el, ael) {
          return !(el.left >= ael.right || ael.left >= el.right);
        });

        if (arrangedArray.length) {
          tempArrArray = tempArrArray.slice(arrangedArray.length);
        }

        max = tlHeight != undefined ? tlHeight : Number.MIN_VALUE;

        tempArrArray.forEach(function (element) {
          if (element.realY + element.realHeight > max)
            max = element.realY + element.realHeight;
        });

        if (!tlHFlag) max = max / (1 - headerPercent);

        if (arrangedArray.length) {
          var tmax;
          if (arrangedArray[0].initHeight == undefined)
            tmax =
              (arrangedArray[0].realY / arrangedArray[0].offsetY) * 100 +
              arrangedArray[0].realHeight / 2;
          else tmax = (arrangedArray[0].realY / arrangedArray[0].offsetY) * 100;
          if (tmax > max) max = tmax;
        }
        arranged = true;

        for (
          ;
          arrangedManually < manualArray.length && arranged == true;
          arrangedManually++
        ) {
          var usedY = [];
          tempArrArray.forEach(function (ael) {
            if (
              !(
                manualArray[arrangedManually].left >= ael.right ||
                ael.left >= manualArray[arrangedManually].right
              )
            ) {
              usedY.push({
                top: ael.realY + ael.realHeight,
                bottom: ael.realY,
              });
            }
          });

          //First try
          if (manualArray[arrangedManually].initHeight === undefined)
            max -= infodotSize;
          manualArray[arrangedManually].realY =
            (max * manualArray[arrangedManually].offsetY) / 100;
          if (
            manualArray[arrangedManually].offsetY !== null &&
            manualArray[arrangedManually].initHeight
          ) {
            manualArray[arrangedManually].height =
              max * manualArray[arrangedManually].initHeight;
            manualArray[arrangedManually].realHeight =
              max * manualArray[arrangedManually].initHeight;
          }
          if (manualArray[arrangedManually].initHeight === undefined)
            max += infodotSize;

          //realY
          var locMin = manualArray[arrangedManually].realY;
          var locMax = Number.MIN_VALUE;

          //Finding the area of intersection
          usedY.forEach(function (ael) {
            if (
              !(
                ael.top <= manualArray[arrangedManually].realY ||
                manualArray[arrangedManually].realY +
                  manualArray[arrangedManually].realHeight <=
                  ael.bottom
              )
            ) {
              arranged = false;
              if (ael.top > locMax) locMax = ael.top;
            }
          });

          //Adding the area size multiplayed by worse case coefficient
          if (arranged === false) {
            if (manualArray[arrangedManually].initHeight == undefined)
              max +=
                (locMax - locMin + infodotSize) *
                (1.001 /
                  (Math.max(
                    manualArray[arrangedManually].offsetY,
                    100.0 - manualArray[arrangedManually].offsetY
                  ) /
                    100));
            else
              max +=
                (locMax - locMin) *
                (1.001 /
                  (Math.max(
                    manualArray[arrangedManually].offsetY,
                    100.0 -
                      manualArray[arrangedManually].offsetY -
                      manualArray[arrangedManually].initHeight * 100
                  ) /
                    100));
            arrangedArray.forEach(function (ael) {
              if (ael.offsetY !== null && ael.initHeight) {
                ael.realY = (max * ael.offsetY) / 100;
                ael.height = max * ael.initHeight;
                ael.realHeight = ael.height;
              } else {
                ael.realY = (max * ael.offsetY) / 100 - infodotSize / 2;
              }
            });
          }

          if (
            manualArray[arrangedManually].offsetY !== null &&
            manualArray[arrangedManually].initHeight
          ) {
            manualArray[arrangedManually].realY =
              (max * manualArray[arrangedManually].offsetY) / 100;
            manualArray[arrangedManually].height =
              max * manualArray[arrangedManually].initHeight;
            manualArray[arrangedManually].realHeight =
              max * manualArray[arrangedManually].initHeight;
          } else {
            manualArray[arrangedManually].realY =
              (max * manualArray[arrangedManually].offsetY) / 100 -
              infodotSize / 2;
          }

          arrangedArray.push(manualArray[arrangedManually]);
        }

        //Check that all exhibits are in their timeline
        for (var i = 0; i < arrangedArray.length; i++) {
          if (arrangedArray[i].realY < 0) arrangedArray[i].realY = 0;
          if (arrangedArray[i].realY + arrangedArray[i].realHeight > max)
            arrangedArray[i].realY = max - arrangedArray[i].realHeight;
        }
      }

      if (arrangedArray.length) {
        max = Number.MIN_VALUE;
        for (var i = 0; i < arrangedArray.length; i++) {
          var tmax;
          if (!arrangedArray[i].initHeight) {
            if (arrangedArray[i].offsetY === 0) tmax = 0;
            else
              tmax =
                ((arrangedArray[i].realY + arrangedArray[i].realHeight / 2) /
                  arrangedArray[i].offsetY) *
                100;
            if (arrangedArray[i].realY + arrangedArray[i].realHeight > tmax)
              tmax = arrangedArray[i].realY + arrangedArray[i].realHeight;
          } else {
            if (arrangedArray[i].offsetY === 0) tmax = 0;
            else
              tmax = (arrangedArray[i].realY / arrangedArray[i].offsetY) * 100;
          }
          if (max < tmax) max = tmax;
        }
      }

      for (var i = 0; i < tempArrArray.length; i++) {
        arrangedArray.push(tempArrArray[i]);
      }

      return max;
    }

    function LayoutContent(
      timeline,
      exhibitSize,
      tlHFlag,
      tlHeight,
      headerPercent
    ) {
      //Prepare arrays for ordered and unordered content
      var sequencedContent = [];
      var unsequencedContent = [];
      var manualContent = [];

      //Prepare measure arrays
      var arrangedElements = [];

      if (timeline.timelines instanceof Array) {
        timeline.timelines.forEach(function (tl) {
          //if y-offset of timeline is user-defined calculate realY
          //else prepare it to auto-calculation
          if (tl.offsetY != null) {
            manualContent.push(tl);
          } else {
            if (tl.Sequence) sequencedContent.push(tl);
            else unsequencedContent.push(tl);
          }
        });
      }

      if (timeline.exhibits instanceof Array) {
        timeline.exhibits.forEach(function (eb) {
          eb.size = exhibitSize;
          eb.left = eb.x - eb.size / 2.0;
          eb.right = eb.x + eb.size / 2.0;
          eb.realHeight = exhibitSize;

          if (eb.left < timeline.left) {
            eb.left = timeline.left;
            eb.right = eb.left + eb.size;
            eb.isDeposed = true;
          } else if (eb.right > timeline.right) {
            eb.right = timeline.right;
            eb.left = timeline.right - eb.size;
            eb.isDeposed = true;
          }

          //if y-offset of exhibit is user-defined calculate realY
          //else prepare it to auto-calculation
          if (eb.offsetY != null) {
            manualContent.push(eb);
          } else {
            if (eb.Sequence) sequencedContent.push(eb);
            else unsequencedContent.push(eb);
          }
        });
      }

      sequencedContent.sort(function (l, r) {
        return l.Sequence - r.Sequence;
      });

      var max = PositionContentAutoManual(
        manualContent,
        sequencedContent,
        unsequencedContent,
        arrangedElements,
        tlHFlag,
        tlHeight,
        headerPercent,
        exhibitSize
      );

      var min = Number.MAX_VALUE;

      for (var i = 0; i < arrangedElements.length; i++) {
        if (arrangedElements[i].realY < min) min = arrangedElements[i].realY;
      }

      if (manualContent.length != 0) min = 0;

      return { min: min, max: max };
    }

    function LayoutChildTimelinesOnly(timeline, tlHFlag, headerPercent) {
      //Prepare measure arrays
      var arrangedElements = [];
      var autoContent = [];
      var manualContent = [];

      if (timeline.timelines instanceof Array) {
        timeline.timelines.forEach(function (tl) {
          //if y-offset of timeline is user-defined calculate realY
          //else prepare it to auto-calculation
          if (tl.offsetY != null) {
            manualContent.push(tl);
          } else {
            autoContent.push(tl);
          }
        });

        PositionContentAutoManual(
          manualContent,
          [],
          autoContent,
          arrangedElements,
          tlHFlag,
          timeline.height,
          headerPercent
        );
      }

      var min = Number.MAX_VALUE;
      var max = Number.MIN_VALUE;

      for (var i = 0; i < arrangedElements.length; i++) {
        if (arrangedElements[i].realY < min) min = arrangedElements[i].realY;
        if (arrangedElements[i].realY + arrangedElements[i].realHeight > max)
          max = arrangedElements[i].realY + arrangedElements[i].realHeight;
      }

      if (arrangedElements.length == 0) {
        max = 0;
        min = 0;
      }

      return { max: max, min: min };
    }

    function Scale(timeline, scale, mctx) {
      if (scale < 1) throw 'Only extending of content is allowed';

      timeline.height *= scale;
      timeline.realHeight = timeline.height + 2 * timeline.heightEps;
      timeline.titleRect = GenerateTitleObject(timeline.height, timeline, mctx);

      if (timeline.timelines instanceof Array) {
        timeline.timelines.forEach(function (tl) {
          tl.realY *= scale;
          if (!tl.AspectRatio) Scale(tl, scale, mctx);
        });
      }

      if (timeline.exhibits instanceof Array) {
        timeline.exhibits.forEach(function (eb) {
          eb.realY *= scale;
        });
      }
    }

    function Arrange(timeline, measureContext) {
      if (timeline.offsetY !== null && timeline.initHeight)
        timeline.y = timeline.realY;
      else timeline.y = timeline.realY + timeline.heightEps;

      if (timeline.exhibits instanceof Array) {
        timeline.exhibits.forEach(function (infodot) {
          infodot.y = infodot.realY + infodot.size / 2.0 + timeline.y;
        });
      }

      if (timeline.timelines instanceof Array) {
        timeline.timelines.forEach(function (tl) {
          if (tl.offsetY !== null && tl.initHeight) {
            var exhibitSize = CalcInfodotSize(timeline);
            var headerPercent =
              constants.timelineHeaderSize +
              2 * constants.timelineHeaderMargin;
            var res = LayoutContent(
              tl,
              exhibitSize,
              true,
              tl.height,
              headerPercent
            );
            while (
              res.max - res.min > timeline.height &&
              exhibitSize > timeline.width / 20.0
            ) {
              exhibitSize /= 1.5;
              res = LayoutContent(
                timeline,
                exhibitSize,
                true,
                tl.height,
                headerPercent
              );
            }
          }
          tl.realY += timeline.y;

          tl.height = Math.max(
            tl.height,
            (constants.timelineMinAspect / 4) * (tl.right - tl.left)
          );
          tl.height = Math.min(
            tl.height,
            ((tl.right - tl.left) * 3) / constants.timelineMinAspect
          );

          Arrange(tl, measureContext);
        });
      }
      var titleObject = GenerateTitleObject(
        timeline.height,
        timeline,
        measureContext
      );
      timeline.titleRect = titleObject;
    }

    function CalcInfodotSize(timeline) {
      return (timeline.right - timeline.left) / 20.0;
    }

    function GenerateTitleObject(tlHeight, timeline, measureContext) {
      var tlW = timeline.right - timeline.left;

      measureContext.font = '100pt ' + constants.timelineHeaderFontName;
      var size = measureContext.measureText(timeline.title);
      var height = constants.timelineHeaderSize * tlHeight;
      var width = (height * size.width) / 100.0;

      var margin = Math.min(tlHeight, tlW) * constants.timelineHeaderMargin;

      if (width + 2 * margin > tlW) {
        width = tlW - 2 * margin;
        height = (width * 100.0) / size.width;
      }

      return {
        width: width - 2.1 * height,
        height: height,
        marginTop: tlHeight - height - margin,
        marginLeft: margin,
        bboxWidth: width + 2 * margin - 2.1 * height,
        bboxHeight: height + 2 * margin,
      };
    }

    function Convert(parent, timeline) {
      //Creating timeline
      var tlColor = GetTimelineColor(timeline);
      var t1 = addTimeline(
        parent,
        'layerTimelines',
        't' + timeline.id,
        {
          isBuffered: timeline.timelines instanceof Array,
          guid: timeline.id,
          timeStart: timeline.left,
          timeEnd: timeline.right,
          top: timeline.y,
          height: timeline.height,
          header: timeline.title,
          fillStyle: 'rgba(0,0,0,0.25)',
          titleRect: timeline.titleRect,
          strokeStyle: tlColor,
          regime: timeline.regime,
          endDate: timeline.endDate,
          fromIsCirca: timeline.fromIsCirca || false,
          toIsCirca: timeline.toIsCirca || false,
          opacity: 0,
          backgroundUrl: timeline.backgroundUrl,
          aspectRatio: timeline.aspectRatio,
          offsetY: timeline.offsetY,
          initHeight: timeline.initHeight,
        }
      );

      //Creating Infodots
      if (timeline.exhibits instanceof Array) {
        timeline.exhibits.forEach(function (childInfodot) {
          var contentItems = [];
          if (typeof childInfodot.contentItems !== 'undefined') {
            contentItems = childInfodot.contentItems;

            for (var i = 0; i < contentItems.length; ++i) {
              contentItems[i].guid = contentItems[i].id;
            }
          }
          var infodot1 = addInfodot(
            t1,
            'layerInfodots',
            'e' + childInfodot.id,
            (childInfodot.left + childInfodot.right) / 2.0,
            childInfodot.y,
            (0.8 * childInfodot.size) / 2.0,
            contentItems,
            {
              isBuffered: false,
              guid: childInfodot.id,
              title: childInfodot.title,
              offsetY: childInfodot.offsetY,
              date: childInfodot.time,
              isCirca: childInfodot.isCirca,
              opacity: 1,
            }
          );
        });
      }

      //Filling child timelines
      if (timeline.timelines instanceof Array) {
        timeline.timelines.forEach(function (childTimeLine) {
          Convert(t1, childTimeLine);
        });
      }
    }

    function GetTimelineColor(timeline) {
      if (timeline.regime == 'Cosmos') {
        return 'rgba(152, 108, 157, 1.0)';
      } else if (timeline.regime == 'Earth') {
        return 'rgba(81, 127, 149, 1.0)';
      } else if (timeline.regime == 'Life') {
        return 'rgba(73, 150, 73, 1.0)';
      } else if (timeline.regime == 'Pre-history') {
        return 'rgba(237, 145, 50, 1.0)';
      } else if (timeline.regime == 'Humanity') {
        return 'rgba(212, 92, 70, 1.0)';
      } else {
        // Return null to allow the settings configuration to choose color.
        return null;
      }
    }

    function GetVisibleFromTimeline(timeline, vcph) {
      if (timeline) {
        var vp = vcph.virtualCanvas('getViewport');
        var width = timeline.right - timeline.left;
        var scaleX = (vp.visible.scale * width) / vp.width;
        var scaleY = (vp.visible.scale * timeline.height) / vp.height;
        return new VisibleRegion2d(
          timeline.left + (timeline.right - timeline.left) / 2.0,
          timeline.y + timeline.height / 2.0,
          Math.max(scaleX, scaleY)
        );
      }
    }

    function LoadTimeline(root, rootTimeline) {
      root.beginEdit();
      Convert(root, rootTimeline);
      root.endEdit(true);
    }

    const Load = function (root, timeline) {
      if (timeline) {
        Prepare(timeline);

        const measureContext = document.createElement('canvas').getContext('2d');

        LayoutTimeline(timeline, 0, measureContext);
        Arrange(timeline, measureContext);

        LoadTimeline(root, timeline);
      }
    }

    /*
    ---------------------------------------------------------------------------
    DYNAMIC LAYOUT
    ---------------------------------------------------------------------------
    */
    // takes a metadata timeline (FromTimeUnit, FromYear, FromMonth, FromDay, ToTimeUnit, ToYear, ToMonth, ToDay)
    // and returns a corresponding scenegraph (x, y, width, height)
    function generateLayout(tmd, tsg) {
      try {
        if (!tmd.AspectRatio) {
          tmd.height = tsg.height;
        }

        const root = new CanvasRootElement(
          tsg.vc, undefined, '__root__',
          -Infinity, -Infinity, Infinity, Infinity
        );

        Load(root, tmd);
        return root.children[0];
      } catch (msg) {
        console.log(msg);
      }
    }

    // converts a scenegraph element in absolute coords to relative coords
    function convertRelativeToAbsoluteCoords(el, delta) {
      if (!delta) return;
      if (typeof el.y !== 'undefined') {
        el.y += delta;
        el.newY += delta;
      }
      if (typeof el.baseline !== 'undefined') {
        el.baseline += delta;
        el.newBaseline += delta;
      }
      el.children.forEach(function (child) {
        convertRelativeToAbsoluteCoords(child, delta);
      });
    }

    // shifts a scenegraph element in absolute coords by delta
    function shiftAbsoluteCoords(el, delta) {
      if (!delta) return;
      if (typeof el.newY !== 'undefined') el.newY += delta;
      if (typeof el.newBaseline !== 'undefined') el.newBaseline += delta;
      el.children.forEach(function (child) {
        shiftAbsoluteCoords(child, delta);
      });
    }

    // calculates the net force excerted on each child timeline and infodot
    // after expansion of child timelines to fit the newly added content
    function calculateForceOnChildren(tsg) {
      var eps = tsg.height / 10;

      var v = [];
      for (var i = 0, el; i < tsg.children.length; i++) {
        el = tsg.children[i];
        if (el.type && (el.type === 'timeline' || el.type === 'infodot')) {
          el.force = 0;
          v.push(el);
        }
      }

      v.sort(function (el, ael) {
        return el.newY - ael.newY;
      }); // inc order of y

      for (var i = 0, el; i < v.length; i++) {
        el = v[i];
        if (el.type && el.type === 'timeline') {
          if (el.delta) {
            var l = el.x;
            var r = el.x + el.width;
            var b = el.y + el.newHeight + eps;
            for (var j = i + 1; j < v.length; j++) {
              var ael = v[j];
              if (
                (ael.x > l && ael.x < r) ||
                (ael.x + ael.width > l && ael.x + ael.width < r) ||
                (ael.x + ael.width > l && ael.x + ael.width === 0 && r === 0)
              ) {
                // ael intersects (l, r)
                if (ael.y < b) {
                  // ael overlaps with el
                  ael.force += el.delta;

                  l = Math.min(l, ael.x);
                  r = Math.max(r, ael.x + ael.width);
                  b = ael.y + ael.newHeight + el.delta + eps;
                } else {
                  break;
                }
              }
            }
          }
        }
      }
    }

    function animateElement(elem) {
      var duration = constants.canvasElementAnimationTime;
      var args = [];

      if (elem.fadeIn == false && typeof elem.animation === 'undefined') {
        elem.height = elem.newHeight;
        elem.y = elem.newY;

        if (elem.baseline) elem.baseline = elem.newBaseline;
      }

      if (elem.newY != elem.y && !elem.id.match('__header__'))
        args.push({
          property: 'y',
          startValue: elem.y,
          targetValue: elem.newY,
        });
      if (elem.newHeight != elem.height && !elem.id.match('__header__'))
        args.push({
          property: 'height',
          startValue: elem.height,
          targetValue: elem.newHeight,
        });

      if (elem.opacity != 1 && elem.fadeIn == false) {
        args.push({
          property: 'opacity',
          startValue: elem.opacity,
          targetValue: 1,
        });
        duration = constants.canvasElementFadeInTime;
      }

      if (isLayoutAnimation == false || args.length == 0) duration = 0;

      initializeAnimation(elem, duration, args);

      // first animate resize/transition of buffered content. skip new content
      if (elem.fadeIn == true) {
        for (var i = 0; i < elem.children.length; i++)
          if (elem.children[i].fadeIn == true) animateElement(elem.children[i]);
      } else
        for (var i = 0; i < elem.children.length; i++)
          animateElement(elem.children[i]);
    }

    function initializeAnimation(elem, duration, args) {
      var startTime = new Date().getTime();

      elem.animation = {
        isAnimating: true,
        duration: duration,
        startTime: startTime,
        args: args,
      };

      // add elem to hash map
      if (typeof this.animatingElements[elem.id] === 'undefined') {
        this.animatingElements[elem.id] = elem;
        this.animatingElements.length++;
      }

      // calculates new animation frame of element
      elem.calculateNewFrame = function () {
        var curTime = new Date().getTime();
        var t;

        if (elem.animation.duration > 0)
          t = Math.min(
            1.0,
            (curTime - elem.animation.startTime) / elem.animation.duration
          );
        //projecting current time to the [0;1] interval of the animation parameter
        else t = 1.0;

        t = animationEase(t);

        for (var i = 0; i < args.length; i++) {
          if (typeof elem[args[i].property] !== 'undefined')
            elem[elem.animation.args[i].property] =
              elem.animation.args[i].startValue +
              t *
                (elem.animation.args[i].targetValue -
                  elem.animation.args[i].startValue);
        }

        if (t == 1.0) {
          elem.animation.isAnimating = false;
          elem.animation.args = [];

          delete this.animatingElements[elem.id];
          this.animatingElements.length--;

          if (elem.fadeIn == false) elem.fadeIn = true;

          for (var i = 0; i < elem.children.length; i++)
            if (typeof elem.children[i].animation === 'undefined')
              animateElement(elem.children[i]);

          return;
        }
      };
    }

    // utiltity function for debugging
    function numberWithCommas(n) {
      var parts = n.toString().split('.');
      return (
        parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
        (parts[1] ? '.' + parts[1] : '')
      );
    }

    // src = metadata tree (responsedump.txt + isBuffered)
    // dest = scenegraph tree (tree of CanvasTimelines)
    // returns void.
    // mutates scenegraph tree (dest) by appending missing data from metadata tree (src).
    // dest timelines can be in 1 of 3 states
    // 1. No Metadata.  (isBuffered == false)
    // 2. All Metadata. (isBuffered == false)
    // 3. All Content.  (isBuffered == true)
    function merge(src, dest) {
      if (src.id === dest.guid) {
        var srcChildTimelines =
          src.timelines instanceof Array ? src.timelines : [];
        var destChildTimelines = [];
        for (var i = 0; i < dest.children.length; i++)
          if (dest.children[i].type && dest.children[i].type === 'timeline')
            destChildTimelines.push(dest.children[i]);

        if (srcChildTimelines.length === destChildTimelines.length) {
          dest.isBuffered = dest.isBuffered || src.timelines instanceof Array;

          // cal bbox (top, bottom) for child timelines and infodots
          var origTop = Number.MAX_VALUE;
          var origBottom = Number.MIN_VALUE;
          for (var i = 0; i < dest.children.length; i++) {
            if (
              dest.children[i].type &&
              (dest.children[i].type === 'timeline' ||
                dest.children[i].type === 'infodot')
            ) {
              if (dest.children[i].newY < origTop)
                origTop = dest.children[i].newY;
              if (
                dest.children[i].newY + dest.children[i].newHeight >
                origBottom
              )
                origBottom = dest.children[i].newY + dest.children[i].newHeight;
            }
          }

          // merge child timelines
          dest.delta = 0;
          for (var i = 0; i < srcChildTimelines.length; i++)
            merge(srcChildTimelines[i], destChildTimelines[i]);

          // check if child timelines have expanded
          var haveChildTimelineExpanded = false;
          for (var i = 0; i < destChildTimelines.length; i++)
            if (destChildTimelines[i].delta) haveChildTimelineExpanded = true;

          if (haveChildTimelineExpanded) {
            for (var i = 0; i < destChildTimelines.length; i++)
              if (destChildTimelines[i].delta)
                destChildTimelines[i].newHeight += destChildTimelines[i].delta;

            // shift all timelines and infodots above and below a expanding timeline
            calculateForceOnChildren(dest);
            for (var i = 0; i < dest.children.length; i++)
              if (dest.children[i].force)
                shiftAbsoluteCoords(dest.children[i], dest.children[i].force);

            // cal bbox (top, bottom) for child timelines and infodots after expansion
            var top = Number.MAX_VALUE;
            var bottom = Number.MIN_VALUE;
            var bottomElementName = '';
            for (var i = 0; i < dest.children.length; i++) {
              if (
                dest.children[i].type &&
                (dest.children[i].type === 'timeline' ||
                  dest.children[i].type === 'infodot')
              ) {
                if (dest.children[i].newY < top) top = dest.children[i].newY;
                if (
                  dest.children[i].newY + dest.children[i].newHeight >
                  bottom
                ) {
                  bottom = dest.children[i].newY + dest.children[i].newHeight;
                  bottomElementName = dest.children[i].title;
                }
              }
            }

            // update title pos after expansion
            dest.delta = Math.max(0, bottom - top - (origBottom - origTop));

            // hide animating text
            // TODO: find the better way to fix text shacking bug if possible
            dest.titleObject.newY += dest.delta;
            dest.titleObject.newBaseline += dest.delta;
            dest.titleObject.opacity = 0;
            dest.titleObject.fadeIn = false;
            delete dest.titleObject.animation;

            // assert: child content cannot exceed parent
            if (bottom > dest.titleObject.newY) {
              var msg =
                bottomElementName +
                ' EXCEEDS ' +
                dest.title +
                '.\n' +
                'bottom: ' +
                numberWithCommas(bottom) +
                '\n' +
                '   top: ' +
                numberWithCommas(dest.titleObject.newY) +
                '\n';
              console.log(msg);
            }

            for (var i = 1; i < dest.children.length; i++) {
              var el = dest.children[i];
              for (var j = 1; j < dest.children.length; j++) {
                var ael = dest.children[j];
                if (el.id !== ael.id) {
                  if (
                    !(
                      (ael.x <= el.x && ael.x + ael.width <= el.x) ||
                      (ael.x >= el.x + el.width &&
                        ael.x + ael.width >= el.x + el.width) ||
                      (ael.newY <= el.newY &&
                        ael.newY + ael.newHeight <= el.newY) ||
                      (ael.newY >= el.newY + el.newHeight &&
                        ael.newY + ael.newHeight >= el.newY + el.newHeight)
                    )
                  ) {
                    var msg = el.title + ' OVERLAPS ' + ael.title + '.\n';
                    console.log(msg);
                  }
                }
              }
            }
          }
        } else if (
          srcChildTimelines.length > 0 &&
          destChildTimelines.length === 0
        ) {
          var t = generateLayout(src, dest);
          var margin =
            Math.min(t.width, t.newHeight) * constants.timelineHeaderMargin;
          dest.delta = Math.max(0, t.newHeight - dest.newHeight); // timelines can only grow, never shrink

          // replace dest.children (timelines, infodots, titleObject) with matching t.children
          dest.children.splice(0);
          for (var i = 0; i < t.children.length; i++)
            dest.children.push(t.children[i]);
          dest.titleObject = dest.children[0];

          dest.isBuffered = dest.isBuffered || src.timelines instanceof Array;

          for (var i = 0; i < dest.children.length; i++)
            convertRelativeToAbsoluteCoords(dest.children[i], dest.newY);
        } else {
          dest.delta = 0;
        }
      } else {
        throw 'error: Cannot merge timelines. Src and dest node ids differ.';
      }
    }

    this.mergeLayouts = function (src, dest) {
      if (!src || !dest) return;

      if (dest.id === '__root__') {
        src.AspectRatio = src.aspectRatio || 10;

        const layout = generateLayout(src, dest);

        convertRelativeToAbsoluteCoords(layout, 0);
        dest.children.push(layout);
        // animateElement(dest);
        // vc.virtualCanvas('requestInvalidate');
      } else {
        merge(src, dest);
        dest.newHeight += dest.delta;
        // animateElement(dest);
        // vc.virtualCanvas('requestInvalidate');
      }
    }
  }
}
