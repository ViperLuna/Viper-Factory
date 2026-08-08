import {
  START_CASH, MACHINE_TYPES, UPGRADES, GRID, SAVE_KEY,
  machineCostFor, operatorCostFor, PLASTIC_UNIT_COST,
} from './config.js';
import { Machine, UtilityWorker, Hauler, makeId } from './entities.js';

export function createInitialState() {
  const state = {
    cash: START_CASH,
    plastic: 0,
    palletsSold: 0,
    hotbar: new Array(9).fill(null),
    overflow: [],
    selectedSlot: 0,
    machines: [],
    utilityWorkers: [new UtilityWorker()],
    haulers: [new Hauler()],
    upgradeLevels: Object.fromEntries(UPGRADES.map((u) => [u.id, 0])),
    machineCounts: Object.fromEntries(Object.keys(MACHINE_TYPES).map((k) => [k, 0])),
    operatorsHired: 0,
    toasts: [],
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

export function buyMachine(state, key) {
  const def = MACHINE_TYPES[key];
  if (!def) return false;
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

export function buyPlastic(state, amount) {
  const cost = amount * plasticPrice(state);
  if (state.cash < cost) return false;
  state.cash -= cost;
  state.plastic += amount;
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

export function hireOperator(state, machine) {
  if (machine.staffed) return false;
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
  for (const m of state.machines) m.update(dt);
  for (const w of state.utilityWorkers) w.update(dt, utilitySpeed(state), refillAmount(state), state);
  for (const h of state.haulers) h.update(dt, haulerSpeed(state), state);
  for (const t of state.toasts) t.t += dt;
  state.toasts = state.toasts.filter((t) => t.t < 2000);
}

// --- Save / Load ---

export function serialize(state) {
  return JSON.stringify({
    cash: state.cash,
    plastic: state.plastic,
    palletsSold: state.palletsSold,
    hotbar: state.hotbar,
    overflow: state.overflow,
    upgradeLevels: state.upgradeLevels,
    machineCounts: state.machineCounts,
    operatorsHired: state.operatorsHired,
    machines: state.machines.map((m) => ({
      key: m.key, row: m.row, col: m.col, hopperAmount: m.hopperAmount,
      progress: m.progress, readyPallets: m.readyPallets, staffed: m.staffed,
    })),
    utilityWorkerCount: state.utilityWorkers.length,
    haulerCount: state.haulers.length,
  });
}

export function saveState(state) {
  try {
    localStorage.setItem(SAVE_KEY, serialize(state));
  } catch (e) {
    // storage unavailable (private browsing etc.) - fail silently
  }
}

export function loadState() {
  let raw;
  try {
    raw = localStorage.getItem(SAVE_KEY);
  } catch (e) {
    return null;
  }
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    const state = createInitialState();
    state.cash = data.cash ?? state.cash;
    state.plastic = data.plastic ?? 0;
    state.palletsSold = data.palletsSold ?? 0;
    state.hotbar = data.hotbar ?? state.hotbar;
    state.overflow = data.overflow ?? [];
    state.upgradeLevels = { ...state.upgradeLevels, ...(data.upgradeLevels ?? {}) };
    state.machineCounts = { ...state.machineCounts, ...(data.machineCounts ?? {}) };
    state.operatorsHired = data.operatorsHired ?? 0;

    state.machines = (data.machines ?? []).map((md) => {
      const m = new Machine(md.key, md.row, md.col);
      m.hopperAmount = md.hopperAmount;
      m.progress = md.progress;
      m.readyPallets = md.readyPallets;
      m.staffed = md.staffed;
      return m;
    });

    const utilCount = Math.max(1, data.utilityWorkerCount ?? 1);
    state.utilityWorkers = Array.from({ length: utilCount }, () => new UtilityWorker());
    const haulerCount = Math.max(1, data.haulerCount ?? 1);
    state.haulers = Array.from({ length: haulerCount }, () => new Hauler());
    if (upgradeLevel(state, 'haulerCapacity') > 0) {
      for (const h of state.haulers) h.capacity = 2;
    }
    return state;
  } catch (e) {
    return null;
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch (e) {
    // ignore
  }
}
