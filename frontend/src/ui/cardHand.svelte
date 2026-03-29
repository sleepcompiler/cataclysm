<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { 
    projectedHandStore, 
    playerIdStore, 
    projectedCatnipStore, 
    selectedCardIdStore, 
    isMyTurnStore, 
    selectedUnitIdStore,
    isSpectatorStore,
    dragDropStore
  } from "../game/gameClient";
  import { fly, fade } from "svelte/transition";

  $: hand = $projectedHandStore || [];
  $: catnip = $projectedCatnipStore;

  let isManuallyHidden = false;
  let isMouseNear = false;

  function handleGlobalMouseMove(e: MouseEvent) {
    // Detect if mouse is in the bottom 25% of the viewport (non-blocking)
    const threshold = window.innerHeight * 0.75;
    isMouseNear = e.clientY > threshold;
  }

  // --- Drag to Play ---
  let startX = 0;
  let startY = 0;

  function handleTouchStart(e: TouchEvent, cardId: string) {
    if (!$isMyTurnStore || $isSpectatorStore) return;
    const touch = e.touches[0];
    startX = touch.clientX;
    startY = touch.clientY;
    dragDropStore.set({ cardId, x: touch.clientX, y: touch.clientY, isDragging: true });
  }

  function handleTouchMove(e: TouchEvent) {
    if (!$dragDropStore.isDragging) return;
    const touch = e.touches[0];
    dragDropStore.update(s => ({ ...s, x: touch.clientX, y: touch.clientY }));
    
    // If dragging upward, we can "ghost" the hand or just let it hide
    if (touch.clientY < window.innerHeight * 0.7) {
      // isMouseNear will trigger hide automatically based on our mouse move listener
      // but for touch we might need to manually set it or similar
      isMouseNear = true;
    }

    // Prevent scrolling parent while dragging
    if (e.cancelable) e.preventDefault();
  }

  function handleTouchEnd(e: TouchEvent) {
    if (!$dragDropStore.isDragging) return;
    
    const lastX = $dragDropStore.x;
    const lastY = $dragDropStore.y;
    
    const dx = lastX - startX;
    const dy = lastY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Only dispatch a drop event if the user actually dragged the card significantly.
    // This prevents accidental played cards when simply tapping to select/deselect.
    if (dist > 20) {
      window.dispatchEvent(new CustomEvent('card-dropped', { 
        detail: { cardId: $dragDropStore.cardId, x: lastX, y: lastY } 
      }));
    }

    dragDropStore.set({ cardId: null, x: 0, y: 0, isDragging: false });
  }

  onMount(() => {
    window.addEventListener('mousemove', handleGlobalMouseMove);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  });
  onDestroy(() => {
    window.removeEventListener('mousemove', handleGlobalMouseMove);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  });

  function selectCard(cardId: string, cost: number) {
    if (!$isMyTurnStore || $isSpectatorStore) return; // ignore clicks
    if (catnip >= cost) {
      $selectedCardIdStore = $selectedCardIdStore === cardId ? null : cardId;
      if ($selectedCardIdStore) {
        $selectedUnitIdStore = null; 
      }
    }
  }
</script>

{#if !$isSpectatorStore}
<div 
  class="hand-outer" 
  class:disabled-hand={!$isMyTurnStore} 
  class:hidden={($selectedCardIdStore && !isManuallyHidden && isMouseNear) || isManuallyHidden}
>
  <div class="feed-indicator">
    <span>Catnip: {catnip}</span>
    <button 
      class="hide-toggle" 
      class:active={isManuallyHidden}
      on:click|stopPropagation={() => isManuallyHidden = !isManuallyHidden}
      title={isManuallyHidden ? 'Show Hand' : 'Hide Hand'}
    >
      {isManuallyHidden ? '👁️' : '🙈'}
    </button>
  </div>
  <div class="hand-scroll-container">
    <div class="cards" style="--total: {hand.length}">
      {#each hand as card, i}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
          class="card-wrapper"
          style="--index: {i}"
        >
          <div
            class="card {catnip >= card.cost && $isMyTurnStore ? 'playable' : 'unplayable'} {$selectedCardIdStore === card.id ? 'selected' : ''}"
            on:click={() => selectCard(card.id, card.cost)}
            on:touchstart={(e) => handleTouchStart(e, card.id)}
          >
            <h4>{card.name}</h4>
            <div class="cost">Cost: {card.cost}</div>
            <div class="type">{card.type}</div>
            {#if card.moltsFrom}
              <div class="molt-info">Molts from:<br/><strong>{card.moltsFrom.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong></div>
            {/if}
            {#if card.ability}
              <div class="ability">✪ {card.ability.name}</div>
            {/if}
          </div>
        </div>
      {/each}
    </div>
  </div>
</div>
{/if}

{#if isManuallyHidden}
  <button 
    class="unhide-tab" 
    on:click={() => isManuallyHidden = false}
    in:fly={{ y: 20, duration: 300 }}
  >
    <span>Show Hand</span>
    <span class="icon">▲</span>
  </button>
{/if}

<style>
  .hand-outer {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: transparent;
    padding: 0 0 20px 0;
    width: 100%;
    overflow: hidden;
    pointer-events: none;
    transition: transform 0.4s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease;
    z-index: 10;
  }
  
  .hand-outer.hidden {
    transform: translateY(120%);
    opacity: 0;
  }
  
  .feed-indicator {
    background: #FFD700;
    color: #333;
    padding: 6px 16px;
    border-radius: 30px;
    font-weight: 800;
    font-size: 1.1rem;
    box-shadow: 0 4px 10px rgba(255, 215, 0, 0.4);
    border: 2px solid white;
    z-index: 200;
    margin-bottom: -10px;
    pointer-events: auto;
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .hide-toggle {
    background: rgba(0,0,0,0.1);
    border: none;
    padding: 2px;
    font-size: 0.9rem;
    cursor: pointer;
    border-radius: 6px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .hide-toggle:hover {
    background: rgba(255,255,255,0.3);
  }

  .hide-toggle.active {
    background: rgba(255,255,255,0.2);
  }

  .hand-scroll-container {
    width: 100%;
    overflow: visible;
    padding: 20px 0;
    display: flex;
    justify-content: center;
    pointer-events: none;
  }

  .cards {
    display: flex;
    /* Centers the hand, but allows scrolling if it overflows */
    margin: 0 auto;
    /* Rotation math constants */
    --rot-step: 3deg;
    --y-step: 4px;
  }

  .card-wrapper {
    /* Offset math: (index - (total-1)/2) */
    --offset: calc(var(--index) - (var(--total) - 1) / 2);
    /* Rotate and move slightly down as we go further from center */
    transform: 
      rotate(calc(var(--offset) * var(--rot-step)))
      translateY(calc(var(--offset) * var(--offset) * var(--y-step)));
    transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    margin: 0 -15px; /* Overlap cards like a real hand */
    z-index: var(--index);
  }

  @media (max-width: 600px) {
    .card-wrapper {
      margin: 0 -22px; /* Tighter overlap to fit screen width */
    }
  }

  .card-wrapper:hover {
    z-index: 1000;
    transform: 
      translateY(-30px)
      scale(1.1)
      rotate(0deg) !important;
  }

  .card {
    width: 120px;
    height: 170px;
    background: white;
    color: #444;
    border-radius: 16px;
    padding: 10px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
    cursor: pointer;
    border: 2px solid transparent;
    user-select: none;
    pointer-events: auto;
  }

  @media (max-width: 600px) {
    .card {
      width: 85px;
      height: 125px;
      padding: 6px;
      border-radius: 12px;
    }
    .cost { font-size: 0.65rem; padding: 1px 4px; }
    .type { font-size: 0.6rem; }
    .ability { font-size: 8px; padding-top: 3px; }
    h4 { font-size: 0.75rem !important; margin-bottom: 3px; }
  }

  h4 {
    margin: 0;
    font-size: 1rem;
    color: #ff6090;
    margin-bottom: 5px;
  }

  .unplayable {
    opacity: 0.6;
    filter: grayscale(80%);
  }

  .cost {
    background: #ffead0;
    color: #d46a00;
    align-self: flex-start;
    padding: 2px 6px;
    border-radius: 10px;
    font-weight: 800;
    font-size: 0.75rem;
    margin-bottom: 5px;
  }

  .type {
    font-size: 0.7rem;
    text-transform: uppercase;
    color: #999;
  }

  .molt-info {
    font-size: 0.65rem;
    color: #d46a00;
    margin-top: 3px;
    line-height: 1.1;
  }

  .selected {
    border-color: #ff6090 !important;
    box-shadow: 0 0 25px rgba(255, 96, 144, 0.6) !important;
  }

  .card-wrapper:has(.selected) {
    z-index: 1000;
    transform: translateY(-50px) scale(1.15) rotate(0deg) !important;
  }



  .disabled-hand {
    filter: saturate(0.3);
    pointer-events: none;
  }

  .ability {
    margin-top: auto;
    font-size: 10px;
    color: #7c3aed;
    font-weight: 600;
    border-top: 1px dashed #eee;
    padding-top: 5px;
  }

  .unhide-tab {
    position: fixed;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    background: #FFD700;
    color: #333;
    border: 2px solid white;
    border-bottom: none;
    border-radius: 12px 12px 0 0;
    padding: 6px 16px;
    font-weight: 800;
    font-size: 0.9rem;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    box-shadow: 0 -4px 12px rgba(0,0,0,0.2);
    z-index: 2000;
    pointer-events: auto;
  }
  .unhide-tab .icon { font-size: 0.7rem; }
</style>
