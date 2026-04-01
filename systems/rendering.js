// Rendering System for Samhold
// Extracted from main game file for modular architecture

// Import dependencies
import { TERRAIN } from '../data/terrain.js';
import { BUILDINGS } from '../data/buildings.js';
import { UNIT_TYPES } from '../data/units.js';
import { THREAT_TYPES } from '../data/threats.js';
import * as CONSTANTS from '../data/constants.js';
import { hexToPixel, pixelToHex, hexNeighbor, offsetToCube, cubeDistance, canonicalEdgeKey } from '../utils/hexMath.js';
import { createRNG } from '../utils/random.js';
import { FORTIFICATIONS, WALL_INSET } from '../data/fortifications.js';

// Global variables that will be set by main game
let gameState = null;
let mapCanvas = null;
let mapCtx = null;
let canvas = null;
let ctx = null;
let canvasRect = null;
let mapDirty = true;
let minimapCanvas = null;
let minimapCtx = null;
let canvasW = 0;
let canvasH = 0;

// Dev panel variables for rendering control
let devShowRiverVertices = false;
let devHighlightRivers = new Set();
let fogOfWarDisabled = false;

// Initialize rendering system
function initRendering(gameStateRef, canvasElement, mapCanvasElement, minimapCanvasElement, canvasWidth, canvasHeight, canvasRectRef) {
  gameState = gameStateRef;
  canvas = canvasElement;
  ctx = canvas.getContext('2d');
  mapCanvas = mapCanvasElement;
  mapCtx = mapCanvas.getContext('2d');
  minimapCanvas = minimapCanvasElement;
  minimapCtx = minimapCanvas.getContext('2d');
  canvasRect = canvasRectRef || canvas.getBoundingClientRect(); // Use passed rect or fallback
  canvasW = canvasWidth;
  canvasH = canvasHeight;
}

// Function to update canvasRect when canvas is resized
function updateCanvasRect(canvasRectRef) {
  if (canvasRectRef) {
    canvasRect = canvasRectRef;
  } else if (canvas) {
    canvasRect = canvas.getBoundingClientRect();
  }
}

// ---- CORE CANVAS FUNCTIONS ----

function pageToCanvas(cx, cy) {
  return { x: cx - canvasRect.left, y: cy - canvasRect.top };
}

function drawHexPath(c, cx, cy, size) {
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 180) * (60 * i - 30);
    if (i === 0) c.moveTo(cx + size * Math.cos(a), cy + size * Math.sin(a));
    else c.lineTo(cx + size * Math.cos(a), cy + size * Math.sin(a));
  }
  c.closePath();
}

// ---- HEX RENDERING ----

function drawHexStatic(hex, size) {
  const wp = hexToPixel(hex.col, hex.row, size);
  const dx = wp.x + CONSTANTS.MAP_PAD, dy = wp.y + CONSTANTS.MAP_PAD;

  // 3-tier visibility: 0=unexplored, 1=revealed(dimmed), 2=visible(full)
  const vis = (gameState.visibilityMap && gameState.visibilityMap[hex.row])
    ? gameState.visibilityMap[hex.row][hex.col] : (hex.revealed ? 2 : 0);

  if (vis === 0) {
    drawHexPath(mapCtx, dx, dy, size);
    mapCtx.fillStyle = '#1a1610'; mapCtx.fill();
    drawHexPath(mapCtx, dx, dy, size);
    mapCtx.strokeStyle = '#2a2520'; mapCtx.lineWidth = 0.5; mapCtx.stroke();
    return;
  }

  // Terrain fill
  drawHexPath(mapCtx, dx, dy, size);
  mapCtx.fillStyle = hex.variation > 0.5 ? TERRAIN[hex.terrain].color : TERRAIN[hex.terrain].colorAlt;
  mapCtx.fill();

  drawTerrainDetail(mapCtx, hex, dx, dy, size);
  mapCtx.globalAlpha = 1.0;

  // Uniform thin hex borders
  drawHexPath(mapCtx, dx, dy, size);
  mapCtx.strokeStyle = 'rgba(0,0,0,0.15)';
  mapCtx.lineWidth = 1;
  mapCtx.stroke();

  // Building icon (drawn at full opacity)
  if (hex.building) {
    const bDef = BUILDINGS[hex.building];
    mapCtx.globalAlpha = 1.0;
    const fs = Math.max(14, size * 0.5);
    mapCtx.font = `${fs}px serif`;
    mapCtx.textAlign = 'center';
    mapCtx.textBaseline = 'middle';
    mapCtx.shadowColor = 'rgba(0,0,0,0.8)';
    mapCtx.shadowBlur = 4;
    mapCtx.fillStyle = '#ffffff';
    mapCtx.fillText(bDef.icon, dx, dy);
    mapCtx.shadowBlur = 0;

    // Construction progress indicator
    if (hex.buildProgress > 0) {
      mapCtx.globalAlpha = 1.0;
      mapCtx.font = `bold ${Math.max(10, size * 0.28)}px 'Nunito Sans', sans-serif`;
      mapCtx.shadowColor = 'rgba(0,0,0,0.9)';
      mapCtx.shadowBlur = 3;
      if (hex.workers > 0) {
        const turnsLeft = Math.ceil(hex.buildProgress / hex.workers);
        mapCtx.fillStyle = '#ffcc44';
        mapCtx.fillText(`🔨 ${turnsLeft}t`, dx, dy + size * 0.42);
      } else {
        mapCtx.fillStyle = '#cc8844';
        mapCtx.fillText(`⏸`, dx, dy + size * 0.42);
      }
      mapCtx.shadowBlur = 0;
    }
  }

  // Sacred site marker — golden inner glow, edges to center
  if (hex.building === 'sacred_site' && hex.buildProgress <= 0) {
    mapCtx.save();
    drawHexPath(mapCtx, dx, dy, size);
    mapCtx.clip();
    const grd = mapCtx.createRadialGradient(dx, dy, size * 0.25, dx, dy, size * 1.0);
    grd.addColorStop(0, 'rgba(220,185,60,0)');
    grd.addColorStop(0.6, 'rgba(220,185,60,0.18)');
    grd.addColorStop(1, 'rgba(255,210,80,0.55)');
    mapCtx.fillStyle = grd;
    mapCtx.fillRect(dx - size, dy - size, size * 2, size * 2);
    mapCtx.restore();
  }

  // Shrine marker — soft purple/violet inner glow
  if (hex.building === 'shrine' && hex.buildProgress <= 0) {
    mapCtx.save();
    drawHexPath(mapCtx, dx, dy, size);
    mapCtx.clip();
    const grd = mapCtx.createRadialGradient(dx, dy, size * 0.2, dx, dy, size * 1.0);
    grd.addColorStop(0, 'rgba(160,100,200,0)');
    grd.addColorStop(0.5, 'rgba(160,100,200,0.15)');
    grd.addColorStop(1, 'rgba(180,120,220,0.45)');
    mapCtx.fillStyle = grd;
    mapCtx.fillRect(dx - size, dy - size, size * 2, size * 2);
    mapCtx.restore();
  }

  // Monument marker — active: stone-grey glow with golden center; neglected: dull red crack pattern
  if (hex.building === 'monument' && hex.buildProgress <= 0) {
    mapCtx.save();
    drawHexPath(mapCtx, dx, dy, size);
    mapCtx.clip();
    if (hex.monumentState === 'neglected') {
      // Neglected: muted reddish-grey, no warmth
      const grd = mapCtx.createRadialGradient(dx, dy, size * 0.1, dx, dy, size * 0.9);
      grd.addColorStop(0, 'rgba(120,80,70,0.25)');
      grd.addColorStop(0.5, 'rgba(100,70,60,0.15)');
      grd.addColorStop(1, 'rgba(80,55,50,0.35)');
      mapCtx.fillStyle = grd;
      mapCtx.fillRect(dx - size, dy - size, size * 2, size * 2);
      // Small crack indicator — a dim X at center
      mapCtx.globalAlpha = 0.35;
      mapCtx.strokeStyle = '#8a6055';
      mapCtx.lineWidth = 1.5;
      mapCtx.beginPath();
      mapCtx.moveTo(dx - size * 0.15, dy - size * 0.15);
      mapCtx.lineTo(dx + size * 0.15, dy + size * 0.15);
      mapCtx.moveTo(dx + size * 0.15, dy - size * 0.15);
      mapCtx.lineTo(dx - size * 0.15, dy + size * 0.15);
      mapCtx.stroke();
      mapCtx.globalAlpha = 1.0;
    } else {
      // Active: warm stone glow
      const grd = mapCtx.createRadialGradient(dx, dy, size * 0.15, dx, dy, size * 0.9);
      grd.addColorStop(0, 'rgba(255,215,80,0.35)');
      grd.addColorStop(0.4, 'rgba(180,170,155,0.2)');
      grd.addColorStop(1, 'rgba(140,135,125,0.4)');
      mapCtx.fillStyle = grd;
      mapCtx.fillRect(dx - size, dy - size, size * 2, size * 2);
    }
    mapCtx.restore();
  }

  // Meeting Hall marker — blue-green civic glow
  if (hex.building === 'meeting_hall' && hex.buildProgress <= 0) {
    mapCtx.save();
    drawHexPath(mapCtx, dx, dy, size);
    mapCtx.clip();
    const grd = mapCtx.createRadialGradient(dx, dy, size * 0.2, dx, dy, size * 1.0);
    grd.addColorStop(0, 'rgba(60,160,140,0)');
    grd.addColorStop(0.5, 'rgba(60,160,140,0.15)');
    grd.addColorStop(1, 'rgba(80,180,160,0.45)');
    mapCtx.fillStyle = grd;
    mapCtx.fillRect(dx - size, dy - size, size * 2, size * 2);
    mapCtx.restore();
  }

  // Watchtower marker — amber/orange utilitarian glow
  if (hex.building === 'watchtower' && hex.buildProgress <= 0) {
    mapCtx.save();
    drawHexPath(mapCtx, dx, dy, size);
    mapCtx.clip();
    const grd = mapCtx.createRadialGradient(dx, dy, size * 0.15, dx, dy, size * 0.85);
    grd.addColorStop(0, 'rgba(220,160,40,0)');
    grd.addColorStop(0.5, 'rgba(220,160,40,0.12)');
    grd.addColorStop(1, 'rgba(200,140,30,0.35)');
    mapCtx.fillStyle = grd;
    mapCtx.fillRect(dx - size, dy - size, size * 2, size * 2);
    mapCtx.restore();
  }

  // Market marker — light yellow-green commercial glow
  if (hex.building === 'market' && hex.buildProgress <= 0) {
    mapCtx.save();
    drawHexPath(mapCtx, dx, dy, size);
    mapCtx.clip();
    const grd = mapCtx.createRadialGradient(dx, dy, size * 0.2, dx, dy, size * 1.0);
    grd.addColorStop(0, 'rgba(180,200,60,0)');
    grd.addColorStop(0.5, 'rgba(180,200,60,0.15)');
    grd.addColorStop(1, 'rgba(160,190,50,0.40)');
    mapCtx.fillStyle = grd;
    mapCtx.fillRect(dx - size, dy - size, size * 2, size * 2);
    mapCtx.restore();
  }

  // Festival Grounds marker — warm amber/festive glow
  if (hex.building === 'festival_grounds' && hex.buildProgress <= 0) {
    mapCtx.save();
    drawHexPath(mapCtx, dx, dy, size);
    mapCtx.clip();
    const grd = mapCtx.createRadialGradient(dx, dy, size * 0.2, dx, dy, size * 1.0);
    grd.addColorStop(0, 'rgba(240,180,60,0)');
    grd.addColorStop(0.5, 'rgba(240,180,60,0.18)');
    grd.addColorStop(1, 'rgba(220,140,40,0.45)');
    mapCtx.fillStyle = grd;
    mapCtx.fillRect(dx - size, dy - size, size * 2, size * 2);
    mapCtx.restore();
  }

  // Named terrain feature label is drawn in screen-space in drawFeatureLabels()
  // so that font size stays legible regardless of zoom level.

  // Worker indicator (dots below center)
  if (hex.workers > 0) {
    mapCtx.globalAlpha = 1.0;
    const dotR = Math.max(2.5, size * 0.06);
    const dotY = dy + size * (hex.building ? 0.48 : 0.2);
    const totalW = (hex.workers - 1) * dotR * 3;
    for (let i = 0; i < hex.workers; i++) {
      const dotX = dx - totalW / 2 + i * dotR * 3;
      mapCtx.beginPath();
      mapCtx.arc(dotX, dotY, dotR, 0, Math.PI * 2);
      mapCtx.fillStyle = '#e8d080';
      mapCtx.shadowColor = 'rgba(0,0,0,0.8)';
      mapCtx.shadowBlur = 2;
      mapCtx.fill();
    }
    mapCtx.shadowBlur = 0;

    // For gatherers on unimproved hex, show a small gather icon
    if (!hex.building) {
      const gs = Math.max(10, size * 0.35);
      mapCtx.font = `${gs}px serif`;
      mapCtx.textAlign = 'center';
      mapCtx.textBaseline = 'middle';
      mapCtx.shadowColor = 'rgba(0,0,0,0.7)';
      mapCtx.shadowBlur = 3;
      mapCtx.fillStyle = '#ffffff';
      mapCtx.fillText('👤', dx, dy - size * 0.1);
      mapCtx.shadowBlur = 0;
    }
  }

  // Revealed-but-not-visible overlay (state 1): dark semi-transparent wash
  if (vis === 1) {
    drawHexPath(mapCtx, dx, dy, size);
    mapCtx.fillStyle = 'rgba(15,13,10,0.45)';
    mapCtx.fill();
  }
}

// ---- TERRAIN DETAIL RENDERING ----

function drawTerrainDetail(c, hex, cx, cy, size) {
  const rng = createRNG(hex.col * 1000 + hex.row), s = size * 0.3;
  c.save();
  c.globalAlpha = 0.3;
  switch (hex.terrain) {
    case 'forest': for(let i=0;i<6;i++){const ox=(rng()-0.5)*size*1.1,oy=(rng()-0.5)*size*1.1;c.beginPath();c.arc(cx+ox,cy+oy,s*(0.25+rng()*0.35),0,Math.PI*2);c.fillStyle='#1a4a18';c.fill();}break;
    case 'hills': for(let i=0;i<3;i++){const ox=(rng()-0.5)*size*0.8,oy=(rng()-0.3)*size*0.6;c.beginPath();c.arc(cx+ox,cy+oy,s*0.7,Math.PI,0);c.strokeStyle='#5a4a30';c.lineWidth=2;c.stroke();}break;
    case 'mountain': for(let i=0;i<2;i++){const ox=(rng()-0.5)*size*0.6,oy=rng()*size*0.3;c.beginPath();c.moveTo(cx+ox-s*0.6,cy+oy+s*0.3);c.lineTo(cx+ox,cy+oy-s*0.6);c.lineTo(cx+ox+s*0.6,cy+oy+s*0.3);c.closePath();c.fillStyle='#888';c.fill();c.beginPath();c.moveTo(cx+ox-s*0.18,cy+oy-s*0.25);c.lineTo(cx+ox,cy+oy-s*0.6);c.lineTo(cx+ox+s*0.18,cy+oy-s*0.25);c.closePath();c.fillStyle='#ddd';c.fill();}break;
    case 'desert': for(let i=0;i<8;i++){c.beginPath();c.arc(cx+(rng()-0.5)*size,cy+(rng()-0.5)*size,1.5,0,Math.PI*2);c.fillStyle='#a08830';c.fill();}break;
    case 'wetland': for(let i=0;i<5;i++){const ox=(rng()-0.5)*size*0.8,oy=(rng()-0.5)*size*0.8;c.beginPath();c.moveTo(cx+ox,cy+oy);c.lineTo(cx+ox+(rng()-0.5)*3,cy+oy-s*0.8);c.strokeStyle='#3a5a30';c.lineWidth=1.5;c.stroke();}break;
    case 'coast': for(let i=0;i<3;i++){const oy=(rng()-0.5)*size*0.5;c.beginPath();c.moveTo(cx-size*0.4,cy+oy);c.quadraticCurveTo(cx,cy+oy-5,cx+size*0.4,cy+oy);c.strokeStyle='#88ccee';c.lineWidth=1;c.stroke();}break;
    case 'ocean': for(let i=0;i<4;i++){const oy=(rng()-0.5)*size*0.6;c.beginPath();c.moveTo(cx-size*0.35,cy+oy);c.quadraticCurveTo(cx,cy+oy-4,cx+size*0.35,cy+oy);c.strokeStyle='#4a80b0';c.lineWidth=1.2;c.stroke();}break;
    case 'lake': c.beginPath();c.arc(cx,cy,size*0.45,0,Math.PI*2);c.fillStyle='#3a70a0';c.fill();for(let i=0;i<2;i++){const oy=(rng()-0.5)*size*0.3;c.beginPath();c.moveTo(cx-size*0.25,cy+oy);c.quadraticCurveTo(cx,cy+oy-3,cx+size*0.25,cy+oy);c.strokeStyle='#6abade';c.lineWidth=1;c.stroke();}break;
    case 'lake': for(let i=0;i<2;i++){const oy=(rng()-0.5)*size*0.3;c.beginPath();c.moveTo(cx-size*0.3,cy+oy);c.quadraticCurveTo(cx,cy+oy-4,cx+size*0.3,cy+oy);c.strokeStyle='#6abccc';c.lineWidth=1.5;c.stroke();}c.beginPath();c.arc(cx,cy+size*0.15,size*0.08,0,Math.PI*2);c.fillStyle='#6abccc';c.fill();break;
  }
  c.restore(); // always restores globalAlpha to 1.0 regardless of which case ran
}

// ---- MAP RENDERING TO CACHE ----

function renderMapToCache() {
  mapCtx.clearRect(0, 0, mapCanvas.width, mapCanvas.height);

  // Pass 1: Draw all hex terrain, details, icons, thin borders
  for (let r = 0; r < CONSTANTS.MAP_ROWS; r++) for (let c = 0; c < CONSTANTS.MAP_COLS; c++)
    drawHexStatic(gameState.map[r][c], CONSTANTS.HEX_SIZE);

  // Pass 1.5: Rivers — draw segment by segment with variable width for tributaries
  const segCounts = gameState.riverSegmentCounts || new Map();
  function _segKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }

  // River colors for highlighting individual rivers
  const RIVER_COLORS = ['#3a8cc8','#c83a6e','#3ac878','#c8a03a','#8a3ac8','#3ac8c8','#c85a3a','#6e8ac8'];

  for (const river of gameState.rivers) {
    if (river.path.length < 2) continue;
    const pts = river.path;

    // If any rivers are highlighted, dim non-highlighted ones
    const anyHighlighted = devHighlightRivers.size > 0;
    const isHighlighted = !anyHighlighted || devHighlightRivers.has(river.id);
    const baseColor = anyHighlighted ? RIVER_COLORS[river.id % RIVER_COLORS.length] : '#3a8cc8';
    const alpha = isHighlighted ? 1.0 : 0.15;

    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i], p1 = pts[i + 1];

      // Fog of war: a segment is visible only if at least one of the 2 hexes
      // that border it is revealed. River vertices sit exactly at hex corners,
      // equidistant from 3 hex centers, so pixelToHex is ambiguous there.
      // Instead, find the hexes adjacent to BOTH endpoints — those are the 2
      // hexes sharing the edge the segment lies on.
      if (!fogOfWarDisabled) {
        const size = CONSTANTS.HEX_SIZE;
        const cols = CONSTANTS.MAP_COLS, rows = CONSTANTS.MAP_ROWS;
        const threshold = size * 1.1;

        const nearKeys = (vx, vy) => {
          const h = pixelToHex(vx, vy, size);
          const keys = [];
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              const c = h.col + dc, r = h.row + dr;
              if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
              const hp = hexToPixel(c, r, size);
              if (Math.hypot(vx - hp.x, vy - hp.y) <= threshold) keys.push(c * 10000 + r);
            }
          }
          return keys;
        };

        const near0 = nearKeys(p0.x, p0.y);
        const near1Set = new Set(nearKeys(p1.x, p1.y));

        let visible = false;
        for (const key of near0) {
          if (near1Set.has(key)) {
            const c = Math.floor(key / 10000), r = key % 10000;
            // Use visibilityMap >= 1 (revealed or visible) if available, else fallback to hex.revealed
            const vm = gameState.visibilityMap?.[r]?.[c];
            if (vm != null ? vm >= 1 : gameState.map[r][c].revealed) { visible = true; break; }
          }
        }
        if (!visible) continue;
      }

      const sk = (p0.key && p1.key) ? _segKey(p0.key, p1.key) : null;
      const count = sk ? (segCounts.get(sk) || 1) : 1;
      const coreW = 4.5 + (count - 1) * 3.5;
      const glowW = coreW + 6;

      // Glow
      mapCtx.globalAlpha = alpha * 0.3;
      mapCtx.strokeStyle = anyHighlighted ? baseColor : 'rgba(50,130,200,1)';
      mapCtx.lineWidth = glowW;
      mapCtx.lineCap = 'round';
      mapCtx.beginPath();
      mapCtx.moveTo(p0.x + CONSTANTS.MAP_PAD, p0.y + CONSTANTS.MAP_PAD);
      mapCtx.lineTo(p1.x + CONSTANTS.MAP_PAD, p1.y + CONSTANTS.MAP_PAD);
      mapCtx.stroke();

      // Core
      mapCtx.globalAlpha = alpha;
      mapCtx.strokeStyle = baseColor;
      mapCtx.lineWidth = coreW;
      mapCtx.beginPath();
      mapCtx.moveTo(p0.x + CONSTANTS.MAP_PAD, p0.y + CONSTANTS.MAP_PAD);
      mapCtx.lineTo(p1.x + CONSTANTS.MAP_PAD, p1.y + CONSTANTS.MAP_PAD);
      mapCtx.stroke();
    }
  }
  mapCtx.globalAlpha = 1.0;

  // River vertex debug markers
  if (devShowRiverVertices) {
    for (const river of gameState.rivers) {
      if (devHighlightRivers.size > 0 && !devHighlightRivers.has(river.id)) continue;

      // Show degenerate (0-segment) rivers as a distinct red X so they are visible
      if (river.path.length < 2) {
        const src = river.path[0];
        if (!src) continue;
        const sx = src.x + CONSTANTS.MAP_PAD, sy = src.y + CONSTANTS.MAP_PAD;
        mapCtx.strokeStyle = '#ff0000';
        mapCtx.lineWidth = 3;
        mapCtx.beginPath();
        mapCtx.moveTo(sx - 7, sy - 7); mapCtx.lineTo(sx + 7, sy + 7);
        mapCtx.moveTo(sx + 7, sy - 7); mapCtx.lineTo(sx - 7, sy + 7);
        mapCtx.stroke();
        continue;
      }

      const src = river.path[0];
      const end = river.path[river.path.length - 1];

      // Source: green diamond
      mapCtx.fillStyle = '#00ff44';
      mapCtx.strokeStyle = '#004400';
      mapCtx.lineWidth = 2;
      mapCtx.beginPath();
      const sx = src.x + CONSTANTS.MAP_PAD, sy = src.y + CONSTANTS.MAP_PAD;
      mapCtx.moveTo(sx, sy - 8); mapCtx.lineTo(sx + 6, sy);
      mapCtx.lineTo(sx, sy + 8); mapCtx.lineTo(sx - 6, sy); mapCtx.closePath();
      mapCtx.fill(); mapCtx.stroke();

      // Terminus: color by type
      const termColors = { coast: '#ff4444', lake: '#4488ff', merge: '#ffcc00', edge: '#ff8800', none: '#888888' };
      const tc = termColors[river.terminusType] || '#888888';
      const ex = end.x + CONSTANTS.MAP_PAD, ey = end.y + CONSTANTS.MAP_PAD;
      mapCtx.fillStyle = tc;
      mapCtx.strokeStyle = '#000000';
      mapCtx.lineWidth = 2;
      if (river.terminusType === 'merge') {
        // Merge: triangle
        mapCtx.beginPath();
        mapCtx.moveTo(ex, ey - 8); mapCtx.lineTo(ex + 7, ey + 5);
        mapCtx.lineTo(ex - 7, ey + 5); mapCtx.closePath();
        mapCtx.fill(); mapCtx.stroke();
      } else {
        // Others: circle
        mapCtx.beginPath();
        mapCtx.arc(ex, ey, 6, 0, Math.PI * 2);
        mapCtx.fill(); mapCtx.stroke();
      }

      // River ID label
      mapCtx.fillStyle = '#ffffff';
      mapCtx.strokeStyle = '#000000';
      mapCtx.lineWidth = 3;
      mapCtx.font = 'bold 12px monospace';
      mapCtx.textAlign = 'center';
      mapCtx.strokeText(`R${river.id}`, sx, sy - 14);
      mapCtx.fillText(`R${river.id}`, sx, sy - 14);
    }
  }

  // Pass 1.75: Region color overlay (when region view toggle is active)
  if (window.regionViewVisible && gameState.culture?.namedRegions?.length > 0) {
    for (const region of gameState.culture.namedRegions) {
      const color = window.getRegionColor ? window.getRegionColor(region.id) : '#c8a03a';
      // Parse hex color and apply as rgba
      const r2 = parseInt(color.slice(1, 3), 16);
      const g2 = parseInt(color.slice(3, 5), 16);
      const b2 = parseInt(color.slice(5, 7), 16);

      for (const key of region.hexes) {
        const [hc, hr] = key.split(',').map(Number);
        const hex = gameState.map[hr]?.[hc];
        if (!hex || !hex.revealed) continue;

        const wp = hexToPixel(hc, hr, CONSTANTS.HEX_SIZE);
        const dx = wp.x + CONSTANTS.MAP_PAD, dy = wp.y + CONSTANTS.MAP_PAD;

        mapCtx.save();
        drawHexPath(mapCtx, dx, dy, CONSTANTS.HEX_SIZE);
        mapCtx.clip();
        mapCtx.fillStyle = `rgba(${r2},${g2},${b2},0.2)`;
        mapCtx.fillRect(dx - CONSTANTS.HEX_SIZE, dy - CONSTANTS.HEX_SIZE, CONSTANTS.HEX_SIZE * 2, CONSTANTS.HEX_SIZE * 2);
        mapCtx.restore();
      }

      // Draw region border edges
      mapCtx.save();
      mapCtx.strokeStyle = `rgba(${r2},${g2},${b2},0.6)`;
      mapCtx.lineWidth = 2.5;
      mapCtx.lineCap = 'round';
      mapCtx.lineJoin = 'round';
      const regionSet = new Set(region.hexes);
      mapCtx.beginPath();
      for (const key of region.hexes) {
        const [hc, hr] = key.split(',').map(Number);
        const hex = gameState.map[hr]?.[hc];
        if (!hex || !hex.revealed) continue;
        const wp = hexToPixel(hc, hr, CONSTANTS.HEX_SIZE);
        const dx = wp.x + CONSTANTS.MAP_PAD, dy = wp.y + CONSTANTS.MAP_PAD;

        for (let i = 0; i < 6; i++) {
          const nb = hexNeighbor(hc, hr, i);
          if (regionSet.has(`${nb.col},${nb.row}`)) continue;
          const a0 = (Math.PI / 180) * (60 * i - 30);
          const a1 = (Math.PI / 180) * (60 * ((i + 1) % 6) - 30);
          mapCtx.moveTo(dx + CONSTANTS.HEX_SIZE * Math.cos(a0), dy + CONSTANTS.HEX_SIZE * Math.sin(a0));
          mapCtx.lineTo(dx + CONSTANTS.HEX_SIZE * Math.cos(a1), dy + CONSTANTS.HEX_SIZE * Math.sin(a1));
        }
      }
      mapCtx.stroke();
      mapCtx.restore();
    }
  }

  // Pass 2: Territory vignette — gradient only from boundary edges inward
  for (let r = 0; r < CONSTANTS.MAP_ROWS; r++) for (let c = 0; c < CONSTANTS.MAP_COLS; c++) {
    if (!window.isInTerritory(c, r) || !gameState.map[r][c].revealed) continue;
    const wp = hexToPixel(c, r, CONSTANTS.HEX_SIZE);
    const dx = wp.x + CONSTANTS.MAP_PAD, dy = wp.y + CONSTANTS.MAP_PAD;

    // Find which edges are boundary edges
    let hasBoundary = false;
    for (let i = 0; i < 6; i++) {
      const nb = hexNeighbor(c, r, i);
      const nbIn = (nb.col >= 0 && nb.col < CONSTANTS.MAP_COLS && nb.row >= 0 && nb.row < CONSTANTS.MAP_ROWS)
        ? window.isInTerritory(nb.col, nb.row) : false;
      if (!nbIn) { hasBoundary = true; break; }
    }
    if (!hasBoundary) continue; // fully interior hex, no vignette

    mapCtx.save();
    drawHexPath(mapCtx, dx, dy, CONSTANTS.HEX_SIZE);
    mapCtx.clip();

    for (let i = 0; i < 6; i++) {
      const nb = hexNeighbor(c, r, i);
      const nbIn = (nb.col >= 0 && nb.col < CONSTANTS.MAP_COLS && nb.row >= 0 && nb.row < CONSTANTS.MAP_ROWS)
        ? window.isInTerritory(nb.col, nb.row) : false;
      if (nbIn) continue; // not a boundary edge

      // Edge vertices
      const a0 = (Math.PI / 180) * (60 * i - 30);
      const a1 = (Math.PI / 180) * (60 * ((i + 1) % 6) - 30);
      const ex = (Math.cos(a0) + Math.cos(a1)) / 2;
      const ey = (Math.sin(a0) + Math.sin(a1)) / 2;

      // Gradient from edge midpoint toward center
      const edgeX = dx + CONSTANTS.HEX_SIZE * ex;
      const edgeY = dy + CONSTANTS.HEX_SIZE * ey;
      const grad = mapCtx.createLinearGradient(edgeX, edgeY, dx, dy);
      grad.addColorStop(0, 'rgba(160,130,30,0.4)');
      grad.addColorStop(0.4, 'rgba(180,150,50,0.12)');
      grad.addColorStop(0.8, 'rgba(201,168,76,0)');
      mapCtx.fillStyle = grad;
      mapCtx.fillRect(dx - CONSTANTS.HEX_SIZE, dy - CONSTANTS.HEX_SIZE, CONSTANTS.HEX_SIZE * 2, CONSTANTS.HEX_SIZE * 2);
    }
    mapCtx.restore();
  }

  // Pass 3: Territory outer border — single clean pass, drawn once per edge
  const drawnEdges = new Set();
  mapCtx.strokeStyle = 'rgba(190,155,40,0.9)';
  mapCtx.lineWidth = 3.5;
  mapCtx.lineCap = 'round';
  mapCtx.lineJoin = 'round';
  mapCtx.beginPath();

  for (let r = 0; r < CONSTANTS.MAP_ROWS; r++) for (let c = 0; c < CONSTANTS.MAP_COLS; c++) {
    if (!window.isInTerritory(c, r)) continue;
    const wp = hexToPixel(c, r, CONSTANTS.HEX_SIZE);
    const dx = wp.x + CONSTANTS.MAP_PAD, dy = wp.y + CONSTANTS.MAP_PAD;

    for (let i = 0; i < 6; i++) {
      const nb = hexNeighbor(c, r, i);
      const nbIn = (nb.col >= 0 && nb.col < CONSTANTS.MAP_COLS && nb.row >= 0 && nb.row < CONSTANTS.MAP_ROWS)
        ? window.isInTerritory(nb.col, nb.row) : false;
      if (nbIn) continue;

      // Deduplicate: each edge drawn once
      const eKey = `${c},${r},${i}`;
      if (drawnEdges.has(eKey)) continue;
      drawnEdges.add(eKey);

      const a0 = (Math.PI / 180) * (60 * i - 30);
      const a1 = (Math.PI / 180) * (60 * ((i + 1) % 6) - 30);
      mapCtx.moveTo(dx + CONSTANTS.HEX_SIZE * Math.cos(a0), dy + CONSTANTS.HEX_SIZE * Math.sin(a0));
      mapCtx.lineTo(dx + CONSTANTS.HEX_SIZE * Math.cos(a1), dy + CONSTANTS.HEX_SIZE * Math.sin(a1));
    }
  }
  mapCtx.stroke();

  // Pass 4: Fortification rendering — drawn inset from hex edge to avoid clashing with territory borders
  if (gameState.fortifications) {
    // vertexEndpoints: ideal_vertex_key -> [{x, y, fortKey, def, alpha}]
    // Used in the gap-closer pass after all segments are drawn.
    const vertexEndpoints = new Map();

    for (const [key, fort] of Object.entries(gameState.fortifications)) {
      const parts = key.split(',');
      const fc = parseInt(parts[0]), fr = parseInt(parts[1]), fe = parseInt(parts[2]);

      // Skip if not at least revealed — check owner hex visibility
      const visCol = fort.ownerCol ?? fc, visRow = fort.ownerRow ?? fr;
      const fVis = gameState.visibilityMap?.[visRow]?.[visCol];
      if (fVis != null ? fVis < 1 : !gameState.map[visRow]?.[visCol]?.revealed) continue;

      const def = FORTIFICATIONS[fort.type];
      if (!def) continue;

      // Use owner hex for inset direction so wall always appears inside the owning hex.
      // If no owner stored (old data), fall back to canonical hex.
      const renderCol = fort.ownerCol ?? fc;
      const renderRow = fort.ownerRow ?? fr;
      const isOwnerCanonical = (renderCol === fc && renderRow === fr);
      const renderEdge = isOwnerCanonical ? fe : (fe + 3) % 6;

      const wp = hexToPixel(renderCol, renderRow, CONSTANTS.HEX_SIZE);
      const cx = wp.x + CONSTANTS.MAP_PAD, cy = wp.y + CONSTANTS.MAP_PAD;

      // Compute inset edge corners
      const a0 = (Math.PI / 180) * (60 * renderEdge - 30);
      const a1 = (Math.PI / 180) * (60 * ((renderEdge + 1) % 6) - 30);
      const inset = WALL_INSET;
      const x0 = cx + CONSTANTS.HEX_SIZE * inset * Math.cos(a0);
      const y0 = cy + CONSTANTS.HEX_SIZE * inset * Math.sin(a0);
      const x1 = cx + CONSTANTS.HEX_SIZE * inset * Math.cos(a1);
      const y1 = cy + CONSTANTS.HEX_SIZE * inset * Math.sin(a1);

      // Opacity: under construction = dashed 50%, revealed-not-visible = 50%, else full
      let alpha = 1.0;
      if (fort.buildProgress > 0) alpha = 0.5;
      else if (fVis === 1) alpha = 0.5;

      mapCtx.save();
      mapCtx.globalAlpha = alpha;
      mapCtx.strokeStyle = def.color;
      mapCtx.lineWidth = def.lineWidth;
      mapCtx.lineCap = 'round';

      if (fort.buildProgress > 0) {
        mapCtx.setLineDash([6, 4]);
      }

      if (fort.type === 'gate' && def.gapRatio) {
        // Gate: two segments with a gap in the middle
        const gap = def.gapRatio;
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        const dx = (x1 - x0) * gap / 2, dy2 = (y1 - y0) * gap / 2;

        // Left segment
        mapCtx.beginPath();
        mapCtx.moveTo(x0, y0);
        mapCtx.lineTo(mx - dx, my - dy2);
        mapCtx.stroke();

        // Right segment
        mapCtx.beginPath();
        mapCtx.moveTo(mx + dx, my + dy2);
        mapCtx.lineTo(x1, y1);
        mapCtx.stroke();

        // Gate posts (small circles at gap ends)
        mapCtx.fillStyle = def.color;
        mapCtx.beginPath();
        mapCtx.arc(mx - dx, my - dy2, def.lineWidth * 0.6, 0, Math.PI * 2);
        mapCtx.fill();
        mapCtx.beginPath();
        mapCtx.arc(mx + dx, my + dy2, def.lineWidth * 0.6, 0, Math.PI * 2);
        mapCtx.fill();
      } else {
        // Palisade or Wall: solid line
        mapCtx.beginPath();
        mapCtx.moveTo(x0, y0);
        mapCtx.lineTo(x1, y1);
        mapCtx.stroke();
      }

      mapCtx.setLineDash([]);

      // Health bar if damaged and completed
      if (fort.buildProgress <= 0 && fort.health < fort.maxHealth) {
        const mx = (x0 + x1) / 2, my = (y0 + y1) / 2;
        const barW = 16, barH = 3;
        mapCtx.globalAlpha = 0.9;
        mapCtx.fillStyle = '#400000';
        mapCtx.fillRect(mx - barW / 2, my - barH / 2 - 4, barW, barH);
        const hp = fort.health / fort.maxHealth;
        mapCtx.fillStyle = hp > 0.5 ? '#5a8a4a' : hp > 0.25 ? '#c9a84c' : '#a94442';
        mapCtx.fillRect(mx - barW / 2, my - barH / 2 - 4, barW * hp, barH);
      }

      mapCtx.restore();

      // Register endpoints for gap-closing (skip gates and in-construction forts).
      // Key is the IDEAL (full-radius) vertex position — both hexes sharing a vertex
      // produce the same ideal coordinate, so they bucket together reliably.
      if (fort.type !== 'gate' && fort.buildProgress <= 0) {
        const R = CONSTANTS.HEX_SIZE;
        const ix0 = Math.round(cx + R * Math.cos(a0));
        const iy0 = Math.round(cy + R * Math.sin(a0));
        const ix1 = Math.round(cx + R * Math.cos(a1));
        const iy1 = Math.round(cy + R * Math.sin(a1));

        for (const [ik, ax, ay] of [[`${ix0},${iy0}`, x0, y0], [`${ix1},${iy1}`, x1, y1]]) {
          if (!vertexEndpoints.has(ik)) vertexEndpoints.set(ik, []);
          vertexEndpoints.get(ik).push({ x: ax, y: ay, key, def, alpha });
        }
      }
    }

    // Gap-closer pass: for each shared vertex where two different forts almost meet,
    // draw a short connector segment between their inset endpoints.
    for (const endpoints of vertexEndpoints.values()) {
      if (endpoints.length < 2) continue;
      for (let i = 0; i < endpoints.length; i++) {
        for (let j = i + 1; j < endpoints.length; j++) {
          if (endpoints[i].key === endpoints[j].key) continue; // same fort, skip
          const ep1 = endpoints[i], ep2 = endpoints[j];
          mapCtx.save();
          mapCtx.globalAlpha = Math.min(ep1.alpha, ep2.alpha);
          mapCtx.strokeStyle = ep1.def.color;
          mapCtx.lineWidth = Math.min(ep1.def.lineWidth, ep2.def.lineWidth);
          mapCtx.lineCap = 'round';
          mapCtx.beginPath();
          mapCtx.moveTo(ep1.x, ep1.y);
          mapCtx.lineTo(ep2.x, ep2.y);
          mapCtx.stroke();
          mapCtx.restore();
        }
      }
    }
  }

  mapDirty = false;
}

// ---- FEATURE LABELS (screen-space, fixed font size) ----

// Returns the world-space midpoint of the revealed portion of a river,
// using the same vertex-proximity fog-of-war check as the river renderer.
function getRiverRevealedMidpoint(river) {
  const pts = river.path;
  if (pts.length < 2) return null;
  const size = CONSTANTS.HEX_SIZE;
  const threshold = size * 1.1;
  const cols = CONSTANTS.MAP_COLS, rows = CONSTANTS.MAP_ROWS;

  const nearHexKeys = (vx, vy) => {
    const h = pixelToHex(vx, vy, size);
    const keys = [];
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        const c = h.col + dc, r = h.row + dr;
        if (c < 0 || c >= cols || r < 0 || r >= rows) continue;
        const hp = hexToPixel(c, r, size);
        if (Math.hypot(vx - hp.x, vy - hp.y) <= threshold) keys.push(c * 10000 + r);
      }
    }
    return keys;
  };

  const revealedSegIdx = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i], p1 = pts[i + 1];
    const near0 = nearHexKeys(p0.x, p0.y);
    const near1Set = new Set(nearHexKeys(p1.x, p1.y));
    let visible = false;
    for (const key of near0) {
      if (near1Set.has(key)) {
        const c = Math.floor(key / 10000), r = key % 10000;
        if (gameState.map[r]?.[c]?.revealed) { visible = true; break; }
      }
    }
    if (visible) revealedSegIdx.push(i);
  }

  if (revealedSegIdx.length === 0) return null;
  const midIdx = revealedSegIdx[Math.floor(revealedSegIdx.length / 2)];
  const p0 = pts[midIdx], p1 = pts[midIdx + 1];
  return { x: (p0.x + p1.x) / 2, y: (p0.y + p1.y) / 2 };
}

// Updates the HTML overlay with feature labels positioned over the canvas.
// Using HTML elements instead of canvas text avoids Chrome GPU crashes that occur
// when Canvas 2D web-font rendering and CSS compositor layers interact.
// Cache key prevents 60fps DOM churn: only update when camera or features change.
let _featureLabelCacheKey = null;
function drawFeatureLabels() {
  const overlay = document.getElementById('feature-labels-overlay');
  if (!overlay || !gameState?.culture || !window.worldToScreen) return;

  // Hidden by player toggle — clear overlay and bail
  if (window.featureLabelsVisible === false) {
    if (overlay.innerHTML !== '') { overlay.innerHTML = ''; _featureLabelCacheKey = null; }
    return;
  }

  const cam = gameState.camera;
  const features = gameState.culture.namedFeatures ?? [];
  const featureNames = features.map(f => f.name).join('\x00');
  const regionNames = (gameState.culture?.namedRegions ?? []).map(r => `${r.name}:${r.hexes.length}`).join('\x00');
  const settlementNames = (gameState.settlements ?? []).map(s => `${s.name || ''}:${s.col},${s.row}`).join('\x00');
  const cacheKey = `${cam.x.toFixed(1)},${cam.y.toFixed(1)},${cam.zoom.toFixed(3)}\x00${featureNames}\x00${regionNames}\x00${settlementNames}`;
  if (cacheKey === _featureLabelCacheKey) return;
  _featureLabelCacheKey = cacheKey;

  // Font size scales inversely with zoom so names stay readable when zoomed out.
  // Clamped to keep labels legible at all zoom levels.
  const fontSize = Math.round(Math.max(24, Math.min(42, 20 / cam.zoom)));
  const sizeStyle = `font-size:${fontSize}px`;

  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

  // Collect all label candidates with priority order before rendering.
  // Priority 0 = highest (always placed first). Labels that would overlap a
  // higher-priority label are suppressed. All labels use translate(-50%,-50%)
  // so cx/cy is the visual center of the span.
  const candidates = []; // {cx, cy, text, html, priority}

  // Settlement names — priority 0 (highest), positioned above hex
  for (const settlement of (gameState.settlements ?? [])) {
    if (!settlement.name) continue;
    const hex = gameState.map[settlement.row]?.[settlement.col];
    if (!hex?.revealed) continue;
    const wp = hexToPixel(settlement.col, settlement.row, CONSTANTS.HEX_SIZE);
    const sp = window.worldToScreen(wp.x, wp.y);
    const offset = CONSTANTS.HEX_SIZE * cam.zoom * 0.55;
    const cx = sp.x, cy = sp.y - offset;
    candidates.push({ cx, cy, text: settlement.name, priority: 0,
      html: `<span class="map-settlement-label" style="left:${cx}px;top:${cy}px;${sizeStyle}">${esc(settlement.name)}</span>` });
  }

  // Region names — priority 1
  for (const region of (gameState.culture?.namedRegions ?? [])) {
    let sumX = 0, sumY = 0, count = 0;
    for (const key of region.hexes) {
      const [hc, hr] = key.split(',').map(Number);
      const hex = gameState.map[hr]?.[hc];
      if (!hex?.revealed) continue;
      const wp = hexToPixel(hc, hr, CONSTANTS.HEX_SIZE);
      sumX += wp.x; sumY += wp.y; count++;
    }
    if (count === 0) continue;
    const sp = window.worldToScreen(sumX / count, sumY / count);
    candidates.push({ cx: sp.x, cy: sp.y, text: region.name, priority: 1,
      html: `<span class="map-region-label" style="left:${sp.x}px;top:${sp.y}px;${sizeStyle}">${esc(region.name)}</span>` });
  }

  // River names — priority 2
  for (const river of (gameState.rivers ?? [])) {
    const named = window.getNamedRiver?.(river.id);
    if (!named) continue;
    const mid = getRiverRevealedMidpoint(river);
    if (!mid) continue;
    const sp = window.worldToScreen(mid.x, mid.y);
    candidates.push({ cx: sp.x, cy: sp.y, text: named.name, priority: 2,
      html: `<span class="map-river-label" style="left:${sp.x}px;top:${sp.y}px;${sizeStyle}">${esc(named.name)}</span>` });
  }

  // Lake names — priority 3 (one label per cluster at centroid)
  for (const feature of features) {
    if (feature.type !== 'lake' || feature.lakeCluster == null) continue;
    let sumX = 0, sumY = 0, count = 0;
    for (let r = 0; r < gameState.map.length; r++) {
      const row = gameState.map[r];
      if (!row) continue;
      for (let c = 0; c < row.length; c++) {
        const h = row[c];
        if (h?.terrain === 'lake' && h.lakeCluster === feature.lakeCluster && h.revealed) {
          const wp = hexToPixel(c, r, CONSTANTS.HEX_SIZE);
          sumX += wp.x; sumY += wp.y; count++;
        }
      }
    }
    if (count === 0) continue;
    const sp = window.worldToScreen(sumX / count, sumY / count);
    candidates.push({ cx: sp.x, cy: sp.y, text: feature.name, priority: 3,
      html: `<span class="map-feature-label" style="left:${sp.x}px;top:${sp.y}px;${sizeStyle}">${esc(feature.name)}</span>` });
  }

  // Terrain feature names (non-lake, non-river) — priority 4 (lowest)
  for (const feature of features) {
    if (feature.type === 'river') continue;
    if (feature.type === 'lake' && feature.lakeCluster != null) continue;
    const hex = gameState.map[feature.row]?.[feature.col];
    if (!hex?.revealed) continue;
    const wp = hexToPixel(feature.col, feature.row, CONSTANTS.HEX_SIZE);
    const sp = window.worldToScreen(wp.x, wp.y);
    const yOffset = CONSTANTS.HEX_SIZE * cam.zoom * 0.3;
    const cx = sp.x, cy = sp.y + yOffset;
    candidates.push({ cx, cy, text: feature.name, priority: 4,
      html: `<span class="map-feature-label" style="left:${cx}px;top:${cy}px;${sizeStyle}">${esc(feature.name)}</span>` });
  }

  // Collision detection — place labels in priority order, suppress overlapping ones.
  // Estimate bounding box: Almendra serif ≈ 0.55× char width, 1.4× line height.
  // All spans use translate(-50%,-50%) so cx/cy is already the visual center.
  const CHAR_W_FACTOR = 0.55;
  const LINE_H_FACTOR = 1.4;
  const MARGIN = 6; // extra gap between labels (px)

  candidates.sort((a, b) => a.priority - b.priority);
  const placed = []; // [{cx, cy, hw, hh}]

  function labelsOverlap(cx, cy, hw, hh) {
    for (const p of placed) {
      if (Math.abs(cx - p.cx) < hw + p.hw + MARGIN &&
          Math.abs(cy - p.cy) < hh + p.hh + MARGIN) return true;
    }
    return false;
  }

  let html = '';
  for (const c of candidates) {
    const hw = (c.text.length * fontSize * CHAR_W_FACTOR) / 2;
    const hh = (fontSize * LINE_H_FACTOR) / 2;
    if (!labelsOverlap(c.cx, c.cy, hw, hh)) {
      placed.push({ cx: c.cx, cy: c.cy, hw, hh });
      html += c.html;
    }
  }

  overlay.innerHTML = html;
}

// ---- MAIN RENDER FUNCTION ----

function render() {
  if (!gameState || !gameState.map || !gameState.map.length) return;
  if (mapDirty) renderMapToCache();
  ctx.fillStyle = '#0e0c0a'; ctx.fillRect(0, 0, canvasW, canvasH);
  const cam = gameState.camera;
  const so = window.worldToScreen(-CONSTANTS.MAP_PAD, -CONSTANTS.MAP_PAD);
  ctx.drawImage(mapCanvas, 0, 0, mapCanvas.width, mapCanvas.height, so.x, so.y, mapCanvas.width * cam.zoom, mapCanvas.height * cam.zoom);
  drawFeatureLabels();
  drawOverlays();
  drawMinimap();
}

// ---- OVERLAY RENDERING ----

function drawOverlays() {
  ctx.save();

  // Draw movement range indicators first
  drawMovementRange();

  // Draw units (over movement indicators)
  drawUnits();

  // Draw units in training
  drawUnitsInTraining();

  // Draw external threats
  drawThreats();

  // Draw fortification edge highlight (when in fortify mode)
  if (gameState.unitInteractionMode === 'fortify' && window.hoveredHex && window.hoveredEdge != null) {
    const hh = window.hoveredHex;
    const he = window.hoveredEdge;
    const wp = hexToPixel(hh.col, hh.row, CONSTANTS.HEX_SIZE);
    const sp = window.worldToScreen(wp.x, wp.y);
    const scale = gameState.camera.zoom;
    const inset = WALL_INSET;

    const a0 = (Math.PI / 180) * (60 * he - 30);
    const a1 = (Math.PI / 180) * (60 * ((he + 1) % 6) - 30);
    const ex0 = sp.x + CONSTANTS.HEX_SIZE * scale * inset * Math.cos(a0);
    const ey0 = sp.y + CONSTANTS.HEX_SIZE * scale * inset * Math.sin(a0);
    const ex1 = sp.x + CONSTANTS.HEX_SIZE * scale * inset * Math.cos(a1);
    const ey1 = sp.y + CONSTANTS.HEX_SIZE * scale * inset * Math.sin(a1);

    // Determine validity
    const inTerritory = window.isInTerritory(hh.col, hh.row);
    const nb = hexNeighbor(hh.col, hh.row, he);
    const nbValid = nb.col >= 0 && nb.col < CONSTANTS.MAP_COLS && nb.row >= 0 && nb.row < CONSTANTS.MAP_ROWS;
    const existing = window.getFortification ? window.getFortification(hh.col, hh.row, he) : null;
    const valid = inTerritory && nbValid && !existing;

    // Glow
    ctx.save();
    ctx.strokeStyle = valid ? 'rgba(100,255,100,0.8)' : 'rgba(255,80,80,0.8)';
    ctx.lineWidth = 6 * scale;
    ctx.lineCap = 'round';
    ctx.shadowColor = valid ? 'rgba(100,255,100,0.5)' : 'rgba(255,80,80,0.5)';
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(ex0, ey0);
    ctx.lineTo(ex1, ey1);
    ctx.stroke();
    ctx.restore();
  }

  // Draw selected hex outline
  const sel = gameState.selectedHex;
  if (sel) {
    const wp = hexToPixel(sel.col, sel.row, CONSTANTS.HEX_SIZE);
    const sp = window.worldToScreen(wp.x, wp.y);
    const ds = CONSTANTS.HEX_SIZE * gameState.camera.zoom;
    drawHexPath(ctx, sp.x, sp.y, ds + 2); ctx.strokeStyle = 'rgba(201,168,76,0.25)'; ctx.lineWidth = 6; ctx.stroke();
    drawHexPath(ctx, sp.x, sp.y, ds - 1); ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 3; ctx.stroke();
  }

  ctx.restore();
}

function drawMovementRange() {
  const selectedUnit = gameState.selectedUnit;
  if (!selectedUnit) return;

  const mode = gameState.unitInteractionMode;

  // ---- ACTION MODE: draw action targets instead of move range ----
  if (mode === 'action') {
    const actionTargets = window.getValidActionTargets ? window.getValidActionTargets(selectedUnit) : [];
    const scale = gameState.camera.zoom;
    for (const target of actionTargets) {
      const wp = hexToPixel(target.col, target.row, CONSTANTS.HEX_SIZE);
      const sp = window.worldToScreen(wp.x, wp.y);
      const ds = CONSTANTS.HEX_SIZE * scale;

      // Pulsing red ring for attack targets
      drawHexPath(ctx, sp.x, sp.y, ds - 2);
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.9)';
      ctx.fillStyle = 'rgba(255, 80, 80, 0.15)';
      ctx.lineWidth = 3 * scale;
      ctx.stroke();
      ctx.fill();

      // Outer glow ring
      drawHexPath(ctx, sp.x, sp.y, ds + 4);
      ctx.strokeStyle = 'rgba(255, 80, 80, 0.3)';
      ctx.lineWidth = 5 * scale;
      ctx.stroke();

      ctx.fillStyle = 'rgba(255, 80, 80, 0.9)';
      ctx.font = `${16 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚔️', sp.x, sp.y);
    }

    // Highlight the unit's current hex in action mode (amber outline)
    const uwp = hexToPixel(selectedUnit.col, selectedUnit.row, CONSTANTS.HEX_SIZE);
    const usp = window.worldToScreen(uwp.x, uwp.y);
    const uds = CONSTANTS.HEX_SIZE * scale;
    drawHexPath(ctx, usp.x, usp.y, uds - 1);
    ctx.strokeStyle = 'rgba(220, 160, 40, 0.9)';
    ctx.lineWidth = 3 * scale;
    ctx.stroke();

    return;
  }

  // ---- MOVE MODE ----
  const validTargets = window.getValidMoveTargets(selectedUnit);
  const blockedTargets = window.getBlockedMoveTargets(selectedUnit);
  const unitType = UNIT_TYPES[selectedUnit.type];

  for (const target of validTargets) {
    const hex = gameState.map[target.row][target.col];
    if (!hex.revealed) continue;

    const wp = hexToPixel(target.col, target.row, CONSTANTS.HEX_SIZE);
    const sp = window.worldToScreen(wp.x, wp.y);
    const ds = CONSTANTS.HEX_SIZE * gameState.camera.zoom;

    // Check special abilities for this hex
    let canAttackFromHere = false;
    let canFoundHere = false;

    if (unitType.combat > 0) {
      canAttackFromHere = gameState.externalThreats.some(threat => {
        const distance = cubeDistance(offsetToCube(target.col, target.row), offsetToCube(threat.col, threat.row));
        return distance <= 1;
      });
    }

    if (selectedUnit.type === 'settler') {
      canFoundHere = window.canFoundSettlement(target.col, target.row);
    }


    // Movement range indicator - different colors for different abilities
    drawHexPath(ctx, sp.x, sp.y, ds - 4);
    if (canFoundHere) {
      // Green for settlement/region founding locations
      ctx.strokeStyle = 'rgba(100, 255, 100, 0.8)';
      ctx.fillStyle = 'rgba(100, 255, 100, 0.2)';
    } else if (canAttackFromHere) {
      // Red for combat locations
      ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
      ctx.fillStyle = 'rgba(255, 100, 100, 0.2)';
    } else {
      // Blue for normal movement
      ctx.strokeStyle = 'rgba(100, 150, 255, 0.6)';
      ctx.fillStyle = 'rgba(100, 150, 255, 0.15)';
    }

    ctx.lineWidth = 2 * gameState.camera.zoom;
    ctx.stroke();
    ctx.fill();

    // Movement cost indicator or special ability icon
    if (canFoundHere) {
      // Show settlement icon for founding locations
      ctx.fillStyle = 'rgba(100, 255, 100, 0.9)';
      ctx.font = `${16 * gameState.camera.zoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🏛️', sp.x, sp.y);
    } else if (target.cost > 1) {
      ctx.fillStyle = canAttackFromHere ? 'rgba(255, 100, 100, 0.9)' : 'rgba(100, 150, 255, 0.8)';
      ctx.font = `${12 * gameState.camera.zoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(target.cost.toString(), sp.x, sp.y);
    }

    // Attack indicator
    if (canAttackFromHere) {
      ctx.fillStyle = 'rgba(255, 100, 100, 0.9)';
      ctx.font = `${16 * gameState.camera.zoom}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('⚔️', sp.x, sp.y + (target.cost > 1 ? 10 * gameState.camera.zoom : 0));
    }
  }

  // Draw blocked targets in faded style
  for (const target of blockedTargets) {
    const hex = gameState.map[target.row][target.col];
    if (!hex.revealed) continue;

    const wp = hexToPixel(target.col, target.row, CONSTANTS.HEX_SIZE);
    const sp = window.worldToScreen(wp.x, wp.y);
    const ds = CONSTANTS.HEX_SIZE * gameState.camera.zoom;

    // Blocked movement indicator
    drawHexPath(ctx, sp.x, sp.y, ds - 4);
    ctx.strokeStyle = 'rgba(150, 50, 50, 0.5)';
    ctx.fillStyle = 'rgba(150, 50, 50, 0.1)';
    ctx.lineWidth = 2 * gameState.camera.zoom;
    ctx.stroke();
    ctx.fill();

    // X symbol for blocked
    ctx.strokeStyle = 'rgba(150, 50, 50, 0.8)';
    ctx.lineWidth = 3 * gameState.camera.zoom;
    const crossSize = 8 * gameState.camera.zoom;
    ctx.beginPath();
    ctx.moveTo(sp.x - crossSize, sp.y - crossSize);
    ctx.lineTo(sp.x + crossSize, sp.y + crossSize);
    ctx.moveTo(sp.x + crossSize, sp.y - crossSize);
    ctx.lineTo(sp.x - crossSize, sp.y + crossSize);
    ctx.stroke();
  }
}

function drawUnits() {
  for (const unit of gameState.units) {
    const hex = gameState.map[unit.row][unit.col];
    if (!hex.revealed) continue; // Only draw units on revealed hexes

    const unitType = UNIT_TYPES[unit.type];
    const wp = hexToPixel(unit.col, unit.row, CONSTANTS.HEX_SIZE);
    const sp = window.worldToScreen(wp.x, wp.y);
    const scale = gameState.camera.zoom;

    const isSelected = gameState.selectedUnit && gameState.selectedUnit.id === unit.id;

    // Unit background circle
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 16 * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fill();

    // Selection highlight
    if (isSelected) {
      ctx.strokeStyle = '#6495ed';
      ctx.lineWidth = 3 * scale;
    } else {
      ctx.strokeStyle = '#c9a84c';
      ctx.lineWidth = 2 * scale;
    }
    ctx.stroke();

    // Unit icon
    ctx.fillStyle = '#e8dcc8';
    ctx.font = `${20 * scale}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(unitType.icon, sp.x, sp.y);

    // Health indicator (if damaged)
    if (unit.health < 100) {
      const healthWidth = 24 * scale;
      const healthHeight = 3 * scale;
      const healthX = sp.x - healthWidth / 2;
      const healthY = sp.y + 22 * scale;

      // Health bar background
      ctx.fillStyle = 'rgba(64, 0, 0, 0.8)';
      ctx.fillRect(healthX, healthY, healthWidth, healthHeight);

      // Health bar fill
      const healthPercent = unit.health / 100;
      ctx.fillStyle = healthPercent > 0.5 ? '#5a8a4a' : healthPercent > 0.25 ? '#c9a84c' : '#a94442';
      ctx.fillRect(healthX, healthY, healthWidth * healthPercent, healthHeight);
    }

    // Movement indicator (if moved this turn)
    const unitTypeData = UNIT_TYPES[unit.type];
    if (unit.movementLeft < unitTypeData.movement) {
      ctx.beginPath();
      ctx.arc(sp.x + 12 * scale, sp.y - 12 * scale, 4 * scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(201, 168, 76, 0.8)';
      ctx.fill();
    }

    // Combat damage indicator (if took damage this turn)
    if (unit.lastDamage > 0) {
      ctx.fillStyle = '#ff4444';
      ctx.font = `bold ${14 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`-${unit.lastDamage}`, sp.x, sp.y - 30 * scale);

      // Combat flash effect
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 20 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 68, 68, 0.6)';
      ctx.lineWidth = 3 * scale;
      ctx.stroke();
    }
  }
}

function drawUnitsInTraining() {
  for (const training of gameState.unitsInTraining) {
    const hex = gameState.map[training.row][training.col];
    if (!hex.revealed) continue; // Only draw training on revealed hexes

    const unitType = UNIT_TYPES[training.type];
    const wp = hexToPixel(training.col, training.row, CONSTANTS.HEX_SIZE);
    const sp = window.worldToScreen(wp.x, wp.y);
    const scale = gameState.camera.zoom;

    // Training background circle (dashed)
    ctx.setLineDash([4 * scale, 4 * scale]);
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 16 * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(100, 80, 0, 0.3)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(200, 150, 0, 0.8)';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // Unit icon (semi-transparent)
    ctx.fillStyle = 'rgba(232, 220, 200, 0.6)';
    ctx.font = `${20 * scale}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(unitType.icon, sp.x, sp.y);

    // Training progress indicator
    const progress = (training.trainingNeeded - training.trainingProgress) / training.trainingNeeded;
    const progressWidth = 24 * scale;
    const progressHeight = 3 * scale;
    const progressX = sp.x - progressWidth / 2;
    const progressY = sp.y + 22 * scale;

    // Progress bar background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(progressX, progressY, progressWidth, progressHeight);

    // Progress bar fill
    ctx.fillStyle = 'rgba(200, 150, 0, 0.9)';
    ctx.fillRect(progressX, progressY, progressWidth * progress, progressHeight);

    // Hammer icon to indicate training
    ctx.fillStyle = 'rgba(200, 150, 0, 0.8)';
    ctx.font = `${12 * scale}px Arial`;
    ctx.fillText('🔨', sp.x + 18 * scale, sp.y - 18 * scale);
  }
}

function drawThreats() {
  for (const threat of gameState.externalThreats) {
    const hex = gameState.map[threat.row][threat.col];
    // Only draw enemy threats on hexes with active visibility (2)
    const vis = gameState.visibilityMap?.[threat.row]?.[threat.col];
    if (vis != null ? vis < 2 : !hex.revealed) continue;

    const threatType = THREAT_TYPES[threat.type];
    const wp = hexToPixel(threat.col, threat.row, CONSTANTS.HEX_SIZE);
    const sp = window.worldToScreen(wp.x, wp.y);
    const scale = gameState.camera.zoom;

    // Threat background circle - red/orange for hostility
    ctx.beginPath();
    ctx.arc(sp.x, sp.y, 18 * scale, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(180, 60, 60, 0.8)';
    ctx.fill();
    ctx.strokeStyle = '#a94442';
    ctx.lineWidth = 2 * scale;
    ctx.stroke();

    // Threat icon
    ctx.fillStyle = '#ffffff';
    ctx.font = `${22 * scale}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(threatType.icon, sp.x, sp.y);

    // Health bar
    if (threat.health < threat.maxHealth) {
      const healthWidth = 28 * scale;
      const healthHeight = 4 * scale;
      const healthX = sp.x - healthWidth / 2;
      const healthY = sp.y + 24 * scale;

      // Health bar background
      ctx.fillStyle = 'rgba(64, 0, 0, 0.9)';
      ctx.fillRect(healthX, healthY, healthWidth, healthHeight);

      // Health bar fill
      const healthPercent = threat.health / threat.maxHealth;
      ctx.fillStyle = healthPercent > 0.5 ? '#a94442' : '#722b2b';
      ctx.fillRect(healthX, healthY, healthWidth * healthPercent, healthHeight);
    }

    // Movement indicator (if threat has moved this turn)
    if (threat.movementLeft < threatType.movement) {
      ctx.beginPath();
      ctx.arc(sp.x + 14 * scale, sp.y - 14 * scale, 5 * scale, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(180, 60, 60, 0.9)';
      ctx.fill();
    }

    // Targeting line (show which settlement they're heading for)
    if (threat.target) {
      const targetWp = hexToPixel(threat.target.col, threat.target.row, CONSTANTS.HEX_SIZE);
      const targetSp = window.worldToScreen(targetWp.x, targetWp.y);

      ctx.beginPath();
      ctx.moveTo(sp.x, sp.y);
      ctx.lineTo(targetSp.x, targetSp.y);
      ctx.strokeStyle = 'rgba(180, 60, 60, 0.4)';
      ctx.lineWidth = 2 * scale;
      ctx.setLineDash([5 * scale, 5 * scale]);
      ctx.stroke();
      ctx.setLineDash([]); // Reset line dash
    }

    // Combat damage indicator (if took damage this turn)
    if (threat.lastDamage > 0) {
      ctx.fillStyle = '#ff4444';
      ctx.font = `bold ${14 * scale}px Arial`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(`-${threat.lastDamage}`, sp.x, sp.y - 35 * scale);

      // Combat flash effect
      ctx.beginPath();
      ctx.arc(sp.x, sp.y, 22 * scale, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 68, 68, 0.6)';
      ctx.lineWidth = 3 * scale;
      ctx.stroke();
    }
  }
}

// ---- MINIMAP ----
const MM_W = 180, MM_H = 135;

function drawMinimap() {
  minimapCtx.fillStyle = '#0e0c0a'; minimapCtx.fillRect(0, 0, MM_W, MM_H);
  const sx = MM_W/(CONSTANTS.MAP_COLS+0.5), sy = MM_H/CONSTANTS.MAP_ROWS, dot = Math.min(sx,sy)*0.52;
  for (let r = 0; r < CONSTANTS.MAP_ROWS; r++) for (let c = 0; c < CONSTANTS.MAP_COLS; c++) {
    const hex = gameState.map[r][c];
    const mx = (c+0.5*(r&1))*sx+sx*0.5, my = r*sy+sy*0.5;
    const mmVis = gameState.visibilityMap?.[r]?.[c];
    const mmState = mmVis != null ? mmVis : (hex.revealed ? 2 : 0);
    if (mmState === 0) {
      minimapCtx.fillStyle = '#1a1610';
    } else if (mmState === 1) {
      // Dimmed terrain color for revealed-but-not-visible
      const tc = TERRAIN[hex.terrain].color;
      const pr = parseInt(tc.slice(1,3),16), pg = parseInt(tc.slice(3,5),16), pb = parseInt(tc.slice(5,7),16);
      minimapCtx.fillStyle = `rgb(${Math.floor(pr*0.5)},${Math.floor(pg*0.5)},${Math.floor(pb*0.5)})`;
    } else {
      minimapCtx.fillStyle = TERRAIN[hex.terrain].color;
    }
    minimapCtx.beginPath(); minimapCtx.arc(mx,my,dot,0,Math.PI*2); minimapCtx.fill();
    // River indicator on minimap
    if (hex.revealed && window.hexHasRiver && window.hexHasRiver(hex)) {
      minimapCtx.fillStyle = '#3a8cc8';
      minimapCtx.beginPath(); minimapCtx.arc(mx,my,dot*0.6,0,Math.PI*2); minimapCtx.fill();
    }
  }
  const cam=gameState.camera, ms=window.getMapPixelSize();
  const vx=cam.x/ms.width*MM_W, vy=cam.y/ms.height*MM_H;
  const vw=(canvasW/(cam.zoom*ms.width))*MM_W, vh=(canvasH/(cam.zoom*ms.height))*MM_H;
  minimapCtx.strokeStyle='rgba(201,168,76,0.8)'; minimapCtx.lineWidth=1.5;
  minimapCtx.strokeRect(vx-vw/2,vy-vh/2,vw,vh);
  // Region overlay on minimap
  if (window.regionViewVisible && gameState.culture?.namedRegions?.length > 0) {
    for (const region of gameState.culture.namedRegions) {
      const color = window.getRegionColor ? window.getRegionColor(region.id) : '#c8a03a';
      const r2 = parseInt(color.slice(1, 3), 16);
      const g2 = parseInt(color.slice(3, 5), 16);
      const b2 = parseInt(color.slice(5, 7), 16);
      minimapCtx.fillStyle = `rgba(${r2},${g2},${b2},0.4)`;
      for (const key of region.hexes) {
        const [hc, hr] = key.split(',').map(Number);
        const hex = gameState.map[hr]?.[hc];
        if (!hex || !hex.revealed) continue;
        const mmx = (hc + 0.5 * (hr & 1)) * sx + sx * 0.5, mmy = hr * sy + sy * 0.5;
        minimapCtx.beginPath(); minimapCtx.arc(mmx, mmy, dot + 1, 0, Math.PI * 2); minimapCtx.fill();
      }
    }
  }

  for (const s of gameState.settlements) {
    const smx=(s.col+0.5*(s.row&1))*sx+sx*0.5, smy=s.row*sy+sy*0.5;
    minimapCtx.fillStyle='#c9a84c'; minimapCtx.beginPath(); minimapCtx.arc(smx,smy,dot+2,0,Math.PI*2); minimapCtx.fill();
  }
}

function minimapToCamera(mx,my){
  if(!gameState || !gameState.camera) return;
  const ms=window.getMapPixelSize();
  gameState.camera.x=(mx/MM_W)*ms.width;
  gameState.camera.y=(my/MM_H)*ms.height;
}

// ---- UTILITY FUNCTIONS ----

function setDevRenderingFlags(showVertices, highlightRivers, fogDisabled) {
  devShowRiverVertices = showVertices;
  devHighlightRivers = highlightRivers;
  fogOfWarDisabled = fogDisabled;
}


function setMapDirty(dirty) {
  mapDirty = dirty;
}

// Force the feature-label cache key to be null so that drawFeatureLabels()
// rebuilds the overlay HTML on the next render() call. Used after the confirm
// dialog hides the overlay (display:none) and then restores it.
function invalidateFeatureLabelCache() {
  _featureLabelCacheKey = null;
}

// Export functions for module use
export {
  initRendering,
  pageToCanvas,
  drawHexPath,
  drawHexStatic,
  drawTerrainDetail,
  renderMapToCache,
  render,
  drawOverlays,
  drawMovementRange,
  drawUnits,
  drawUnitsInTraining,
  drawThreats,
  drawMinimap,
  minimapToCamera,
  setDevRenderingFlags,
  updateCanvasRect,
  setMapDirty,
  invalidateFeatureLabelCache
};

// For browser compatibility, attach to window if available
if (typeof window !== 'undefined') {
  window.Rendering = {
    initRendering,
    pageToCanvas,
    drawHexPath,
    drawHexStatic,
    drawTerrainDetail,
    renderMapToCache,
    render,
    drawOverlays,
    drawMovementRange,
    drawUnits,
    drawUnitsInTraining,
    drawThreats,
    drawMinimap,
    minimapToCamera,
    setDevRenderingFlags,
    updateCanvasRect,
    setMapDirty,
    invalidateFeatureLabelCache
  };
}