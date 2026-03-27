# 🐾 Catnip Conquest(placeholder name)

A lightweight, hex-based strategy game built with TypeScript(and Svelte). Commmand your cats, play your cards right, and protect your Cat Tower at all costs. 

Designed to be lightweight so it could be hosted on a slightly advanced toaster, or more specifically, an old Dell office laptop I found laying around. (I get the irony of using typescript for a project that aims to run on a potato, but it lets me share types between the client and server, and I'm lazy. I almost did commit to a rust rewrite but I had to stop myself)

## 🌟 Features

- **Real-time Multiplayer**: Powered by WebSockets with a custom `LobbyManager` for fast pairing.
- **Matchmaking**: 
  - **Quick Match**: FCFS (First-Come, First-Served) queue to get you into the action instantly.
  - **Private Match**: Generate a 4-character code and invite a friend.
- **Persistent Identity**: No accounts needed yet. Your UUID and chosen name stay with you via `localStorage`.
- **Hex Strategy**: BFS-based movement range calculation, symmetric map generation, and tactical positioning.
- **Card-Driven Mechanics**: Spend Catnip to spawn units, evolve your kittens (Stage 1 -> 2 -> 3), or buff your troops with Cardboard Boxes.
- **Dynamic Combat**: initiative-based speed system, damage popups, and a detailed combat log.

## 🏗️ How it Works

The architecture is split into three main layers to keep things decoupled:

1. **Lobby Layer**: Handles incoming WebSocket connections, `identify` messages, and the matchmaking queue.
2. **Match Layer (`MatchSession`)**: Manages the bridge between raw WebSockets and a specific game instance. It handles message broadcasting and client presence.
3. **Simulation Engine**: The core "brain" of the game. It processes moves, card plays, and combat ticks in a (as close to as possible)deterministic way.

## 🚀 Getting Started

### Prerequisites
- Node.js (Latest LTS)
- npm

### Installation

1. Clone the repo:
   ```bash
   git clone https://github.com/fakeplastic-tree/catnip.git
   cd catnip
   ```

2. Install dependencies (root, frontend, and backend):
   ```bash
   npm install
   cd backend && npm install
   cd ../frontend && npm install
   ```

### Running Locally

To start both the backend and frontend in development mode:
```bash
# From the root directory
npm start
```

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3000

## 🛠️ Tech Stack

- **Frontend**: Svelte + Vite (Canvas-based rendering)
- **Backend**: Node.js + TypeScript + `ws`
- **Shared**: Common types and constants for perfect sync between client and server.

---
