// Event-driven tutorial: each step waits for something real to happen in
// the game state (not just a "next" click), except the final step which
// waits for the player to dismiss it.

export const TUTORIAL_STEPS = [
  {
    id: 'openShop',
    text: "Let's get your factory running. Click Shop to see what you can buy.",
    highlight: { type: 'dom', selector: '#shopBtn' },
    doneWhen: (state) => state.uiFlags.shopOpen,
  },
  {
    id: 'buyExtruder',
    text: "Open the Machines tab and buy the Extruder — it's the only machine you can afford right now, and the cheapest one there is.",
    highlight: { type: 'dom', selector: '.tab[data-tab="machines"]' },
    doneWhen: (state) => (state.machineCounts.extruder || 0) >= 1,
  },
  {
    id: 'placeMachine',
    text: "It landed in hotbar slot 1, already selected. Click a glowing pad on the factory floor to place it. (Press 1 anytime to reselect a hotbar item.)",
    highlight: { type: 'canvas-pads' },
    doneWhen: (state) => state.machines.length >= 1,
  },
  {
    id: 'hireUtility',
    text: 'Open Shop → Workers and hire a Utility Worker. They keep your machines stocked with plastic.',
    highlight: { type: 'dom', selector: '.tab[data-tab="workers"]' },
    doneWhen: (state) => state.utilityWorkers.length >= 1,
  },
  {
    id: 'hireWarehouse',
    text: "Now hire a Warehouse Worker from the same tab. They'll haul finished pallets out to the warehouse.",
    highlight: { type: 'dom', selector: '.tab[data-tab="workers"]' },
    doneWhen: (state) => state.haulers.length >= 1,
  },
  {
    id: 'hireOperator',
    text: "One more hire: in the Workers tab (or by clicking the machine itself), hire an Operator for it. No operator, no production.",
    highlight: { type: 'canvas-machine-first' },
    doneWhen: (state) => !!(state.machines[0] && state.machines[0].staffed),
  },
  {
    id: 'buyPlastic',
    text: 'Machines need raw material. Open Shop → Material and buy some plastic.',
    highlight: { type: 'dom', selector: '.tab[data-tab="plastic"]' },
    doneWhen: (state) => state.everBoughtPlastic,
  },
  {
    id: 'buyBlueprint',
    text: 'Now open Shop → Blueprints and buy the Straws blueprint, so your Extruder knows what to make.',
    highlight: { type: 'dom', selector: '.tab[data-tab="blueprints"]' },
    doneWhen: (state) => state.blueprintsOwned.straws,
  },
  {
    id: 'assignBlueprint',
    text: 'Click your Extruder to load the Straws blueprint onto it.',
    highlight: { type: 'canvas-machine-first' },
    doneWhen: (state) => !!(state.machines[0] && state.machines[0].productKey === 'straws'),
  },
  {
    id: 'waitForSale',
    text: "Now just wait: plastic gets carried in, straws get made, and your warehouse worker hauls the pallet out to sell. Let's speed up the pace so it doesn't take forever...",
    highlight: null,
    onEnter: (state) => { state.tutorial.fastForward = true; },
    onExit: (state) => { state.tutorial.fastForward = false; },
    doneWhen: (state) => state.palletsSold >= 1,
  },
  {
    id: 'done',
    text: "You sold your first pallet! That's enough to upgrade your machine and both workers once — open Upgrades and grab Machine Tune-Up, Utility Worker Boots, and Warehouse Worker Speed Training.",
    highlight: { type: 'dom', selector: '.tab[data-tab="upgrades"]' },
    manualDismiss: true,
  },
];

export function currentStep(state) {
  if (!state.tutorial.active) return null;
  return TUTORIAL_STEPS[state.tutorial.stepIndex] || null;
}

export function advanceTutorial(state) {
  const step = currentStep(state);
  if (!step || step.manualDismiss) return;
  if (!step.doneWhen(state)) return;
  if (step.onExit) step.onExit(state);
  state.tutorial.stepIndex += 1;
  const next = TUTORIAL_STEPS[state.tutorial.stepIndex];
  if (!next) {
    state.tutorial.active = false;
  } else if (next.onEnter) {
    next.onEnter(state);
  }
}

export function dismissTutorial(state) {
  const step = currentStep(state);
  if (step && step.onExit) step.onExit(state);
  state.tutorial.active = false;
  state.tutorial.fastForward = false;
}

export function resolveHighlight(state, step) {
  if (!step || !step.highlight) return { dom: null, canvas: null };
  const h = step.highlight;
  if (h.type === 'dom') return { dom: h.selector, canvas: null };
  if (h.type === 'canvas-pads') return { dom: null, canvas: { type: 'pads' } };
  if (h.type === 'canvas-machine-first') {
    const m = state.machines[0];
    return { dom: null, canvas: m ? { type: 'machine', id: m.id } : null };
  }
  return { dom: null, canvas: null };
}
