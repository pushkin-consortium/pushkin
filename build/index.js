"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("@babel/polyfill");

var _amqplib = _interopRequireDefault(require("amqplib"));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function asyncGeneratorStep(gen, resolve, reject, _next, _throw, key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { Promise.resolve(value).then(_next, _throw); } }

function _asyncToGenerator(fn) { return function () { var self = this, args = arguments; return new Promise(function (resolve, reject) { var gen = fn.apply(self, args); function _next(value) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "next", value); } function _throw(err) { asyncGeneratorStep(gen, resolve, reject, _next, _throw, "throw", err); } _next(undefined); }); }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } }

function _createClass(Constructor, protoProps, staticProps) { if (protoProps) _defineProperties(Constructor.prototype, protoProps); if (staticProps) _defineProperties(Constructor, staticProps); return Constructor; }

var Worker =
/*#__PURE__*/
function () {
  function Worker(options) {
    _classCallCheck(this, Worker);

    this.amqpAddress = options.amqpAddress;
    this.readQueue = options.readQueue;
    this.writeQueue = options.writeQueue;
    this.taskQueue = options.taskQueue;
    this.conn = undefined;
    this.initialized = false;
    this.handlers = new Map();
  }

  _createClass(Worker, [{
    key: "init",
    value: function () {
      var _init = _asyncToGenerator(
      /*#__PURE__*/
      regeneratorRuntime.mark(function _callee() {
        var _this = this;

        return regeneratorRuntime.wrap(function _callee$(_context) {
          while (1) {
            switch (_context.prev = _context.next) {
              case 0:
                return _context.abrupt("return", new Promise(function (resolve, reject) {
                  _amqplib.default.connect(_this.amqpAddress).then(function (conn) {
                    _this.conn = conn;
                    _this.initialized = true;
                    console.log('Worker connected to message queue');
                    resolve();
                  }).catch(function (err) {
                    reject("Error connecting to message queue: ".concat(err));
                  });
                }));

              case 1:
              case "end":
                return _context.stop();
            }
          }
        }, _callee);
      }));

      function init() {
        return _init.apply(this, arguments);
      }

      return init;
    }()
  }, {
    key: "handle",
    value: function handle(method, handler) {
      this.handlers.set(method, handler);
    }
  }, {
    key: "start",
    value: function start() {
      var _this2 = this;

      this.conn.createChannel().then(function (ch) {
        ch.assertQueue(_this2.readQueue, {
          durable: false
        });
        ch.assertQueue(_this2.writeQueue, {
          durable: true
        });
        ch.assertQueue(_this2.taskQueue, {
          durable: false
        });
        ch.prefetch(1);

        var consumeCallback = function consumeCallback(msg) {
          console.log("got message: ".concat(msg.content.toString()));
          Promise.resolve(msg.content.toString()).then(JSON.parse).then(function (req) {
            if (!req || !req.method || req.data === undefined) throw new Error('requests must have a method and data field'); // try to call a handler

            if (!_this2.handlers.has(req.method)) throw new Error("no handler found to handle method ".concat(req.method));
            return _this2.handlers.get(req.method)(req.data);
          }).then(function (res) {
            console.log("responding ".concat(res));
            ch.sendToQueue(msg.properties.replyTo, new Buffer.from(JSON.stringify(res)), {
              correlationId: msg.properties.correlationId
            });
            ch.ack(msg);
          }).catch(function (err) {
            console.error(err);
            ch.ack(msg);
            ch.sendToQueue(msg.properties.replyTo, new Buffer.from(JSON.stringify(err)), {
              correlationId: msg.properties.correlationId
            });
          });
        };

        console.log("consuming on ".concat(_this2.readQueue));
        ch.consume(_this2.readQueue, consumeCallback);
        console.log("consuming on ".concat(_this2.writeQueue));
        ch.consume(_this2.writeQueue, consumeCallback);
        console.log("consuming on ".concat(_this2.taskQueue));
        ch.consume(_this2.taskQueue, consumeCallback);
      }).catch(function (err) {
        console.error("failed to created channel: ".concat(err));
      });
    }
  }]);

  return Worker;
}();

exports.default = Worker;