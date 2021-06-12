import $, {Deferred, when} from 'jquery';
window.jQuery = $;
import 'jquery-ui';

export default class UILoader {
  constructor() {}

  static loadHtml(selector, filepath) {
    var container = $(selector);
    var promise = $.Deferred();

    // NOTE: Allow undefined filepath. The method will return initial container.
    if (!filepath) {
      promise.resolve(container);
      return promise;
    }

    if (!selector || !container.length) {
      throw "Unable to load " + filepath + " " + selector;
    }

    container.load(filepath, function () {
      alert('infinity error');
      promise.resolve(container);
    });

    return promise;
  }

  static loadAll(uiMap) {
    var promises = [];

    for (var selector in uiMap) {
      if (uiMap.hasOwnProperty(selector)) {
        promises.push(this.loadHtml(selector, uiMap[selector]));
      }
    }
    return $.when.apply($, promises);
  }
}