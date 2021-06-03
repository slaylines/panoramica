import $ from 'jquery';
import 'jquery-ui';
import Axis from './axis';
import initWidgetVC from './vc';

$(document).ready(() => {

  var ax, axis, vc;
  ax = $('#axis');
  axis = new Axis(ax);

  var range = { min: -10000000000, max: 50 };
  axis.update(range);

  initWidgetVC();
	vc = $('#vc');
	vc.virtualCanvas();

  
});


