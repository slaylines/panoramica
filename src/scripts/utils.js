export const getXBrowserMouseOrigin = (element, event) => ({
  x: event.pageX - element[0].offsetLeft,
  y: event.pageY - element[0].offsetTop,
});

export const sqr = d => d * d;

export const preventBubble = event => {
  if (!event) return;

  if (e.stopPropagation) {
    e.stopPropagation();
  } else {
    e.cancelBubble = true;
  }
};

