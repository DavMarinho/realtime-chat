// server/rooms.js
// Gerencia usuários online e metadados das salas

const roomUsers  = {}; // { roomId: Set<socketId> }
const socketMeta = {}; // { socketId: { name, room } }

function joinRoom(socketId, roomId, userName) {
  const prev = socketMeta[socketId];

  // remove da sala anterior se existir
  if (prev) {
    roomUsers[prev.room]?.delete(socketId);
  }

  if (!roomUsers[roomId]) roomUsers[roomId] = new Set();
  roomUsers[roomId].add(socketId);
  socketMeta[socketId] = { name: userName, room: roomId };

  return prev; // retorna sala anterior para notificar saída
}

function leaveRoom(socketId) {
  const meta = socketMeta[socketId];
  if (!meta) return null;

  roomUsers[meta.room]?.delete(socketId);
  delete socketMeta[socketId];

  return meta; // retorna { name, room } para notificar saída
}

function getOnlineCount(roomId) {
  return roomUsers[roomId]?.size ?? 0;
}

function getMeta(socketId) {
  return socketMeta[socketId] ?? null;
}

module.exports = { joinRoom, leaveRoom, getOnlineCount, getMeta };