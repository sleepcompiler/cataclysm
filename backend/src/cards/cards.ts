import { 
  Card,
  CARD_LIBRARY, 
  DEFAULT_DECK, 
  STAGE_1_UNIT_TEMPLATES, 
  STAGE_1_BUILDING_TEMPLATES, 
  STAGE_1_TRAP_TEMPLATES, 
  STARTER_TEMPLATES,
  validateDeck 
} from "@hex-strategy/shared";

export { 
  CARD_LIBRARY, 
  DEFAULT_DECK, 
  STAGE_1_UNIT_TEMPLATES, 
  STAGE_1_BUILDING_TEMPLATES, 
  STAGE_1_TRAP_TEMPLATES, 
  STARTER_TEMPLATES,
  validateDeck
};

let _cardInstanceId = 0;

export function createCardInstance(templateId: string): Card {
  const template = CARD_LIBRARY[templateId];
  if (!template) throw new Error(`unknown card template: ${templateId}`);
  // We explicitly cast to Card to satisfy the return type, adding the mandatory 'id'
  return { ...(template as any), id: `c_${++_cardInstanceId}_${Date.now()}` } as Card;
}
