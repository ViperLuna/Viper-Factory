// Central tunable numbers for the whole game. Change values here to rebalance.

export const CANVAS_W = 1000;
export const CANVAS_H = 600;

export const START_CASH = 120;

export const DEPOT = { x: 20, y: 90, w: 140, h: 470, doorX: 160, doorY: 300 };
export const WAREHOUSE = { x: 840, y: 90, w: 140, h: 470, doorX: 840, doorY: 300 };

export const GRID = {
  cols: 4,
  rows: 3,
  padW: 140,
  padH: 140,
  gap: 20,
  originX: 200,
  originY: 110,
};

export function padCenter(row, col) {
  return {
    x: GRID.originX + col * (GRID.padW + GRID.gap) + GRID.padW / 2,
    y: GRID.originY + row * (GRID.padH + GRID.gap) + GRID.padH / 2,
  };
}

// Blueprints: what you buy in the shop. No separate "mold" purchase - the
// blueprint price already covers everything needed to run that machine.
// All machines eat the same generic "Plastic" material, bought at the depot.
export const MACHINE_TYPES = {
  extruder: {
    key: 'extruder',
    name: 'Extruder',
    product: 'Straws',
    cost: 50,
    hopperCapacity: 50,
    consumePerCycle: 5,
    cycleTime: 9000,
    palletValue: 10,
    color: '#4f8fd6',
    icon: '🥤',
  },
  injector: {
    key: 'injector',
    name: 'Injection Molder',
    product: 'Toy Parts',
    cost: 260,
    hopperCapacity: 70,
    consumePerCycle: 9,
    cycleTime: 12000,
    palletValue: 34,
    color: '#d68f4f',
    icon: '⚙️',
  },
  blowmolder: {
    key: 'blowmolder',
    name: 'Blow Molder',
    product: 'Bottles',
    cost: 950,
    hopperCapacity: 140,
    consumePerCycle: 20,
    cycleTime: 17000,
    palletValue: 105,
    color: '#8f4fd6',
    icon: '🍼',
  },
};

// Blueprints and operators are one-time purchases (no wages), but each
// additional one of the same kind costs more than the last.
const MACHINE_COST_GROWTH = 1.15;
const OPERATOR_COST_GROWTH = 1.15;

export function machineCostFor(key, ownedCount) {
  return Math.round(MACHINE_TYPES[key].cost * Math.pow(MACHINE_COST_GROWTH, ownedCount));
}

export function operatorCostFor(key, operatorsHiredCount) {
  return Math.round(MACHINE_TYPES[key].cost * 0.4 * Math.pow(OPERATOR_COST_GROWTH, operatorsHiredCount));
}

export const PLASTIC_UNIT_COST = 0.4;
export const PLASTIC_BUNDLES = [25, 75, 250];

// Upgrades: leveled ones scale in cost per level, oneTime ones are bought once.
export const UPGRADES = [
  {
    id: 'hireUtility',
    name: 'Hire Utility Worker',
    desc: 'Adds another worker who keeps machine hoppers stocked with plastic.',
    max: 3,
    costFor: (level) => 300 * Math.pow(2, level),
  },
  {
    id: 'hireHauler',
    name: 'Hire Pallet Jack Operator',
    desc: 'Adds another worker who hauls finished pallets to the warehouse.',
    max: 3,
    costFor: (level) => 350 * Math.pow(2, level),
  },
  {
    id: 'utilitySpeed',
    name: 'Utility Worker Boots',
    desc: '+15% utility worker walking speed.',
    max: 5,
    costFor: (level) => Math.round(150 * Math.pow(1.8, level)),
  },
  {
    id: 'haulerSpeed',
    name: 'Pallet Jack Tune-Up',
    desc: '+15% hauler walking speed.',
    max: 5,
    costFor: (level) => Math.round(150 * Math.pow(1.8, level)),
  },
  {
    id: 'refillAmount',
    name: 'Bigger Plastic Loads',
    desc: '+25% plastic carried per trip.',
    max: 5,
    costFor: (level) => Math.round(120 * Math.pow(1.7, level)),
  },
  {
    id: 'plasticDiscount',
    name: 'Bulk Plastic Contract',
    desc: '-10% plastic purchase price.',
    max: 4,
    costFor: (level) => Math.round(200 * Math.pow(1.8, level)),
  },
  {
    id: 'haulerCapacity',
    name: 'Towmotor Upgrade',
    desc: 'Replaces pallet jacks with a towmotor: carry 2 pallets at once, big speed boost.',
    max: 1,
    costFor: () => 1200,
  },
];

export const CLICK_BOOST_MS = 400;
export const SAVE_KEY = 'viper-factory-save-v2';
export const AUTOSAVE_INTERVAL_MS = 15000;
