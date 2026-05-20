// server/index.js
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const path       = require('path');
const fs         = require('fs');
const rooms      = require('./rooms');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, { cors: { origin: '*' } });
const PORT   = process.env.PORT || 3000;

// ── Persistência JSON ──────────────────────────────────────────────
const DB_PATH = path.join(__dirname, 'messages.json');

function loadMessages() {
  try { return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); }
  catch { return {}; }
}
function saveMessages(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data), 'utf8');
}
function insertMessage(room, user, text) {
  const data = loadMessages();
  if (!data[room]) data[room] = [];
  const msg = { id: Date.now(), room, user, text, created_at: new Date().toISOString() };
  data[room].push(msg);
  if (data[room].length > 200) data[room] = data[room].slice(-200);
  saveMessages(data);
  return msg;
}
function getMessages(room) {
  return (loadMessages()[room] || []).slice(-50);
}

// DM room id — sempre o mesmo par independente da ordem
function dmRoomId(a, b) {
  return 'dm:' + [a, b].sort().join(':');
}

// ── Static ─────────────────────────────────────────────────────────
app.use(express.static(path.join(__dirname, '..', 'public')));

// ── Rate limit ─────────────────────────────────────────────────────
const msgRates = {};
function isRateLimited(sid) {
  const now = Date.now();
  if (!msgRates[sid]) msgRates[sid] = [];
  msgRates[sid] = msgRates[sid].filter(t => now - t < 5000);
  if (msgRates[sid].length >= 10) return true;
  msgRates[sid].push(now);
  return false;
}

// ── Socket.io ──────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[+] ${socket.id}`);

  // ── join room ────────────────────────────────────────────────────
  socket.on('join_room', ({ room, user }) => {
    if (!room || !user) return;
    const name = String(user).trim().slice(0, 24);
    const rid  = String(room).trim().slice(0, 64);

    const prev = rooms.joinRoom(socket.id, rid, name);
    if (prev) {
      socket.leave(prev.room);
      io.to(prev.room).emit('user_left',  { user: prev.name, online: rooms.getOnlineCount(prev.room), users: rooms.getOnlineUsers(prev.room) });
    }

    socket.join(rid);
    socket.emit('message_history', getMessages(rid));
    socket.emit('online_users', { users: rooms.getOnlineUsers(rid), online: rooms.getOnlineCount(rid) });
    io.to(rid).emit('user_joined', { user: name, online: rooms.getOnlineCount(rid), users: rooms.getOnlineUsers(rid) });
    console.log(`[sala] ${name} → #${rid}`);
  });

  // ── send message ─────────────────────────────────────────────────
  socket.on('send_message', ({ text }) => {
    const meta = rooms.getMeta(socket.id);
    if (!meta) return;
    const clean = String(text ?? '').trim().slice(0, 500);
    if (!clean) return;
    if (isRateLimited(socket.id)) { socket.emit('rate_limit', { message: 'Devagar! Muitas mensagens.' }); return; }
    const msg = insertMessage(meta.room, meta.name, clean);
    io.to(meta.room).emit('new_message', msg);
  });

  // ── open DM ──────────────────────────────────────────────────────
  socket.on('open_dm', ({ targetUser }) => {
    const meta = rooms.getMeta(socket.id);
    if (!meta || !targetUser || targetUser === meta.name) return;

    const rid = dmRoomId(meta.name, targetUser);

    // entra na sala DM
    const prev = rooms.joinRoom(socket.id, rid, meta.name);
    if (prev) socket.leave(prev.room);
    socket.join(rid);
    socket.emit('dm_opened', { roomId: rid, with: targetUser, history: getMessages(rid) });

    // notifica o outro usuário em qualquer sala onde esteja
    io.sockets.sockets.forEach((s) => {
      const m = rooms.getMeta(s.id);
      if (m && m.name === targetUser) {
        s.join(rid);
        s.emit('dm_received', { roomId: rid, from: meta.name, history: getMessages(rid) });
      }
    });
  });

  // ── typing ────────────────────────────────────────────────────────
  let typingTimer;
  socket.on('typing_start', () => {
    const meta = rooms.getMeta(socket.id);
    if (!meta) return;
    socket.to(meta.room).emit('user_typing', { user: meta.name });
    clearTimeout(typingTimer);
    typingTimer = setTimeout(() => socket.to(meta.room).emit('user_stop_typing', { user: meta.name }), 3000);
  });
  socket.on('typing_stop', () => {
    const meta = rooms.getMeta(socket.id);
    if (!meta) return;
    clearTimeout(typingTimer);
    socket.to(meta.room).emit('user_stop_typing', { user: meta.name });
  });

  // ── disconnect ────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const meta = rooms.leaveRoom(socket.id);
    if (meta) io.to(meta.room).emit('user_left', { user: meta.name, online: rooms.getOnlineCount(meta.room), users: rooms.getOnlineUsers(meta.room) });
    delete msgRates[socket.id];
    console.log(`[-] ${socket.id}`);
  });
});

server.listen(PORT, '0.0.0.0', () => console.log(`\n🟣 http://0.0.0.0:${PORT}\n`));