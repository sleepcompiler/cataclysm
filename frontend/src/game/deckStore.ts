import { writable, get } from 'svelte/store';
import { CARD_LIBRARY, DEFAULT_DECK, validateDeck } from '@hex-strategy/shared';

export interface SavedDeck {
  name: string;
  cards: string[]; // array of templateIds
}

const STORAGE_KEY = 'hex_strategy_decks';

function getInitialDecks(): Record<string, SavedDeck> {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch (e) {
      console.error('Failed to parse decks from localStorage', e);
    }
  }
  
  // Return a default starter deck if nothing is stored
  return {
    'Starter Deck': {
      name: 'Starter Deck',
      cards: [...DEFAULT_DECK]
    }
  };
}

export const decksStore = writable<Record<string, SavedDeck>>(getInitialDecks());
export const selectedDeckNameStore = writable<string>('Starter Deck');

// Sync with localStorage
decksStore.subscribe(value => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
});

export function saveDeck(name: string, cards: string[]) {
  decksStore.update(d => ({
    ...d,
    [name]: { name, cards }
  }));
}

export function deleteDeck(name: string) {
  if (name === 'Starter Deck') return; // protect starter
  decksStore.update(d => {
    const next = { ...d };
    delete next[name];
    return next;
  });
  
  if (get(selectedDeckNameStore) === name) {
    selectedDeckNameStore.set('Starter Deck');
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
