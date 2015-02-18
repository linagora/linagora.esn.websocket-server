'use strict';

var expect = require('chai').expect,
    mockery = require('mockery');

describe('The WebSockets server module', function() {

  beforeEach(function() {
    this.dependenciesByName = {
      logger: require('./logger')
    };
    var self = this;
    this.dependencies = function(name) {
      return self.dependenciesByName[name];
    };
  });

  it('should provide a start state', function() {
    var module = require('../../lib/index').WsServer;
    expect(module.settings.states.start).to.exist;
    expect(module.settings.states.start).to.be.a('function');
  });

  it('should contains all needed properties.', function() {
    var module = require('../../lib/index').WsServer;
    module.settings.states.lib(function() {}, function(err, wsserver) {
      expect(err).to.not.exist;
      expect(wsserver).to.exist;
      expect(wsserver).to.be.an.Object;
      expect(wsserver.namespaces).to.exist;
      expect(wsserver.namespaces).to.be.an.Array;
      expect(wsserver).to.have.property('server');
      expect(wsserver.server).to.be.null;
      expect(wsserver).to.have.property('port');
      expect(wsserver.port).to.be.null;
      expect(wsserver).to.have.property('started');
      expect(wsserver.started).to.be.false;
      expect(wsserver).to.have.property('start');
      expect(wsserver.start).to.be.a.Function;
    });
  });

  describe('the start property', function() {

    describe('when webserver port and wsserver port are different', function() {

      it('should call socket.io listen with a new express server', function(done) {
        var ioMock = function(target) {
          expect(target.name).to.equal('a new server');
          done();
        };

        var expressMock = function() {
          return {
            listen: function() {
              return {
                name: 'a new server',
                on: function() {}
              };
            }
          };
        };

        mockery.registerMock('socket.io', ioMock);
        mockery.registerMock('express', expressMock);

        var module = require('../../lib/index').WsServer;
        module.settings.states.lib(this.dependencies, function(err, wsserver) {
          expect(err).to.not.exist;
          wsserver.start(1234, function() {
          });
        });
      });
    });

    describe('when webserver port and wsserver port are equal', function() {

      it('should call socket.io listen with the express server as an argument', function(done) {
        var wsserver;
        var webserverMock = {
          port: 8080,
          server: 'sslserver'
        };
        this.dependenciesByName.webserver = webserverMock;

        var ioMock = function(target) {
          expect(wsserver.server).to.equal(webserverMock.server);
          expect(target).to.equal(webserverMock.server);
          return done();
        };

        mockery.registerMock('socket.io', ioMock);

        var module = require('../../lib/index').WsServer;
        module.settings.states.lib(this.dependencies, function(err, api) {
          expect(err).to.not.exist;
          wsserver = api;
          wsserver.start(8080, function() {});
          });
        });
      });

    });

    describe('when webserver ssl_port and wsserver port are equal', function() {

      it('should call socket.io listen with the express sslserver as an argument', function(done) {
        var wsserver;
        var webserverMock = {
          ssl_port: 443,
          sslserver: 'sslserver'
        };
        this.dependenciesByName.webserver = webserverMock;

        var ioMock = function(target) {
          expect(wsserver.server).to.equal(webserverMock.sslserver);
          expect(target).to.equal(webserverMock.sslserver);
          return done();
        };

        mockery.registerMock('socket.io', ioMock);

        var module = require('../../lib/index').WsServer;
        module.settings.states.lib(this.dependencies, function(err, api) {
          expect(err).to.not.exist;
          wsserver = api;
          wsserver.start(443, function() {});
        });
      });
    });

    it('should fire the callback when system is started', function(done) {
      var ioMock = function() {
        return {
          use: function() {},
          on: function() {}
        };
      };

      mockery.registerMock('./middleware/setup-sessions', function() {});
      mockery.registerMock('socket.io', ioMock);

      var module = require('../../lib/index').WsServer;
      module.settings.states.lib(this.dependencies, function(err, wsserver) {
        expect(err).to.not.exist;
        wsserver.start(function() {
          done();
        });
      });
    });


  describe('socket.io instance', function() {
    it('should add user on socket connection', function(done) {
      var events = require('events');
      var eventEmitter = new events.EventEmitter();
      eventEmitter.use = function() {};

      var ioMock = function() {
        return eventEmitter;
      };

      mockery.registerMock('socket.io', ioMock);

      var store = require('../../lib/socketstore')(this.dependencies('logger'));

      var module = require('../../lib/index').WsServer;
      module.settings.states.lib(this.dependencies, function(err, wsserver) {
        expect(err).to.not.exist;
        wsserver.start(function() {
          var socket = {
            id: 'socket1',
            request: {
              userId: '123'
            },
            on: function() {
            }
          };
          eventEmitter.emit('connection', socket);

          process.nextTick(function() {
            var socks = store.getSocketsForUser('123');
            expect(socks).to.have.length(1);
            expect(socks[0]).to.deep.equal(socket);
            done();
          });
        });
      });
    });

    it('should remove user on socket disconnect event', function(done) {
      var events = require('events');
      var ioEventEmitter = new events.EventEmitter();
      var util = require('util');

      function Socket(handshake) {
        this.request = handshake;
        events.EventEmitter.call(this);
      }
      util.inherits(Socket, events.EventEmitter);

      var ioMock = function() {
        ioEventEmitter.use = function() {};
        return ioEventEmitter;
      };

      mockery.registerMock('./middleware/setup-sessions', function() {});
      mockery.registerMock('socket.io', ioMock);

      var store = require('../../lib/socketstore')(this.dependencies('logger'));

      var module = require('../../lib/index').WsServer;
      module.settings.states.lib(this.dependencies, function(err, wsserver) {
        expect(err).to.not.exist;
        wsserver.start(function() {
          var socket = new Socket({userId: '123'});
          socket.id = 'socket1';
          ioEventEmitter.emit('connection', socket);

          process.nextTick(function() {
            socket.emit('disconnect');
            process.nextTick(function() {
              expect(store.getSocketsForUser('123')).to.have.length(0);
              done();
            });
          });
        });
      });
    });
  });

});
