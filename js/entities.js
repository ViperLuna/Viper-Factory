import {
  MACHINE_TYPES, PRODUCTS, PALLET_CAPACITY, padCenter, DEPOT, WAREHOUSE,
} from './config.js';
import {
  machineApproachPoints, doorApproachPoints, pathBetween, pathFromDoor,
} from './pathing.js';

let nextId = 1;
export function makeId() {
  return nextId++;
}

export class Machine {
  constructor(key, row, col) {
    this.id = makeId();
    this.key = key;
    this.row = row;
    this.col = col;
    const def = MACHINE_TYPES[key];
    this.hopperCapacity = def.hopperCapacity;
    this.hopperAmount = 0;
    this.progress = 0;
    this.readyPallets = 0;
    this.staffed = false;
    this.productKey = null;
    this.reservedByUtility = null;
    this.reservedByHauler = null;
    const { x, y } = padCenter(row, col);
    this.x = x;
    this.y = y;
  }

  get def() {
    return MACHINE_TYPES[this.key];
  }

  get product() {
    return this.productKey ? PRODUCTS[this.productKey] : null;
  }

  get hopperRatio() {
    return this.hopperAmount / this.hopperCapacity;
  }

  canRun() {
    return this.staffed && this.product !== null
      && this.hopperAmount >= this.product.consumePerCycle
      && this.readyPallets < PALLET_CAPACITY;
  }

  update(dt, speedMult) {
    if (!this.canRun()) return;
    this.progress += dt * speedMult;
    if (this.progress >= this.product.cycleTime) {
      this.progress -= this.product.cycleTime;
      this.hopperAmount -= this.product.consumePerCycle;
      this.readyPallets += 1;
    }
  }

  boostClick(ms) {
    if (!this.canRun()) return false;
    this.progress = Math.min(this.progress + ms, this.product.cycleTime);
    return true;
  }
}

// Walker moves along a queued list of waypoints rather than straight to a
// single destination, so callers can route it down the walkway aisles
// instead of cutting through other machines' plots.
class Walker {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.state = 'idle';
    this.path = [];
    this.walkT = 0; // for bob animation
  }

  setPath(points) {
    this.path = points.slice();
  }

  // Advances toward the next waypoint; returns true once the whole path
  // has been consumed (i.e. arrived at the final destination).
  followPath(dt, speed) {
    if (this.path.length === 0) return true;
    const target = this.path[0];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.hypot(dx, dy);
    const step = speed * (dt / 1000);
    if (dist <= step || dist === 0) {
      this.x = target.x;
      this.y = target.y;
      this.path.shift();
      this.walkT += dt;
      return this.path.length === 0;
    }
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
    this.walkT += dt;
    return false;
  }
}

export class UtilityWorker extends Walker {
  constructor() {
    super(DEPOT.doorX, DEPOT.doorY);
    this.id = makeId();
    this.cargo = 0;
    this.targetMachine = null;
  }

  update(dt, speed, refillAmount, state) {
    if (this.state === 'idle') {
      if (state.plastic <= 0) return;
      const target = pickMachineNeedingFill(state.machines, this.id);
      if (target) {
        target.reservedByUtility = this.id;
        this.targetMachine = target;
        const need = target.hopperCapacity - target.hopperAmount;
        const load = Math.min(refillAmount, need, state.plastic);
        this.cargo = load;
        state.plastic -= load;
        this.setPath(pathFromDoor(
          doorApproachPoints(DEPOT.doorX, DEPOT.doorY, 'left'),
          machineApproachPoints(target, 'left'),
        ));
        this.state = 'toMachine';
      }
      return;
    }

    if (this.state === 'toMachine') {
      if (this.followPath(dt, speed)) {
        const m = this.targetMachine;
        if (m) {
          m.hopperAmount = Math.min(m.hopperCapacity, m.hopperAmount + this.cargo);
          m.reservedByUtility = null;
        }
        this.cargo = 0;
        this.setPath(pathBetween(
          machineApproachPoints(m, 'left'),
          doorApproachPoints(DEPOT.doorX, DEPOT.doorY, 'left'),
        ));
        this.targetMachine = null;
        this.state = 'returning';
      }
      return;
    }

    if (this.state === 'returning') {
      if (this.followPath(dt, speed)) this.state = 'idle';
    }
  }
}

function pickMachineNeedingFill(machines, workerId) {
  let best = null;
  let bestRatio = 0.5;
  for (const m of machines) {
    if (m.reservedByUtility && m.reservedByUtility !== workerId) continue;
    if (m.hopperAmount >= m.hopperCapacity) continue;
    const ratio = 1 - m.hopperRatio;
    if (m.hopperRatio < 0.5 && ratio > bestRatio - 0.5 + 0.0001) {
      if (best === null || m.hopperRatio < best.hopperRatio) {
        best = m;
        bestRatio = ratio;
      }
    }
  }
  return best;
}

export class Hauler extends Walker {
  constructor() {
    super(WAREHOUSE.doorX, WAREHOUSE.doorY);
    this.id = makeId();
    this.cargoCount = 0;
    this.cargoValue = 0;
    this.capacity = 1;
    this.targetMachine = null;
    this.atMachine = null; // machine currently standing at, if not at the warehouse
  }

  currentApproachPoint() {
    return this.atMachine
      ? machineApproachPoints(this.atMachine, 'right')
      : doorApproachPoints(WAREHOUSE.doorX, WAREHOUSE.doorY, 'right');
  }

  update(dt, speed, state) {
    if (this.state === 'idle') {
      if (this.cargoCount < this.capacity) {
        const target = pickMachineWithPallets(state.machines, this.id);
        if (target) {
          target.reservedByHauler = this.id;
          this.targetMachine = target;
          const buildPath = this.atMachine ? pathBetween : pathFromDoor;
          this.setPath(buildPath(this.currentApproachPoint(), machineApproachPoints(target, 'right')));
          this.state = 'toMachine';
          return;
        }
      }
      if (this.cargoCount > 0) {
        this.setPath(pathBetween(this.currentApproachPoint(), doorApproachPoints(WAREHOUSE.doorX, WAREHOUSE.doorY, 'right')));
        this.state = 'toWarehouse';
      }
      return;
    }

    if (this.state === 'toMachine') {
      if (this.followPath(dt, speed)) {
        const m = this.targetMachine;
        if (m) {
          const take = Math.min(this.capacity - this.cargoCount, m.readyPallets);
          m.readyPallets -= take;
          this.cargoCount += take;
          this.cargoValue += take * m.product.palletValue;
          m.reservedByHauler = null;
        }
        this.atMachine = m;
        this.targetMachine = null;
        this.state = 'idle';
      }
      return;
    }

    if (this.state === 'toWarehouse') {
      if (this.followPath(dt, speed)) {
        state.cash += this.cargoValue;
        state.palletsSold += this.cargoCount;
        this.cargoCount = 0;
        this.cargoValue = 0;
        this.atMachine = null;
        this.state = 'idle';
      }
    }
  }
}

function pickMachineWithPallets(machines, haulerId) {
  let best = null;
  for (const m of machines) {
    if (m.reservedByHauler && m.reservedByHauler !== haulerId) continue;
    if (m.readyPallets <= 0) continue;
    if (!best || m.readyPallets > best.readyPallets) best = m;
  }
  return best;
}
