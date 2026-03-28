<script lang="ts">
  import { 
    gameStateStore, 
    playerIdStore, 
    isMyTurnStore, 
    isSpectatorStore,
    hasEndedTurnStore, 
    combatLogStore, 
    sendCommand,
    privateCodeStore
  } from "../game/gameClient";
  import { onMount, afterUpdate } from "svelte";

  export let showLog = false;
  export let toggleLog: () => void;
  export let selectedUnitId: string | null = null;

  let logEl: HTMLElement;

  function handleEndTurn() {
    if (!$hasEndedTurnStore && $isMyTurnStore) {
      sendCommand({ type: "end_turn" });
    }
  }

  $: turnLabel = $gameStateStore
    ? $isMyTurnStore
      ? "Your Turn"
      : `${$gameStateStore.players[$gameStateStore.currentTurnPlayer]?.name ?? $gameStateStore.currentTurnPlayer}'s Turn`
    : "";

  afterUpdate(() => {
    if (logEl) {
      logEl.scrollTop = logEl.scrollHeight;
    }
  });

  function copyInviteLink() {
    if (!$privateCodeStore) return;
    const url = `${window.location.origin}${window.location.pathname}?match=${$privateCodeStore}`;
    navigator.clipboard.writeText(url);
    alert('Invite link copied to clipboard!');
  }

</script>

<div class="ui-sidebar" class:log-open={showLog}>
  <!-- turn banner -->
  <div
    class="turn-banner"
    class:my-turn={$isMyTurnStore}
    class:opp-turn={!$isMyTurnStore}
  >
    <div class="banner-text">
      {turnLabel}
      {#if selectedUnitId}
        <span class="sub"> — select destination</span>
      {/if}
    </div>
    
    <!-- mobile log toggle -->
    <button class="log-toggle" on:click={toggleLog}>
      {showLog ? "Back" : "📜 Log"}
    </button>
  </div>

  {#if $privateCodeStore}
    <div class="match-code-badge">
      <span class="label">Code:</span>
      <span class="code">{$privateCodeStore}</span>
      <button class="copy-btn" on:click={copyInviteLink} title="Copy Invite Link">🔗</button>
    </div>
  {/if}

  <!-- player stat boxes -->
  {#if $gameStateStore}
    <div class="player-stats-container">
      {#each Object.values($gameStateStore.players) as player}
        <div
          class="player-stat-box"
          class:current-player={player.id === $playerIdStore}
          class:active-turn={player.id === $gameStateStore.currentTurnPlayer}
        >
          <div class="player-name">{player.name}</div>
          <div class="stats-row">
            <span class="stat">Catnip: {player.catnip}</span>
            <span class="stat">Cards: {player.hand.length}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  <!-- combat log -->
  <div class="combat-log" bind:this={logEl}>
    <div class="log-title">Combat Log</div>
    {#if $combatLogStore.length === 0}
      <div class="log-empty">Waiting for actions...</div>
    {/if}
    {#each $combatLogStore as entry}
      {#if entry.isHeader}
        <div class="log-header">[{entry.text}]</div>
      {:else}
        <div class="log-entry log-{entry.color}">{entry.text}</div>
      {/if}
    {/each}
  </div>

  <!-- end turn button -->
  <div class="controls">
    <button
      class="end-turn-btn"
      disabled={$hasEndedTurnStore || !$isMyTurnStore || $isSpectatorStore}
      on:click={handleEndTurn}
    >
      {#if $isSpectatorStore}
        Viewing
      {:else if !$isMyTurnStore}
        Wait...
      {:else if $hasEndedTurnStore}
        Resolving...
      {:else}
        End Turn
      {/if}
    </button>
  </div>
</div>

<style>
  .ui-sidebar {
    display: flex;
    flex-direction: column;
    background: #111;
    border-left: 1px solid #333;
    padding: 12px;
    gap: 12px;
    height: 100%;
    overflow: hidden;
    position: relative;
    z-index: 100;
  }

  @media (orientation: portrait) {
    .ui-sidebar {
      border-left: none;
      height: auto;
      background: rgba(0, 0, 0, 0.4);
      backdrop-filter: blur(8px);
      padding: 8px;
    }
  }

  .log-toggle {
    display: none;
    padding: 6px 12px;
    background: #333;
    color: white;
    border: 1px solid #555;
    border-radius: 8px;
    font-size: 13px;
    font-weight: bold;
  }

  @media (orientation: portrait) {
    .log-toggle { display: block; }
  }

  .turn-banner {
    background: #1e293b;
    padding: 10px 15px;
    border-radius: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border: 1px solid #334155;
  }
  .turn-banner.my-turn { border-color: #4caf50; }
  .banner-text { font-weight: bold; font-size: 14px; text-transform: uppercase; color: #f1f5f9; }
  .banner-text .sub { font-weight: normal; font-size: 11px; color: #94a3b8; }

  .player-stats-container { display: flex; flex-direction: column; gap: 8px; }
  @media (orientation: portrait) {
    .player-stats-container { flex-direction: row; }
  }

  .player-stat-box {
    background: #000;
    padding: 8px 12px;
    border-radius: 8px;
    border: 1px solid #333;
    flex: 1;
  }
  .player-stat-box.current-player { border-color: #4caf50; background: #1a1a0033; }
  .player-stat-box.active-turn { border-color: #ffd700; background: #33330033; }
  .player-name { font-weight: bold; font-size: 13px; color: #ffd700; }
  .stats-row { display: flex; gap: 10px; font-size: 11px; color: #ccc; }

  .combat-log {
    flex: 1;
    background: #000;
    border: 1px solid #222;
    border-radius: 8px;
    padding: 10px;
    overflow-y: auto;
    font-size: 12px;
    transition: transform 0.3s ease-in-out;
  }

  @media (orientation: portrait) {
    .combat-log {
      position: fixed;
      top: 60px;
      left: 0;
      right: 0;
      bottom: 0;
      z-index: 2000;
      transform: translateY(100%);
      border-radius: 0;
      background: #000; /* Solid log for better readability as overlay */
    }
    .ui-sidebar.log-open .combat-log {
      transform: translateY(0);
    }
  }

  .log-title { font-size: 10px; text-transform: uppercase; color: #666; margin-bottom: 5px; border-bottom: 1px solid #222; }
  .log-header { font-weight: bold; color: #ffd700; margin-top: 5px; }
  .log-blue { color: #60a5fa; }
  .log-red { color: #f87171; }
  .controls { margin-top: auto; }
  
  .end-turn-btn { 
    width: 100%; 
    border-radius: 8px; 
    padding: 12px; 
    font-weight: bold; 
    background: #4caf50; 
    color: white;
    border: none;
    cursor: pointer;
  }
  .end-turn-btn:hover:not(:disabled) { background: #43a047; }
  .end-turn-btn:disabled { background: #333; color: #666; cursor: not-allowed; }

  .match-code-badge {
    display: flex;
    align-items: center;
    gap: 8px;
    background: #1e293b;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 12px;
    border: 1px solid #334155;
  }
  .match-code-badge .label { color: #94a3b8; font-weight: bold; text-transform: uppercase; font-size: 10px; }
  .match-code-badge .code { color: #f1f5f9; font-weight: bold; font-family: monospace; font-size: 14px; letter-spacing: 1px; }
  .match-code-badge .copy-btn {
    background: #334155;
    border: none;
    color: white;
    cursor: pointer;
    border-radius: 4px;
    padding: 2px 6px;
    font-size: 12px;
  }
  .match-code-badge .copy-btn:hover { background: #475569; }
</style>
