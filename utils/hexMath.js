// ---- HEX MATH UTILITIES ----
// Mathematical functions for hexagonal grid calculations and coordinate conversions

// Convert offset coordinates to cube coordinates for distance calculations
export function offsetToCube(col, row) {
  const q = col - (row - (row & 1)) / 2;
  return { q, r: row, s: -q - row };
}

// Calculate distance between two hexes using cube coordinates
export function cubeDistance(a, b) {
  return Math.max(Math.abs(a.q - b.q), Math.abs(a.r - b.r), Math.abs(a.s - b.s));
}

// Convert hex grid coordinates to pixel coordinates
export function hexToPixel(col, row, size) {
  return {
    x: Math.sqrt(3) * size * (col + 0.5 * (row & 1)),
    y: 2 * size * 0.75 * row
  };
}

// Convert pixel coordinates to hex grid coordinates
export function pixelToHex(px, py, size) {
  const w = Math.sqrt(3) * size, h = 2 * size;
  const row = Math.round(py / (h * 0.75)), col = Math.round((px / w) - 0.5 * (row & 1));
  let best = Infinity, bc = col, br = row;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      const c = hexToPixel(col + dc, row + dr, size);
      const d = Math.hypot(px - c.x, py - c.y);
      if (d < best) {
        best = d;
        bc = col + dc;
        br = row + dr;
      }
    }
  }
  return { col: bc, row: br };
}

// Get neighbor hex by edge index (pointy-top, odd-r offset)
// Edge 0=E, 1=SE, 2=SW, 3=W, 4=NW, 5=NE
export function hexNeighbor(col, row, edge) {
  const even = (row & 1) === 0;
  const dirs = even
    ? [[1,0],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1]]
    : [[1,0],[1,1],[0,1],[-1,0],[0,-1],[1,-1]];
  return { col: col + dirs[edge][0], row: row + dirs[edge][1] };
}

// Canonical edge key: deterministic string for the shared edge between a hex and its neighbor.
// Both sides produce the same key. Edge is 0-5 (E,SE,SW,W,NW,NE).
export function canonicalEdgeKey(col, row, edge) {
  const nb = hexNeighbor(col, row, edge);
  // Pick the "smaller" hex as canonical (by row, then col)
  if (row < nb.row || (row === nb.row && col < nb.col)) {
    return `${col},${row},${edge}`;
  }
  // Find the reverse edge (neighbor's edge that faces back to us)
  const reverseEdge = (edge + 3) % 6;
  return `${nb.col},${nb.row},${reverseEdge}`;
}

// Get which edge (0-5) of hex1 faces hex2, or -1 if not adjacent.
export function getEdgeBetween(col1, row1, col2, row2) {
  for (let e = 0; e < 6; e++) {
    const nb = hexNeighbor(col1, row1, e);
    if (nb.col === col2 && nb.row === row2) return e;
  }
  return -1;
}