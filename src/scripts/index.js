// Using require here for jQuery-ui to work with jQuery: need global variable
const $ = require('jquery');
window.jQuery = $;
require('jquery-ui');

import Axis from './axis';
import VirtualCanvas from './vc';

$(document).ready(() => {
  const $axis = $('#axis');
  const axis = new Axis($axis);

  const range = { min: -10000000000, max: 50 };

  axis.update(range);

  const vc = $('#vc');
  VirtualCanvas();
  vc.virtualCanvas();
});
