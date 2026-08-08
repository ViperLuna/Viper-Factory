import { MACHINE_TYPES, PLASTIC_BUNDLES, UPGRADES } from './config.js';
import {
  buyMachine, buyPlastic, buyUpgrade, hireOperator, moveOverflowToHotbar,
  upgradeLevel, upgradeCost, upgradeMaxed, plasticPrice, addToast,
  nextMachineCost, nextOperatorCost,
} from './state.js';

const els = {};

export function initUI(state, onChange) {
  els.cash = document.getElementById('cashVal');
  els.plastic = document.getElementById('plasticVal');
  els.sold = document.getElementById('soldVal');
  els.hotbar = document.getElementById('hotbar');
  els.shopPanel = document.getElementById('shopPanel');
  els.inventoryPanel = document.getElementById('inventoryPanel');
  els.helpPanel = document.getElementById('helpPanel');
  els.shopMachines = document.getElementById('shopMachines');
  els.shopPlastic = document.getElementById('shopPlastic');
  els.shopUpgrades = document.getElementById('shopUpgrades');
  els.inventoryGrid = document.getElementById('inventoryGrid');

  document.getElementById('shopBtn').addEventListener('click', () => togglePanel('shopPanel'));
  document.getElementById('inventoryBtn').addEventListener('click', () => togglePanel('inventoryPanel'));
  document.getElementById('helpBtn').addEventListener('click', () => togglePanel('helpPanel'));

  document.querySelectorAll('[data-close]').forEach((btn) => {
    btn.addEventListener('click', () => hidePanel(btn.dataset.close));
  });

  document.querySelectorAll('#shopPanel .tab').forEach((tabBtn) => {
    tabBtn.addEventListener('click', () => {
      document.querySelectorAll('#shopPanel .tab').forEach((b) => b.classList.remove('active'));
      tabBtn.classList.add('active');
      ['shopMachines', 'shopPlastic', 'shopUpgrades'].forEach((id) => {
        document.getElementById(id).classList.toggle('hidden', `shop${capitalize(tabBtn.dataset.tab)}` !== id);
      });
    });
  });

  buildShopMachines(state, onChange);
  buildShopPlastic(state, onChange);
  buildShopUpgrades(state, onChange);
  buildHotbar(state, onChange);
  render(state);
}

function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

function togglePanel(id) {
  const el = document.getElementById(id);
  el.classList.toggle('hidden');
}

function hidePanel(id) {
  document.getElementById(id).classList.add('hidden');
}

export function isAnyPanelOpen() {
  return ['shopPanel', 'inventoryPanel', 'helpPanel'].some(
    (id) => !document.getElementById(id).classList.contains('hidden'),
  );
}

function buildShopMachines(state, onChange) {
  els.shopMachines.innerHTML = '';
  Object.values(MACHINE_TYPES).forEach((def) => {
    const row = document.createElement('div');
    row.className = 'shop-item';
    els.shopMachines.appendChild(row);

    const refresh = () => {
      const cost = nextMachineCost(state, def.key);
      const owned = state.machineCounts[def.key] || 0;
      row.innerHTML = `
        <div class="info">
          <div class="name">${def.icon} ${def.name} blueprint — makes ${def.product}${owned > 0 ? ` (owned: ${owned})` : ''}</div>
          <div class="desc">Hopper ${def.hopperCapacity} plastic · uses ${def.consumePerCycle}/cycle
          · ${(def.cycleTime / 1000).toFixed(0)}s cycle · pallet worth $${def.palletValue}
          · next operator costs $${nextOperatorCost(state, def.key)}</div>
        </div>
        <button data-key="${def.key}">Buy $${cost}</button>
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
}

function buildShopPlastic(state, onChange) {
  els.shopPlastic.innerHTML = '';
  const info = document.createElement('div');
  info.className = 'desc';
  info.style.marginBottom = '8px';
  info.textContent = 'Generic plastic feedstock. Any machine can use it — your utility worker fetches it from here.';
  els.shopPlastic.appendChild(info);

  PLASTIC_BUNDLES.forEach((amount) => {
    const row = document.createElement('div');
    row.className = 'shop-item';
    const priceEl = document.createElement('span');
    row.innerHTML = `<div class="info"><div class="name">${amount} plastic</div></div>`;
    const btn = document.createElement('button');
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
  UPGRADES.forEach((def) => {
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
        <button ${maxed ? 'disabled' : ''}>${maxed ? 'Maxed' : `Buy $${cost}`}</button>
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
