<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { CARD_LIBRARY, validateDeck, VALIDATION_RULES, STAGE_1_UNIT_TEMPLATES, STAGE_1_BUILDING_TEMPLATES } from '@hex-strategy/shared';
  import { decksStore, saveDeck, exportDeckToText, importDeckFromText, selectedDeckNameStore } from '../game/deckStore';

  const dispatch = createEventDispatcher();

  let deckName = "My New Deck";
  let currentCards: string[] = []; // array of templateIds
  let importText = "";
  let showImport = false;

  // Derive counts for the UI list
  $: cardCounts = currentCards.reduce((acc, id) => {
    acc[id] = (acc[id] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  $: sortedDeckIds = Object.keys(cardCounts).sort((a, b) => {
    const cardA = CARD_LIBRARY[a];
    const cardB = CARD_LIBRARY[b];
    if (cardA.cost !== cardB.cost) return cardA.cost - cardB.cost;
    return cardA.name.localeCompare(cardB.name);
  });

  $: validation = validateDeck(currentCards);
  $: hasStage1 = currentCards.some(id => STAGE_1_UNIT_TEMPLATES.includes(id) || STAGE_1_BUILDING_TEMPLATES.includes(id));

  // Library filtering
  let filterType: 'all' | 'troop' | 'building' | 'instinct' = 'all';
  let searchQuery = "";

  $: filteredLibrary = Object.entries(CARD_LIBRARY)
    .filter(([id, card]) => {
      if (filterType !== 'all' && card.type !== filterType) return false;
      if (searchQuery && !card.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
    .sort((a, b) => a[1].cost - b[1].cost);

  function addCard(id: string) {
    if (currentCards.length >= VALIDATION_RULES.deckSize) return;
    const copies = currentCards.filter(c => c === id).length;
    if (copies >= VALIDATION_RULES.maxCopies) return;
    currentCards = [...currentCards, id];
  }

  function removeCard(id: string) {
    const idx = currentCards.lastIndexOf(id);
    if (idx !== -1) {
      currentCards.splice(idx, 1);
      currentCards = [...currentCards];
    }
  }

  function handleSave() {
    if (!validation.valid) {
      alert("Cannot save an invalid deck: " + validation.errors.join("\n"));
      return;
    }
    if (!deckName.trim()) {
      alert("Please enter a name for your deck.");
      return;
    }
    saveDeck(deckName, currentCards);
    selectedDeckNameStore.set(deckName);
    dispatch('back');
  }

  function handleImport() {
    const result = importDeckFromText(importText);
    if ('error' in result) {
      alert(result.error);
    } else {
      currentCards = result;
      showImport = false;
      importText = "";
    }
  }

  function handleExport() {
    const text = exportDeckToText(currentCards);
    navigator.clipboard.writeText(text);
    alert("Deck copied to clipboard!");
  }

</script>

<div class="deckbuilder">
  <!-- Left Side: Library -->
  <div class="library panel">
    <div class="panel-header">
      <h2>Card Library</h2>
      <div class="controls">
        <input type="text" placeholder="Search cards..." bind:value={searchQuery} />
        <select bind:value={filterType}>
          <option value="all">All Types</option>
          <option value="troop">Troops</option>
          <option value="building">Buildings</option>
          <option value="instinct">Instincts</option>
        </select>
      </div>
    </div>
    
    <div class="card-grid scrollable">
      {#each filteredLibrary as [id, card]}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="card-item" class:maxed={cardCounts[id] >= 3} on:click={() => addCard(id)}>
          <div class="card-top">
            <span class="cost">{card.cost}</span>
            <span class="type-icon">{card.type === 'troop' ? '🐱' : card.type === 'building' ? '🏗️' : '✨'}</span>
          </div>
          <div class="card-body">
            <div class="name">{card.name}</div>
            <div class="desc">{card.description}</div>
          </div>
          <div class="card-footer">
            <div class="count-pills">
              <div class="pill" class:active={cardCounts[id] >= 1}></div>
              <div class="pill" class:active={cardCounts[id] >= 2}></div>
              <div class="pill" class:active={cardCounts[id] >= 3}></div>
            </div>
          </div>
        </div>
      {/each}
    </div>
  </div>

  <!-- Right Side: Current Deck -->
  <div class="current-deck panel">
    <div class="panel-header">
      <input class="deck-name-input" bind:value={deckName} placeholder="Deck Name..." />
      <div class="deck-stats">
        <span>{currentCards.length} / {VALIDATION_RULES.deckSize} Cards</span>
      </div>
    </div>

    <div class="deck-list scrollable">
      {#if currentCards.length === 0}
        <div class="empty-state">Click cards in the library to add them to your deck.</div>
      {:else}
        {#each sortedDeckIds as id}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="deck-row" on:click={() => removeCard(id)}>
            <span class="row-cost">{CARD_LIBRARY[id].cost}</span>
            <span class="row-name">{CARD_LIBRARY[id].name}</span>
            <span class="row-count">x{cardCounts[id]}</span>
          </div>
        {/each}
      {/if}
    </div>

    <div class="validation-panel">
      <div class="v-item" class:pass={currentCards.length === 25}>
        {currentCards.length === 25 ? '✅' : '❌'} Exactly 25 Cards
      </div>
      <div class="v-item" class:pass={hasStage1}>
        {hasStage1 ? '✅' : '❌'} Turn 1 Playable (Stage 1/Building)
      </div>
    </div>

    <div class="actions">
      <button class="primary" on:click={handleSave} disabled={!validation.valid}>Save Deck</button>
      <div class="secondary-actions">
        <button on:click={() => showImport = true}>Import</button>
        <button on:click={handleExport}>Export</button>
        <button class="danger" on:click={() => dispatch('back')}>Close</button>
      </div>
    </div>
  </div>

  {#if showImport}
    <div class="modal-overlay">
      <div class="modal">
        <h3>Import Deck</h3>
        <p>Paste your deck list below (Format: 3x House Kitten)</p>
        <textarea bind:value={importText} rows="10"></textarea>
        <div class="modal-btns">
          <button class="primary" on:click={handleImport}>Load Deck</button>
          <button on:click={() => showImport = false}>Cancel</button>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .deckbuilder {
    display: grid;
    grid-template-columns: 1fr 340px;
    height: 100vh;
    background: #0f172a;
    color: #f1f5f9;
    padding: 1rem;
    gap: 1rem;
  }

  @media (max-width: 900px) {
    .deckbuilder {
      grid-template-columns: 1fr;
      grid-template-rows: 1fr 400px;
    }
  }

  .panel {
    background: #1e293b;
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #334155;
  }

  .panel-header {
    padding: 1.5rem;
    border-bottom: 1px solid #334155;
    background: #1e293b;
  }

  .controls {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .controls input, .controls select, .deck-name-input {
    background: #0f172a;
    border: 1px solid #334155;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    outline: none;
  }

  .deck-name-input {
    width: 100%;
    font-size: 1.2rem;
    font-weight: bold;
    border-color: #475569;
  }

  .scrollable {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 1rem;
  }

  .card-item {
    background: #0f172a;
    border: 2px solid #334155;
    border-radius: 12px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
  }

  .card-item:hover {
    border-color: #6366f1;
    transform: translateY(-2px);
    background: #1e293b;
  }

  .card-item.maxed {
    opacity: 0.6;
    border-color: #ef4444;
  }

  .card-top {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .cost {
    background: #6366f1;
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-weight: bold;
    font-size: 14px;
    color: white;
  }

  .name {
    font-weight: bold;
    font-size: 1.1rem;
    color: #818cf8;
  }

  .desc {
    font-size: 0.85rem;
    color: #94a3b8;
    line-height: 1.4;
  }

  .count-pills {
    display: flex;
    gap: 4px;
    margin-top: auto;
  }

  .pill {
    flex: 1;
    height: 4px;
    background: #334155;
    border-radius: 2px;
  }

  .pill.active {
    background: #6366f1;
  }

  .deck-list {
    background: #0f172a;
    margin: 1rem;
    border-radius: 8px;
    border: 1px solid #334155;
  }

  .deck-row {
    padding: 0.6rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    border-bottom: 1px solid #334155;
    cursor: pointer;
  }

  .deck-row:hover {
    background: #1e293b;
    color: #ef4444;
  }

  .row-cost {
    font-weight: bold;
    color: #6366f1;
    width: 20px;
  }

  .row-name {
    flex: 1;
  }

  .row-count {
    color: #94a3b8;
    font-family: monospace;
  }

  .validation-panel {
    padding: 1rem 1.5rem;
    background: #0f172a88;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .v-item {
    font-size: 0.9rem;
    color: #f87171;
  }

  .v-item.pass {
    color: #4ade80;
  }

  .actions {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .secondary-actions {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.5rem;
  }

  button {
    padding: 0.8rem;
    border-radius: 8px;
    border: none;
    font-weight: bold;
    cursor: pointer;
    background: #334155;
    color: white;
    transition: filter 0.2s;
  }

  button:hover {
    filter: brightness(1.2);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  button.primary {
    background: linear-gradient(135deg, #6366f1, #a855f7);
    font-size: 1.1rem;
  }

  button.danger {
    background: #ef444433;
    color: #ef4444;
    border: 1px solid #ef444455;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  }

  .modal {
    background: #1e293b;
    padding: 2rem;
    border-radius: 16px;
    width: 90%;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  textarea {
    background: #0f172a;
    color: white;
    border: 1px solid #334155;
    padding: 1rem;
    border-radius: 8px;
    font-family: monospace;
    resize: none;
    outline: none;
  }

  .modal-btns {
    display: flex;
    gap: 1rem;
  }

  .modal-btns button {
    flex: 1;
  }

  .empty-state {
    text-align: center;
    color: #64748b;
    padding: 3rem 1rem;
  }
</style>
