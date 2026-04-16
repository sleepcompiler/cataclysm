# cataclysm

a hex-based multiplayer strategy game. you manage a deck of 25 cards—troops, buildings, and instincts—to fight on a hexagonal grid and destroy the opponent's cat tree.

the roster is mostly anime-inspired cats. they don't just upgrade linearly; they evolve mid-match based on specific triggers. some evolve after dying, some evolve after taking enough lifetime damage, and some evolve when you play specific catalyst cards on them. 

## tech stack

- **frontend**: svelte + vite
- **backend**: node.js and websockets
- **core logic**: shared typescript

the combat engine lives in the `shared/` directory. both the client and server run the exact same simulation code to ensure state stays perfectly synced and predictive pathing works without latency. the engine handles phase-based combat, so all movements are locked in and attacks resolve transitively based on unit speed stats.

## running it locally

requires node.js (v18+).

```bash
git clone https://github.com/fakeplastic-tree/catnip.git
cd catnip
npm install
npm run dev
```

this spins up both the frontend (localhost:5173) and the websocket server (localhost:3000) concurrently.

## mechanics

- **deckbuilder**: standard decks need exactly 25 cards and at least one stage 1 unit or building to be playable on turn 1. stage 2 and stage 3 units cannot be drafted directly.
- **matchmaking**: global queue for quick matches or 4-letter room codes for private games.
- **active abilities**: units have active skills ranging from lifesteal to marking delayed-execution countdowns on enemy units. these resolve via dedicated command queues.
