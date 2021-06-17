import $ from 'jquery';

import Axis from './axis';
import VirtualCanvas from './vc';
import Gestures from './gestures';

$(document).ready(() => {
  const $axis = $('#axis');
  const axis = new Axis($axis);

  const range = { min: -10000000000, max: 50 };

  axis.update(range);

  const $vc = $('#vc');

  VirtualCanvas();
  $vc.virtualCanvas();

  const canvasGestures = Gestures.getGesturesStream($vc);

  // TODO: обрабатывать touch жесты
  // TODO: обрабатывать жесты на оси

  canvasGestures.subscribe(val => console.log(val));
});


/*
[x] подключить rxjs
[x] проверить gestures.js
[ ] создавать в index поток жестов
[ ] создать контроллер (и проверить, что viewport-controller норм работает — тут если чего-то нет, лучше удалить все упоминания, чем переносить файл-заглушку. Например, в контроллере есть ссылка на data.js, нам это вообще не надо, все эти функции надо выпилить нафиг)
[ ] добавить в index updateAxis и updateMarker
[ ] проверить, что всё работает
*/
