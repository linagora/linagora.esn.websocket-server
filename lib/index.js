'use strict';

var io = require('socket.io');
var express = require('express');

var AwesomeModule = require('awesome-module');
var Dependency = AwesomeModule.AwesomeModuleDependency;
var MODULE_PREFIX = 'linagora.om.';
var socketioHelper = require('./helper/socketio');
var wsserver;
var WEBSOCKETS_NAMESPACES = ['/ws'];

function getWSServer(logger, webserver) {
  if (wsserver) {
    return wsserver;
  }

  wsserver = {
    server: null,
    port: null,
    started: false,
    namespaces: WEBSOCKETS_NAMESPACES
  };

  /*
   * options should be {'match origin protocol' : true, 'transports' : ['websocket']}
   * for ssl transport.
   */
  function start(port, options, callback) {
    if (arguments.length === 0) {
      logger.error('Websocket server start method should have at least 1 argument');
      process.exit(1);
    }

    callback = callback || options || function() {};

    function listenCallback(err) {
      wsserver.server.removeListener('listening', listenCallback);
      wsserver.server.removeListener('error', listenCallback);
      callback(err);
    }

    if (wsserver.started) {
      return callback();
    }
    wsserver.started = true;

    wsserver.port = port;
    var realCallback = callback;

    if (webserver && webserver.sslserver && webserver.ssl_port === wsserver.port) {
      logger.debug('websocket server will be attached to the IPv4 SSL Express server');
      wsserver.server = webserver.sslserver;
    } else if (webserver && webserver.server && webserver.port === wsserver.port) {
      logger.debug('websocket server will be attached to the IPv4 Express server');
      wsserver.server = webserver.server;
    } else if (webserver && webserver.sslserver6 && webserver.ssl_port === wsserver.port) {
      logger.debug('websocket server will be attached to the IPv6 SSL Express server');
      wsserver.server = webserver.sslserver6;
    } else if (webserver && webserver.server6 && webserver.port === wsserver.port) {
      logger.debug('websocket server will be attached to the IPv6 Express server');
      wsserver.server = webserver.server6;
    } else {
      logger.debug('websocket server will launch a new Express server');
      wsserver.server = express().listen(wsserver.port);
      wsserver.server.on('listening', listenCallback);
      wsserver.server.on('error', listenCallback);
      realCallback = function() {};
    }

    var store = require('./socketstore')(logger);

    var sio = io(wsserver.server, options);
    if (sio) {
      sio.on('connection', function(socket) {
        var user = socketioHelper.getUserId(socket);
        store.registerSocket(socket);
        logger.info('Socket is connected for user = ' + user);
        socket.on('disconnect', function() {
          logger.info('Socket is disconnected for user = ' + user);
          store.unregisterSocket(socket);
        });
      });
      wsserver.io = sio;
    }
    return realCallback();
  }

  wsserver.start = start;
  return wsserver;
}

var awesomeWsServer = new AwesomeModule(MODULE_PREFIX + 'wsserver', {
  dependencies: [
    new Dependency(Dependency.TYPE_ABILITY, 'config', 'config'),
    new Dependency(Dependency.TYPE_ABILITY, 'webserver', 'webserver'),
    new Dependency(Dependency.TYPE_ABILITY, 'logger', 'logger')
  ],
  states: {
    lib: function(dependencies, callback) {
      var logger = dependencies('logger');
      var webserver = dependencies('webserver');
      var api = getWSServer(logger, webserver);
      return callback(null, api);
    },
    start: function(dependencies, callback) {
      var config = dependencies('config')('default');
      var logger = dependencies('logger');

      if (!config.wsserver.enabled) {
        logger.warn('The websocket server will not start as expected by the configuration.');
        return callback();
      }

      wsserver.start(config.wsserver.port, config.wsserver.options, function(err) {
        if (err) {
          logger.error('websocket server failed to start', err);
        }
        callback.apply(this, arguments);
      });
    }
  }
});

/**
 *
 * @type {AwesomeModule}
 */
module.exports.WsServer = awesomeWsServer;
