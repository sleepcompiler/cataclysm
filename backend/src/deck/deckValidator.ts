import { CARD_LIBRARY } from "../cards/cards";

/**
 * Validates a deck array according to game rules.
 * @param deck Array of card template ids
 */
export function validateDeck(deck: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Rules
  const DECK_SIZE = 20;
  const MAX_COPIES = 2;

  if (deck.length !== DECK_SIZE) {
    errors.push(`Deck must contain exactly ${DECK_SIZE} cards (has ${deck.length}).`);
  }

  const counts: Record<string, number> = {};

  for (const cardId of deck) {
    if (!CARD_LIBRARY[cardId]) {
      errors.push(`Card ${cardId} does not exist in library.`);
      continue;
    }

    counts[cardId] = (counts[cardId] || 0) + 1;
    if (counts[cardId] > MAX_COPIES) {
      if (!errors.includes(`Exceeded ${MAX_COPIES} copy limit for card ${cardId}.`)) {
        errors.push(`Exceeded ${MAX_COPIES} copy limit for card ${cardId}.`);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
