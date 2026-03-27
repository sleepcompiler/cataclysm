<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  // In reality, this would fetch from an API instead of being hardcoded.
  // We'll mock the library to meet the architecture requirements of browsing, adding, saving.

  const dispatch = createEventDispatcher();

  const mockLibrary = [
    { id: "kitten", name: "Kitten", cost: 1, type: "troop" },
    { id: "tabby", name: "Tabby", cost: 1, type: "troop" },
    { id: "maine_coon", name: "Maine Coon", cost: 2, type: "troop" },
    { id: "alley_cat", name: "Alley Cat", cost: 2, type: "troop" },
    { id: "panther", name: "Panther", cost: 2, type: "troop" },
    { id: "tom", name: "Tom Cat", cost: 2, type: "troop" },
    { id: "lion", name: "Lion", cost: 2, type: "troop" },
    { id: "litter_box", name: "Litter Box", cost: 1, type: "building" },
    { id: "scratching_post", name: "Scratching Post", cost: 2, type: "building" },
    { id: "catnip", name: "Catnip Frenzy", cost: 2, type: "instinct" },
    { id: "pounce", name: "Pounce", cost: 1, type: "instinct" },
    { id: "hiss", name: "Hiss", cost: 3, type: "instinct" },
    { id: "purr", name: "Purr", cost: 1, type: "instinct" },
    { id: "lightning_claw", name: "Lightning Claw", cost: 4, type: "instinct" },
  ];

  let deck: string[] = [];

  function addCard(id: string) {
    if (deck.length >= 20) return;
    const copies = deck.filter(c => c === id).length;
    if (copies >= 2) return;
    deck = [...deck, id];
  }

  function removeCard(id: string) {
    const idx = deck.indexOf(id);
    if (idx !== -1) {
      deck.splice(idx, 1);
      deck = [...deck];
    }
  }

  function saveDeck() {
    if (deck.length !== 20) {
      alert("Deck must be exactly 20 cards.");
      return;
    }
    alert("Deck Saved successfully!");
    dispatch("back");
  }
</script>

<div class="deckbuilder">
  <div class="library panel">
    <h2>Library</h2>
    <div class="grid">
      {#each mockLibrary as card}
       <!-- svelte-ignore a11y-click-events-have-key-events -->
       <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="card-sm" on:click={() => addCard(card.id)}>
          <span class="cost">{card.cost}</span>
          <span>{card.name}</span>
        </div>
      {/each}
    </div>
  </div>

  <div class="current-deck panel">
    <h2>Your Deck ({deck.length}/20)</h2>
    <div class="list">
      {#each deck as d}
        <!-- svelte-ignore a11y-click-events-have-key-events -->
       <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div class="deck-item" on:click={() => removeCard(d)}>
          {d}
        </div>
      {/each}
    </div>
    
    <div class="actions">
      <button on:click={saveDeck} disabled={deck.length !== 20}>Save Deck</button>
      <button class="secondary" on:click={() => dispatch('back')}>Cancel</button>
    </div>
  </div>
</div>

<style>
  .deckbuilder {
    display: flex;
    flex-direction: row;
    height: 100%;
    padding: 2rem;
    gap: 2rem;
    background: #333;
  }
  .panel {
    background: #222;
    border-radius: 8px;
    padding: 1rem;
    flex: 1;
    display: flex;
    flex-direction: column;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
    gap: 1rem;
  }
  .list {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .card-sm {
    background: white;
    color: black;
    height: 160px;
    border-radius: 8px;
    padding: 10px;
    cursor: pointer;
    box-shadow: 0 2px 4px rgba(0,0,0,0.5);
  }
  .deck-item {
    background: #444;
    padding: 0.5rem 1rem;
    border-radius: 4px;
    cursor: pointer;
  }
  .deck-item:hover {
    background: #555;
  }
  button {
    padding: 10px;
    font-size: 1rem;
    background: #4caf50;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-top: 1rem;
  }
  button:disabled {
    background: #555;
    cursor: not-allowed;
  }
  button.secondary {
    background: #666;
  }
  .actions {
    display: flex;
    gap: 1rem;
  }
</style>
