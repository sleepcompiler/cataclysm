import { writable, get } from 'svelte/store';
import { CARD_LIBRARY, DEFAULT_DECK, validateDeck } from '@hex-strategy/shared';

export interface SavedDeck {
  name: string;
  cards: string[]; // array of templateIds
  readonly?: boolean;
}

const STORAGE_KEY = 'hex_strategy_decks';
export const STARTER_DECK_ID = '__starter_standard__';

function getInitialDecks(): Record<string, SavedDeck> {
  const stored = localStorage.getItem(STORAGE_KEY);
  let userDecks: Record<string, SavedDeck> = {};
  
  if (stored) {
    try {
      userDecks = JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse decks from localStorage', e);
    }
  }
  
  // Always provide the official starter deck
  return {
    ...userDecks,
    [STARTER_DECK_ID]: {
      name: 'Starter Deck',
      cards: [...DEFAULT_DECK],
      readonly: true
    }
  };
}

export const decksStore = writable<Record<string, SavedDeck>>(getInitialDecks());
export const selectedDeckNameStore = writable<string>(STARTER_DECK_ID);

// Sync with localStorage
decksStore.subscribe(value => {
  // Only store user-created decks; don't persist the starter to the same key 
  // (we re-inject it on load anyway)
  const toStore = { ...value };
  delete toStore[STARTER_DECK_ID];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
});

export function saveDeck(name: string, cards: string[]) {
  // If editing the starter or a readonly deck, saving with the same name actually creates a new entry
  // unless we want to prevent that. Usually "Save" on a template should suggest a new name.
  // We'll use the name as the key if it's NOT the starter ID.
  const key = name === 'Starter Deck' ? name : name; 
  
  decksStore.update(d => ({
    ...d,
    [name]: { name, cards, readonly: false }
  }));
}

export function deleteDeck(id: string) {
  if (id === STARTER_DECK_ID) return; // protect starter
  decksStore.update(d => {
    const next = { ...d };
    delete next[id];
    return next;
  });
  
  if (get(selectedDeckNameStore) === id) {
    selectedDeckNameStore.set(STARTER_DECK_ID);
  }
}

export function exportDeckToText(cards: string[]): string {
  const counts: Record<string, number> = {};
  for (const id of cards) {
    counts[id] = (counts[id] || 0) + 1;
  }
  
  return Object.entries(counts)
    .map(([id, count]) => {
      const name = CARD_LIBRARY[id]?.name || id;
      return `${count}x ${name}`;
    })
    .join('\n');
}

export function importDeckFromText(text: string): string[] | { error: string } {
  const lines = text.split('\n');
  const cards: string[] = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    const match = trimmed.match(/^(\d+)x\s+(.+)$/i);
    if (!match) return { error: `Invalid line format: "${trimmed}". Expected "Count x CardName"` };
    
    const count = parseInt(match[1]);
    const cardName = match[2].toLowerCase();
    
    // Find templateId by card name
    const templateId = Object.keys(CARD_LIBRARY).find(id => 
      CARD_LIBRARY[id].name.toLowerCase() === cardName
    );
    
    if (!templateId) return { error: `Unknown card: "${match[2]}"` };
    
    for (let i = 0; i < count; i++) {
      cards.push(templateId);
    }
  }
  
  return cards;
}

export function getSelectedDeck(): SavedDeck {
  const decks = get(decksStore);
  const name = get(selectedDeckNameStore);
  return decks[name] || decks['Starter Deck'];
}
