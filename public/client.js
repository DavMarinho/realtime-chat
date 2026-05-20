// public/client.js
const socket = io();

// ── Estado local ───────────────────────────────────────────────────
let currentUser = null;
let currentRoom = null;

// ── Helpers ────────────────────────────────────────────────────────
function timeStr(iso) {
  const d = iso ? new Date(iso) : new Date();
  return d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
}

function dateStr() {
  return new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function initials(name) {
  return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '?';
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// cores por usuário (índice pelo nome)
const COLOR_LIGHT = [
  { bg: '#EEEDFE', text: '#3C3489' },
  { bg: '#E1F5EE', text: '#0F6E56' },
  { bg: '#FAECE7', text: '#993C1D' },
  { bg: '#FBEAF0', text: '#993556' },
  { bg: '#E6F1FB', text: '#185FA5' },
  { bg: '#EAF3DE', text: '#3B6D11' },
  { bg: '#FAEEDA', text: '#854F0B' },
];
const COLOR_DARK = [
  { bg: '#26215C', text: '#AFA9EC' },
  { bg: '#04342C', text: '#5DCAA5' },
  { bg: '#4A1B0C', text: '#F0997B' },
  { bg: '#4B1528', text: '#ED93B1' },
  { bg: '#042C53', text: '#85B7EB' },
  { bg: '#173404', text: '#97C459' },
  { bg: '#412402', text: '#EF9F27' },
];

function colorFor(name) {
  const idx = name.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % COLOR_LIGHT.length;
  return isDark() ? COLOR_DARK[idx] : COLOR_LIGHT[idx];
}

function isDark() {
  return document.documentElement.getAttribute('data-theme') === 'dark';
}

// ── DOM refs ───────────────────────────────────────────────────────
const messagesWrap   = document.getElementById('messages-wrap');
const typingRow      = document.getElementById('typing-row');
const typingLabel    = document.getElementById('typing-label');
const typingAvatar   = document.getElementById('typing-avatar');
const onlineCount    = document.getElementById('online-count');
const chatRoomName   = document.getElementById('chat-room-name');
const chatRoomMeta   = document.getElementById('chat-room-meta');
const messageInput   = document.getElementById('message-input');
const sendBtn        = document.getElementById('send-btn');
const hintText       = document.getElementById('hint-text');
const charCount      = document.getElementById('char-count');
const myNameDisplay  = document.getElementById('my-name-display');
const myInitialsEl   = document.getElementById('my-initials');
const myAvatarEl     = document.getElementById('my-avatar');

// ── Render helpers ─────────────────────────────────────────────────
function scrollToBottom() {
  messagesWrap.scrollTo({ top: messagesWrap.scrollHeight, behavior: 'smooth' });
}

function appendSystemEvent(text) {
  const el = document.createElement('div');
  el.className = 'sys-event';
  el.innerHTML = `<div class="sys-dot"></div><span>${escHtml(text)}</span><div class="sys-dot"></div>`;
  messagesWrap.insertBefore(el, typingRow);
  scrollToBottom();
}

function appendMessage({ id, user, text, time, own, read }) {
  const col = colorFor(user);
  const row = document.createElement('div');
  row.className = 'msg-row' + (own ? ' own' : '');
  row.dataset.id = id;

  const avatarHtml = `<div class="msg-avatar" style="background:${col.bg};color:${col.text}">${initials(user)}</div>`;
  const checkHtml  = own ? `<span class="msg-read">${read ? '✓✓' : '✓'}</span>` : '';

  row.innerHTML = `
    ${own ? '' : avatarHtml}
    <div class="msg-content">
      ${own ? '' : `<div class="msg-sender">${escHtml(user)}</div>`}
      <div class="bubble">${escHtml(text)}</div>
      <div class="msg-meta">
        <span class="msg-time">${time}</span>
        ${checkHtml}
      </div>
    </div>
    ${own ? avatarHtml : ''}
  `;

  messagesWrap.insertBefore(row, typingRow);
  scrollToBottom();
}

function clearMessages() {
  // remove tudo exceto o typing-row
  Array.from(messagesWrap.children).forEach(el => {
    if (el.id !== 'typing-row') el.remove();
  });
}

function showTyping(name) {
  const col = colorFor(name);
  typingAvatar.textContent = initials(name);
  typingAvatar.style.background = col.bg;
  typingAvatar.style.color = col.text;
  typingLabel.textContent = name + ' está digitando';
  typingRow.classList.add('visible');
  scrollToBottom();
}

function hideTyping() {
  typingRow.classList.remove('visible');
}

function updateOnlineCount(n) {
  onlineCount.textContent = n + ' online';
}

function showToast(msg) {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast';
  t.textContent = msg;
  c.appendChild(t);
  requestAnimationFrame(() => requestAnimationFrame(() => t.classList.add('show')));
  setTimeout(() => { t.classList.add('hide'); setTimeout(() => t.remove(), 300); }, 2800);
}

// ── Socket events ──────────────────────────────────────────────────
socket.on('message_history', (messages) => {
  clearMessages();

  const divider = document.createElement('div');
  divider.className = 'date-divider';
  divider.innerHTML = `<span>hoje — ${dateStr()}</span>`;
  messagesWrap.insertBefore(divider, typingRow);

  const join = document.createElement('div');
  join.className = 'sys-event';
  join.innerHTML = `<div class="sys-dot"></div><span>Você entrou na sala</span><div class="sys-dot"></div>`;
  messagesWrap.insertBefore(join, typingRow);

  messages.forEach(msg => appendMessage({
    id:   msg.id,
    user: msg.user,
    text: msg.text,
    time: timeStr(msg.created_at),
    own:  msg.user === currentUser,
    read: true,
  }));

  scrollToBottom();
});

socket.on('new_message', (msg) => {
  appendMessage({
    id:   msg.id,
    user: msg.user,
    text: msg.text,
    time: timeStr(msg.created_at),
    own:  msg.user === currentUser,
    read: msg.user !== currentUser,
  });

  // marca como lido após 800ms se for própria mensagem
  if (msg.user === currentUser) {
    setTimeout(() => {
      const row = messagesWrap.querySelector(`[data-id="${msg.id}"] .msg-read`);
      if (row) row.textContent = '✓✓';
    }, 800);
  }

  // atualiza preview da sala na sidebar
  const roomItem = document.querySelector(`.room-item[data-room="${msg.room || currentRoom}"] .room-preview`);
  if (roomItem) roomItem.textContent = (msg.user === currentUser ? 'Você' : msg.user) + ': ' + msg.text;
});

socket.on('user_joined', ({ user, online }) => {
  if (user !== currentUser) appendSystemEvent(`${user} entrou na sala`);
  updateOnlineCount(online);
});

socket.on('user_left', ({ user, online }) => {
  appendSystemEvent(`${user} saiu`);
  updateOnlineCount(online);
});

socket.on('user_typing',      ({ user }) => showTyping(user));
socket.on('user_stop_typing', ()         => hideTyping());
socket.on('rate_limit',       ({ message }) => showToast(message));

socket.on('disconnect', () => showToast('Conexão perdida. Reconectando...'));
socket.on('connect', () => {
  if (currentRoom && currentUser) {
    socket.emit('join_room', { room: currentRoom, user: currentUser });
    showToast('Reconectado ✓');
  }
});

// ── Public API (usada pelo index.html) ─────────────────────────────
let typingDebounce;

window.Chat = {
  login(name) {
    currentUser = name;
    myNameDisplay.textContent = name;
    myInitialsEl.textContent  = initials(name);
    const col = colorFor(name);
    myAvatarEl.style.background = col.bg;
    myAvatarEl.style.color      = col.text;
  },

  joinRoom(roomId, roomName, roomDesc) {
    currentRoom = roomId;
    chatRoomName.textContent = '#' + roomName;
    chatRoomMeta.textContent = roomDesc;
    messageInput.disabled = false;
    sendBtn.disabled = true;
    hintText.textContent = 'Enter para enviar · Shift+Enter para nova linha';

    // atualiza sidebar
    document.querySelectorAll('.room-item').forEach(el => el.classList.remove('active'));
    document.querySelector(`.room-item[data-room="${roomId}"]`)?.classList.add('active');

    // zera badge
    const badge = document.querySelector(`.room-item[data-room="${roomId}"] .room-badge`);
    if (badge) badge.remove();

    socket.emit('join_room', { room: roomId, user: currentUser });
  },

  sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !currentRoom) return;
    socket.emit('send_message', { text });
    messageInput.value = '';
    messageInput.style.height = '';
    sendBtn.disabled = true;
    charCount.textContent = '';
    socket.emit('typing_stop');
    clearTimeout(typingDebounce);
  },

  onTyping() {
    socket.emit('typing_start');
    clearTimeout(typingDebounce);
    typingDebounce = setTimeout(() => socket.emit('typing_stop'), 2000);
  },

  logout() {
    currentUser = null;
    currentRoom = null;
    clearMessages();
  },
};