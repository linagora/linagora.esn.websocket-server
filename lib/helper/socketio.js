'use strict';

function getUserSocketsFromNamespace(userId, nsSockets, store) {
  var userSockets = store.getSocketsForUser(userId);
  var namespaceSocketIds = {};
  nsSockets.forEach(function(socket) {
    namespaceSocketIds[socket.id] = socket;
  });
  var nsUserSockets = userSockets.filter(function(socket) {
    return (socket.id in namespaceSocketIds);
  })
  .map(function(socket) {
    return namespaceSocketIds[socket.id];
  });
  return nsUserSockets;
}

function getInfos(socket) {
  if (!socket || !socket.request) {
    return null;
  }
  var request = socket.request,
      remoteAddress, remotePort;
  if (request.client && request.client._peername) {
    remoteAddress = request.client._peername.address;
    remotePort = request.client._peername.port;
  }
  return {
    userId: request.userId,
    query: request._query,
    headers: request.headers,
    remoteAddress: remoteAddress,
    remotePort: remotePort
  };
}

function setUserId(socket, userId) {
  socket.request.userId = userId;
}

function getUserId(socket) {
  if (!socket.request) {
    return null;
  }
  return socket.request.userId;
}

/**
 *
 * @type {getUserSocketsFromNamespace}
 */
module.exports.getUserSocketsFromNamespace = getUserSocketsFromNamespace;
/**
 *
 * @type {getInfos}
 */
module.exports.getInfos = getInfos;
/**
 *
 * @type {setUserId}
 */
module.exports.setUserId = setUserId;
/**
 *
 * @type {getUserId}
 */
module.exports.getUserId = getUserId;
