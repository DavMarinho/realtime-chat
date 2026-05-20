# 💬 Pulse Chat

A real-time chat application built with Node.js, Socket.io, and vanilla JavaScript — featuring a clean, minimal UI with dark/light mode.

![Pulse Chat Preview](https://raw.githubusercontent.com/yourusername/realtime-chat/main/preview.png)

## ✨ Features

- **Real-time messaging** — instant delivery via WebSockets
- **Multiple rooms** — switch between channels like #geral, #dev, #design, #random
- **Typing indicator** — shows when someone is typing
- **Message history** — last 50 messages per room, persisted on the server
- **Online counter** — live count of users in each room
- **Emoji picker** — 11 categories including flags 🇧🇷
- **Dark / Light mode** — auto-detects system preference
- **Responsive** — works on desktop, tablet, and mobile
- **Rate limiting** — 10 messages per 5 seconds per user

## 🛠 Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Server | Express |
| WebSocket | Socket.io |
| Persistence | JSON file (server-side) |
| Frontend | HTML + CSS + Vanilla JS |
| Fonts | DM Sans + JetBrains Mono |
| Deploy | Railway |

## 📁 Project Structure

```
realtime-chat/
├── server/
│   ├── index.js        # Express + Socket.io server
│   └── rooms.js        # Online user management per room
├── public/
│   ├── index.html      # UI + all client logic
│   ├── style.css       # Styles + dark mode + responsive
│   └── client.js       # Socket.io client (reference)
├── railway.json        # Railway deploy config
└── package.json
```

## 🚀 Running Locally

```bash
# Clone the repository
git clone https://github.com/yourusername/realtime-chat.git
cd realtime-chat

# Install dependencies
npm install

# Start development server (with hot reload)
npm run dev

# Start production server
npm start
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## 🌐 Socket.io Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `join_room` | client → server | Join a room with username |
| `send_message` | client → server | Send a message to current room |
| `typing_start` | client → server | User started typing |
| `typing_stop` | client → server | User stopped typing |
| `message_history` | server → client | Last 50 messages on room join |
| `new_message` | server → room | Broadcast new message |
| `user_joined` | server → room | User joined notification |
| `user_left` | server → room | User left notification |
| `user_typing` | server → room | Typing indicator |
| `user_stop_typing` | server → room | Stop typing indicator |

## 📱 Responsive Breakpoints

| Breakpoint | Behavior |
|------------|----------|
| > 768px | Sidebar always visible |
| ≤ 768px | Sidebar becomes a slide-in drawer |
| ≤ 480px | Full mobile layout, touch optimized |

## 🔧 Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3000` | Server port |

## 📦 Deploy on Railway

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app)

1. Push this repo to GitHub
2. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub**
3. Select this repository
4. Go to **Settings** → **Domains** → **Generate Domain**

## 📄 License

MIT