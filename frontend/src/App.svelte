<script lang="ts">
  import { onMount } from 'svelte';
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
    isSpectatorStore,
    lobbyErrorStore,
    savePlayerName,
    joinQueue,
    createPrivateMatch,
    joinPrivateMatch,
    leaveQueue,
    leaveLobby,
    selectedCardIdStore
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

  function selectDeck(id: string) {
    const deck = $decksStore[id];
    if (!deck || !validateDeck(deck.cards).valid) return;
    selectedDeckNameStore.set(id);
    showDeckSelect = false;
  }

  function copyInviteLink() {
    const code = $privateCodeStore || privateCodeInput;
    if (!code) return;
    const url = `${window.location.origin}${window.location.pathname}?match=${code}`;
    navigator.clipboard.writeText(url);
    alert('Invite link copied to clipboard!');
  }

  onMount(() => {
    const params = new URLSearchParams(window.location.search);
    const matchCode = params.get('match');
    if (matchCode) {
      privateCodeInput = matchCode.toUpperCase();
      showJoinPrivate = true;
    }
  });

  import { selectedUnitIdStore } from './game/gameClient';
  function deselectAll() {
    $selectedCardIdStore = null;
    $selectedUnitIdStore = null;
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
        <button 
          class="current-selection" 
          on:click={() => showDeckSelect = !showDeckSelect}
          aria-expanded={showDeckSelect}
          aria-haspopup="listbox"
        >
          <span class="label">Playing with:</span>
          <span class="deck-name">{$decksStore[$selectedDeckNameStore]?.name || 'Unknown Deck'}</span>
          <span class="chevron">{showDeckSelect ? '▲' : '▼'}</span>
        </button>

        {#if showDeckSelect}
          <div class="deck-dropdown" role="listbox">
            {#each Object.entries($decksStore) as [id, deck]}
              {@const isValid = validateDeck(deck.cards).valid}
              <button 
                class="deck-option" 
                class:selected={id === $selectedDeckNameStore}
                class:invalid={!isValid}
                on:click={() => isValid && selectDeck(id)}
                role="option"
                aria-selected={id === $selectedDeckNameStore}
              >
                <div class="option-info">
                  <span class="name">{deck.name}</span>
                  {#if !isValid}
                    <span class="error-tag">Invalid (25 cards required)</span>
                  {/if}
                </div>
                {#if id === $selectedDeckNameStore}
                  <span class="check">✓</span>
                {/if}
              </button>
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
          <span class="label">Match Code</span>
          <span class="code-display">{$privateCodeStore}</span>
          <button class="copy-link-btn" on:click={copyInviteLink} title="Copy Invite Link">🔗</button>
        </div>
        <p class="hint">Invite a friend with this code or link!</p>
        <button class="btn-ghost" on:click={leaveLobby}>Exit Lobby</button>
      {/if}
    </div>

  {:else if view === 'deckbuilder'}
    <DeckBuilder on:back={() => view = 'menu'} />

  {:else if view === 'game'}
    {#if $gameStateStore}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
      <div class="game-ui" on:click={deselectAll}>
        {#if $isSpectatorStore}
          <div class="spectator-badge">👁️ SPECTATOR MODE</div>
        {/if}
        <div class="info-layer">
          <UnitInfo />
        </div>
        <div 
          class="map-layer"
          on:click|stopPropagation
        >
          <MapView />
        </div>
        <div class="hand-layer" on:click|stopPropagation>
          <CardHand />
        </div>
        <div class="sidebar-layer" on:click|stopPropagation>
          <GameSidebar {showLog} toggleLog={() => showLog = !showLog} />
        </div>
      </div>
    {:else}
      <p class="connecting">Connecting to match...</p>
    {/if}
  {/if}
</main>

<style>
  :root {
    --bg-dark: #0f172a;
    --bg-panel: #1e293b;
    --accent-pink: #ff6090;
    --accent-indigo: #6366f1;
    --text-main: #f1f5f9;
    --text-muted: #94a3b8;
    --btn-radius: 12px;
    --input-radius: 50px;
    --font-main: 'BitcountPropSingle', sans-serif;
  }

  @font-face {
    font-family: 'BitcountPropSingle';
    src: url('./assets/fonts/BitcountPropSingle-VariableFont_CRSV,ELSH,ELXP,slnt,wght.ttf') format('truetype');
    font-weight: 100 900;
    font-style: normal;
  }

  .app-container {
    width: 100vw;
    height: 100vh;
    font-family: var(--font-main);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    background: var(--bg-dark);
    color: var(--text-main);
    line-height: 1.2;
  }

  .menu {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    flex: 1;
    gap: 1.5rem;
    background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
    position: relative;
  }

  h1 {
    font-size: 3.5rem;
    color: var(--accent-pink);
    text-shadow: 0 4px 20px rgba(255, 96, 144, 0.4);
    margin-bottom: 0.5rem;
    position: relative;
    font-weight: 800;
  }

  /* Name row */
  .name-row {
    margin-bottom: 0.5rem;
  }

  .name-input {
    padding: 12px 24px;
    font-size: 1.1rem;
    border: 2px solid var(--bg-panel);
    border-radius: var(--input-radius);
    outline: none;
    background: var(--bg-panel);
    color: white;
    text-align: center;
    transition: all 0.2s;
    width: 260px;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
  }

  .name-input:focus {
    border-color: var(--accent-indigo);
    box-shadow: 0 0 15px rgba(99, 102, 241, 0.3);
    transform: translateY(-2px);
  }

  .deck-selector {
    position: relative;
    width: 300px;
    margin-bottom: 1.5rem;
    z-index: 100;
  }

  .current-selection {
    background: var(--bg-panel);
    padding: 0.8rem 1.2rem;
    border-radius: var(--btn-radius);
    display: flex;
    align-items: center;
    gap: 0.8rem;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(0,0,0,0.2);
    border: 2px solid transparent;
    transition: all 0.2s;
  }

  .current-selection:hover {
    border-color: var(--accent-pink);
    transform: translateY(-2px);
  }

  .label {
    font-size: 0.75rem;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05rem;
    font-weight: bold;
  }

  .deck-name {
    flex: 1;
    font-weight: bold;
    color: var(--text-main);
  }

  .chevron {
    color: var(--accent-pink);
    font-size: 0.8rem;
  }

  .deck-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    left: 0;
    right: 0;
    background: var(--bg-panel);
    border-radius: var(--btn-radius);
    box-shadow: 0 10px 30px rgba(0,0,0,0.4);
    border: 1px solid #334155;
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
    border-bottom: 1px solid #1e293b;
    transition: background 0.2s;
  }

  .deck-option:last-child {
    border-bottom: none;
  }

  .deck-option:hover:not(.invalid) {
    background: #334155;
  }

  .deck-option.selected {
    background: #312e8133;
    border-left: 3px solid var(--accent-indigo);
  }

  .deck-option.invalid {
    opacity: 0.4;
    cursor: not-allowed;
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
    color: var(--accent-pink);
    font-weight: bold;
  }

  /* Buttons */
  .button-group {
    display: flex;
    gap: 16px;
    flex-wrap: wrap;
    justify-content: center;
  }

  button {
    font-family: inherit;
    cursor: pointer;
    border: none;
    border-radius: var(--input-radius);
    font-weight: bold;
    transition: all 0.2s;
  }

  button:hover {
    transform: translateY(-2px);
  }

  button:active {
    transform: translateY(0) scale(0.98);
  }

  .btn-primary {
    padding: 14px 40px;
    font-size: 1.2rem;
    background: linear-gradient(135deg, var(--accent-indigo), #a855f7);
    color: white;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
  }

  .btn-primary:hover {
    box-shadow: 0 8px 25px rgba(99, 102, 241, 0.5);
    filter: brightness(1.1);
  }

  .btn-secondary {
    padding: 14px 34px;
    font-size: 1.1rem;
    background: #334155;
    color: white;
    border: 2px solid transparent;
  }

  .btn-secondary:hover {
    background: #475569;
    border-color: var(--accent-indigo);
  }

  .btn-ghost {
    padding: 10px 24px;
    font-size: 0.95rem;
    background: transparent;
    color: var(--text-muted);
    border: 2px solid #334155;
  }

  .btn-ghost:hover {
    color: white;
    border-color: var(--accent-pink);
    background: rgba(255, 96, 144, 0.1);
  }

  /* Private section */
  .private-section {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
  }

  .code-row {
    display: flex;
    gap: 12px;
    align-items: center;
  }

  .code-input {
    padding: 10px 20px;
    font-size: 1.2rem;
    font-weight: bold;
    letter-spacing: 0.3em;
    text-transform: uppercase;
    border: 2px solid #334155;
    border-radius: var(--input-radius);
    outline: none;
    background: #0f172a;
    color: var(--accent-pink);
    width: 130px;
    text-align: center;
    transition: all 0.2s;
  }

  .code-input:focus {
    border-color: var(--accent-pink);
    box-shadow: 0 0 10px rgba(255, 96, 144, 0.2);
  }

  /* Status badges */
  .status-badge {
    padding: 14px 32px;
    border-radius: var(--btn-radius);
    font-size: 1.1rem;
    font-weight: bold;
    border: 2px solid transparent;
  }

  .status-badge.searching {
    background: #1e1b4b;
    color: #818cf8;
    border-color: #3730a3;
    display: flex;
    align-items: center;
    gap: 12px;
    box-shadow: 0 0 20px rgba(99, 102, 241, 0.1);
  }

  .status-badge.private {
    background: #1e293b;
    color: var(--accent-pink);
    border-color: #334155;
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .code-display {
    font-size: 1.6rem;
    letter-spacing: 0.2em;
    font-family: 'Outfit', monospace;
    color: white;
    text-shadow: 0 0 8px rgba(255, 96, 144, 0.5);
  }

  .copy-link-btn {
    background: #334155;
    border: none;
    color: white;
    width: 32px;
    height: 32px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s;
    font-size: 1rem;
    padding: 0;
  }

  .copy-link-btn:hover {
    background: var(--accent-indigo);
    transform: scale(1.1);
  }

  .hint {
    font-size: 0.85rem;
    color: var(--text-muted);
    margin: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .spinner {
    display: inline-block;
    animation: spin 1s linear infinite;
    font-size: 1.4rem;
    color: var(--accent-indigo);
  }

  /* Game view */
  .game-ui {
    display: grid;
    width: 100vw;
    height: 100vh;
    background: #000;
    overflow: hidden;
  }

  .spectator-badge {
    position: fixed;
    top: 10px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(255, 171, 0, 0.9);
    color: black;
    padding: 6px 20px;
    border-radius: 100px;
    font-size: 0.8rem;
    font-weight: 900;
    letter-spacing: 0.1em;
    z-index: 9999;
    box-shadow: 0 4px 20px rgba(255, 171, 0, 0.4);
    animation: pulse 2s infinite ease-in-out;
  }

  @keyframes pulse {
    0% { opacity: 0.8; }
    50% { opacity: 1; transform: translateX(-50%) scale(1.05); }
    100% { opacity: 0.8; }
  }

  /* Default (Portrait) */
  @media (orientation: portrait) {
    .game-ui {
      grid-template-rows: 1fr;
      grid-template-columns: 100%;
    }
    .map-layer { grid-row: 1; grid-column: 1; min-height: 0; }
    .hand-layer { 
      grid-row: 1; grid-column: 1; 
      z-index: 1000; 
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      pointer-events: none;
    }
    .info-layer { grid-row: 1; grid-column: 1; z-index: 5000; pointer-events: none; }
    .sidebar-layer { grid-row: 1; grid-column: 1; z-index: 500; pointer-events: none; }
  }

  /* Landscape (Desktop/Tablet) */
  @media (orientation: landscape) {
    .game-ui {
      grid-template-columns: 1fr 320px;
      grid-template-rows: 1fr;
    }
    .map-layer { grid-row: 1; grid-column: 1; min-height: 0; }
    .hand-layer { 
      grid-row: 1; grid-column: 1; 
      z-index: 1000; 
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      pointer-events: none; 
    }
    .sidebar-layer { grid-row: 1; grid-column: 2; }
    .info-layer { grid-row: 1; grid-column: 1; z-index: 5000; pointer-events: none; }
  }

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
    color: var(--text-muted);
    background: var(--bg-dark);
  }

  /* Error Banner */
  .error-banner {
    position: absolute;
    top: 2rem;
    width: 90%;
    max-width: 500px;
    background: #7f1d1d;
    color: #fecaca;
    padding: 14px 24px;
    border-radius: var(--btn-radius);
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
    z-index: 200;
    font-weight: bold;
    border: 1px solid #991b1b;
    animation: slideDownFade 0.3s ease-out;
  }

  .close-error {
    background: rgba(0,0,0,0.2) !important;
    border: none !important;
    color: #fecaca !important;
    width: 28px !important;
    height: 28px !important;
    padding: 0 !important;
    font-size: 1.3rem !important;
    line-height: 1 !important;
    box-shadow: none !important;
    border-radius: 50% !important;
  }

  .close-error:hover {
    background: rgba(255,255,255,0.1) !important;
  }
</style>
