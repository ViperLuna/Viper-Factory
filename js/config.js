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

export const MACHINE_TYPES = {
  injector: {
    key: 'injector',
    name: 'Injection Molder',
    cost: 60,
    hopperCapacity: 40,
    consumePerCycle: 4,
    cycleTime: 8000,
    palletValue: 12,
    color: '#4f8fd6',
    icon: '⚙️',
  },
  extruder: {
    key: 'extruder',
    name: 'Extruder',
    cost: 250,
    hopperCapacity: 80,
    consumePerCycle: 10,
    cycleTime: 11000,
    palletValue: 38,
    color: '#d68f4f',
    icon: '🧵',
  },
  blowmolder: {
    key: 'blowmolder',
    name: 'Blow Molder',
    cost: 900,
    hopperCapacity: 150,
    consumePerCycle: 20,
    cycleTime: 16000,
    palletValue: 110,
    color: '#8f4fd6',
    icon: '🫙',
  },
};

export function operatorHireCost(machineKey) {
  return Math.round(MACHINE_TYPES[machineKey].cost * 0.4);
}

export const PELLET_UNIT_COST = 0.5;
export const PELLET_BUNDLES = [50, 100, 500];

// Upgrades: leveled ones scale in cost per level, oneTime ones are bought once.
export const UPGRADES = [
  {
    id: 'hireUtility',
    name: 'Hire Utility Worker',
    desc: 'Adds another worker who keeps machine hoppers stocked.',
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
    name: 'Bigger Pellet Bags',
    desc: '+25% pellets carried per trip.',
    max: 5,
    costFor: (level) => Math.round(120 * Math.pow(1.7, level)),
  },
  {
    id: 'pelletDiscount',
    name: 'Bulk Pellet Contract',
    desc: '-10% pellet purchase price.',
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
export const SAVE_KEY = 'viper-factory-save-v1';
export const AUTOSAVE_INTERVAL_MS = 15000;
