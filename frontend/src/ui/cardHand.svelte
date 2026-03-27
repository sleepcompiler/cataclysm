<script lang="ts">
  import { projectedHandStore, playerIdStore, projectedCatnipStore, selectedCardIdStore, isMyTurnStore, selectedUnitIdStore } from "../game/gameClient";

  $: hand = $projectedHandStore || [];
  $: catnip = $projectedCatnipStore;

  function selectCard(cardId: string, cost: number) {
    if (!$isMyTurnStore) return; // ignore clicks when it's not our turn
    if (catnip >= cost) {
      $selectedCardIdStore = $selectedCardIdStore === cardId ? null : cardId;
      if ($selectedCardIdStore) {
        $selectedUnitIdStore = null; // Clear unit selection to allow card tooltip
      }
    }
  }
</script>

<div class="hand-container" class:disabled-hand={!$isMyTurnStore}>
  <div class="feed-indicator">Catnip: {catnip}</div>
  <div class="cards">
    {#each hand as card}
      <!-- svelte-ignore a11y-click-events-have-key-events -->
      <!-- svelte-ignore a11y-no-static-element-interactions -->
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
    {/each}
  </div>
</div>

<style>
  .hand-container {
    position: absolute;
    bottom: 30px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    z-index: 100;
  }
  
  .feed-indicator {
    background: #FFD700;
    color: #333;
    padding: 8px 20px;
    border-radius: 30px;
    font-weight: 800;
    font-size: 1.3rem;
    box-shadow: 0 4px 10px rgba(255, 215, 0, 0.4);
    border: 3px solid white;
  }

  .feed-indicator::before {
    content: "🐾 ";
  }

  .cards {
    display: flex;
    gap: 12px;
    padding: 10px;
  }

  .card {
    width: 130px;
    height: 190px;
    background: white;
    color: #444;
    border-radius: 20px;
    padding: 12px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 6px 12px rgba(0,0,0,0.1);
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    border: 2px solid transparent;
  }

  .card:hover {
    transform: translateY(-15px) rotate(2deg);
    box-shadow: 0 12px 24px rgba(0,0,0,0.15);
  }

  h4 {
    margin: 0;
    font-size: 1.1rem;
    color: #ff6090;
    margin-bottom: 8px;
  }

  .unplayable {
    opacity: 0.6;
    filter: grayscale(40%) blur(0.5px);
    cursor: not-allowed;
  }

  .cost {
    background: #ffead0;
    color: #d46a00;
    align-self: flex-start;
    padding: 3px 8px;
    border-radius: 12px;
    font-weight: 800;
    font-size: 0.8rem;
    margin-bottom: 8px;
  }

  .type {
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 1px;
    color: #999;
  }

  .molt-info {
    font-size: 0.7rem;
    color: #d46a00;
    margin-top: 5px;
    background: #fffafa;
    padding: 3px 5px;
    border-radius: 6px;
    border: 1px dashed #ffcada;
    line-height: 1.2;
  }

  .selected {
    border-color: #ff6090;
    box-shadow: 0 0 20px rgba(255, 96, 144, 0.4);
    transform: translateY(-20px) scale(1.05);
  }

  .disabled-hand {
    pointer-events: none;
    filter: saturate(0.5);
  }

  .ability {
    margin-top: auto;
    font-size: 11px;
    color: #7c3aed;
    font-weight: 600;
    border-top: 2px dashed #ffeeee;
    padding-top: 8px;
  }
</style>
