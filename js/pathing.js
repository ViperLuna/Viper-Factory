// Workers should only ever walk the walkway gaps between machine plots,
// never straight-line through someone else's plot. The factory floor is a
// regular grid, so the gaps form a simple rectangular corridor network:
// a horizontal aisle running above each row, and a vertical aisle running
// beside each column (plus the margins next to the depot/warehouse).
//
// Any point on a row's aisle is reachable from any point on that same aisle
// without crossing a pad (it's literally the empty strip between rows), and
// likewise for a column's aisle - so routing is just: leave your current
// plot onto its own aisle corner, slide along one aisle to the target's
// aisle corner, then step onto the target's plot. That's the whole path.

import { GRID } from './config.js';

function colStart(col) {
  return GRID.originX + col * (GRID.padW + GRID.gap);
}

function rowStart(row) {
  return GRID.originY + row * (GRID.padH + GRID.gap);
}

function rowEntryY(row) {
  return rowStart(row) - GRID.gap / 2;
}

function colLeftX(col) {
  return colStart(col) - GRID.gap / 2;
}

function colRightX(col) {
  return colStart(col) + GRID.padW + GRID.gap / 2;
}

// side: 'left' (approaching from the depot side) or 'right' (warehouse side).
export function machineApproachPoints(machine, side) {
  return {
    colX: side === 'left' ? colLeftX(machine.col) : colRightX(machine.col),
    rowY: rowEntryY(machine.row),
    serviceX: machine.x,
    serviceY: machine.y + 45,
  };
}

export function doorApproachPoints(doorX, doorY, side) {
  return {
    colX: side === 'left' ? colLeftX(0) : colRightX(GRID.cols - 1),
    rowY: doorY,
    serviceX: doorX,
    serviceY: doorY,
  };
}

// Builds the waypoint queue (excluding the current position, which is
// implicitly wherever the walker already is) from one approach-point set
// to another, staying on aisle lines except for the final short step onto
// the destination's own plot.
//
// A machine's own row aisle is safe to travel along for its full width, so
// starting from a machine this can safely go horizontal-then-vertical. Use
// this for machine -> machine and machine -> door.
export function pathBetween(from, to) {
  return [
    { x: from.colX, y: from.rowY },
    { x: to.colX, y: from.rowY },
    { x: to.colX, y: to.rowY },
    { x: to.serviceX, y: to.serviceY },
  ];
}

// A door's own "row" is just its raw Y, not a real aisle - only its margin
// column is safe to travel the full height of. So starting from a door,
// route vertical-then-horizontal instead: up/down the margin first, then
// across the target's own row aisle. Use this for door -> machine.
export function pathFromDoor(from, to) {
  return [
    { x: from.colX, y: from.rowY },
    { x: from.colX, y: to.rowY },
    { x: to.colX, y: to.rowY },
    { x: to.serviceX, y: to.serviceY },
  ];
}
