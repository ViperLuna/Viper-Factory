import { CANVAS_W, CANVAS_H, DEPOT, WAREHOUSE, GRID, PRODUCTS, PALLET_CAPACITY } from './config.js';
import { haulerTier } from './state.js';

const FLOOR = '#2c2f36';
const PAD_EMPTY = '#3a3f49';
const PAD_BORDER = '#565c68';

export function draw(ctx, state, hoverCell, tutorialHint) {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);

  // floor
  ctx.fillStyle = FLOOR;
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  drawHazardBorder(ctx);

  drawDepot(ctx, state);
  drawWarehouse(ctx, state);
  drawGridPads(ctx, state, hoverCell);

  for (const m of state.machines) drawMachine(ctx, m);
  for (const w of state.utilityWorkers) drawUtilityWorker(ctx, w);
  for (const h of state.haulers) drawHauler(ctx, h, haulerTier(state));

  drawTutorialHighlight(ctx, state, tutorialHint);
  drawToasts(ctx, state);
}

function drawHazardBorder(ctx) {
  ctx.save();
  ctx.fillStyle = '#f4c430';
  ctx.fillRect(0, 0, CANVAS_W, 6);
  ctx.fillRect(0, CANVAS_H - 6, CANVAS_W, 6);
  ctx.restore();
}

function drawDepot(ctx, state) {
  ctx.fillStyle = '#5b4636';
  ctx.fillRect(DEPOT.x, DEPOT.y, DEPOT.w, DEPOT.h);
  ctx.strokeStyle = '#3a2c22';
  ctx.lineWidth = 3;
  ctx.strokeRect(DEPOT.x, DEPOT.y, DEPOT.w, DEPOT.h);

  ctx.fillStyle = '#f0d9b5';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SUPPLY DEPOT', DEPOT.x + DEPOT.w / 2, DEPOT.y + 24);

  // plastic pile
  const shown = Math.min(24, Math.round(state.plastic / 20));
  ctx.fillStyle = '#e8e05a';
  for (let i = 0; i < shown; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    ctx.beginPath();
    ctx.arc(DEPOT.x + 30 + col * 24, DEPOT.y + 60 + row * 24, 8, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`${Math.floor(state.plastic)} plastic`, DEPOT.x + DEPOT.w / 2, DEPOT.y + DEPOT.h - 16);
}

function drawWarehouse(ctx, state) {
  ctx.fillStyle = '#3b4a3b';
  ctx.fillRect(WAREHOUSE.x, WAREHOUSE.y, WAREHOUSE.w, WAREHOUSE.h);
  ctx.strokeStyle = '#28351f';
  ctx.lineWidth = 3;
  ctx.strokeRect(WAREHOUSE.x, WAREHOUSE.y, WAREHOUSE.w, WAREHOUSE.h);

  ctx.fillStyle = '#dff0d8';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('WAREHOUSE', WAREHOUSE.x + WAREHOUSE.w / 2, WAREHOUSE.y + 24);

  const shown = Math.min(16, state.palletsSold % 200 === 0 && state.palletsSold > 0 ? 16 : Math.floor(state.palletsSold / 5) % 17);
  ctx.fillStyle = '#a97c50';
  for (let i = 0; i < shown; i++) {
    const col = i % 4;
    const row = Math.floor(i / 4);
    ctx.fillRect(WAREHOUSE.x + 24 + col * 26, WAREHOUSE.y + 55 + row * 20, 20, 14);
  }

  ctx.fillStyle = '#fff';
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText(`${state.palletsSold} sold`, WAREHOUSE.x + WAREHOUSE.w / 2, WAREHOUSE.y + WAREHOUSE.h - 16);
}

function drawGridPads(ctx, state, hoverCell) {
  for (let row = 0; row < GRID.rows; row++) {
    for (let col = 0; col < GRID.cols; col++) {
      const occupied = state.machines.some((m) => m.row === row && m.col === col);
      if (occupied) continue;
      const px = GRID.originX + col * (GRID.padW + GRID.gap);
      const py = GRID.originY + row * (GRID.padH + GRID.gap);
      const isHover = hoverCell && hoverCell.row === row && hoverCell.col === col;
      ctx.fillStyle = isHover ? '#4a5566' : PAD_EMPTY;
      ctx.strokeStyle = PAD_BORDER;
      ctx.lineWidth = 2;
      roundRect(ctx, px, py, GRID.padW, GRID.padH, 10);
      ctx.fill();
      ctx.stroke();
    }
  }
}

function drawMachine(ctx, m) {
  const w = GRID.padW - 20;
  const h = GRID.padH - 20;
  const x = m.x - w / 2;
  const y = m.y - h / 2;

  ctx.fillStyle = m.def.color;
  ctx.globalAlpha = m.staffed ? 1 : 0.55;
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.globalAlpha = 1;

  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 2;
  roundRect(ctx, x, y, w, h, 12);
  ctx.stroke();

  ctx.font = '26px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(m.def.icon, m.x, m.y - 5);

  // staffed indicator (top-left)
  ctx.beginPath();
  ctx.arc(x + 12, y + 12, 6, 0, Math.PI * 2);
  ctx.fillStyle = m.staffed ? '#4caf50' : '#e53935';
  ctx.fill();

  // product blueprint badge (top-right)
  ctx.beginPath();
  ctx.arc(x + w - 12, y + 12, 10, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(0,0,0,0.35)';
  ctx.fill();
  ctx.font = '13px sans-serif';
  ctx.fillStyle = '#fff';
  ctx.fillText(m.product ? m.product.icon : '?', x + w - 12, y + 16);

  if (m.staffed) drawOperator(ctx, x + 12, y + h - 10);

  // hopper bar
  const barW = w - 10;
  drawBar(ctx, x + 5, y + h - 18, barW, 6, m.hopperRatio, '#7fd66b', '#1b1b1b');
  // progress bar
  const progressRatio = m.product ? m.progress / m.product.cycleTime : 0;
  drawBar(ctx, x + 5, y + h - 10, barW, 5, progressRatio, '#ffd54f', '#1b1b1b');

  if (m.readyPallets > 0) {
    const full = m.readyPallets >= PALLET_CAPACITY;
    ctx.fillStyle = '#a97c50';
    for (let i = 0; i < m.readyPallets; i++) {
      ctx.fillRect(x + w - 18, y + h - 30 - i * 8, 14, 6);
    }
    ctx.fillStyle = full ? '#ff6b6b' : '#fff';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText(full ? 'FULL' : `x${m.readyPallets}`, x + w - 11, y + h - 40);
  }
}

function drawOperator(ctx, x, y) {
  const bob = Math.sin(Date.now() / 400) * 1.5;
  ctx.beginPath();
  ctx.fillStyle = '#f2c299';
  ctx.arc(x, y - 10 + bob, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#3a5f8a';
  ctx.fillRect(x - 5, y - 6 + bob, 10, 12);
  ctx.fillStyle = '#ffcc00';
  ctx.fillRect(x - 5, y - 8 + bob, 10, 3);
}

function drawBar(ctx, x, y, w, h, ratio, fg, bg) {
  ratio = Math.max(0, Math.min(1, ratio));
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = fg;
  ctx.fillRect(x, y, w * ratio, h);
}

function drawUtilityWorker(ctx, w) {
  const bob = w.state === 'idle' ? 0 : Math.sin(w.walkT / 80) * 2;
  ctx.beginPath();
  ctx.fillStyle = '#e08a3c';
  ctx.arc(w.x, w.y + bob, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a4a1f';
  ctx.lineWidth = 2;
  ctx.stroke();

  if (w.cargo > 0) {
    ctx.fillStyle = '#e8e05a';
    ctx.beginPath();
    ctx.arc(w.x, w.y - 14 + bob, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

// tier 0: on foot. tier 1: pushing a hand cart. tier 2: riding a towmotor.
function drawHauler(ctx, h, tier) {
  const bob = h.state === 'idle' && h.cargoCount === 0 ? 0 : Math.sin(h.walkT / 80) * 2;
  const y = h.y + bob;

  if (tier === 2) {
    ctx.fillStyle = '#f4c430';
    roundRect(ctx, h.x - 16, y - 10, 30, 18, 4);
    ctx.fill();
    ctx.strokeStyle = '#8a6d10';
    ctx.lineWidth = 2;
    roundRect(ctx, h.x - 16, y - 10, 30, 18, 4);
    ctx.stroke();
    // forks
    ctx.fillStyle = '#555';
    ctx.fillRect(h.x + 14, y - 2, 8, 3);
    ctx.fillRect(h.x + 14, y + 4, 8, 3);
    // wheels
    ctx.fillStyle = '#222';
    ctx.beginPath(); ctx.arc(h.x - 10, y + 10, 4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(h.x + 8, y + 10, 4, 0, Math.PI * 2); ctx.fill();
  } else if (tier === 1) {
    ctx.beginPath();
    ctx.fillStyle = '#e0b23c';
    ctx.arc(h.x - 6, y, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#8a6d10';
    roundRect(ctx, h.x + 2, y - 7, 16, 14, 3);
    ctx.fill();
  } else {
    ctx.fillStyle = '#f4c430';
    roundRect(ctx, h.x - 10, y - 8, 20, 16, 4);
    ctx.fill();
    ctx.strokeStyle = '#8a6d10';
    ctx.lineWidth = 2;
    roundRect(ctx, h.x - 10, y - 8, 20, 16, 4);
    ctx.stroke();
  }

  if (h.cargoCount > 0) {
    ctx.fillStyle = '#a97c50';
    for (let i = 0; i < h.cargoCount; i++) {
      ctx.fillRect(h.x - 8 + i * 10, y - 24, 8, 8);
    }
  }
}

function drawTutorialHighlight(ctx, state, hint) {
  if (!hint) return;
  const pulse = 0.5 + 0.5 * Math.sin(Date.now() / 220);
  ctx.save();
  ctx.strokeStyle = `rgba(244, 196, 48, ${0.5 + pulse * 0.5})`;
  ctx.lineWidth = 4;

  if (hint.type === 'pads') {
    for (let row = 0; row < GRID.rows; row++) {
      for (let col = 0; col < GRID.cols; col++) {
        const occupied = state.machines.some((m) => m.row === row && m.col === col);
        if (occupied) continue;
        const px = GRID.originX + col * (GRID.padW + GRID.gap);
        const py = GRID.originY + row * (GRID.padH + GRID.gap);
        roundRect(ctx, px - 3, py - 3, GRID.padW + 6, GRID.padH + 6, 12);
        ctx.stroke();
      }
    }
  } else if (hint.type === 'machine') {
    const m = state.machines.find((mm) => mm.id === hint.id);
    if (m) {
      const w = GRID.padW - 20;
      const hgt = GRID.padH - 20;
      roundRect(ctx, m.x - w / 2 - 4, m.y - hgt / 2 - 4, w + 8, hgt + 8, 14);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawToasts(ctx, state) {
  ctx.textAlign = 'center';
  ctx.font = 'bold 14px sans-serif';
  state.toasts.forEach((t, i) => {
    const alpha = 1 - t.t / 2000;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.fillText(t.text, CANVAS_W / 2, 40 + i * 18 - t.t / 40);
  });
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function machineAtPoint(state, x, y) {
  const half = (GRID.padW - 20) / 2;
  return state.machines.find((m) => Math.abs(x - m.x) <= half && Math.abs(y - m.y) <= half) || null;
}
