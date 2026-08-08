import { CANVAS_W, CANVAS_H, AUTOSAVE_INTERVAL_MS, CLICK_BOOST_MS } from './config.js';
import { createInitialState, loadState, saveState, tick, placeFromSlot, gridCellFromPoint, addToast } from './state.js';
import { draw, machineAtPoint } from './render.js';
import { initUI, render, isAnyPanelOpen, tryHireOperator } from './ui.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

let state = loadState() || createInitialState();
let hoverCell = null;

function onChange() {
  render(state);
}

initUI(state, onChange);

function canvasPoint(evt) {
  const rect = canvas.getBoundingClientRect();
  const scaleX = CANVAS_W / rect.width;
  const scaleY = CANVAS_H / rect.height;
  return {
    x: (evt.clientX - rect.left) * scaleX,
    y: (evt.clientY - rect.top) * scaleY,
  };
}

canvas.addEventListener('mousemove', (evt) => {
  const { x, y } = canvasPoint(evt);
  hoverCell = gridCellFromPoint(x, y);
});

canvas.addEventListener('click', (evt) => {
  const { x, y } = canvasPoint(evt);

  const machine = machineAtPoint(state, x, y);
  if (machine) {
    if (!machine.staffed) {
      tryHireOperator(state, machine, onChange);
    } else {
      const boosted = machine.boostClick(CLICK_BOOST_MS);
      if (!boosted) addToast(state, 'Needs pellets to run');
    }
    onChange();
    return;
  }

  const cell = gridCellFromPoint(x, y);
  if (cell) {
    const placed = placeFromSlot(state, state.selectedSlot, cell.row, cell.col);
    if (placed) onChange();
  }
});

window.addEventListener('keydown', (evt) => {
  if (evt.key >= '1' && evt.key <= '9') {
    state.selectedSlot = Number(evt.key) - 1;
    render(state);
    return;
  }
  const key = evt.key.toLowerCase();
  if (key === 'b') document.getElementById('shopBtn').click();
  if (key === 'i') document.getElementById('inventoryBtn').click();
  if (key === 'h') document.getElementById('helpBtn').click();
  if (key === 'escape') {
    ['shopPanel', 'inventoryPanel', 'helpPanel'].forEach((id) => {
      document.getElementById(id).classList.add('hidden');
    });
  }
});

let lastTime = performance.now();
let sinceSave = 0;

function loop(now) {
  const dt = Math.min(100, now - lastTime);
  lastTime = now;

  tick(state, dt);
  draw(ctx, state, hoverCell);
  render(state);

  sinceSave += dt;
  if (sinceSave >= AUTOSAVE_INTERVAL_MS) {
    saveState(state);
    sinceSave = 0;
  }

  requestAnimationFrame(loop);
}

window.addEventListener('beforeunload', () => saveState(state));

requestAnimationFrame(loop);
