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
    dragDropStore,
  } from "../game/gameClient";

  let canvas: HTMLCanvasElement;
  let renderer: GameRenderer;
  let overlayEl: HTMLDivElement;

  // which of your own units is currently selected for movement
  let selectedUnitId: string | null = null;
  let rendererReady = false;
  let isPortrait = false;

  onMount(() => {
    const updateOrientation = () => {
      isPortrait = window.innerHeight > window.innerWidth;
    };
    window.addEventListener('resize', updateOrientation);
    updateOrientation();

    renderer = new GameRenderer(canvas);
    rendererReady = true;
    const loop = () => {
      if ($gameStateStore && $playerIdStore) {
        renderer.setState($gameStateStore, $playerIdStore);
        renderer.setOrientation(isPortrait);

        const selectedCard = $selectedCardIdStore
          ? (($projectedHandStore ?? []).find(
              (c) => c.id === $selectedCardIdStore,
            ) ?? null)
          : null;
        renderer.setSelectedCard(selectedCard);

        // If dragging, let renderer know intended target for preview
        if ($dragDropStore.isDragging) {
           const hex = getHexAt($dragDropStore.x, $dragDropStore.y);
           if (hex) renderer.setHoverTile(hex);
        } else {
           renderer.setHoverTile(null);
        }

        renderer.setSelectedUnit(selectedUnitId);
        renderer.render();

        // Scale overlay to match canvas stretching
        if (overlayEl && canvas) {
          const rect = canvas.getBoundingClientRect();
          const baseW = isPortrait ? 800 : 1200;
          const baseH = isPortrait ? 1200 : 800;
          overlayEl.style.transform = `scale(${rect.width / baseW}, ${rect.height / baseH})`;
        }
      }
      requestAnimationFrame(loop);
    };
    loop();

    const onDrop = (e: any) => {
      const { cardId, x, y } = e.detail;
      const hex = getHexAt(x, y);
      if (hex) {
        // We temporarily select the card to use the existing play logic or call a helper
        $selectedCardIdStore = cardId;
        // The click handler expects a native event or we can just call a refactored playCard(card, hex)
        // For now, let's trigger a fake click logic
        attemptPlayCard(cardId, hex);
      }
    };
    window.addEventListener('card-dropped', onDrop);
    return () => {
      window.removeEventListener('card-dropped', onDrop);
      window.removeEventListener('resize', updateOrientation);
    };
  });

  function getHexAt(screenX: number, screenY: number) {
    if (!canvas || !renderer) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let x = (screenX - rect.left) * scaleX;
    let y = (screenY - rect.top) * scaleY;
    
    if (isPortrait) {
       const x1 = x - 400;
       const y1 = y - 600;
       const x2 = y1;
       const y2 = -x1;
       x = 600 + x2;
       y = 400 + y2;
    }
    
    return (renderer as any).grid.pixelToHex(x, y);
  }

  function attemptPlayCard(cardId: string, hex: {q: number, r: number}) {
    if (!$gameStateStore || !$playerIdStore) return;
    const playerStates = $gameStateStore.players[$playerIdStore];
    const card = playerStates?.hand.find(c => c.id === cardId);
    if (!card) return;

    // Reuse validation/send logic from click handler...
    // To avoid duplication, we could extract handleCanvasClick's core
    // but here we just send if catnip is enough for simplicity
    if ($projectedCatnipStore >= card.cost) {
        let finalTarget: any = hex;
        if (card.target === "unit") {
           const unitAtHex = Object.values($gameStateStore.units).find(u => u.position.q === hex.q && u.position.r === hex.r);
           if (unitAtHex) finalTarget = unitAtHex.id;
           else return; // Bail if target unit not found
        }
        sendCommand({ type: "play_card", cardId, target: finalTarget });
        $projectedCatnipStore -= card.cost;
        projectedHandStore.update(h => h.filter(c => c.id !== cardId));
    }
    $selectedCardIdStore = null;
  }

  function handleCanvasClick(e: MouseEvent) {
    if (!renderer) return;

    // We allow clicks for inspection, but actions require $isMyTurnStore
    const isMyTurn = $isMyTurnStore;
    const hex = getHexAt(e.clientX, e.clientY);
    if (!hex) return;

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

  $: turnLabel = "";

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
  let showLog = false;

  function toggleLog() {
    showLog = !showLog;
  }
</script>

<div class="map-view-root">
  <div class="canvas-panel">
    <div class="game-container">
      <canvas
        bind:this={canvas}
        width={isPortrait ? 800 : 1200}
        height={isPortrait ? 1200 : 800}
        on:click={handleCanvasClick}
      ></canvas>

      <!-- DOM OVERLAYS FROM CANVAS (PIXEL-POSITIONED) -->
      <div 
        class="ui-overlay-layer" 
        bind:this={overlayEl}
        style="width: {isPortrait ? 800 : 1200}px; height: {isPortrait ? 1200 : 800}px;"
      >
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

          <!-- Damage Popups (Pixel-positioned) -->
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
  </div>

  <!-- GAME OVER OVERLAY (Fullscreen) -->
  {#if $gameStateStore && $gameStateStore.activePlayers.length <= 1}
    <div class="game-over-overlay">
      <div class="game-over-modal">
        <h1 class="victory-text">MATCH OVER</h1>
        <p class="winner-text">
          {#if $gameStateStore.activePlayers.length === 1}
            {$gameStateStore.players[$gameStateStore.activePlayers[0]]?.name ?? $gameStateStore.activePlayers[0]} wins! 👑
          {:else}
            It's a draw!
          {/if}
        </p>
        <button class="return-btn" on:click={() => window.location.reload()}
          >Exit to Menu</button
        >
      </div>
    </div>
  {/if}
</div>

<style>
  .map-view-root {
    display: contents; /* App.svelte grid handles layout */
  }

  .canvas-panel {
    display: flex;
    justify-content: center;
    align-items: center;
    background: #0d0d0d;
    overflow: hidden;
    padding: 10px;
    height: 100%;
  }

  .game-container {
    position: relative;
    width: 100%;
    aspect-ratio: 3 / 2;
    max-width: calc(100vh * 1.5 - 20px);
    max-height: calc(100vw * 0.66);
    background: #111;
    box-shadow: 0 10px 40px rgba(0,0,0,0.5);
    border: 1px solid #333;
  }

  canvas {
    width: 100%;
    height: 100%;
    display: block;
  }

  /* Portrait overrides for canvas behavior */
  @media (orientation: portrait) {
    .game-container {
      aspect-ratio: 2 / 3;
      max-height: unset;
      max-width: 100%;
    }
  }

  .ui-overlay-layer {
    position: absolute;
    top: 0;
    left: 0;
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
    margin-top: 32px;
  }
  .mini-hp-bar .fill {
    height: 100%;
    transition: width 0.3s ease-out;
  }

  .status-tray { display: flex; gap: 2px; margin-top: 2px; }
  .stat-badge { font-size: 8px; font-weight: 800; padding: 1px 3px; border-radius: 3px; color: white; }
  .stat-badge.pos { background: #4caf50; }
  .item-badge { font-size: 10px; }

  .damage-popup {
    position: absolute;
    transform: translateX(-50%);
    color: #ff4444;
    font-weight: 900;
    font-size: 12px;
    text-shadow: 0 0 4px black;
    pointer-events: none;
    z-index: 100;
  }

  .game-over-overlay {
    position: fixed; top: 0; left: 0; right: 0; bottom: 0;
    background: rgba(0, 0, 0, 0.9); z-index: 2000;
    display: flex; justify-content: center; align-items: center;
  }
  .game-over-modal { background: #222; padding: 30px; border-radius: 12px; text-align: center; border: 2px solid #444; }
  .victory-text { font-size: 24px; color: #ffd700; margin-bottom: 10px; }
  .return-btn { background: #4a90e2; padding: 12px 24px; color: white; border-radius: 8px; }
</style>
