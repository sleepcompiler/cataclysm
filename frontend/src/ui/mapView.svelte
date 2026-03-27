<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { GameRenderer } from "../game/renderer";
  import { fly, fade } from "svelte/transition";
  import {
    gameStateStore,
    playerIdStore,
    sendCommand,
    selectedCardIdStore,
    selectedTileStore,
    projectedCatnipStore,
    projectedHandStore,
    hasEndedTurnStore,
    isMyTurnStore,
    combatLogStore,
    selectedUnitIdStore,
    damagePopupsStore,
  } from "../game/gameClient";

  let canvas: HTMLCanvasElement;
  let renderer: GameRenderer;
  let overlayEl: HTMLDivElement;

  // which of your own units is currently selected for movement
  let selectedUnitId: string | null = null;
  let rendererReady = false;

  onMount(() => {
    renderer = new GameRenderer(canvas);
    rendererReady = true;
    const loop = () => {
      if ($gameStateStore && $playerIdStore) {
        renderer.setState($gameStateStore, $playerIdStore);

        const selectedCard = $selectedCardIdStore
          ? (($projectedHandStore ?? []).find(
              (c) => c.id === $selectedCardIdStore,
            ) ?? null)
          : null;
        renderer.setSelectedCard(selectedCard);
        renderer.setSelectedUnit(selectedUnitId);
        renderer.render();

        // Scale overlay to match canvas stretching
        if (overlayEl && canvas) {
          const rect = canvas.getBoundingClientRect();
          overlayEl.style.transform = `scale(${rect.width / 1200}, ${rect.height / 800})`;
        }
      }
      requestAnimationFrame(loop);
    };
    loop();
  });

  function handleCanvasClick(e: MouseEvent) {
    if (!renderer) return;

    // We allow clicks for inspection, but actions require $isMyTurnStore
    const isMyTurn = $isMyTurnStore;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const hex = (renderer as any).grid.pixelToHex(x, y);

    renderer.setSelectedTile(hex);

    // --- card play mode (only on your turn) ---
    if (isMyTurn && $selectedCardIdStore && $gameStateStore && $playerIdStore) {
      const playerStates = $gameStateStore.players[$playerIdStore];
      const card = playerStates?.hand.find(
        (c) => c.id === $selectedCardIdStore,
      );
      if (!card) return;

      const isSpawnCard =
        card?.effects.some(
          (e) => e.type === "spawn_unit" || e.type === "spawn_building",
        ) ?? false;
      const isMoltCard =
        card?.effects.some((e) => e.type === "molt_unit") ?? false;

      if (isSpawnCard && !renderer.isValidSpawnTile(hex.q, hex.r)) {
        // invalid spawn tile — deselect and bail
        $selectedCardIdStore = null;
        renderer.setSelectedCard(null);
        renderer.setSelectedTile(null);
        return;
      }

      if (isMoltCard) {
        // Validation: must be a tile with a friendly unit OR we must have a spirit card for direct spawning
        const moltsFrom = (card as any)?.moltsFrom as string | undefined;
        const unitHere = Object.values($gameStateStore.units).find(
          (u) =>
            u.owner === $playerIdStore &&
            u.position.q === hex.q &&
            u.position.r === hex.r &&
            u.type === moltsFrom,
        );

        const unitType = card.effects.find((e) => e.type === "molt_unit")
          ?.params.unitType as string | undefined;
        const isStray = ["tom", "alley_cat", "lion", "panther"].includes(
          unitType || "",
        );
        const isHouse = [
          "tabby",
          "siamese",
          "sphynx",
          "maine_coon",
          "calico",
        ].includes(unitType || "");
        const hasMatchingSpirit = playerStates?.hand.some(
          (c) =>
            (isStray && c.templateId === "stray_spirit") ||
            (isHouse && c.templateId === "house_spirit"),
        );

        if (!unitHere && !hasMatchingSpirit) {
          $selectedCardIdStore = null;
          renderer.setSelectedCard(null);
          renderer.setSelectedTile(null);
          return;
        }
      }

      if (card && $projectedCatnipStore >= card.cost) {
        let finalTarget: any = hex;
        if (card.target === "unit") {
          const unitAtHex = Object.values($gameStateStore.units).find(
            (u) => u.position.q === hex.q && u.position.r === hex.r,
          );
          if (unitAtHex) {
            finalTarget = unitAtHex.id;
          } else {
            // If target is unit but we clicked empty space, bail
            $selectedCardIdStore = null;
            renderer.setSelectedCard(null);
            renderer.setSelectedTile(null);
            return;
          }
        } else if (card.target === "none") {
          finalTarget = null;
        }

        sendCommand({
          type: "play_card",
          cardId: $selectedCardIdStore,
          target: finalTarget,
        });
        $projectedCatnipStore -= card.cost;
        projectedHandStore.update((hand) =>
          hand.filter((c) => c.id !== $selectedCardIdStore),
        );
      }

      $selectedCardIdStore = null;
      renderer.setSelectedCard(null);
      renderer.setSelectedTile(null);
      return;
    }

    // --- unit move mode (only on your turn) ---
    if (isMyTurn && selectedUnitId) {
      if (renderer.isInMovementRange(hex.q, hex.r)) {
        // valid destination — execute the move instantly
        const unit = $gameStateStore?.units[selectedUnitId];
        sendCommand({
          type: "move_unit",
          unitId: selectedUnitId,
          path: [unit!.position, hex], // direct hop for now, server validates
        });
      }
      // either way, deselect the unit after clicking
      selectedUnitId = null;
      renderer.setSelectedUnit(null);
      renderer.setSelectedTile(null);
      return;
    }

    // --- unit select mode — click on any unit to pick it up (for info) or select for move ---
    const unitHere = Object.values($gameStateStore?.units ?? {}).find(
      (u) => u.position.q === hex.q && u.position.r === hex.r,
    );

    if (unitHere) {
      $selectedUnitIdStore = unitHere.id;
      // if it's our own unit and it hasn't moved, also select it for movement (only if our turn)
      if (
        isMyTurn &&
        unitHere.owner === $playerIdStore &&
        !unitHere.hasMovedThisTurn
      ) {
        selectedUnitId = unitHere.id;
        renderer.setSelectedUnit(unitHere.id);
      } else {
        selectedUnitId = null;
        renderer.setSelectedUnit(null);
      }
      return;
    }

    // --- building select mode — click on a building to inspect it ---
    const buildingHere = Object.values($gameStateStore?.buildings ?? {}).find(
      (b) => b.position.q === hex.q && b.position.r === hex.r,
    );

    if (buildingHere) {
      $selectedUnitIdStore = buildingHere.id;
      // buildings don't move
      selectedUnitId = null;
      renderer.setSelectedUnit(null);
      return;
    }

    // clicked nothing useful, clear everything
    $selectedUnitIdStore = null;
    selectedUnitId = null;
    renderer.setSelectedUnit(null);
    renderer.setSelectedTile(null);
  }

  function handleEndTurn() {
    if (!$hasEndedTurnStore && $isMyTurnStore) {
      selectedUnitId = null;
      renderer?.setSelectedUnit(null);
      sendCommand({ type: "end_turn" });
      $hasEndedTurnStore = true;
    }
  }

  $: turnLabel = $gameStateStore
    ? $isMyTurnStore
      ? "Your Turn"
      : `${$gameStateStore.currentTurnPlayer}'s Turn`
    : "";

  let logEl: HTMLElement;
  $: if (logEl && $combatLogStore) {
    setTimeout(() => {
      if (logEl) logEl.scrollTop = logEl.scrollHeight;
    }, 10);
  }

  // Auto-cleanup for damage popups — done in a timer to avoid Svelte reactive loops
  let popupTimer: ReturnType<typeof setInterval>;
  onMount(() => {
    popupTimer = setInterval(() => {
      const popups = $damagePopupsStore;
      if (popups.length > 0) {
        const now = Date.now();
        const filtered = popups.filter((p) => now - p.timestamp < 1500);
        if (filtered.length !== popups.length) {
          damagePopupsStore.set(filtered);
        }
      }
    }, 500);
  });
  onDestroy(() => clearInterval(popupTimer));

  function getPixelPos(q: number, r: number) {
    if (!renderer) return { x: 0, y: 0 };
    return renderer.hexToPixel(q, r);
  }
</script>

<div class="game-container">
  <canvas
    bind:this={canvas}
    width="1200"
    height="800"
    on:click={handleCanvasClick}
  ></canvas>

  <!-- DOM OVERLAYS -->
  <div class="ui-overlay-layer" bind:this={overlayEl}>
    {#if $gameStateStore && rendererReady}
      <!-- Mini Health Bars & Status Icons -->
      {#each Object.values($gameStateStore.units) as unit (unit.id)}
        {@const pos = getPixelPos(unit.position.q, unit.position.r)}
        <div class="entity-overlay" style="left: {pos.x}px; top: {pos.y}px;">
          <!-- Health Bar -->
          <div class="mini-hp-bar">
            <div
              class="fill"
              style="width: {(unit.hp / unit.maxHp) *
                100}%; background: {unit.hp / unit.maxHp < 0.33
                ? '#f44336'
                : unit.hp / unit.maxHp < 0.66
                  ? '#ffd700'
                  : '#4caf50'}"
            ></div>
          </div>

          <!-- Status Icons -->
          <div class="status-tray">
            {#if unit.modifiers && unit.modifiers.length > 0}
              {#each unit.modifiers as mod}
                {#if mod.stat === "attack"}
                  <span class="stat-badge pos">+ATK</span>
                {/if}
                {#if mod.stat === "speed"}
                  <span class="stat-badge pos">+SPD</span>
                {/if}
                {#if mod.stat === "movement"}
                  <span class="stat-badge pos">+MOV</span>
                {/if}
              {/each}
            {/if}
            {#if unit.modifiers && unit.modifiers.some((m) => m.source === "cardboard_box")}
              <span class="item-badge box">📦</span>
            {/if}
          </div>
        </div>
      {/each}

      {#each Object.values($gameStateStore.buildings) as b (b.id)}
        {@const pos = getPixelPos(b.position.q, b.position.r)}
        <div class="entity-overlay" style="left: {pos.x}px; top: {pos.y}px;">
          <div class="mini-hp-bar">
            <div
              class="fill"
              style="width: {(b.hp / b.maxHp) * 100}%; background: {b.hp /
                b.maxHp <
              0.33
                ? '#f44336'
                : b.hp / b.maxHp < 0.66
                  ? '#ffd700'
                  : '#4caf50'}"
            ></div>
          </div>
        </div>
      {/each}

      <!-- Damage Popups -->
      {#each $damagePopupsStore as popup (popup.id)}
        {@const pos = getPixelPos(popup.q, popup.r)}
        <div
          class="damage-popup"
          style="left: {pos.x}px; top: {pos.y - 20}px;"
          in:fly={{ y: 20, duration: 200 }}
          out:fade={{ duration: 200 }}
        >
          -{popup.amount}
        </div>
      {/each}
    {/if}
  </div>
</div>

<!-- player stat boxes -->
{#if $gameStateStore}
  <div class="player-stats-container">
    {#each Object.values($gameStateStore.players) as player}
      <div
        class="player-stat-box"
        class:current-player={player.id === $playerIdStore}
        class:active-turn={player.id === $gameStateStore.currentTurnPlayer}
      >
        <div class="player-name">{player.id}</div>
        <div class="stat">Catnip: {player.catnip}</div>
        <div class="stat">Cards: {player.hand.length}</div>
        {#if player.id === $gameStateStore.currentTurnPlayer}
          <div class="turn-badge">ACTIVE</div>
        {/if}
      </div>
    {/each}
  </div>
{/if}

<!-- turn banner -->
<div
  class="turn-banner"
  class:my-turn={$isMyTurnStore}
  class:opp-turn={!$isMyTurnStore}
>
  {turnLabel}
  {#if selectedUnitId}
    <span class="sub"> — select destination</span>
  {/if}
</div>

<!-- combat log top right -->
<div class="combat-log" bind:this={logEl}>
  <div class="log-title">Combat Log</div>
  {#if $combatLogStore.length === 0}
    <div class="log-empty">
      Turn 1 — {$gameStateStore?.currentTurnPlayer ?? ""} goes first.
    </div>
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
    disabled={$hasEndedTurnStore || !$isMyTurnStore}
    on:click={handleEndTurn}
  >
    {#if !$isMyTurnStore}
      Opponent's Turn...
    {:else if $hasEndedTurnStore}
      Resolving...
    {:else}
      End Turn
    {/if}
  </button>
</div>

<!-- GAME OVER OVERLAY -->
{#if $gameStateStore && $gameStateStore.activePlayers.length <= 1}
  <div class="game-over-overlay">
    <div class="game-over-modal">
      <h1 class="victory-text">MATCH CONCLUDED</h1>
      <p class="winner-text">
        {#if $gameStateStore.activePlayers.length === 1}
          {$gameStateStore.activePlayers[0]} is the victor! 👑
        {:else}
          It's a draw!
        {/if}
      </p>
      <button class="return-btn" on:click={() => window.location.reload()}
        >Return to Main Menu</button
      >
    </div>
  </div>
{/if}

<style>
  .game-container {
    position: relative;
    width: 100%;
    height: 100%;
    overflow: hidden;
    background: #111;
  }

  canvas {
    display: block;
    width: 100%;
    height: 100%;
  }

  .ui-overlay-layer {
    position: absolute;
    top: 0;
    left: 0;
    width: 1200px;
    height: 800px;
    transform-origin: top left;
    pointer-events: none;
  }

  .entity-overlay {
    position: absolute;
    transform: translate(-50%, -50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 60px;
    z-index: 50;
  }

  .mini-hp-bar {
    width: 36px;
    height: 5px;
    background: rgba(0, 0, 0, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 2px;
    overflow: hidden;
    margin-top: 32px; /* Position below unit circle */
  }
  .mini-hp-bar .fill {
    height: 100%;
    transition:
      width 0.3s ease-out,
      background 0.3s;
  }

  .status-tray {
    display: flex;
    gap: 2px;
    margin-top: 2px;
  }
  .stat-badge {
    font-size: 8px;
    font-weight: 800;
    padding: 1px 3px;
    border-radius: 3px;
    color: white;
    text-shadow: 1px 1px 1px black;
  }
  .stat-badge.pos {
    background: #4caf50;
  }
  .item-badge {
    font-size: 10px;
    filter: drop-shadow(0 0 2px black);
  }

  .damage-popup {
    position: absolute;
    transform: translateX(-50%);
    color: #ff4444;
    font-weight: 900;
    font-size: 12px;
    text-shadow:
      0 0 4px black,
      0 0 8px black;
    pointer-events: none;
    z-index: 100;
  }

  .turn-banner {
    position: absolute;
    top: 12px;
    left: 50%;
    transform: translateX(-50%);
    padding: 6px 22px;
    border-radius: 20px;
    font-size: 15px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    transition:
      background 0.4s,
      color 0.4s;
    z-index: 200;
    white-space: nowrap;
  }
  .turn-banner .sub {
    font-weight: 400;
    text-transform: none;
    font-size: 13px;
  }
  .turn-banner.my-turn {
    background: #4caf50;
    color: #fff;
    box-shadow: 0 0 14px rgba(76, 175, 80, 0.6);
  }
  .turn-banner.opp-turn {
    background: rgba(255, 255, 255, 0.08);
    color: #aaa;
    border: 1px solid #444;
  }

  .player-stats-container {
    position: absolute;
    top: 55px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 20px;
    z-index: 100;
  }
  .player-stat-box {
    background: rgba(0, 0, 0, 0.85);
    color: white;
    padding: 8px 18px;
    border-radius: 8px;
    border: 2px solid #555;
    min-width: 140px;
    text-align: center;
    transition: border-color 0.3s;
  }
  .player-stat-box.current-player {
    border-color: #4caf50;
    box-shadow: 0 0 10px rgba(76, 175, 80, 0.5);
  }
  .player-stat-box.active-turn {
    border-color: #ffd700;
  }
  .player-name {
    font-weight: bold;
    font-size: 15px;
    margin-bottom: 4px;
    color: #ffd700;
  }
  .stat {
    font-size: 13px;
    margin: 2px 0;
  }
  .turn-badge {
    margin-top: 4px;
    font-size: 10px;
    background: #ffd700;
    color: #333;
    border-radius: 4px;
    padding: 1px 6px;
    display: inline-block;
    font-weight: bold;
  }

  .combat-log {
    position: absolute;
    top: 20px;
    right: 20px;
    width: 280px;
    max-height: 380px;
    overflow-y: auto;
    background: rgba(0, 0, 0, 0.88);
    color: #e0e0e0;
    border: 1px solid #333;
    border-radius: 10px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 4px;
    z-index: 100;
    scroll-behavior: smooth;
  }
  .combat-log::-webkit-scrollbar {
    width: 4px;
  }
  .combat-log::-webkit-scrollbar-thumb {
    background: #444;
    border-radius: 2px;
  }
  .log-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.1em;
    color: #888;
    margin-bottom: 6px;
    border-bottom: 1px solid #333;
    padding-bottom: 4px;
  }
  .log-header {
    font-size: 12px;
    font-weight: 700;
    color: #ffd700;
    margin-top: 6px;
  }
  .log-entry {
    font-size: 12px;
    line-height: 1.5;
  }
  .log-blue {
    color: #60a5fa;
  }
  .log-red {
    color: #f87171;
  }
  .log-neutral {
    color: #d1d5db;
  }
  .log-empty {
    font-size: 12px;
    color: #666;
    font-style: italic;
  }

  .controls {
    position: absolute;
    bottom: 20px;
    right: 20px;
    z-index: 100;
  }
  button {
    padding: 10px 24px;
    font-size: 15px;
    font-weight: 600;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    transition: background 0.25s;
  }
  button:hover:not(:disabled) {
    background: #43a047;
  }
  button:disabled {
    background: #333;
    cursor: not-allowed;
    color: #666;
  }

  .game-over-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    z-index: 1000;
    display: flex;
    justify-content: center;
    align-items: center;
    pointer-events: all;
  }
  .game-over-modal {
    background: #1e1e24;
    padding: 40px 60px;
    border-radius: 12px;
    border: 2px solid #555;
    text-align: center;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.8);
  }
  .victory-text {
    font-size: 32px;
    color: #ffd700;
    margin: 0 0 16px 0;
    letter-spacing: 0.1em;
  }
  .winner-text {
    font-size: 20px;
    color: #fff;
    margin: 0 0 32px 0;
  }
  .return-btn {
    background: #4a90e2;
    padding: 12px 30px;
    font-size: 16px;
  }
  .return-btn:hover:not(:disabled) {
    background: #357abd;
  }
</style>
