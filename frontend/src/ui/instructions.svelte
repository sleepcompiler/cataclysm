<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  const dispatch = createEventDispatcher();

  let activeTab: 'getting-started' | 'drawing-costs' | 'card-types' | 'abilities-evolution' = 'getting-started';

  const tabs = [
    { id: 'getting-started', label: '📖 Getting Started', icon: '🐾' },
    { id: 'drawing-costs', label: '⚡ Drawing & Catnip', icon: '🔋' },
    { id: 'card-types', label: '🐱 Card Types', icon: '🃏' },
    { id: 'abilities-evolution', label: '⚔️ Combat & Evolution', icon: '🔥' }
  ] as const;
</script>

<div class="instructions-page">
  <header class="header">
    <button class="btn-back" on:click={() => dispatch('back')} aria-label="Back to main menu">
      ← Back to Menu
    </button>
    <h1>🐾 How to Play Catnip Conquest 🐾</h1>
    <p class="subtitle">Master the hexagonal battlefields and lead your feline army to victory!</p>
  </header>

  <div class="tabs-container">
    {#each tabs as tab}
      <button 
        class="tab-btn" 
        class:active={activeTab === tab.id}
        on:click={() => activeTab = tab.id}
      >
        <span class="tab-icon">{tab.icon}</span>
        <span class="tab-label">{tab.label}</span>
      </button>
    {/each}
  </div>

  <main class="content-container">
    {#if activeTab === 'getting-started'}
      <section class="tab-content" id="getting-started">
        <h2>Welcome to Catnip Conquest!</h2>
        <div class="intro-card">
          <p class="greeting">Hi!! Thanks for trying out Catnip Conquest! 🐱✨</p>
          <p>This is a fast-paced, hex-based multiplayer strategy card game where you manage a deck of anime-inspired cats, tactical buildings, traps, and instincts to battle on a grid and destroy your opponent's <strong>Cat Tree</strong>.</p>
        </div>

        <div class="grid-layout">
          <div class="info-card">
            <h3>🔨 Step 1: Build Your Deck</h3>
            <p>Before jumping into a match, you must build a deck in the <strong>Deck Builder</strong> (accessible right from the Play Menu!).</p>
            <ul>
              <li>Decks must contain <strong>exactly 25 cards</strong>.</li>
              <li>You can have a <strong>maximum of 3 copies</strong> of any card.</li>
              <li>Your deck must have <strong>at least one Stage 1 unit or building</strong> to make a valid play on Turn 1.</li>
              <li>Stage 2 and Stage 3 units are powerful evolutions and <strong>cannot be played directly</strong> from your hand on an empty tile! They must molt from their base forms.</li>
            </ul>
          </div>

          <div class="info-card highlight">
            <h3>🏆 Win Condition</h3>
            <p>Each player has a <strong>Cat Tree</strong> building spawned at their home territory at the start of the match with <strong>2000 HP</strong>.</p>
            <p>Protect your Cat Tree at all costs while maneuvering your units across the board to strike down and reduce the enemy's Cat Tree to 0 HP!</p>
          </div>
        </div>
      </section>

    {:else if activeTab === 'drawing-costs'}
      <section class="tab-content animate-fade-in" id="drawing-costs">
        <h2>Turn Resources & Card Flow</h2>
        <p class="section-desc">Manage your hand and spend your resources wisely to outmaneuver the enemy.</p>

        <div class="grid-layout">
          <div class="info-card">
            <h3>🎴 Card Drawing</h3>
            <p>At the start of your turn, you draw <strong>1 card</strong> from your 25-card deck into your hand.</p>
            <div class="rule-box warning">
              <strong>Balance Rule:</strong> The player going first in the match misses their card draw on their very first turn to balance the initiative advantage. All subsequent turns proceed with standard draws.
            </div>
          </div>

          <div class="info-card">
            <h3>🌿 Catnip Costs</h3>
            <p><strong>Catnip</strong> is the energy resource required to play cards from your hand or activate special unit skills.</p>
            <ul>
              <li>You start the game with a small pool of Catnip.</li>
              <li>At the start of your turn, your Max Catnip increases, and you automatically regenerate <strong>+1 Catnip</strong>.</li>
              <li>You can play generators like the <strong>Treat Dispenser</strong> to gain an extra <strong>+1 Catnip</strong> at the beginning of each of your turns!</li>
              <li>Trapping your opponent in L Gato's deduction traps can end their turn and grant you extra Catnip!</li>
            </ul>
          </div>
        </div>
      </section>

    {:else if activeTab === 'card-types'}
      <section class="tab-content animate-fade-in" id="card-types">
        <h2>The Four Card Types</h2>
        <p class="section-desc">Your deck consists of Troops, Buildings, Traps, and Instincts. Understanding how to deploy them is crucial.</p>

        <div class="card-types-list">
          <div class="type-row troop">
            <div class="type-header">
              <span class="badge">Troop</span>
              <h3>🐱 Troops</h3>
            </div>
            <p>Spawns an active Cat unit on an owned, non-water tile. Troops can move across the hex grid and engage in combat. Troops cannot move or attack on the turn they are spawned (spawn sickness) unless rushed with instincts.</p>
          </div>

          <div class="type-row building">
            <div class="type-header">
              <span class="badge">Building</span>
              <h3>🏢 Buildings</h3>
            </div>
            <p>Spawns static structures (e.g. <em>Scratching Post</em> to taunt enemies, <em>Litter Box</em> to boost movement, or <em>Grooming Station</em> to heal allies) on owned tiles. Can also be played as weapon attachments (e.g., <em>Catapult, Cannon, Wizard</em>) directly onto your Cat Tree to defend your base.</p>
          </div>

          <div class="type-row trap">
            <div class="type-header">
              <span class="badge">Trap</span>
              <h3>🕸️ Traps</h3>
            </div>
            <p>Places an invisible trap (e.g. <em>Yarn Ball, Cucumber Scare, deduction traps</em>) on a tile. Traps trigger immediately when an enemy unit steps on the tile, applying disruptive effects (like halting movement, canceling their actions, or forcing their turn to end).</p>
          </div>

          <div class="type-row instinct">
            <div class="type-header">
              <span class="badge">Instinct</span>
              <h3>⚡ Instincts</h3>
            </div>
            <p>Instant magic spell/tactics cards played directly on units or tiles. Instincts provide healing (e.g., <em>Purr</em>), displacement (e.g., <em>Hiss</em>), target lures (e.g., <em>Laser Pointer</em>), or act as catalysts (e.g., <em>Fresh Spark</em> or <em>Spirits</em>) to instantly trigger cat evolutions.</p>
          </div>
        </div>
      </section>

    {:else if activeTab === 'abilities-evolution'}
      <section class="tab-content animate-fade-in" id="abilities-evolution">
        <h2>Combat, Quirks & Evolution</h2>
        <p class="section-desc">Catnip Conquest's combat is phase-locked. All attacks resolve sequentially based on initiative.</p>

        <div class="grid-layout">
          <div class="info-card">
            <h3>⚡ Combat & Speed Initiative</h3>
            <p>Combat resolves in dedicated phases where movements are locked in first, and then attacks resolve transitively.</p>
            <p>Each unit has a <strong>Speed</strong> stat which acts as initiative. Slower units will take damage or can even be defeated before they get a chance to swing if the faster unit deals lethal damage first!</p>
          </div>

          <div class="info-card">
            <h3>🌀 Quirks & Mid-Game Evolution (Molting)</h3>
            <p>Cats are anime-inspired fighters with unique <strong>Quirks</strong> (passive/active abilities) that evolve mid-match!</p>
            <ul>
              <li><strong>Evolution triggers</strong> vary by unit line:
                <ul>
                  <li><em>Katarot</em> gains permanent stats when hit and evolves into Super Katarot upon dying.</li>
                  <li><em>Levi Caterman</em> snowballs speed and attack on every enemy killed.</li>
                  <li><em>Potential Cat</em> generates shadow tickets each turn and evolves after surviving combat.</li>
                </ul>
              </li>
              <li><strong>Standard Molting</strong>: Play a Stage 2/3 card from your hand directly onto a tile occupied by its pre-evolution on the board. (Note: The unit cannot have spawn sickness, i.e., it must have been on the board for at least 1 turn).</li>
              <li><strong>Fresh Spark Catalyst</strong>: Play a <em>Fresh Spark</em> instinct card to bypass spawn sickness and molt a unit on the same turn it was deployed!</li>
              <li><strong>Active Abilities</strong>: Certain high-tier units have powerful active abilities (e.g. Light Nyagami's <em>Death Note</em> countdown, L Gato's <em>Deduction Trap</em>). You can activate these once per turn by clicking the unit, costing Catnip to execute.</li>
            </ul>
          </div>
        </div>
      </section>
    {/if}
  </main>
</div>

<style>
  .instructions-page {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    background: radial-gradient(circle at center, #1e293b 0%, #0f172a 100%);
    padding: 2rem;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    align-items: center;
  }

  .header {
    width: 100%;
    max-width: 1000px;
    display: flex;
    flex-direction: column;
    align-items: center;
    position: relative;
    text-align: center;
    padding-bottom: 1rem;
    border-bottom: 1px solid #334155;
  }

  .btn-back {
    position: absolute;
    left: 0;
    top: 0;
    padding: 8px 18px;
    font-size: 0.95rem;
    background: #1e293b;
    border: 2px solid #334155;
    color: var(--text-muted);
    border-radius: var(--btn-radius);
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s ease;
    box-shadow: 0 4px 10px rgba(0,0,0,0.2);
  }

  .btn-back:hover {
    color: white;
    border-color: var(--accent-pink);
    background: rgba(255, 96, 144, 0.1);
    transform: translateX(-4px);
  }

  h1 {
    font-size: 2.8rem;
    color: var(--accent-pink);
    text-shadow: 0 4px 20px rgba(255, 96, 144, 0.4);
    margin: 0.5rem 0;
    font-weight: 800;
  }

  .subtitle {
    color: var(--text-muted);
    font-size: 1.1rem;
    margin: 0;
  }

  .tabs-container {
    display: flex;
    gap: 10px;
    width: 100%;
    max-width: 1000px;
    justify-content: center;
    flex-wrap: wrap;
  }

  .tab-btn {
    padding: 12px 24px;
    background: #1e293b;
    border: 1px solid #334155;
    color: var(--text-muted);
    border-radius: var(--btn-radius);
    font-weight: bold;
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .tab-btn:hover {
    border-color: var(--accent-indigo);
    color: white;
    transform: translateY(-2px);
  }

  .tab-btn.active {
    background: linear-gradient(135deg, var(--accent-indigo), #a855f7);
    color: white;
    border-color: transparent;
    box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
  }

  .tab-icon {
    font-size: 1.1rem;
  }

  .content-container {
    width: 100%;
    max-width: 1000px;
    background: rgba(30, 41, 59, 0.6);
    border: 1px solid #334155;
    border-radius: 16px;
    padding: 2.5rem;
    box-sizing: border-box;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .tab-content {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  h2 {
    font-size: 1.8rem;
    color: white;
    margin: 0;
    border-left: 4px solid var(--accent-pink);
    padding-left: 12px;
  }

  .section-desc {
    color: var(--text-muted);
    margin: -0.5rem 0 0.5rem 0;
    font-size: 1rem;
  }

  .intro-card {
    background: rgba(99, 102, 241, 0.08);
    border: 1px solid rgba(99, 102, 241, 0.2);
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  }

  .greeting {
    font-size: 1.2rem;
    font-weight: bold;
    color: var(--accent-pink);
    margin-top: 0;
    margin-bottom: 0.5rem;
  }

  .grid-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1.5rem;
  }

  @media (max-width: 768px) {
    .grid-layout {
      grid-template-columns: 1fr;
    }
    .header {
      padding-top: 3rem;
    }
    .btn-back {
      left: 50%;
      transform: translateX(-50%);
    }
    .btn-back:hover {
      transform: translateX(-50%) scale(1.05);
    }
  }

  .info-card {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 1.5rem;
    box-shadow: 0 4px 15px rgba(0,0,0,0.1);
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    transition: transform 0.2s ease, border-color 0.2s ease;
  }

  .info-card:hover {
    transform: translateY(-2px);
    border-color: rgba(99, 102, 241, 0.4);
  }

  .info-card h3 {
    margin: 0;
    font-size: 1.25rem;
    color: var(--accent-pink);
  }

  .info-card ul {
    margin: 0;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    color: #cbd5e1;
  }

  .info-card p {
    margin: 0;
    color: #cbd5e1;
    line-height: 1.5;
  }

  .info-card.highlight {
    border: 1px solid rgba(255, 96, 144, 0.3);
    background: rgba(255, 96, 144, 0.04);
  }

  .info-card.highlight h3 {
    color: var(--accent-pink);
  }

  .rule-box {
    margin-top: 10px;
    padding: 12px;
    border-radius: 8px;
    font-size: 0.9rem;
    line-height: 1.4;
  }

  .rule-box.warning {
    background: rgba(245, 158, 11, 0.15);
    border: 1px solid rgba(245, 158, 11, 0.3);
    color: #fef08a;
  }

  /* Card types styles */
  .card-types-list {
    display: flex;
    flex-direction: column;
    gap: 1.2rem;
  }

  .type-row {
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 12px;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 8px;
    transition: all 0.2s ease;
  }

  .type-row:hover {
    transform: translateX(4px);
  }

  .type-header {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .type-header h3 {
    margin: 0;
    font-size: 1.3rem;
  }

  .badge {
    padding: 4px 10px;
    font-size: 0.75rem;
    font-weight: 800;
    text-transform: uppercase;
    border-radius: 4px;
    letter-spacing: 0.05em;
  }

  .troop { border-left: 4px solid #6366f1; }
  .troop .badge { background: #4f46e5; color: white; }
  .troop h3 { color: #818cf8; }

  .building { border-left: 4px solid #10b981; }
  .building .badge { background: #059669; color: white; }
  .building h3 { color: #34d399; }

  .trap { border-left: 4px solid #f59e0b; }
  .trap .badge { background: #d97706; color: white; }
  .trap h3 { color: #fbbf24; }

  .instinct { border-left: 4px solid #ec4899; }
  .instinct .badge { background: #db2777; color: white; }
  .instinct h3 { color: #f472b6; }

  .type-row p {
    margin: 0;
    color: #cbd5e1;
    line-height: 1.5;
  }

  /* Fade-in Animation */
  .animate-fade-in {
    animation: fadeIn 0.25s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(4px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>
