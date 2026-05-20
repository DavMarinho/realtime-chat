// server/rooms.js
const roomUsers  = {}; // { roomId: Set<socketId> }
const socketMeta = {}; // { socketId: { name, room } }

function joinRoom(socketId, roomId, userName) {
  const prev = socketMeta[socketId];
  if (prev) roomUsers[prev.room]?.delete(socketId);
  if (!roomUsers[roomId]) roomUsers[roomId] = new Set();
  roomUsers[roomId].add(socketId);
  socketMeta[socketId] = { name: userName, room: roomId };
  return prev;
}

function leaveRoom(socketId) {
  const meta = socketMeta[socketId];
  if (!meta) return null;
  roomUsers[meta.room]?.delete(socketId);
  delete socketMeta[socketId];
  return meta;
}

function getOnlineCount(roomId) {
  return roomUsers[roomId]?.size ?? 0;
}

// retorna lista de nomes únicos online numa sala
function getOnlineUsers(roomId) {
  const sids = roomUsers[roomId];
  if (!sids) return [];
  const names = new Set();
  sids.forEach(sid => { if (socketMeta[sid]) names.add(socketMeta[sid].name); });
  return Array.from(names).sort();
}

function getMeta(socketId) {
  return socketMeta[socketId] ?? null;
}

// retorna socketId de um usuário pelo nome numa sala (para DM)
function findSocketByName(roomId, name) {
  const sids = roomUsers[roomId];
  if (!sids) return null;
  for (const sid of sids) {
    if (socketMeta[sid]?.name === name) return sid;
  }
  return null;
}

module.exports = { joinRoom, leaveRoom, getOnlineCount, getOnlineUsers, getMeta, findSocketByName };