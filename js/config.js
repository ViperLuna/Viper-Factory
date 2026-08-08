// Central tunable numbers for the whole game. Change values here to rebalance.

export const CANVAS_W = 1000;
export const CANVAS_H = 600;

export const START_CASH = 180;

// A machine's plot only holds this many finished pallets. Once full, it
// stops producing (even with staff and material) until a warehouse worker
// hauls at least one pallet away.
export const PALLET_CAPACITY = 3;

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

// Physical machine shells. Each needs a one-time "license" before it can be
// bought at all (Extruder is pre-licensed so a new player can start right
// away); licenses get pricier up the tiers. A licensed machine's own price
// still climbs every time you buy another one of that type.
export const MACHINE_TYPES = {
  extruder: {
    key: 'extruder', name: 'Extruder', icon: '⚙️', color: '#4f8fd6',
    cost: 40, hopperCapacity: 50, licenseCost: 0,
  },
  injector: {
    key: 'injector', name: 'Injection Molder', icon: '🔩', color: '#d68f4f',
    cost: 200, hopperCapacity: 70, licenseCost: 150,
  },
  blowmolder: {
    key: 'blowmolder', name: 'Blow Molder', icon: '🌀', color: '#8f4fd6',
    cost: 800, hopperCapacity: 140, licenseCost: 600,
  },
  rotomolder: {
    key: 'rotomolder', name: 'Rotational Molder', icon: '🔄', color: '#5ac48a',
    cost: 2200, hopperCapacity: 260, licenseCost: 1800,
  },
};

// Product blueprints: what a machine actually runs. Bought separately from
// the machine itself, then assigned to a placed machine of the matching
// type by clicking it. Buying a blueprint is a one-time unlock (not
// per-machine) - own it once, load it onto as many matching machines as
// you like.
export const PRODUCTS = {
  straws: {
    key: 'straws', name: 'Straws', machineType: 'extruder', icon: '🥤',
    cost: 20, consumePerCycle: 5, cycleTime: 9000, palletValue: 16,
  },
  toyparts: {
    key: 'toyparts', name: 'Toy Parts', machineType: 'injector', icon: '🚗',
    cost: 150, consumePerCycle: 9, cycleTime: 12000, palletValue: 34,
  },
  bottles: {
    key: 'bottles', name: 'Bottles', machineType: 'blowmolder', icon: '🍼',
    cost: 550, consumePerCycle: 20, cycleTime: 17000, palletValue: 105,
  },
  kayaks: {
    key: 'kayaks', name: 'Kayaks', machineType: 'rotomolder', icon: '🛶',
    cost: 2500, consumePerCycle: 60, cycleTime: 30000, palletValue: 400,
  },
};

// Blueprints (machines, operators) are one-time purchases - no wages - but
// each additional one of the same kind costs more than the last.
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
    // Capped by the starting warehouse's size - a future warehouse
    // expansion (see README roadmap) would raise this.
    max: 2,
    costFor: (level) => Math.round(30 * Math.pow(1.8, level)),
  },
  {
    id: 'hireHauler',
    name: 'Hire Warehouse Worker',
    desc: 'Adds another worker who hauls finished pallets to the warehouse.',
    max: 2,
    costFor: (level) => Math.round(30 * Math.pow(1.8, level)),
  },
  {
    id: 'machineSpeed',
    name: 'Machine Tune-Up',
    desc: '+8% production speed for every machine you own.',
    max: 8,
    costFor: (level) => Math.round(12 * Math.pow(1.6, level)),
  },
  {
    id: 'utilitySpeed',
    name: 'Utility Worker Boots',
    desc: '+15% utility worker walking speed.',
    max: 5,
    costFor: (level) => Math.round(12 * Math.pow(1.6, level)),
  },
  {
    id: 'haulerSpeed',
    name: 'Warehouse Worker Speed Training',
    desc: '+15% warehouse worker speed. Enough of this and they upgrade their ride.',
    max: 5,
    costFor: (level) => Math.round(12 * Math.pow(1.6, level)),
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
    desc: 'Every warehouse worker gets a towmotor immediately: carry 2 pallets at once, big speed boost.',
    max: 1,
    costFor: () => 1200,
  },
];

export const CLICK_BOOST_MS = 400;
export const AUTOSAVE_INTERVAL_MS = 15000;
export const TUTORIAL_FAST_FORWARD_MULT = 8;

// Save slots: a save only remembers what you own (machines, blueprints,
// licenses, staffing, workers hired, ready-to-ship pallets) - not live
// worker positions or a machine's in-progress cycle timer. Loading a slot
// looks like everyone just clocked in for a fresh shift.
export const SAVE_SLOT_COUNT = 3;
export const SAVE_KEY_PREFIX = 'viper-factory-v4-slot-';
export const ACTIVE_SLOT_KEY = 'viper-factory-v4-active-slot';
