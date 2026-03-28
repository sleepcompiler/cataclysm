<script lang="ts">
  import MapView from './ui/mapView.svelte';
  import GameSidebar from './ui/GameSidebar.svelte';
  import CardHand from './ui/cardHand.svelte';
  import UnitInfo from './ui/UnitInfo.svelte';
  import DeckBuilder from './ui/deckBuilder.svelte';

  import {
    gameStateStore,
    playerIdStore,
    playerNameStore,
    lobbyStatusStore,
    queuePositionStore,
    privateCodeStore,
    lobbyErrorStore,
    savePlayerName,
    joinQueue,
    leaveQueue,
    createPrivateMatch,
    joinPrivateMatch,
  } from './game/gameClient';

  import { decksStore, selectedDeckNameStore } from './game/deckStore';
  import { validateDeck } from '@hex-strategy/shared';

  let view: 'menu' | 'deckbuilder' | 'game' = 'menu';
  let privateCodeInput = '';
  let showJoinPrivate = false;
  let nameInput = $playerNameStore;
  let showLog = false;
  let showDeckSelect = false;

  $: if ($lobbyStatusStore === 'in_match') {
    view = 'game';
  }

  function handleNameChange() {
    if (nameInput.trim()) savePlayerName(nameInput.trim());
  }

  function selectDeck(name: string) {
    const deck = $decksStore[name];
    if (!deck || !validateDeck(deck.cards).valid) return;
    selectedDeckNameStore.set(name);
    showDeckSelect = false;
  }
</script>

<main class="app-container">
  {#if view === 'menu'}
    <div class="menu">
      {#if $lobbyErrorStore}
        <div class="error-banner">
          <span>{$lobbyErrorStore}</span>
          <button class="close-error" on:click={() => lobbyErrorStore.set(null)}>×</button>
        </div>
      {/if}
      <h1>🐾 Catnip Conquest 🐾</h1>

      <!-- Player name -->
      <div class="name-row">
        <input
          class="name-input"
          bind:value={nameInput}
          on:blur={handleNameChange}
          on:keydown={e => e.key === 'Enter' && handleNameChange()}
          placeholder="Your name"
          maxlength="20"
        />
      </div>

      <!-- Deck Selector -->
      <div class="deck-selector">
        <div class="current-selection" on:click={() => showDeckSelect = !showDeckSelect}>
          <span class="label">Playing with:</span>
          <span class="deck-name">{$selectedDeckNameStore}</span>
          <span class="chevron">{showDeckSelect ? '▲' : '▼'}</span>
        </div>

        {#if showDeckSelect}
          <div class="deck-dropdown">
            {#each Object.entries($decksStore) as [name, deck]}
              {@const isValid = validateDeck(deck.cards).valid}
              <div 
                class="deck-option" 
                class:selected={name === $selectedDeckNameStore}
                class:invalid={!isValid}
                on:click={() => isValid && selectDeck(name)}
              >
                <div class="option-info">
                  <span class="name">{name}</span>
                  {#if !isValid}
                    <span class="error-tag">Invalid (25 cards required)</span>
                  {/if}
                </div>
                {#if name === $selectedDeckNameStore}
                  <span class="check">✓</span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>

      {#if $lobbyStatusStore === 'idle'}
        <div class="button-group">
          <button class="btn-primary" on:click={joinQueue}>⚔️ Quick Match</button>
          <button class="btn-secondary" on:click={() => view = 'deckbuilder'}>📖 Deck Builder</button>
        </div>

        <div class="private-section">
          {#if !showJoinPrivate}
            <button class="btn-ghost" on:click={createPrivateMatch}>🔒 Create Private Match</button>
            <button class="btn-ghost" on:click={() => showJoinPrivate = true}>🔑 Join Private Match</button>
          {:else}
            <div class="code-row">
              <input class="code-input" bind:value={privateCodeInput} placeholder="Enter code" maxlength="4" />
              <button class="btn-primary" on:click={() => joinPrivateMatch(privateCodeInput.toUpperCase())}>Join</button>
              <button class="btn-ghost" on:click={() => showJoinPrivate = false}>Cancel</button>
            </div>
          {/if}
        </div>

      {:else if $lobbyStatusStore === 'queued'}
        <div class="status-badge searching">
          <span class="spinner">⟳</span> Searching... (#{$queuePositionStore})
        </div>
        <button class="btn-ghost" on:click={leaveQueue}>Cancel</button>

      {:else if $lobbyStatusStore === 'in_private'}
        <div class="status-badge private">
          Your code: <strong class="code-display">{$privateCodeStore}</strong>
        </div>
        <p class="hint">Share this with a friend to start.</p>
        <button class="btn-ghost" on:click={() => lobbyStatusStore.set('idle')}>Cancel</button>
      {/if}
    </div>

  {:else if view === 'deckbuilder'}
    <DeckBuilder on:back={() => view = 'menu'} />

  {:else if view === 'game'}
    {#if $gameStateStore}
      <div class="game-ui">
        <div class="info-layer">
          <UnitInfo />
        </div>
        <div class="map-layer">
          <MapView />
        </div>
        <div class="hand-layer">
          <CardHand />
        </div>
        <div class="sidebar-layer">
          <GameSidebar {showLog} toggleLog={() => showLog = !showLog} />
        </div>
      </div>
    {:else}
      <p class="connecting">Connecting to match...</p>
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
    background: #fffafa;
    color: #444;
  }

  .menu {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 1.2rem;
    background: linear-gradient(135deg, #ffcada 0%, #fffafa 100%);
  }

  h1 {
    font-size: 3.5rem;
    color: #ff6090;
    text-shadow: 2px 2px 0px white, 4px 4px 15px rgba(255, 96, 144, 0.3);
    margin-bottom: 1rem;
  }

  /* Name row */
  .name-row {
    margin-bottom: 0.5rem;
  }

  .name-input {
    padding: 10px 20px;
    font-size: 1.1rem;
    border: 2px solid #ffdde8;
    border-radius: 50px;
    outline: none;
    background: rgba(255,255,255,0.9);
    color: #444;
    text-align: center;
    transition: all 0.2s;
    width: 240px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  }

  .name-input:focus {
    border-color: #ff6090;
    background: white;
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 96, 144, 0.1);
  }

  .deck-selector {
    position: relative;
    width: 280px;
    margin-bottom: 1.5rem;
    z-index: 100;
  }

  .current-selection {
    background: white;
    padding: 0.8rem 1.2rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(0,0,0,0.05);
    border: 2px solid #ffdde8;
    transition: all 0.2s;
  }

  .current-selection:hover {
    border-color: #ff6090;
    transform: translateY(-2px);
  }

  .label {
    font-size: 0.8rem;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.05rem;
  }

  .deck-name {
    flex: 1;
    font-weight: bold;
    color: #444;
  }

  .chevron {
    color: #ff6090;
    font-size: 0.8rem;
  }

  .deck-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    background: white;
    border-radius: 12px;
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
    border: 1px solid #ffdde8;
    overflow: hidden;
    animation: slideDownFade 0.2s ease-out;
  }

  @keyframes slideDownFade {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .deck-option {
    padding: 1rem 1.2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    cursor: pointer;
    border-bottom: 1px solid #fff0f5;
    transition: background 0.2s;
  }

  .deck-option:last-child {
    border-bottom: none;
  }

  .deck-option:hover:not(.invalid) {
    background: #fffafa;
  }

  .deck-option.selected {
    background: #fff5f8;
  }

  .deck-option.invalid {
    opacity: 0.5;
    cursor: not-allowed;
    background: #f8fafc;
  }

  .option-info {
    display: flex;
    flex-direction: column;
    gap: 0.2rem;
  }

  .option-info .name {
    font-weight: 600;
  }

  .error-tag {
    font-size: 0.7rem;
    color: #ef4444;
    font-weight: bold;
  }

  .check {
    color: #ff6090;
    font-weight: bold;
  }

  /* Buttons */
  .button-group {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    justify-content: center;
  }

  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    border-radius: 50px;
    font-weight: bold;
    transition: transform 0.15s, box-shadow 0.15s;
  }

  button:hover {
    transform: translateY(-2px) scale(1.04);
  }

  button:active {
    transform: translateY(0) scale(0.97);
  }

  .btn-primary {
    padding: 12px 32px;
    font-size: 1.2rem;
    background: #ff6090;
    color: white;
    box-shadow: 0 4px 12px rgba(255, 96, 144, 0.4);
  }

  .btn-primary:hover {
    background: #ff7aa6;
    box-shadow: 0 6px 20px rgba(255, 96, 144, 0.5);
  }

  .btn-secondary {
    padding: 12px 28px;
    font-size: 1.1rem;
    background: #ffe0ec;
    color: #cc4477;
    box-shadow: 0 2px 8px rgba(255, 96, 144, 0.2);
  }

  .btn-secondary:hover {
    background: #ffd0e0;
  }

  .btn-ghost {
    padding: 8px 20px;
    font-size: 0.95rem;
    background: transparent;
    color: #cc4477;
    border: 2px solid #ffa0c0;
  }

  .btn-ghost:hover {
    background: rgba(255,192,215,0.3);
  }

  /* Private section */
  .private-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .code-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  .code-input {
    padding: 8px 16px;
    font-size: 1.1rem;
    font-weight: bold;
    letter-spacing: 0.2em;
    text-transform: uppercase;
    border: 2px solid #ffa0c0;
    border-radius: 50px;
    outline: none;
    background: rgba(255,255,255,0.8);
    color: #444;
    width: 100px;
    text-align: center;
    transition: border-color 0.2s;
  }

  .code-input:focus {
    border-color: #ff6090;
  }

  /* Status badges */
  .status-badge {
    padding: 12px 28px;
    border-radius: 50px;
    font-size: 1.1rem;
    font-weight: bold;
  }

  .status-badge.searching {
    background: #fff0b0;
    color: #886600;
    border: 2px solid #ffdd44;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .status-badge.private {
    background: #e8f0ff;
    color: #3355cc;
    border: 2px solid #99aaff;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .code-display {
    font-size: 1.5rem;
    letter-spacing: 0.2em;
    font-family: monospace;
  }

  .hint {
    font-size: 0.85rem;
    color: #888;
    margin: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .spinner {
    display: inline-block;
    animation: spin 1s linear infinite;
    font-size: 1.3rem;
  }

  /* Game view */
  .game-ui {
    display: grid;
    width: 100vw;
    height: 100vh;
    background: #000;
    overflow: hidden;
  }

  /* Default (Portrait) */
  @media (orientation: portrait) {
    .game-ui {
      grid-template-rows: 1fr auto;
      grid-template-columns: 100%;
    }
    .map-layer { grid-row: 1; grid-column: 1; }
    .hand-layer { grid-row: 2; grid-column: 1; }
    .info-layer { grid-row: 1 / 3; grid-column: 1; z-index: 5000; pointer-events: none; }
    .sidebar-layer { grid-row: 1; grid-column: 1; z-index: 500; pointer-events: none; }
  }

  /* Landscape (Desktop/Tablet) */
  @media (orientation: landscape) {
    .game-ui {
      grid-template-columns: 1fr 320px;
      grid-template-rows: 1fr auto;
    }
    .map-layer { grid-row: 1; grid-column: 1; }
    .hand-layer { grid-row: 2; grid-column: 1; }
    .sidebar-layer { grid-row: 1 / 3; grid-column: 2; }
    /* Ensure info layer is strictly above map and cards */
    .info-layer { grid-row: 1 / 3; grid-column: 1; z-index: 5000; pointer-events: none; }
  }

  /* Shared layer styles */
  .map-layer, .hand-layer, .info-layer, .sidebar-layer {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 0;
  }

  .info-layer { pointer-events: none; }
  .info-layer > :global(*) { pointer-events: auto; }
  .sidebar-layer { pointer-events: none; }
  .sidebar-layer > :global(*) { pointer-events: auto; }

  .connecting {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    font-size: 1.2rem;
    color: #888;
  }

  /* Error Banner */
  .error-banner {
    position: absolute;
    top: 2rem;
    width: 90%;
    max-width: 500px;
    background: #ff5555;
    color: white;
    padding: 12px 20px;
    border-radius: 12px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 15px rgba(255, 0, 0, 0.2);
    z-index: 100;
    font-weight: bold;
    animation: slideDown 0.3s ease-out;
  }

  .close-error {
    background: rgba(255,255,255,0.2) !important;
    border: none !important;
    color: white !important;
    width: 24px !important;
    height: 24px !important;
    padding: 0 !important;
    font-size: 1.2rem !important;
    line-height: 1 !important;
    box-shadow: none !important;
  }

  .close-error:hover {
    background: rgba(255,255,255,0.4) !important;
    transform: none !important;
  }

  @keyframes slideDown {
    from { transform: translateY(-20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
</style>
