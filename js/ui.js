import { MACHINE_TYPES, PRODUCTS, PLASTIC_BUNDLES, UPGRADES } from './config.js';
import {
  buyMachine, buyPlastic, buyUpgrade, buyLicense, buyBlueprint, hireOperator,
  moveOverflowToHotbar, upgradeLevel, upgradeCost, upgradeMaxed, plasticPrice,
  addToast, nextMachineCost, nextOperatorCost, pickUpMachine,
  listSlotSummaries, getActiveSlot, setActiveSlot, clearSlot,
} from './state.js';
import { currentStep, resolveHighlight, dismissTutorial, getStepLockInfo } from './tutorial.js';

const els = {};
const WORKER_HIRE_IDS = ['hireUtility', 'hireHauler'];
const TAB_CONTENT_IDS = {
  machines: 'shopMachines', workers: 'shopWorkers', plastic: 'shopPlastic',
  blueprints: 'shopBlueprints', upgrades: 'shopUpgrades',
};
let highlightedEls = [];
let lastTutorialActive = null;
let lockedEls = [];

export function initUI(state, onChange) {
  els.cash = document.getElementById('cashVal');
  els.plastic = document.getElementById('plasticVal');
  els.sold = document.getElementById('soldVal');
  els.hotbar = document.getElementById('hotbar');
  els.shopPanel = document.getElementById('shopPanel');
  els.inventoryPanel = document.getElementById('inventoryPanel');
  els.helpPanel = document.getElementById('helpPanel');
  els.shopMachines = document.getElementById('shopMachines');
  els.shopWorkers = document.getElementById('shopWorkers');
  els.shopPlastic = document.getElementById('shopPlastic');
  els.shopBlueprints = document.getElementById('shopBlueprints');
  els.shopUpgrades = document.getElementById('shopUpgrades');
  els.inventoryGrid = document.getElementById('inventoryGrid');
  els.slotsPanel = document.getElementById('slotsPanel');
  els.slotsGrid = document.getElementById('slotsGrid');
  els.tutorialBanner = document.getElementById('tutorialBanner');
  els.tutorialText = document.getElementById('tutorialText');
  els.tutorialNext = document.getElementById('tutorialNext');
  els.tutorialSkip = document.getElementById('tutorialSkip');

  document.getElementById('shopBtn').addEventListener('click', () => togglePanel(state, 'shopPanel'));
  document.getElementById('inventoryBtn').addEventListener('click', () => togglePanel(state, 'inventoryPanel'));
  document.getElementById('helpBtn').addEventListener('click', () => togglePanel(state, 'helpPanel'));
  document.getElementById('slotsBtn').addEventListener('click', () => {
    togglePanel(state, 'slotsPanel');
    if (!els.slotsPanel.classList.contains('hidden')) buildSlotsPanel();
  });

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => hidePanel(state, btn.dataset.close));
  });

  document.querySelectorAll('#shopPanel .tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('#shopPanel .tab').forEach((b) => b.classList.remove('active'));
      tabBtn.classList.add('active');
      ['shopMachines', 'shopWorkers', 'shopPlastic', 'shopBlueprints', 'shopUpgrades'].forEach((id) => {
        document.getElementById(id).classList.toggle('hidden', `shop${capitalize(tabBtn.dataset.tab)}` !== id);
      });
    });
  });

  els.tutorialSkip.addEventListener('click', () => {
    dismissTutorial(state);
    onChange();
  });
  els.tutorialNext.addEventListener('click', () => {
    dismissTutorial(state);
    onChange();
  });

  rebuildShopMachines(state, onChange);
  rebuildShopBlueprints(state, onChange);
  buildShopWorkers(state, onChange);
  buildShopPlastic(state, onChange);
  buildShopUpgrades(state, onChange);
  buildHotbar(state, onChange);
  lastTutorialActive = state.tutorial.active;
  render(state);
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function togglePanel(state, id) {
  const el = document.getElementById(id);
  el.classList.toggle('hidden');
  if (id === 'shopPanel') state.uiFlags.shopOpen = !el.classList.contains('hidden');
}

function hidePanel(state, id) {
  document.getElementById(id).classList.add('hidden');
  if (id === 'shopPanel') state.uiFlags.shopOpen = false;
}

export function isAnyPanelOpen() {
  return ['shopPanel', 'inventoryPanel', 'helpPanel', 'slotsPanel'].some(
    (id) => !document.getElementById(id).classList.contains('hidden'),
  );
}

function buildSlotsPanel() {
  els.slotsGrid.innerHTML = '';
  const active = getActiveSlot();
  const note = document.createElement('div');
  note.className = 'desc';
  note.style.marginBottom = '8px';
  note.textContent = 'A slot remembers what you own and what you\'ve earned - not exactly where your workers were standing. Switching slots reloads the page.';
  els.slotsGrid.appendChild(note);

  listSlotSummaries().forEach((summary) => {
    const row = document.createElement('div');
    row.className = 'shop-item';
    const isActive = summary.slot === active;
    const label = summary.empty
      ? 'Empty'
      : `$${summary.cash.toFixed(0)} cash · ${summary.machineCount} machine(s) · ${summary.palletsSold} sold`;
    row.innerHTML = `
      <div class="info">
        <div class="name">Slot ${summary.slot}${isActive ? ' (current)' : ''}</div>
        <div class="desc">${label}</div>
      </div>
    `;
    const actions = document.createElement('div');
    actions.style.display = 'flex';
    actions.style.gap = '6px';

    if (!summary.empty && !isActive) {
      const continueBtn = document.createElement('button');
      continueBtn.textContent = 'Continue';
      continueBtn.addEventListener('click', () => {
        setActiveSlot(summary.slot);
        window.location.reload();
      });
      actions.appendChild(continueBtn);
    }

    const newGameBtn = document.createElement('button');
    newGameBtn.textContent = summary.empty ? 'New Game' : 'Erase & Restart';
    newGameBtn.addEventListener('click', () => {
      if (!summary.empty) {
        const ok = window.confirm(`Erase everything in Slot ${summary.slot} and start fresh?`);
        if (!ok) return;
      }
      clearSlot(summary.slot);
      setActiveSlot(summary.slot);
      window.location.reload();
    });
    actions.appendChild(newGameBtn);

    row.appendChild(actions);
    els.slotsGrid.appendChild(row);
  });
}

function rebuildShopMachines(state, onChange) {
  els.shopMachines.innerHTML = '';

  Object.values(MACHINE_TYPES).forEach((def) => {
    if (state.tutorial.active && def.key !== 'extruder') return;
    const owned = state.licensesOwned[def.key];

    const row = document.createElement('div');
    row.className = 'shop-item';
    els.shopMachines.appendChild(row);

    const refresh = () => {
      if (!owned && !state.licensesOwned[def.key]) {
        row.innerHTML = `
          <div class="info">
            <div class="name">${def.icon} ${def.name} — license required</div>
            <div class="desc">Hopper ${def.hopperCapacity} plastic. Buy the license once to unlock this machine type for good.</div>
          </div>
          <button data-action="buyLicense">Buy License $${def.licenseCost}</button>
        `;
        row.querySelector('button').addEventListener('click', () => {
          if (buyLicense(state, def.key)) {
            addToast(state, `${def.name} license purchased`);
            onChange();
            refresh();
          } else {
            flashDisabled(row.querySelector('button'));
          }
        });
        return;
      }

      const cost = nextMachineCost(state, def.key);
      const count = state.machineCounts[def.key] || 0;
      row.innerHTML = `
        <div class="info">
          <div class="name">${def.icon} ${def.name}${count > 0 ? ` (owned: ${count})` : ''}</div>
          <div class="desc">Hopper ${def.hopperCapacity} plastic · next operator costs $${nextOperatorCost(state, def.key)}</div>
        </div>
        <button data-action="buyMachine">Buy $${cost}</button>
      `;
      row.querySelector('button').addEventListener('click', () => {
        if (buyMachine(state, def.key)) {
          addToast(state, `Bought ${def.name}`);
          onChange();
          refresh();
        } else {
          flashDisabled(row.querySelector('button'));
        }
      });
    };
    refresh();
  });

  if (state.machines.length > 0) {
    const divider = document.createElement('div');
    divider.className = 'desc';
    divider.style.margin = '10px 0 4px';
    divider.textContent = 'Placed on the floor (pick one up to free its pad - its operator stays yours, in limbo, ready to staff the next machine for free):';
    els.shopMachines.appendChild(divider);

    state.machines.forEach((m) => {
      const row = document.createElement('div');
      row.className = 'shop-item';
      row.innerHTML = `
        <div class="info">
          <div class="name">${m.def.icon} ${m.def.name} at row ${m.row + 1}, col ${m.col + 1}</div>
          <div class="desc">${m.staffed ? 'Staffed' : 'Unstaffed'}${m.product ? ` · running ${m.product.name}` : ' · no blueprint loaded'}</div>
        </div>
        <button data-action="pickUpMachine">Pick Up</button>
      `;
      row.querySelector('button').addEventListener('click', () => {
        pickUpMachine(state, m.id);
        addToast(state, 'Machine picked up');
        onChange();
        rebuildShopMachines(state, onChange);
      });
      els.shopMachines.appendChild(row);
    });
  }
}

function buildShopWorkers(state, onChange) {
  const container = els.shopWorkers;

  const render_ = () => {
    container.innerHTML = '';

    WORKER_HIRE_IDS.forEach((id) => {
      const def = UPGRADES.find((u) => u.id === id);
      const level = upgradeLevel(state, id);
      const maxed = upgradeMaxed(state, id);
      const cost = maxed ? null : upgradeCost(state, id);
      const row = document.createElement('div');
      row.className = 'upgrade-item';
      row.innerHTML = `
        <div class="info">
          <div class="name">${def.name} (hired: ${level}/${def.max})</div>
          <div class="desc">${def.desc}</div>
        </div>
        <button data-action="${id}" ${maxed ? 'disabled' : ''}>${maxed ? 'Maxed' : `Hire $${cost}`}</button>
      `;
      row.querySelector('button').addEventListener('click', () => {
        if (buyUpgrade(state, id)) {
          addToast(state, `${def.name} hired`);
          onChange();
          render_();
        } else {
          flashDisabled(row.querySelector('button'));
        }
      });
      container.appendChild(row);
    });

    const divider = document.createElement('div');
    divider.className = 'desc';
    divider.style.margin = '10px 0 4px';
    divider.textContent = state.operatorsInLimbo > 0
      ? `Machine operators — ${state.operatorsInLimbo} in limbo, free to reassign before any new hire:`
      : 'Machine operators (one per machine, hired on the spot - no upgrades, that all happens on the machine itself):';
    container.appendChild(divider);

    const unstaffed = state.machines.filter((m) => !m.staffed);
    if (unstaffed.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'desc';
      empty.textContent = 'No unstaffed machines right now — place one from your hotbar first.';
      container.appendChild(empty);
      return;
    }
    unstaffed.forEach((m) => {
      const free = state.operatorsInLimbo > 0;
      const cost = nextOperatorCost(state, m.key);
      const row = document.createElement('div');
      row.className = 'shop-item';
      row.innerHTML = `
        <div class="info">
          <div class="name">${m.def.icon} ${m.def.name} at row ${m.row + 1}, col ${m.col + 1}</div>
          <div class="desc">Unstaffed — won't produce until staffed.</div>
        </div>
        <button data-action="hireOperator">${free ? 'Assign (free)' : `Hire $${cost}`}</button>
      `;
      row.querySelector('button').addEventListener('click', () => {
        if (hireOperator(state, m)) {
          addToast(state, free ? 'Operator reassigned from limbo' : 'Operator hired');
          onChange();
          render_();
        } else {
          flashDisabled(row.querySelector('button'));
        }
      });
      container.appendChild(row);
    });
  };

  render_();
  container._rebuild = render_;
}

function rebuildShopBlueprints(state, onChange) {
  els.shopBlueprints.innerHTML = '';
  Object.values(PRODUCTS).forEach((def) => {
    if (state.tutorial.active && def.key !== 'straws') return;
    if (!state.licensesOwned[def.machineType]) return;

    const row = document.createElement('div');
    row.className = 'shop-item';
    els.shopBlueprints.appendChild(row);

    const refresh = () => {
      const owned = state.blueprintsOwned[def.key];
      const machineDef = MACHINE_TYPES[def.machineType];
      row.innerHTML = `
        <div class="info">
          <div class="name">${def.icon} ${def.name} blueprint — runs on ${machineDef.name}</div>
          <div class="desc">Uses ${def.consumePerCycle} plastic/cycle · ${(def.cycleTime / 1000).toFixed(0)}s cycle
          · pallet worth $${def.palletValue}</div>
        </div>
        <button data-action="buyBlueprint" ${owned ? 'disabled' : ''}>${owned ? 'Owned' : `Buy $${def.cost}`}</button>
      `;
      if (!owned) {
        row.querySelector('button').addEventListener('click', () => {
          if (buyBlueprint(state, def.key)) {
            addToast(state, `${def.name} blueprint purchased`);
            onChange();
            refresh();
          } else {
            flashDisabled(row.querySelector('button'));
          }
        });
      }
    };
    refresh();
  });
}

function buildShopPlastic(state, onChange) {
  els.shopPlastic.innerHTML = '';
  const info = document.createElement('div');
  info.className = 'desc';
  info.style.marginBottom = '8px';
  info.textContent = 'Generic plastic feedstock. Any machine can use it — your utility worker fetches it from here.';
  els.shopPlastic.appendChild(info);

  PLASTIC_BUNDLES.forEach((amount, i) => {
    const row = document.createElement('div');
    row.className = 'shop-item';
    const priceEl = document.createElement('span');
    row.innerHTML = `<div class="info"><div class="name">${amount} plastic</div></div>`;
    const btn = document.createElement('button');
    btn.dataset.action = i === 0 ? 'buyPlasticStarter' : 'buyPlasticBulk';
    row.appendChild(btn);
    row.querySelector('.info').appendChild(priceEl);
    const refresh = () => {
      const price = plasticPrice(state);
      priceEl.textContent = ` — $${(amount * price).toFixed(2)}`;
      btn.textContent = 'Buy';
    };
    refresh();
    btn.addEventListener('click', () => {
      if (buyPlastic(state, amount)) {
        addToast(state, `Bought ${amount} plastic`);
        onChange();
        refresh();
      } else {
        flashDisabled(btn);
      }
    });
    els.shopPlastic.appendChild(row);
  });
}

function buildShopUpgrades(state, onChange) {
  els.shopUpgrades.innerHTML = '';
  UPGRADES.filter((def) => !WORKER_HIRE_IDS.includes(def.id)).forEach((def) => {
    const row = document.createElement('div');
    row.className = 'upgrade-item';
    els.shopUpgrades.appendChild(row);

    const refresh = () => {
      const level = upgradeLevel(state, def.id);
      const maxed = upgradeMaxed(state, def.id);
      const cost = maxed ? null : upgradeCost(state, def.id);
      row.innerHTML = `
        <div class="info">
          <div class="name">${def.name} ${def.max > 1 ? `(Lv ${level}/${def.max})` : ''}</div>
          <div class="desc">${def.desc}</div>
        </div>
        <button data-action="${def.id}" ${maxed ? 'disabled' : ''}>${maxed ? 'Maxed' : `Buy $${cost}`}</button>
      `;
      row.querySelector('button').addEventListener('click', () => {
        if (buyUpgrade(state, def.id)) {
          addToast(state, `${def.name} purchased`);
          onChange();
          refresh();
        } else {
          flashDisabled(row.querySelector('button'));
        }
      });
    };
    refresh();
  });
}

function flashDisabled(btn) {
  const original = btn.textContent;
  btn.textContent = "Can't afford";
  btn.disabled = true;
  setTimeout(() => {
    btn.disabled = false;
    btn.textContent = original;
  }, 700);
}

function buildHotbar(state, onChange) {
  els.hotbar.innerHTML = '';
  for (let i = 0; i < 9; i++) {
    const slot = document.createElement('div');
    slot.className = 'hotbar-slot';
    slot.dataset.index = String(i);
    slot.innerHTML = `<span class="slot-key">${i + 1}</span>`;
    slot.addEventListener('click', () => {
      state.selectedSlot = i;
      render(state);
    });
    els.hotbar.appendChild(slot);
  }
}

export function renderInventory(state, onChange) {
  els.inventoryGrid.innerHTML = '';
  if (state.overflow.length === 0) {
    els.inventoryGrid.innerHTML = '<div class="desc">Nothing extra — buy more machines or place the ones in your hotbar.</div>';
    return;
  }
  state.overflow.forEach((item, idx) => {
    const def = MACHINE_TYPES[item.key];
    const row = document.createElement('div');
    row.className = 'inv-item';
    row.innerHTML = `<div class="info"><div class="name">${def.icon} ${def.name}</div></div>
      <button>Move to hotbar</button>`;
    row.querySelector('button').addEventListener('click', () => {
      moveOverflowToHotbar(state, idx);
      onChange();
    });
    els.inventoryGrid.appendChild(row);
  });
}

export function refreshWorkersTab() {
  if (els.shopWorkers && els.shopWorkers._rebuild) els.shopWorkers._rebuild();
}

export function tryHireOperator(state, machine, onChange) {
  const cost = nextOperatorCost(state, machine.key);
  if (hireOperator(state, machine)) {
    addToast(state, `Operator hired for $${cost}`);
    onChange();
    return true;
  }
  addToast(state, "Can't afford an operator");
  return false;
}

export function tryAssignBlueprintUI(state, machine, trySetBlueprintFn, onChange) {
  const key = trySetBlueprintFn(state, machine);
  if (key) {
    addToast(state, `${PRODUCTS[key].name} blueprint loaded`);
    onChange();
    return true;
  }
  addToast(state, 'Buy the matching blueprint first');
  return false;
}

function clearHighlights() {
  highlightedEls.forEach((el) => el.classList.remove('tutorial-highlight'));
  highlightedEls = [];
}

function applyDomHighlight(selector) {
  clearHighlights();
  if (!selector) return;
  document.querySelectorAll(selector).forEach((el) => {
    el.classList.add('tutorial-highlight');
    highlightedEls.push(el);
  });
}

function lockEl(el) {
  el.classList.add('tutorial-dim');
  if (el.tagName === 'BUTTON') el.disabled = true;
}

function unlockEl(el) {
  el.classList.remove('tutorial-dim');
  if (el.tagName === 'BUTTON') el.disabled = false;
}

// Everything clickable except the current step's exact target gets locked,
// so a new player can't wander off, buy the wrong thing, and strand
// themselves without enough cash to finish the tutorial.
function computeLockedSet(state, step) {
  const info = getStepLockInfo(step);
  if (info.kind === 'none') return [];
  const locked = [];
  const shopNeeded = info.kind === 'tab-action';

  // The shop's own open/close toggle and its X are never locked - whatever
  // step is active, the player must always be able to get the shop out of
  // the way to reach the canvas underneath, or back open again.
  ['inventoryBtn', 'slotsBtn', 'helpBtn'].forEach((id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const allowed = info.kind === 'top-level' && info.selector === `#${id}`;
    if (!allowed) locked.push(el);
  });

  document.querySelectorAll('#inventoryPanel .close-btn, #slotsPanel .close-btn, #helpPanel .close-btn')
    .forEach((el) => locked.push(el));

  document.querySelectorAll('#shopPanel .tab').forEach((tabEl) => {
    const allowed = shopNeeded && tabEl.dataset.tab === info.tab;
    if (!allowed) locked.push(tabEl);
  });

  Object.entries(TAB_CONTENT_IDS).forEach(([tabName, containerId]) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const isAllowedContainer = shopNeeded && tabName === info.tab;
    if (!isAllowedContainer) {
      container.querySelectorAll('button').forEach((b) => locked.push(b));
      return;
    }
    if (info.action) {
      container.querySelectorAll('button').forEach((b) => {
        if (b.dataset.action !== info.action) locked.push(b);
      });
    }
    // action is null/undefined -> every button in this container stays usable
  });

  document.querySelectorAll('.hotbar-slot').forEach((el) => locked.push(el));

  return locked;
}

export function updateTutorialUI(state, onChange) {
  if (state.tutorial.active !== lastTutorialActive) {
    lastTutorialActive = state.tutorial.active;
    rebuildShopMachines(state, onChange);
    rebuildShopBlueprints(state, onChange);
  }

  const step = currentStep(state);
  if (!step) {
    els.tutorialBanner.classList.add('hidden');
    clearHighlights();
    lockedEls.forEach(unlockEl);
    lockedEls = [];
    return;
  }
  els.tutorialBanner.classList.remove('hidden');
  els.tutorialText.textContent = step.text;
  els.tutorialNext.classList.toggle('hidden', !step.manualDismiss);
  const { dom } = resolveHighlight(state, step);
  applyDomHighlight(dom);

  const newLocked = computeLockedSet(state, step);
  lockedEls.forEach((el) => { if (!newLocked.includes(el)) unlockEl(el); });
  newLocked.forEach(lockEl);
  lockedEls = newLocked;
}

export function getTutorialCanvasHint(state) {
  const step = currentStep(state);
  return resolveHighlight(state, step).canvas;
}

export function render(state) {
  els.cash.textContent = `$${state.cash.toFixed(2)}`;
  els.plastic.textContent = Math.floor(state.plastic);
  els.sold.textContent = state.palletsSold;

  document.querySelectorAll('.hotbar-slot').forEach((slotEl, i) => {
    const item = state.hotbar[i];
    slotEl.classList.toggle('selected', state.selectedSlot === i);
    const existingIcon = slotEl.querySelector('.slot-icon');
    if (existingIcon) existingIcon.remove();
    const existingName = slotEl.querySelector('.slot-name');
    if (existingName) existingName.remove();

    if (item) {
      const def = MACHINE_TYPES[item.key];
      const icon = document.createElement('span');
      icon.className = 'slot-icon';
      icon.textContent = def.icon;
      slotEl.appendChild(icon);
      const name = document.createElement('span');
      name.className = 'slot-name';
      name.textContent = def.name.split(' ')[0];
      slotEl.appendChild(name);
    }
  });

  if (!document.getElementById('inventoryPanel').classList.contains('hidden')) {
    renderInventory(state, () => render(state));
  }
}
