<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { CARD_LIBRARY, validateDeck, STANDARD_FORMAT, STAGE_1_UNIT_TEMPLATES, STAGE_1_BUILDING_TEMPLATES, UNIT_DICTIONARY, BUILDING_DICTIONARY, TRAP_DICTIONARY } from '@hex-strategy/shared';
  import { decksStore, saveDeck, deleteDeck, exportDeckToText, importDeckFromText, selectedDeckNameStore, STARTER_DECK_ID } from '../game/deckStore';

  const dispatch = createEventDispatcher();

  let deckName = "New Deck";
  let currentCards: string[] = []; // array of templateIds
  let importText = "";
  let showImport = false;
  let selectedPreviewId: string | null = null;
  let expandedSection: 'my-decks' | 'library' | 'current-deck' | 'preview' = 'library';

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
      if (card.draftable === false) return false;
      
      if (card.type === 'troop') {
        const effect = card.effects.find(e => e.type === "spawn_unit" || e.type === "molt_unit");
        if (effect && effect.params && effect.params.unitType) {
          const stats = UNIT_DICTIONARY[effect.params.unitType];
          if (stats && stats.stage > 1) {
            return false;
          }
        }
      }
      
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

  function handleCardClick(id: string) {
    selectedPreviewId = id;
    expandedSection = 'preview';
  }

  function closePreview() {
    selectedPreviewId = null;
    expandedSection = 'library';
  }

  $: previewStats = selectedPreviewId ? (UNIT_DICTIONARY[selectedPreviewId] || BUILDING_DICTIONARY[selectedPreviewId] || TRAP_DICTIONARY[selectedPreviewId]) : null;
  $: previewCard = selectedPreviewId ? CARD_LIBRARY[selectedPreviewId] : null;
</script>

  <div class="deckbuilder">
  <!-- Far Left: My Decks Sidebar -->
  <div class="my-decks panel" class:expanded={expandedSection === 'my-decks'}>
    <div class="panel-header" on:click={() => expandedSection = 'my-decks'} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && (expandedSection = 'my-decks')}>
      <h3>My Decks</h3>
      <div class="header-actions">
        <button class="new-btn" on:click|stopPropagation={handleNew}>+ New</button>
        <span class="chevron">{expandedSection === 'my-decks' ? '▼' : '▶'}</span>
      </div>
    </div>
    {#if expandedSection === 'my-decks' || window.innerWidth > 900}
      <div class="scrollable">
        {#each Object.entries($decksStore).sort((a,b) => b[1].readonly ? 1 : -1) as [id, deck]}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="deck-tab" class:active={deckName === deck.name} on:click={() => loadDeck(id)} role="button" tabindex="0">
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
    {/if}
  </div>

  <!-- Left Side: Library -->
  <div class="library panel" class:expanded={expandedSection === 'library'}>
    <div class="panel-header" on:click={() => expandedSection = 'library'} role="button" tabindex="0" on:keydown={(e) => e.key === 'Enter' && (expandedSection = 'library')}>
      <div class="title-group">
        <h2>Card Library</h2>
        <span class="chevron">{expandedSection === 'library' ? '▼' : '▶'}</span>
      </div>
      <div class="controls" on:click|stopPropagation role="none">
        <input type="text" placeholder="Search cards..." bind:value={searchQuery} />
        <select bind:value={filterType}>
          <option value="all">All Types</option>
          <option value="troop">Troops</option>
          <option value="building">Buildings</option>
          <option value="instinct">Instincts</option>
        </select>
      </div>
    </div>
    
    {#if expandedSection === 'library' || window.innerWidth > 900}
      <div class="card-grid scrollable">
        {#each filteredLibrary as [id, card]}
          <!-- svelte-ignore a11y-click-events-have-key-events -->
          <!-- svelte-ignore a11y-no-static-element-interactions -->
          <div class="card-item" class:maxed={cardCounts[id] >= 3} on:click={() => handleCardClick(id)} role="button" tabindex="0">
            <div class="card-top">
              <span class="cost">{card.cost}</span>
              <span class="type-icon">{card.type === 'troop' ? '🐱' : card.type === 'building' ? '🏗️' : '✨'}</span>
            </div>
            <div class="card-body">
              <div class="name">{card.name}</div>
              <div class="desc">{card.description}</div>
            </div>
            <div class="card-footer" on:click|stopPropagation={() => addCard(id)} role="none">
              <div class="count-pills">
                <div class="pill" class:active={cardCounts[id] >= 1}></div>
                <div class="pill" class:active={cardCounts[id] >= 2}></div>
                <div class="pill" class:active={cardCounts[id] >= 3}></div>
              </div>
              <button class="add-mini-btn" disabled={cardCounts[id] >= 3}>+</button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Card Preview Overlay -->
  {#if selectedPreviewId && previewCard}
    <div class="preview overlay-panel">
      <div class="panel-header">
        <h3>Card Detail</h3>
        <button class="close-overlay" on:click={closePreview}>×</button>
      </div>
      
      <div class="preview-content scrollable">
         <div class="preview-header">
           <span class="preview-cost">{previewCard.cost}</span>
           <h4>{previewCard.name}</h4>
         </div>
         
         <p class="preview-desc">{previewCard.description}</p>

         {#if previewStats}
           <div class="preview-stats">
              {#if 'hp' in previewStats && previewStats.hp > 0}
                <div class="p-stat"><span class="label">HP</span> <span class="value">{previewStats.hp}</span></div>
              {/if}
              {#if 'attack' in previewStats && previewStats.attack !== undefined}
                <div class="p-stat"><span class="label">ATK</span> <span class="value">{previewStats.attack}</span></div>
              {/if}
              {#if 'speed' in previewStats && previewStats.speed !== undefined}
                <div class="p-stat"><span class="label">SPEED</span> <span class="value">{previewStats.speed}</span></div>
              {/if}
              {#if 'movement' in previewStats && previewStats.movement !== undefined}
                <div class="p-stat"><span class="label">MOV</span> <span class="value">{previewStats.movement}</span></div>
              {/if}
              {#if 'range' in previewStats}
                <div class="p-stat"><span class="label">RANGE</span> <span class="value">{(previewStats.range ?? 0) > 1 ? previewStats.range : 'Melee'}</span></div>
              {/if}
           </div>

           {#if previewStats.quirks && previewStats.quirks.length > 0}
             <div class="preview-quirks">
               <h5>{previewCard.type === 'building' ? 'Functions' : 'Quirks'}</h5>
               {#each previewStats.quirks as q}
                 <div class="p-quirk">
                   <strong>{q.name}</strong>: {q.description}
                 </div>
               {/each}
             </div>
           {/if}
         {/if}

         <button class="add-btn-large" on:click={() => selectedPreviewId && addCard(selectedPreviewId)} disabled={selectedPreviewId ? cardCounts[selectedPreviewId] >= 3 : true}>
            Add to Deck ({selectedPreviewId ? cardCounts[selectedPreviewId] : 0}/3)
         </button>
       </div>
    </div>
  {/if}

  <!-- Right Side: Current Deck -->
  <div class="current-deck panel" class:expanded={expandedSection === 'current-deck'}>
    <div class="panel-header" on:click={() => expandedSection = 'current-deck'}>
      <div class="title-group">
        <h3>Current Deck</h3>
        <span class="chevron">{expandedSection === 'current-deck' ? '▼' : '▶'}</span>
      </div>
      <div class="deck-stats">
        <span>{currentCards.length} / {STANDARD_FORMAT.deckSize} Cards</span>
      </div>
    </div>

    {#if expandedSection === 'current-deck' || window.innerWidth > 900}
      <div class="deck-header-input" on:click|stopPropagation>
        <input 
          class="deck-name-input" 
          bind:value={deckName} 
          placeholder="Deck Name..." 
          disabled={$decksStore[$selectedDeckNameStore]?.readonly && deckName === 'Starter Deck'} 
        />
      </div>

      <div class="deck-list scrollable">
        {#if currentCards.length === 0}
          <div class="empty-state">Click cards in the library to add them to your deck.</div>
        {:else}
          {#each sortedDeckIds as id}
            <!-- svelte-ignore a11y-click-events-have-key-events -->
            <!-- svelte-ignore a11y-no-static-element-interactions -->
            <div class="deck-row" on:click={() => handleCardClick(id)}>
              <span class="row-cost">{CARD_LIBRARY[id].cost}</span>
              <span class="row-name">{CARD_LIBRARY[id].name}</span>
              <span class="row-count">x{cardCounts[id]}</span>
              <button class="remove-btn" on:click|stopPropagation={() => removeCard(id)}>×</button>
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
          <button on:click|stopPropagation={() => showImport = true}>Import</button>
          <button on:click|stopPropagation={handleExport}>Export</button>
          <button class="danger" on:click|stopPropagation={() => dispatch('back')}>Close</button>
        </div>
      </div>
    {/if}
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
    gap: 1rem;
    overflow: hidden;
    position: relative;
  }

  @media (max-width: 1300px) {
    .deckbuilder {
      grid-template-columns: 200px 1fr 300px;
    }
  }

  @media (max-width: 900px) {
    .deckbuilder {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      padding: 0.5rem;
      overflow-y: auto;
    }
    .panel {
      flex: 0 0 auto;
      min-height: 0;
    }
    .panel.expanded {
      flex: 1 1 auto;
    }
    .scrollable {
      max-height: 400px;
    }
    .panel-header {
      cursor: pointer;
    }
  }

  .panel {
    background: var(--bg-panel, #1e293b);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 1px solid #334155;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    transition: flex 0.3s ease;
  }

  .close-overlay {
    background: transparent;
    border: none;
    font-size: 1.8rem;
    color: #94a3b8;
    cursor: pointer;
    line-height: 1;
    padding: 0 4px;
    transition: color 0.2s;
  }
  .close-overlay:hover { color: var(--accent-pink); }

  .overlay-panel {
    position: absolute;
    right: 1.5rem;
    top: 1.5rem;
    bottom: 1.5rem;
    width: 380px;
    z-index: 1000;
    background: var(--bg-panel, #1e293b);
    border-radius: 16px;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    border: 2px solid var(--accent-indigo, #6366f1);
    box-shadow: -10px 0 40px rgba(0,0,0,0.6);
    animation: slideIn 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  @keyframes slideIn {
    from { transform: translateX(50px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }

  @media (max-width: 900px) {
    .overlay-panel {
       width: 90%;
       left: 5%;
       right: auto;
       height: auto;
       max-height: 80vh;
       top: 50%;
       transform: translateY(-50%);
    }
  }

  .panel.hidden { display: none; }

  .panel-header {
    padding: 1rem 1.2rem;
    border-bottom: 1px solid #334155;
    background: var(--bg-panel, #1e293b);
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 10px;
  }

  .title-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .chevron {
    display: none;
    color: var(--accent-pink);
    font-size: 0.8rem;
  }

  @media (max-width: 900px) {
    .chevron { display: inline; }
    .controls { flex-wrap: wrap; }
    .controls input { flex: 1; }
  }

  .new-btn {
    padding: 0.4rem 0.8rem;
    font-size: 0.85rem;
    background: var(--accent-indigo, #6366f1);
    border-radius: 6px;
    color: white;
    font-weight: bold;
    border: none;
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
    border: none;
  }
  .delete-icon:hover { color: #ef4444; background: rgba(239, 68, 68, 0.1); }

  .controls {
    display: flex;
    gap: 0.5rem;
  }

  .controls input, .controls select, .deck-name-input {
    background: var(--bg-dark, #0f172a);
    border: 1px solid #334155;
    color: white;
    padding: 0.5rem 1rem;
    border-radius: 8px;
    outline: none;
    transition: border-color 0.2s;
    font-family: inherit;
  }

  .deck-header-input {
    padding: 1rem 1rem 0 1rem;
  }

  .deck-name-input {
    width: 100%;
    font-size: 1.1rem;
    font-weight: bold;
    border-color: #475569;
  }

  .scrollable {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  /* Preview styles */
  .preview-content {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }

  .preview-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .preview-cost {
    background: var(--accent-indigo);
    width: 32px;
    height: 32px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-weight: bold;
    font-size: 1.1rem;
  }

  .preview-header h4 { margin: 0; font-size: 1.4rem; color: var(--accent-pink); }
  .preview-desc { font-style: italic; color: #cbd5e1; line-height: 1.4; margin: 0; }

  .preview-stats {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 10px;
    background: rgba(0,0,0,0.2);
    padding: 12px;
    border-radius: 12px;
  }

  .p-stat { display: flex; justify-content: space-between; font-size: 0.9rem; }
  .p-stat .label { color: #94a3b8; font-weight: bold; }
  .p-stat .value { color: white; font-weight: bold; }

  .preview-quirks h5 { margin: 0 0 8px 0; color: var(--accent-pink); text-transform: uppercase; font-size: 0.8rem; letter-spacing: 1px; }
  .p-quirk { font-size: 0.85rem; line-height: 1.4; background: rgba(255,255,255,0.05); padding: 8px; border-radius: 8px; margin-bottom: 6px; }

  .add-btn-large {
    background: var(--accent-indigo);
    color: white;
    padding: 1rem;
    font-size: 1.1rem;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
    border: none;
    border-radius: 12px;
    font-weight: bold;
    cursor: pointer;
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
    padding: 0.8rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    cursor: pointer;
    transition: all 0.2s;
    position: relative;
    font-family: inherit;
  }

  .card-item:hover {
    border-color: var(--accent-indigo, #6366f1);
    transform: translateY(-2px);
    background: #1e293b;
  }

  .card-item.maxed { opacity: 0.6; }

  .card-top { display: flex; justify-content: space-between; align-items: center; }
  .cost {
    background: var(--accent-indigo, #6366f1);
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 50%;
    font-weight: bold;
    font-size: 12px;
  }

  .name { font-weight: bold; font-size: 1rem; color: #818cf8; }
  .desc { font-size: 0.75rem; color: #94a3b8; line-height: 1.3; overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; }

  .card-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: auto;
    padding-top: 8px;
    border-top: 1px solid #334155;
  }

  .add-mini-btn {
    width: 24px;
    height: 24px;
    background: var(--accent-indigo);
    border: none;
    border-radius: 4px;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    cursor: pointer;
  }

  .add-mini-btn:disabled { opacity: 0.3; cursor: not-allowed; }

  .count-pills { display: flex; gap: 3px; }
  .pill { width: 12px; height: 4px; background: #334155; border-radius: 2px; }
  .pill.active { background: var(--accent-indigo, #6366f1); }

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
  }

  .deck-row:hover { background: #1e293b; color: var(--accent-pink); }
  .row-cost { font-weight: bold; color: var(--accent-indigo); width: 20px; }
  .row-name { flex: 1; font-size: 0.9rem; }
  .row-count { color: #94a3b8; font-weight: bold; }
  .remove-btn { background: transparent; border: none; font-size: 1.2rem; color: #64748b; padding: 0; cursor: pointer; }
  .remove-btn:hover { color: #ef4444; }

  .validation-panel {
    padding: 1rem 1.5rem;
    background: rgba(15, 23, 42, 0.5);
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    border-top: 1px solid #334155;
  }

  .v-item { font-size: 0.8rem; color: #f87171; display: flex; align-items: center; gap: 8px; }
  .v-item.pass { color: #4ade80; }

  .actions { padding: 1.5rem; display: flex; flex-direction: column; gap: 0.6rem; }
  .secondary-actions { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 0.6rem; }

  button { font-family: inherit; border: none; cursor: pointer; font-weight: bold; transition: all 0.2s; border-radius: 8px; }
  button:hover:not(:disabled) { filter: brightness(1.1); transform: translateY(-1px); }
  button.primary { padding: 0.8rem; background: linear-gradient(135deg, var(--accent-indigo), #a855f7); color: white; font-size: 1rem; }
  button.danger { background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); }

  .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.85); display: flex; align-items: center; justify-content: center; z-index: 10000; backdrop-filter: blur(4px); }
  .modal { background: var(--bg-panel, #1e293b); padding: 2.5rem; border-radius: 20px; width: 90%; max-width: 500px; display: flex; flex-direction: column; gap: 1.2rem; border: 1px solid #334155; }
  .modal h3 { margin: 0; font-size: 1.5rem; color: var(--accent-pink, #ff6090); }
  textarea { background: var(--bg-dark); color: white; border: 1px solid #334155; padding: 1rem; border-radius: 12px; font-family: monospace; }
  .modal-btns { display: flex; gap: 1rem; }
  .modal-btns button { flex: 1; padding: 0.8rem; background: #334155; color: white; }

  .empty-state { text-align: center; color: #64748b; padding: 4rem 1rem; font-style: italic; }
</style>
