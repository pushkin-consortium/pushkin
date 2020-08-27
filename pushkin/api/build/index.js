"use strict";

var _pushkinApi = _interopRequireDefault(require("pushkin-api"));

var _fs = _interopRequireDefault(require("fs"));

var _path = _interopRequireDefault(require("path"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { "default": obj }; }

var port = process.env.PORT || 3000;
var amqpAddress = process.env.AMQP_ADDRESS || 'amqp://localhost:5672';
var api = new _pushkinApi["default"].API(port, amqpAddress);
api.init().then(function () {
  // load in user controllers
  var controllersFile = _path["default"].join(__dirname, 'controllers.json');

  var controllers = JSON.parse(_fs["default"].readFileSync(controllersFile));
  controllers.forEach(function (controller) {
    var mountPath = _path["default"].join('/api/', controller.mountPath);

    var contrModule = require(controller.name);

    console.log(contrModule);
    api.usePushkinController(mountPath, contrModule); //Nests the Express router app for this experiment at the route /api/[exp], where [exp] is the path for the experiment in question.
  });
  api.start();
})["catch"](console.error);