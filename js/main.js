import { CANVAS_W, CANVAS_H, AUTOSAVE_INTERVAL_MS, CLICK_BOOST_MS, TUTORIAL_FAST_FORWARD_MULT } from './config.js';
import {
  createInitialState, loadState, saveState, tick, placeFromSlot, gridCellFromPoint,
  addToast, trySetBlueprint, getActiveSlot,
} from './state.js';
import { draw, machineAtPoint } from './render.js';
import {
  initUI, render, tryHireOperator, tryAssignBlueprintUI, updateTutorialUI, getTutorialCanvasHint,
  refreshWorkersTab,
} from './ui.js';
import { advanceTutorial, isCanvasActionAllowed, isHotbarAllowed } from './tutorial.js';

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const activeSlot = getActiveSlot();
let state = loadState(activeSlot) || createInitialState();
let hoverCell = null;

function onChange() {
  render(state);
  updateTutorialUI(state, onChange);
  refreshWorkersTab();
}

initUI(state, onChange);
updateTutorialUI(state, onChange);

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
  if (!isCanvasActionAllowed(state)) return;
  const { x, y } = canvasPoint(evt);

  const machine = machineAtPoint(state, x, y);
  if (machine) {
    if (!machine.staffed) {
      tryHireOperator(state, machine, onChange);
    } else if (!machine.productKey) {
      tryAssignBlueprintUI(state, machine, trySetBlueprint, onChange);
    } else {
      const boosted = machine.boostClick(CLICK_BOOST_MS);
      if (!boosted) addToast(state, 'Needs plastic to run');
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
    if (!isHotbarAllowed(state)) return;
    state.selectedSlot = Number(evt.key) - 1;
    render(state);
    return;
  }
  const key = evt.key.toLowerCase();
  if (key === 'b') document.getElementById('shopBtn').click();
  if (key === 'i') document.getElementById('inventoryBtn').click();
  if (key === 'h') document.getElementById('helpBtn').click();
  if (key === 'escape') {
    ['shopPanel', 'inventoryPanel', 'helpPanel', 'slotsPanel'].forEach((id) => {
      document.getElementById(id).classList.add('hidden');
    });
    state.uiFlags.shopOpen = false;
  }
});

let lastTime = performance.now();
let sinceSave = 0;

function loop(now) {
  const rawDt = Math.min(100, now - lastTime);
  lastTime = now;
  const dt = state.tutorial.fastForward ? rawDt * TUTORIAL_FAST_FORWARD_MULT : rawDt;

  tick(state, dt);
  advanceTutorial(state);
  updateTutorialUI(state, onChange);

  const tutorialHint = getTutorialCanvasHint(state);
  draw(ctx, state, hoverCell, tutorialHint);
  render(state);

  sinceSave += rawDt;
  if (sinceSave >= AUTOSAVE_INTERVAL_MS) {
    saveState(state, activeSlot);
    sinceSave = 0;
  }

  requestAnimationFrame(loop);
}

window.addEventListener('beforeunload', () => saveState(state, activeSlot));

requestAnimationFrame(loop);
