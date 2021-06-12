import Data from './data'
import HomePageViewModel from './index'
import Common from './common'
/*var __extends = this.__extends || function (d, b) {
	for (var p in b)
		if (b.hasOwnProperty(p)) d[p] = b[p];

	function __() {
		this.constructor = d;
	}
	__.prototype = b.prototype;
	d.prototype = new __();
};*/

/*(function (CZ) {
	(function (UI) {
		var TimeSeriesDataForm = (function (_super) {
			__extends(TimeSeriesDataForm, _super);*/
// We only need to add additional initialization in constructor.
export default class TimeSeriesDataForm {
  constructor(container, formInfo) {
    //_super.call(this, container, formInfo);

    var existingTimSeriesList = $("#existingTimeSeries");

    if (existingTimSeriesList.children().length == 0) {
      var preloadedlist;
      $.ajax({
        cache: false,
        type: "GET",
        //async: false,
        dataType: "JSON",
        url: '/dumps/timeseries-preloaded.txt',
        success: function (result) {
          preloadedlist = result.d;
        },
        error: function (xhr) {
          alert("Error fetching pre-loaded time series chart: " + xhr.responseText);
        }
      });

      preloadedlist.forEach(function (preloaded) {
        var li = $('<li></li>').css("margin-left", 10).css("margin-bottom", "3px").height(22).appendTo(existingTimSeriesList);

        var link = $('<a></a>').addClass("cz-form-preloadedrecord").appendTo(li);
        link.text(preloaded.name);

        var div = $("<span></span>").addClass("cz-form-preloadedrecord").appendTo(li);
        div.text("Source:");

        var sourceDiv = $("<a></a>").addClass("cz-form-preloadedrecord time-series-link").appendTo(li);
        sourceDiv.text(preloaded.source);
        sourceDiv.prop("href", preloaded.link);

        link.click(function (e) {
          var data;
          $.ajax({
            cache: false,
            type: "GET",
            //async: false,
            dataType: "text",
            url: preloaded.file,
            success: function (result) {
              data = result;
            },
            error: function (xhr) {
              alert("Error fetching time series data: " + xhr.responseText);
            }
          });

          var dataSet = undefined;

          try {
            dataSet = Data.csvToDataSet(data, preloaded.delimiter, preloaded.source);

          } catch (err) {
            alert(err);
            return;
          }

          console.log(dataSet);

          HomePageViewModel.showTimeSeriesChart();
          HomePageViewModel.rightDataSet = dataSet;
          var vp = Common.vc.virtualCanvas("getViewport");
          HomePageViewModel.updateTimeSeriesChart(vp);
        });
      });
    }

    this.input = $("#fileLoader");
    var that = this;

    $("#fileLoader").change(function () {
      var fl = $("#fileLoader");
      $("#selectedFile").text(fl[0].files[0].name);
    });

    if (this.checkFileLoadCompatibility()) {
      $("#loadDataBtn").click(function () {
        var fr = that.openFile({
          "onload": function (e) {
            that.updateUserData(fr.result); // this -> FileReader
          }
        });
      });
    } else {
      $("#uploadDataCnt").hide();
    }
  }
  show() {
    _super.prototype.show.call(this, {
      effect: "slide",
      direction: "right",
      duration: 500
    });

    this.activationSource.addClass("active");
  }
  close() {
    _super.prototype.close.call(this, {
      effect: "slide",
      direction: "right",
      duration: 500
    });

    this.activationSource.removeClass("active");
  }
  checkFileLoadCompatibility() {
    return window['File'] && window['FileReader'] && window['FileList'] && window['Blob'];
  }
  openFile(callbacks) {
    var file = this.input[0].files[0];
    var fileReader = new FileReader();

    //TODO: add verifivation of input file
    fileReader.onloadstart = callbacks["onloadstart"];
    fileReader.onerror = callbacks["onerror"];
    fileReader.onabort = callbacks["onabort"];
    fileReader.onload = callbacks["onload"];
    fileReader.onloadend = callbacks["onloadend"];

    fileReader.readAsText(file);

    return fileReader;
  }
  updateUserData(csvString) {
    var dataSet = undefined;

    var delimValue = $("#delim").prop("value");
    if (delimValue === "tab")
      delimValue = "\t";
    else if (delimValue === "space")
      delimValue = " ";

    try {
      dataSet = Data.csvToDataSet(csvString, delimValue, this.input[0].files[0].name);
    } catch (err) {
      alert(err);
      return;
    }

    HomePageViewModel.showTimeSeriesChart();
    HomePageViewModel.leftDataSet = dataSet;
    var vp = Common.vc.virtualCanvas("getViewport");
    HomePageViewModel.updateTimeSeriesChart(vp);
  }
}

/*return TimeSeriesDataForm;
		})(CZ.UI.FormBase);
		UI.TimeSeriesDataForm = TimeSeriesDataForm;
	})(CZ.UI || (CZ.UI = {}));
	var UI = CZ.UI;
})(CZ || (CZ = {}));*/