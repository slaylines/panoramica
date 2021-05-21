import $ from 'jquery';
import Axis from './axis';

$(document).ready(() => {

  var ax, axis, vc;
  ax = $('#axis');
  axis = new Axis(ax);

  var range = { min: -10000000000, max: 50 };
  axis.update(range);

});


