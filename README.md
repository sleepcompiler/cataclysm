# Catnip Conquest

a hex-based multiplayer strategy game. you manage a deck of 25 cards--troops, buildings, and instincts--to fight on a hexagonal grid and destroy the opponent's cat tree.

the roster is mostly anime-inspired cats. they don't just upgrade linearly; they evolve mid-match based on specific triggers. some evolve after dying, some evolve after taking enough lifetime damage, and some evolve when you play specific catalyst cards on them. 

## tech stack

- **frontend**: svelte + vite
- **backend**: node.js and websockets
- **core logic**: shared typescript

the combat engine lives in the `shared/` directory. both the client and server run the exact same simulation code to ensure state stays perfectly synced and predictive pathing works without latency. the engine handles phase-based combat, so all movements are locked in and attacks resolve transitively based on unit speed stats.

## running it locally

requires node.js (v18+).

```bash
git clone https://github.com/sleepcompiler/cataclysm.git
cd cataclysm
npm install
npm run dev
```

this spins up both the frontend (localhost:5173) and the websocket server (localhost:3000) concurrently.

## mechanics

- **deckbuilder**: standard decks need exactly 25 cards and at least one stage 1 unit or building to be playable on turn 1. stage 2 and stage 3 units cannot be played directly.
- **matchmaking**: global queue for quick matches or 4-letter room codes for private games.
- **active abilities**: units have active skills ranging from lifesteal to marking delayed-execution countdowns on enemy units. these resolve via dedicated command queues.
- **elo system**: automatic matchmaking rating updates upon match completion. ratings are stored in the database (`ratings` and `matches` collections) and rating changes are displayed on the Game Over screen.
- **easy read mode**: toggling this mode replaces the game's retro pixel font with highly readable sans-serif typography (Google Sans / Inter), excluding the main branding title.
- **how to play guide**: an interactive, tabbed instructions manual accessible directly from the main menu via the "?" button.

## roadmap

this project is in active development. here is what is planned for the future:

### phase 1: user accounts & persistence
- [ ] **user authentication**: implement secure sign-up, login, and session management .
- [ ] **player profiles**: track player stats, match history, win rates, and preferred cards.
- [ ] **persistent decks**: allow users to build and save multiple custom decks linked to their accounts.

### phase 2: ranked ladder & competitive play
- [x] **mmr / elo system**: implement a matchmaking rating system that accurately evaluates player skill.
- [ ] **ranked queues & matchmaking**: create a dedicated queue that matches players with similar mmr to ensure fair and competitive games.
- [ ] **leaderboards**: global and regional top 100 leaderboards displayed on the frontend.

### phase 3: core mechanics & expansion
- [ ] **expanded roster**: introduce new anime-inspired cat factions with unique evolution triggers and catalyst cards.
- [ ] **spectator mode**: allow players to watch live games from top-tier ladder matches or their friends.
- [ ] **tournaments**: built-in bracket systems for automated weekend tournaments.
- [ ] **animations & vfx**: polish the frontend rendering with smooth attack animations, spell effects, and board interactions.

