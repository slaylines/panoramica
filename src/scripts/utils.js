export const getXBrowserMouseOrigin = (element, event) => ({
  x: event.pageX - element[0].offsetLeft,
  y: event.pageY - element[0].offsetTop,
});
