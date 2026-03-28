<script lang="ts">
  import { gameStateStore, selectedUnitIdStore, selectedCardIdStore, projectedHandStore, isMyTurnStore, playerCatnipStore, playerIdStore, sendCommand } from "../game/gameClient";
  import { UNIT_DICTIONARY, BUILDING_DICTIONARY, TRAP_DICTIONARY } from "@hex-strategy/shared";
  import { derived } from "svelte/store";
  import { tweened } from "svelte/motion";
  import { cubicOut } from "svelte/easing";

  export let mapHovered = false;

  const selectedUnit = derived(
    [gameStateStore, selectedUnitIdStore, selectedCardIdStore, projectedHandStore],
    ([$state, $uid, $cid, $hand]) => {
      // 1. If a unit on the board is selected, show it
      if ($state && $uid) {
        if ($state.units[$uid]) {
          const u = $state.units[$uid];
          const stats = UNIT_DICTIONARY[u.type];
          
          const atkMod = u.modifiers?.reduce((sum: number, m: any) => m.stat === "attack" ? sum + m.amount : sum, 0) || 0;
          const spdMod = u.modifiers?.reduce((sum: number, m: any) => m.stat === "speed" ? sum + m.amount : sum, 0) || 0;
          const movMod = u.modifiers?.reduce((sum: number, m: any) => m.stat === "movement" ? sum + m.amount : sum, 0) || 0;

          return {
            ...u,
            name: stats?.name || u.type,
            description: stats?.description || "Just a mysterious feline doing feline things.",
            isCardPreview: false,
            isBuilding: false,
            isTrap: false,
            quirks: stats?.quirks || [],
            atkMod,
            spdMod,
            movMod,
            activeShields: u.modifiers?.some((m: any) => m.source === 'cardboard_box') || false
          };
        }
        if ($state.buildings && $state.buildings[$uid]) {
          const b = $state.buildings[$uid];
          const stats = BUILDING_DICTIONARY[b.type];
          return {
            ...b,
            name: stats?.name || b.type,
            description: stats?.description || "",
            isCardPreview: false,
            isBuilding: true,
            isTrap: false,
            attack: 0,
            movement: 0,
            quirks: stats?.quirks || [],
            wasHitLastTurn: false,
            modifiers: b.modifiers || [],
            atkMod: 0,
            spdMod: 0,
            movMod: 0
          };
        }
        if ($state.traps && $state.traps[$uid]) {
          const t = $state.traps[$uid];
          const stats = TRAP_DICTIONARY[t.type];
          return {
            ...t,
            name: stats?.name || t.type,
            description: stats?.description || "",
            isCardPreview: false,
            isBuilding: false,
            isTrap: true,
            attack: 0,
            movement: 0,
            speed: 0,
            hp: 0,
            maxHp: 0,
            quirks: stats?.quirks || [],
            wasHitLastTurn: false,
            modifiers: [],
            atkMod: 0, spdMod: 0, movMod: 0
          };
        }
      }
      // 2. Otherwise, if a card in hand is selected, check if it spawns or molts a unit
      if ($cid && $hand) {
        const card = $hand.find(c => c.id === $cid);
        if (card) {
          const spawnEffect = card.effects.find(e => e.type === "spawn_unit" || e.type === "molt_unit" || e.type === "spawn_building" || e.type === "spawn_trap");
          const instruction = getInstruction(card);

          if (spawnEffect) {
            if (spawnEffect.params.unitType) {
              const uType = spawnEffect.params.unitType;
              const stats = UNIT_DICTIONARY[uType];
              if (stats) {
                return {
                  id: "",
                  type: uType,
                  name: stats.name,
                  description: stats.description,
                  owner: "player1",
                  hp: stats.hp,
                  maxHp: stats.hp,
                  attack: stats.attack,
                  speed: stats.speed,
                  movement: stats.movement,
                  isCardPreview: true,
                  isBuilding: false,
                  isTrap: false,
                  quirks: stats.quirks || [],
                  wasHitLastTurn: false,
                  modifiers: [],
                  instruction,
                  atkMod: 0, spdMod: 0, movMod: 0
                };
              }
            } else if (spawnEffect.params.buildingType) {
              const bType = spawnEffect.params.buildingType;
              const stats = BUILDING_DICTIONARY[bType];
              if (stats) {
                return {
                  id: "",
                  type: bType,
                  name: stats.name,
                  description: stats.description,
                  owner: "player1",
                  hp: stats.hp,
                  maxHp: stats.hp,
                  attack: 0,
                  speed: stats.speed,
                  movement: 0,
                  isCardPreview: true,
                  isBuilding: true,
                  isTrap: false,
                  quirks: stats.quirks || [],
                  wasHitLastTurn: false,
                  modifiers: [],
                  instruction,
                  atkMod: 0, spdMod: 0, movMod: 0
                };
              }
            } else if (spawnEffect.params.trapType) {
              const tType = spawnEffect.params.trapType;
              const stats = TRAP_DICTIONARY[tType];
              if (stats) {
                return {
                  id: "",
                  type: tType,
                  name: stats.name,
                  description: stats.description,
                  owner: "player1",
                  hp: 0,
                  maxHp: 0,
                  attack: 0,
                  speed: 0,
                  movement: 0,
                  isCardPreview: true,
                  isBuilding: false,
                  isTrap: true,
                  quirks: stats.quirks || [],
                  wasHitLastTurn: false,
                  modifiers: [],
                  instruction,
                  atkMod: 0, spdMod: 0, movMod: 0
                };
              }
            }
          }

          // Fallback for cards without a simple spawn preview (e.g. Spells, Rare Candy)
          return {
            id: "",
            type: card.type,
            name: card.name,
            description: card.description,
            owner: "player1",
            hp: 0, maxHp: 0, attack: 0, speed: 0, movement: 0,
            isCardPreview: true,
            isBuilding: false,
            isTrap: false,
            quirks: [],
            wasHitLastTurn: false,
            modifiers: [],
            instruction,
            cost: card.cost,
            atkMod: 0,
            spdMod: 0,
            movMod: 0,
            activeShields: false
          };
        }
      }
      return null;
    }
  );

  const displayHp = tweened(0, { duration: 400, easing: cubicOut });
  $: if ($selectedUnit) {
    displayHp.set($selectedUnit.hp);
  }

  function getInstruction(card: any): string {
    if (card.effects.some((e: any) => e.type === "rush_molt")) return "Click a unit played this turn to rush its evolution.";
    if (card.effects.some((e: any) => e.type === "deck_molt")) return "Click a unit to pull its evolution from your deck.";
    if (card.effects.some((e: any) => e.type === "molt_unit")) return `Click a ${card.moltsFrom.replace('_', ' ')} to evolve it.`;
    
    if (card.type === "troop" || card.type === "building" || card.type === "trap") {
      return "Click an empty friendly tile to deploy.";
    }
    
    if (card.target === "unit") return "Click a unit to target.";
    if (card.target === "tile") return "Click a tile to target.";
    
    return "Click to play.";
  }

  function handleDismiss(e: MouseEvent) {
    if ((e.target as HTMLElement).closest('button')) return;
    $selectedCardIdStore = null;
    $selectedUnitIdStore = null;
  }
</script>

{#if $selectedUnit}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    class="unit-info" 
    class:targeting-hidden={mapHovered && !!$selectedCardIdStore}
    on:click={handleDismiss}
  >
    <div class="header">
      <h3>{$selectedUnit.name}</h3>
      <div class="owner" class:mine={$selectedUnit.owner === $playerIdStore}>
        {$selectedUnit.isCardPreview ? 'Preview' : ($gameStateStore?.players[$selectedUnit.owner]?.name ?? 'Unknown')}
      </div>
    </div>

    <div class="stats-grid">
      <div class="stat">
        <span class="label">HP</span>
        <div class="hp-bar-bg">
          <div class="hp-bar-fill" style="width: {($displayHp / $selectedUnit.maxHp) * 100}%"></div>
        </div>
        <span class="value">{Math.round($displayHp)} / {$selectedUnit.maxHp}</span>
      </div>
      
      <div class="stat" class:hidden={$selectedUnit.isBuilding || $selectedUnit.isTrap}>
        <span class="label">ATK</span>
        <span class="value">
          {$selectedUnit.attack}
          {#if $selectedUnit.atkMod !== 0}
            <span class="mod-bonus" class:pos={$selectedUnit.atkMod > 0} class:neg={$selectedUnit.atkMod < 0}>
              ({$selectedUnit.atkMod > 0 ? '+' : ''}{$selectedUnit.atkMod})
            </span>
          {/if}
        </span>
      </div>

      <div class="stat" class:hidden={$selectedUnit.isTrap}>
        <span class="label">SPEED</span>
        <span class="value">
          {$selectedUnit.speed}
          {#if $selectedUnit.spdMod !== 0}
            <span class="mod-bonus" class:pos={$selectedUnit.spdMod > 0} class:neg={$selectedUnit.spdMod < 0}>
              ({$selectedUnit.spdMod > 0 ? '+' : ''}{$selectedUnit.spdMod})
            </span>
          {/if}
        </span>
      </div>

      <div class="stat" class:hidden={$selectedUnit.isBuilding || $selectedUnit.isTrap}>
        <span class="label">MOV</span>
        <span class="value">
          {$selectedUnit.movement}
          {#if $selectedUnit.movMod !== 0}
            <span class="mod-bonus" class:pos={$selectedUnit.movMod > 0} class:neg={$selectedUnit.movMod < 0}>
              ({$selectedUnit.movMod > 0 ? '+' : ''}{$selectedUnit.movMod})
            </span>
          {/if}
        </span>
      </div>

      {#if $selectedUnit.isCardPreview && $selectedUnit.cost !== undefined}
        <div class="stat">
          <span class="label">COST</span>
          <span class="value">{$selectedUnit.cost} Catnip</span>
        </div>
      {/if}
    </div>

    <p class="description">
      {$selectedUnit.description}
    </p>

    {#if $selectedUnit.instruction}
      <div class="instruction">
        <strong>How to play:</strong><br/>
        {$selectedUnit.instruction}
      </div>
    {/if}

    <!-- Quirks Section -->
    {#if $selectedUnit.quirks && $selectedUnit.quirks.length > 0}
      <div class="quirks-section">
        <h4>{$selectedUnit.isBuilding ? 'Functions' : 'Quirks'}</h4>
        {#each $selectedUnit.quirks as quirk}
          <div class="quirk">
            <span class="quirk-name">{quirk.name}</span>: <span class="quirk-desc">{quirk.description}</span>
            {#if quirk.trigger === "active"}
              <button 
                class="activate-btn" 
                class:disabled={
                  !$isMyTurnStore || 
                  (quirk.cost ?? 0) > $playerCatnipStore ||
                  (quirk.id === "quick_step" && (!$selectedUnit.wasHitLastTurn || $selectedUnit.modifiers.some(m => m.source === "quick_step_cooldown")))
                }
                on:click={() => {
                  if ($selectedUnit && !$selectedUnit.isCardPreview && $isMyTurnStore && (quirk.cost ?? 0) <= $playerCatnipStore) {
                    // One final check for quick_step requirements before sending
                    if (quirk.id === "quick_step" && (!$selectedUnit.wasHitLastTurn || $selectedUnit.modifiers.some(m => m.source === "quick_step_cooldown"))) {
                      return;
                    }
                    sendCommand({ type: 'activate_quirk', entityId: $selectedUnit.id, quirkId: quirk.id });
                  }
                }}
              >
                ▶ Activate ({quirk.cost ?? 0} Catnip)
              </button>
            {/if}
          </div>
        {/each}
      </div>
    {/if}

    <!-- Active Effects Section -->
    {#if $selectedUnit.activeShields || ($selectedUnit.modifiers && $selectedUnit.modifiers.length > 0)}
      <div class="effects-section">
        <h4>Active Effects</h4>
        <div class="effects-list">
          {#if $selectedUnit.activeShields}
            <div class="effect-item bin">
              {#if $selectedUnit.modifiers && $selectedUnit.modifiers.some(m => m.source === 'cardboard_box')}
                 <span class="item-badge box">📦</span>
              {/if}
              <span class="effect-name">Cardboard Box</span>
              <span class="effect-value">Shield</span>
            </div>
          {/if}
          {#each $selectedUnit.modifiers as mod}
            <div class="effect-item">
              <span class="icon">✨</span>
              <span class="effect-name">{mod.stat.toUpperCase()} Buff</span>
              <span class="effect-value">{mod.amount > 0 ? '+' : ''}{mod.amount}</span>
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}

<style>
  .unit-info {
    position: absolute;
    top: 20px;
    left: 20px;
    width: 280px;
    background: rgba(255, 255, 255, 0.95);
    border: 3px solid #ffcada;
    border-radius: 20px;
    padding: 16px;
    color: #4a4a4a;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
    z-index: 2100; /* Higher than card wrappers to prevent poking through */
    pointer-events: auto;
    backdrop-filter: blur(16px);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .unit-info.targeting-hidden {
    opacity: 0;
    pointer-events: none;
    transform: translateY(-10px);
  }

  @media (orientation: portrait) {
    .unit-info {
      top: auto;
      bottom: 0px;
      left: 0;
      right: 0;
      width: 100%;
      max-height: 50vh;
      overflow-y: auto;
      border-radius: 24px 24px 0 0;
      border: none;
      border-top: 3px solid #ff6090; /* Accent color on top border */
      padding: 20px;
      box-shadow: 0 -20px 50px rgba(0,0,0,0.5);
    }
    
    .header h3 { font-size: 1.2rem !important; }
    .description { font-size: 0.8rem !important; }
    .stats-grid { flex-direction: row !important; flex-wrap: wrap; gap: 15px !important; }
    .stat { flex: 1; min-width: 80px; }
  }

  h3 {
    margin: 0;
    font-size: 1.4rem;
    color: #ff6090;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }

  .owner {
    font-size: 0.75rem;
    font-weight: bold;
    padding: 2px 8px;
    border-radius: 10px;
    background: #ff6060;
    color: white;
  }
  .owner.mine {
    background: #60a0ff;
  }

  .stats-grid {
    display: flex;
    flex-direction: column;
    gap: 10px;
    margin-bottom: 15px;
  }

  .stat {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  .stat.hidden {
    display: none;
  }

  .label {
    font-size: 0.8rem;
    font-weight: bold;
    color: #999;
    width: 35px;
  }

  .value {
    font-weight: bold;
    color: #444;
  }

  .hp-bar-bg {
    flex: 1;
    height: 8px;
    background: #eee;
    border-radius: 4px;
    overflow: hidden;
  }

  .hp-bar-fill {
    height: 100%;
    background: linear-gradient(90deg, #ff6090, #ffcada);
    /* Transition handled by tweened store now */
  }

  .mod-bonus {
    font-size: 0.8rem;
    margin-left: 2px;
  }
  .mod-bonus.pos { color: #4caf50; }
  .mod-bonus.neg { color: #f44336; }

  .effects-section {
    margin-top: 15px;
    border-top: 1px solid #ffead0;
    padding-top: 10px;
  }
  .effects-section h4 {
    margin: 0 0 8px 0;
    font-size: 0.85rem;
    color: #ff6090;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .effects-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .effect-item {
    display: flex;
    align-items: center;
    gap: 8px;
    background: rgba(255, 255, 255, 0.5);
    padding: 2px 8px;
    border-radius: 6px;
    font-size: 0.8rem;
  }
  .effect-item.bin { background: rgba(255, 200, 100, 0.15); }
  .effect-name { flex: 1; font-weight: 500; }
  .effect-value { font-weight: bold; color: #ff6090; }

  .description {
    font-size: 0.9rem;
    font-style: italic;
    line-height: 1.4;
    color: #666;
    margin: 0;
    border-top: 1px solid #ffead0;
    padding-top: 10px;
  }

  .instruction {
    margin-top: 12px;
    font-size: 0.85rem;
    background: #f0fdf4;
    color: #166534;
    padding: 8px 12px;
    border-radius: 12px;
    border: 1px solid #bbf7d0;
    line-height: 1.5;
    box-shadow: inset 0 2px 4px rgba(0,0,0,0.02);
  }

  .activate-btn {
    margin-top: 8px;
    padding: 6px 14px;
    background: #4caf50;
    color: white;
    border-radius: 12px;
    font-size: 0.85rem;
    font-weight: bold;
    cursor: pointer;
    text-align: center;
    transition: all 0.2s ease;
    border: none;
    box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
    width: fit-content;
  }

  .activate-btn:hover:not(.disabled) {
    background: #43a047;
    transform: translateY(-2px);
    box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4);
  }

  .activate-btn.disabled {
    background: #ccc;
    color: #888;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
  }

  /* Cute accent: little paw print? We can use an emoji for now */
  .unit-info::after {
    content: "🐾";
    position: absolute;
    bottom: -10px;
    right: 10px;
    font-size: 1.5rem;
    opacity: 0.2;
  }
</style>
