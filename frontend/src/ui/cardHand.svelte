<script lang="ts">
  import { 
    projectedHandStore, 
    playerIdStore, 
    projectedCatnipStore, 
    selectedCardIdStore, 
    isMyTurnStore, 
    selectedUnitIdStore,
    isSpectatorStore
  } from "../game/gameClient";

  $: hand = $projectedHandStore || [];
  $: catnip = $projectedCatnipStore;

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
<div class="hand-outer" class:disabled-hand={!$isMyTurnStore}>
  <div class="feed-indicator">Catnip: {catnip}</div>
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

<style>
  .hand-outer {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: linear-gradient(to top, rgba(0,0,0,0.1), transparent);
    padding: 10px 0 20px 0;
    width: 100%;
    overflow: hidden;
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
  }

  .hand-scroll-container {
    width: 100%;
    overflow-x: auto;
    overflow-y: hidden;
    padding: 40px 20px;
    -webkit-overflow-scrolling: touch;
    display: flex;
    justify-content: center;
  }

  @media (max-width: 800px) {
    .hand-scroll-container {
      justify-content: flex-start;
    }
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
  }

  @media (max-width: 600px) {
    .card {
      width: 100px;
      height: 145px;
      padding: 8px;
    }
    h4 { font-size: 0.9rem !important; }
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
</style>
