import {
  START_CASH, MACHINE_TYPES, PRODUCTS, UPGRADES, GRID,
  SAVE_KEY_PREFIX, SAVE_SLOT_COUNT, ACTIVE_SLOT_KEY,
  machineCostFor, operatorCostFor, PLASTIC_UNIT_COST,
} from './config.js';
import { Machine, UtilityWorker, Hauler, makeId } from './entities.js';

export function createInitialState() {
  const state = {
    cash: START_CASH,
    plastic: 0,
    everBoughtPlastic: false,
    palletsSold: 0,
    hotbar: new Array(9).fill(null),
    overflow: [],
    selectedSlot: 0,
    machines: [],
    utilityWorkers: [],
    haulers: [],
    upgradeLevels: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
    machineCounts: Object.fromEntries(Object.keys(MACHINE_TYPES).map((k) => [k, 0])),
    licensesOwned: Object.fromEntries(
      Object.keys(MACHINE_TYPES).map((k) => [k, MACHINE_TYPES[k].licenseCost === 0]),
    ),
    blueprintsOwned: Object.fromEntries(Object.keys(PRODUCTS).map((k) => [k, false])),
    operatorsHired: 0,
    operatorsInLimbo: 0,
    toasts: [],
    tutorial: { stepIndex: 0, active: true, fastForward: false },
    uiFlags: { shopOpen: false },
  };
  return state;
}

export function upgradeLevel(state, id) {
  return state.upgradeLevels[id] || 0;
}

export function upgradeCost(state, id) {
  const def = UPGRADES.find((u) => u.id === id);
  return def.costFor(upgradeLevel(state, id));
}

export function upgradeMaxed(state, id) {
  const def = UPGRADES.find((u) => u.id === id);
  return upgradeLevel(state, id) >= def.max;
}

export function buyUpgrade(state, id) {
  if (upgradeMaxed(state, id)) return false;
  const cost = upgradeCost(state, id);
  if (state.cash < cost) return false;
  state.cash -= cost;
  state.upgradeLevels[id] += 1;

  if (id === 'hireUtility') state.utilityWorkers.push(new UtilityWorker());
  if (id === 'hireHauler') state.haulers.push(new Hauler());
  if (id === 'haulerCapacity') {
    for (const h of state.haulers) h.capacity = 2;
  }
  return true;
}

export function utilitySpeed(state) {
  return 60 * Math.pow(1.15, upgradeLevel(state, 'utilitySpeed'));
}

export function haulerSpeed(state) {
  const base = 60 * Math.pow(1.15, upgradeLevel(state, 'haulerSpeed'));
  return upgradeLevel(state, 'haulerCapacity') > 0 ? base * 1.3 : base;
}

// Visual-only tier used by render.js: 0 = walker, 1 = pushing a cart,
// 2 = towmotor. Climbs on its own with speed training, or jumps straight
// to towmotor if the capacity upgrade is bought outright.
export function haulerTier(state) {
  if (upgradeLevel(state, 'haulerCapacity') > 0) return 2;
  const lvl = upgradeLevel(state, 'haulerSpeed');
  if (lvl >= 4) return 2;
  if (lvl >= 2) return 1;
  return 0;
}

export function machineSpeedMultiplier(state) {
  return Math.pow(1.08, upgradeLevel(state, 'machineSpeed'));
}

export function refillAmount(state) {
  return 15 * Math.pow(1.25, upgradeLevel(state, 'refillAmount'));
}

export function plasticPrice(state) {
  const discount = Math.pow(0.9, upgradeLevel(state, 'plasticDiscount'));
  return +(PLASTIC_UNIT_COST * discount).toFixed(3);
}

export function nextMachineCost(state, key) {
  return machineCostFor(key, state.machineCounts[key] || 0);
}

export function nextOperatorCost(state, machineKey) {
  return operatorCostFor(machineKey, state.operatorsHired);
}

export function buyLicense(state, key) {
  const def = MACHINE_TYPES[key];
  if (!def || state.licensesOwned[key]) return false;
  if (state.cash < def.licenseCost) return false;
  state.cash -= def.licenseCost;
  state.licensesOwned[key] = true;
  return true;
}

export function buyMachine(state, key) {
  const def = MACHINE_TYPES[key];
  if (!def || !state.licensesOwned[key]) return false;
  const cost = nextMachineCost(state, key);
  if (state.cash < cost) return false;
  state.cash -= cost;
  state.machineCounts[key] += 1;
  const item = { instanceId: makeId(), key };
  const emptySlot = state.hotbar.findIndex((s) => s === null);
  if (emptySlot !== -1) state.hotbar[emptySlot] = item;
  else state.overflow.push(item);
  return true;
}

export function buyBlueprint(state, key) {
  const def = PRODUCTS[key];
  if (!def || state.blueprintsOwned[key]) return false;
  if (state.cash < def.cost) return false;
  state.cash -= def.cost;
  state.blueprintsOwned[key] = true;
  return true;
}

// Loads the first owned, matching blueprint onto a machine that doesn't
// have one yet. Returns the product key on success, or null if the player
// needs to buy a blueprint for this machine type first.
export function trySetBlueprint(state, machine) {
  if (machine.productKey) return null;
  const match = Object.values(PRODUCTS).find(
    (p) => p.machineType === machine.key && state.blueprintsOwned[p.key],
  );
  if (!match) return null;
  machine.productKey = match.key;
  return match.key;
}

export function buyPlastic(state, amount) {
  const cost = amount * plasticPrice(state);
  if (state.cash < cost) return false;
  state.cash -= cost;
  state.plastic += amount;
  state.everBoughtPlastic = true;
  return true;
}

export function placeFromSlot(state, slotIndex, row, col) {
  const item = state.hotbar[slotIndex];
  if (!item) return false;
  if (state.machines.some((m) => m.row === row && m.col === col)) return false;
  const machine = new Machine(item.key, row, col);
  state.machines.push(machine);
  state.hotbar[slotIndex] = null;
  if (state.overflow.length > 0) {
    state.hotbar[slotIndex] = state.overflow.shift();
  }
  return true;
}

export function moveOverflowToHotbar(state, overflowIndex) {
  const slot = state.hotbar.findIndex((s) => s === null);
  if (slot === -1) return false;
  const [item] = state.overflow.splice(overflowIndex, 1);
  state.hotbar[slot] = item;
  return true;
}

// Picking a machine up doesn't fire its operator - they go into limbo
// (still yours, unpaid-for-again) until another machine needs staffing.
// The blueprint isn't lost either: blueprints are owned account-wide, so
// re-placing this machine (or any of the same type) can load it for free.
export function pickUpMachine(state, machineId) {
  const idx = state.machines.findIndex((m) => m.id === machineId);
  if (idx === -1) return false;
  const [removed] = state.machines.splice(idx, 1);
  if (removed.staffed) state.operatorsInLimbo += 1;
  const item = { instanceId: makeId(), key: removed.key };
  const emptySlot = state.hotbar.findIndex((s) => s === null);
  if (emptySlot !== -1) state.hotbar[emptySlot] = item;
  else state.overflow.push(item);
  return true;
}

// A machine operator hired before is still owned after their machine gets
// picked up - staffing a new machine draws from that limbo pool for free
// before ever charging for a brand new hire.
export function hireOperator(state, machine) {
  if (machine.staffed) return false;
  if (state.operatorsInLimbo > 0) {
    state.operatorsInLimbo -= 1;
    machine.staffed = true;
    return true;
  }
  const cost = nextOperatorCost(state, machine.key);
  if (state.cash < cost) return false;
  state.cash -= cost;
  machine.staffed = true;
  state.operatorsHired += 1;
  return true;
}

export function gridCellFromPoint(x, y) {
  for (let row = 0; row < GRID.rows; row++) {
    for (let col = 0; col < GRID.cols; col++) {
      const px = GRID.originX + col * (GRID.padW + GRID.gap);
      const py = GRID.originY + row * (GRID.padH + GRID.gap);
      if (x >= px && x <= px + GRID.padW && y >= py && y <= py + GRID.padH) {
        return { row, col };
      }
    }
  }
  return null;
}

export function addToast(state, text) {
  state.toasts.push({ text, t: 0 });
}

export function tick(state, dt) {
  const speedMult = machineSpeedMultiplier(state);
  for (const m of state.machines) m.update(dt, speedMult);
  for (const w of state.utilityWorkers) w.update(dt, utilitySpeed(state), refillAmount(state), state);
  for (const h of state.haulers) h.update(dt, haulerSpeed(state), state);
  for (const t of state.toasts) t.t += dt;
  state.toasts = state.toasts.filter((t) => t.t < 2000);
}

// --- Save / Load ---
//
// A save only remembers what you own and what's earned - not live worker
// positions or a machine's in-progress cycle timer. Loading a slot looks
// like everyone just clocked in for a fresh shift: hoppers start stocked,
// nobody's mid-walk, but pallets that were already built and waiting for
// pickup are still there.

function slotStorageKey(slot) {
  return `${SAVE_KEY_PREFIX}${slot}`;
}

export function getActiveSlot() {
  try {
    const v = parseInt(localStorage.getItem(ACTIVE_SLOT_KEY), 10);
    return v >= 1 && v <= SAVE_SLOT_COUNT ? v : 1;
  } catch (e) {
    return 1;
  }
}

export function setActiveSlot(slot) {
  try {
    localStorage.setItem(ACTIVE_SLOT_KEY, String(slot));
  } catch (e) {
    // ignore
  }
}

export function listSlotSummaries() {
  const summaries = [];
  for (let slot = 1; slot <= SAVE_SLOT_COUNT; slot++) {
    let raw = null;
    try {
      raw = localStorage.getItem(slotStorageKey(slot));
    } catch (e) {
      raw = null;
    }
    if (!raw) {
      summaries.push({ slot, empty: true });
      continue;
    }
    try {
      const data = JSON.parse(raw);
      summaries.push({
        slot,
        empty: false,
        cash: data.cash ?? 0,
        palletsSold: data.palletsSold ?? 0,
        machineCount: (data.machines ?? []).length,
      });
    } catch (e) {
      summaries.push({ slot, empty: true });
    }
  }
  return summaries;
}

export function serialize(state) {
  return JSON.stringify({
    cash: state.cash,
    plastic: state.plastic,
    everBoughtPlastic: state.everBoughtPlastic,
    palletsSold: state.palletsSold,
    hotbar: state.hotbar,
    overflow: state.overflow,
    upgradeLevels: state.upgradeLevels,
    machineCounts: state.machineCounts,
    licensesOwned: state.licensesOwned,
    blueprintsOwned: state.blueprintsOwned,
    operatorsHired: state.operatorsHired,
    operatorsInLimbo: state.operatorsInLimbo,
    tutorial: { stepIndex: state.tutorial.stepIndex, active: state.tutorial.active },
    // Only what's earned and assigned survives - not the in-progress cycle
    // timer or the current plastic level, which reset fresh on load.
    machines: state.machines.map((m) => ({
      key: m.key, row: m.row, col: m.col, readyPallets: m.readyPallets,
      staffed: m.staffed, productKey: m.productKey,
    })),
    utilityWorkerCount: state.utilityWorkers.length,
    haulerCount: state.haulers.length,
  });
}

export function saveState(state, slot) {
  try {
    localStorage.setItem(slotStorageKey(slot), serialize(state));
  } catch (e) {
    // storage unavailable (private browsing etc.) - fail silently
  }
}

export function loadState(slot) {
  let raw;
  try {
    raw = localStorage.getItem(slotStorageKey(slot));
  } catch (e) {
    return null;
  }
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    const state = createInitialState();
    state.cash = data.cash ?? state.cash;
    state.plastic = data.plastic ?? 0;
    state.everBoughtPlastic = data.everBoughtPlastic ?? false;
    state.palletsSold = data.palletsSold ?? 0;
    state.hotbar = data.hotbar ?? state.hotbar;
    state.overflow = data.overflow ?? [];
    state.upgradeLevels = { ...state.upgradeLevels, ...(data.upgradeLevels ?? {}) };
    state.machineCounts = { ...state.machineCounts, ...(data.machineCounts ?? {}) };
    state.licensesOwned = { ...state.licensesOwned, ...(data.licensesOwned ?? {}) };
    state.blueprintsOwned = { ...state.blueprintsOwned, ...(data.blueprintsOwned ?? {}) };
    state.operatorsHired = data.operatorsHired ?? 0;
    state.operatorsInLimbo = data.operatorsInLimbo ?? 0;
    if (data.tutorial) {
      state.tutorial.stepIndex = data.tutorial.stepIndex ?? 0;
      state.tutorial.active = data.tutorial.active ?? false;
    }

    state.machines = (data.machines ?? []).map((md) => {
      const m = new Machine(md.key, md.row, md.col);
      m.hopperAmount = m.hopperCapacity;
      m.progress = 0;
      m.readyPallets = md.readyPallets ?? 0;
      m.staffed = md.staffed;
      m.productKey = md.productKey ?? null;
      return m;
    });

    const utilCount = Math.max(0, data.utilityWorkerCount ?? 0);
    state.utilityWorkers = Array.from({ length: utilCount }, () => new UtilityWorker());
    const haulerCount = Math.max(0, data.haulerCount ?? 0);
    state.haulers = Array.from({ length: haulerCount }, () => new Hauler());
    if (upgradeLevel(state, 'haulerCapacity') > 0) {
      for (const h of state.haulers) h.capacity = 2;
    }
    return state;
  } catch (e) {
    return null;
  }
}

export function clearSlot(slot) {
  try {
    localStorage.removeItem(slotStorageKey(slot));
  } catch (e) {
    // ignore
  }
}
