<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { CARD_LIBRARY, validateDeck, STANDARD_FORMAT, STAGE_1_UNIT_TEMPLATES, STAGE_1_BUILDING_TEMPLATES } from '@hex-strategy/shared';
  import { decksStore, saveDeck, deleteDeck, exportDeckToText, importDeckFromText, selectedDeckNameStore, STARTER_DECK_ID } from '../game/deckStore';

  const dispatch = createEventDispatcher();

  let deckName = "New Deck";
  let currentCards: string[] = []; // array of templateIds
  let importText = "";
  let showImport = false;

  // On mount, load the currently selected deck from the store
  onMount(() => {
    loadDeck($selectedDeckNameStore);
  });

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
    if (currentCards.length >= STANDARD_FORMAT.deckSize) return;
    const copies = currentCards.filter(c => c === id).length;
    if (copies >= STANDARD_FORMAT.maxCopies) return;
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
    if (!deckName.trim() || deckName === 'Starter Deck') {
      alert("Please enter a unique name for your deck.");
      return;
    }
    
    saveDeck(deckName, currentCards);
    selectedDeckNameStore.set(deckName);
    alert("Deck saved!");
  }

  function handleNew() {
    deckName = "New Deck";
    currentCards = [];
  }

  function loadDeck(id: string) {
    const d = $decksStore[id];
    if (d) {
      deckName = d.name;
      currentCards = [...d.cards];
    }
  }

  function confirmDelete(id: string) {
    if ($decksStore[id]?.readonly) return;
    if (confirm(`Are you sure you want to delete "${$decksStore[id].name}"?`)) {
      deleteDeck(id);
    }
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
  <!-- Far Left: My Decks Sidebar -->
  <div class="my-decks panel">
    <div class="panel-header">
      <h3>My Decks</h3>
      <button class="new-btn" on:click={handleNew}>+ New</button>
    </div>
    <div class="scrollable">
      {#each Object.entries($decksStore).sort((a,b) => b[1].readonly ? 1 : -1) as [id, deck]}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="deck-tab" class:active={deckName === deck.name} on:click={() => loadDeck(id)}>
          <div class="deck-info">
            <span class="name">{deck.name}</span>
            {#if deck.readonly}
              <span class="badge">Official</span>
            {/if}
          </div>
          {#if !deck.readonly}
            <button class="delete-icon" on:click|stopPropagation={() => confirmDelete(id)}>×</button>
          {/if}
        </div>
      {/each}
    </div>
  </div>

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
      <input 
        class="deck-name-input" 
        bind:value={deckName} 
        placeholder="Deck Name..." 
        disabled={$decksStore[$selectedDeckNameStore]?.readonly && deckName === 'Starter Deck'} 
      />
      <div class="deck-stats">
        <span>{currentCards.length} / {STANDARD_FORMAT.deckSize} Cards</span>
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
      <button class="primary" on:click={handleSave} disabled={!validation.valid || deckName === 'Starter Deck'}>Save Deck</button>
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
    grid-template-columns: 240px 1fr 340px;
    height: 100vh;
    background: var(--bg-dark, #0f172a);
    color: var(--text-main, #f1f5f9);
    padding: 1rem;
    gap: 1rem;
  }

  @media (max-width: 1100px) {
    .deckbuilder {
      grid-template-columns: 200px 1fr 300px;
    }
  }

  @media (max-width: 900px) {
    .deckbuilder {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr 400px;
    }
    .my-decks { max-height: 150px; }
  }

  .panel {
    background: var(--bg-panel, #1e293b);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #334155;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
  }

  .panel-header {
    padding: 1.2rem 1.5rem;
    border-bottom: 1px solid #334155;
    background: var(--bg-panel, #1e293b);
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .new-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    background: var(--accent-indigo, #6366f1);
    border-radius: 6px;
    color: white;
    font-weight: bold;
  }

  .deck-tab {
    padding: 1rem;
    border-bottom: 1px solid #334155;
    cursor: pointer;
    display: flex;
    justify-content: space-between;
    align-items: center;
    transition: all 0.2s;
  }

  .deck-tab:hover { background: #334155; }
  .deck-tab.active { 
    background: rgba(99, 102, 241, 0.1); 
    border-left: 4px solid var(--accent-indigo, #6366f1); 
  }

  .deck-info { display: flex; flex-direction: column; gap: 4px; }
  .deck-info .name { font-weight: 600; font-size: 0.95rem; }
  .badge { 
    font-size: 0.65rem; 
    background: #475569; 
    color: #cbd5e1;
    padding: 2px 6px; 
    border-radius: 4px; 
    width: fit-content; 
    text-transform: uppercase; 
    font-weight: bold;
  }

  .delete-icon {
    font-size: 1.2rem;
    color: var(--text-muted, #94a3b8);
    background: transparent;
    padding: 0;
    width: 24px;
    height: 24px;
    border-radius: 4px;
  }
  .delete-icon:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }

  .controls {
    display: flex;
    gap: 0.5rem;
    margin-top: 1rem;
  }

  .controls input, .controls select, .deck-name-input {
    background: var(--bg-dark, #0f172a);
    border: 1px solid #334155;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    outline: none;
    transition: border-color 0.2s;
  }

  .controls input:focus, .controls select:focus, .deck-name-input:focus {
    border-color: var(--accent-indigo, #6366f1);
  }

  .deck-name-input {
    width: 100%;
    font-size: 1.2rem;
    font-weight: bold;
    border-color: #475569;
  }

  .deck-name-input:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .scrollable {
    flex: 1;
    overflow-y: auto;
    padding: 1.5rem;
  }

  /* Library grid adjustments */
  .card-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 1rem;
  }

  .card-item {
    background: var(--bg-dark, #0f172a);
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
    border-color: var(--accent-indigo, #6366f1);
    transform: translateY(-2px);
    background: #1e293b;
    box-shadow: 0 4px 15px rgba(0,0,0,0.3);
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
    background: var(--accent-indigo, #6366f1);
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
    color: var(--accent-indigo, #818cf8);
  }

  .desc {
    font-size: 0.85rem;
    color: var(--text-muted, #94a3b8);
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
    background: var(--accent-indigo, #6366f1);
    box-shadow: 0 0 5px var(--accent-indigo, #6366f1);
  }

  .deck-list {
    background: var(--bg-dark, #0f172a);
    margin: 1rem;
    border-radius: 12px;
    border: 1px solid #334155;
  }

  .deck-row {
    padding: 0.6rem 1rem;
    display: flex;
    align-items: center;
    gap: 0.8rem;
    border-bottom: 1px solid #334155;
    cursor: pointer;
    transition: background 0.2s;
  }

  .deck-row:last-child { border-bottom: none; }

  .deck-row:hover {
    background: #1e293b;
    color: var(--accent-pink, #f87171);
  }

  .row-cost {
    font-weight: bold;
    color: var(--accent-indigo, #6366f1);
    width: 20px;
  }

  .row-name {
    flex: 1;
    font-size: 0.95rem;
  }

  .row-count {
    color: var(--text-muted, #94a3b8);
    font-family: monospace;
    font-weight: bold;
  }

  .validation-panel {
    padding: 1rem 1.5rem;
    background: rgba(15, 23, 42, 0.5);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border-top: 1px solid #334155;
  }

  .v-item {
    font-size: 0.85rem;
    color: #f87171;
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .v-item.pass {
    color: #4ade80;
  }

  .actions {
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
  }

  .secondary-actions {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 0.6rem;
  }

  button {
    padding: 0.8rem;
    border-radius: 8px;
    border: none;
    font-weight: bold;
    cursor: pointer;
    background: #334155;
    color: white;
    transition: all 0.2s;
  }

  button:hover {
    filter: brightness(1.1);
    transform: translateY(-1px);
  }

  button:active {
    transform: translateY(0);
  }

  button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }

  button.primary {
    background: linear-gradient(135deg, var(--accent-indigo, #6366f1), #a855f7);
    font-size: 1.1rem;
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }

  button.danger {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  button.danger:hover {
    background: rgba(239, 68, 68, 0.2);
    border-color: #ef4444;
  }

  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    backdrop-filter: blur(4px);
  }

  .modal {
    background: var(--bg-panel, #1e293b);
    padding: 2.5rem;
    border-radius: 20px;
    width: 90%;
    max-width: 500px;
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
    border: 1px solid #334155;
    box-shadow: 0 20px 50px rgba(0,0,0,0.5);
  }

  .modal h3 { margin: 0; font-size: 1.5rem; color: var(--accent-pink, #ff6090); }

  textarea {
    background: var(--bg-dark, #0f172a);
    color: white;
    border: 1px solid #334155;
    padding: 1rem;
    border-radius: 12px;
    font-family: monospace;
    resize: none;
    outline: none;
    font-size: 0.9rem;
  }

  textarea:focus { border-color: var(--accent-indigo, #6366f1); }

  .modal-btns {
    display: flex;
    gap: 1rem;
  }

  .modal-btns button {
    flex: 1;
  }

  .empty-state {
    text-align: center;
    color: var(--text-muted, #64748b);
    padding: 4rem 1rem;
    font-style: italic;
  }
</style>
