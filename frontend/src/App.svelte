<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import MapView from './ui/mapView.svelte';
  import CardHand from './ui/cardHand.svelte';
  import UnitInfo from './ui/UnitInfo.svelte';
  import DeckBuilder from './ui/deckBuilder.svelte';
  
  import { connectGameServer, gameStateStore, playerIdStore, activeMatchIdStore } from './game/gameClient';

  let view: 'menu' | 'deckbuilder' | 'game' = 'menu';

  function joinGame(player: string) {
    const urlParams = new URLSearchParams(window.location.search);
    const requestedPlayer = urlParams.get('player') || player;
    
    $playerIdStore = requestedPlayer;
    connectGameServer("match_test_123", requestedPlayer);
    view = 'game';
  }

</script>

<main class="app-container">
  {#if view === 'menu'}
    <div class="menu">
      <h1>🐾 Catnip Conquest 🐾</h1>
      <button on:click={() => view = 'deckbuilder'}>Deck Builder</button>
      <div style="display: flex; gap: 10px;">
        <button on:click={() => joinGame('player1')}>Join as Player 1</button>
        <button on:click={() => joinGame('player2')}>Join as Player 2</button>
      </div>
    </div>
  {:else if view === 'deckbuilder'}
    <DeckBuilder on:back={() => view = 'menu'} />
  {:else if view === 'game'}
    {#if $gameStateStore}
      <div class="game-ui">
        <UnitInfo />
        <MapView />
        <CardHand />
      </div>
    {:else}
      <p>Connecting to server & waiting for state...</p>
    {/if}
  {/if}
</main>

<style>
  .app-container {
    width: 100vw;
    height: 100vh;
    font-family: 'Outfit', 'Inter', -apple-system, sans-serif;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: #fffafa; /* Very soft pink-white */
    color: #444;
  }

  .menu {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 1.5rem;
    background: linear-gradient(135deg, #ffcada 0%, #fffafa 100%);
  }

  h1 {
    font-size: 3.5rem;
    color: #ff6090;
    text-shadow: 2px 2px 0px white, 4px 4px 15px rgba(255, 96, 144, 0.3);
    margin-bottom: 2rem;
  }

  button {
    padding: 12px 32px;
    font-size: 1.25rem;
    font-weight: bold;
    cursor: pointer;
    background: #ff6090;
    color: white;
    border: none;
    border-radius: 50px; /* Super rounded / pill shaped */
    box-shadow: 0 4px 12px rgba(255, 96, 144, 0.4);
    transition: transform 0.2s, box-shadow 0.2s;
  }

  button:hover {
    transform: translateY(-2px) scale(1.05);
    box-shadow: 0 6px 20px rgba(255, 96, 144, 0.5);
    background: #ff7aa6;
  }

  button:active {
    transform: translateY(0) scale(0.98);
  }

  .game-ui {
    position: relative;
    width: 100%;
    height: 100%;
    background: #eef2f3;
  }
</style>
