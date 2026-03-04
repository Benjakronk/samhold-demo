// Rendering System for Samhold
// Extracted from main game file for modular architecture

// Import dependencies
import { TERRAIN } from '../data/terrain.js';
import { BUILDINGS } from '../data/buildings.js';
import { UNIT_TYPES } from '../data/units.js';
import { THREAT_TYPES } from '../data/threats.js';
import { hexToPixel, pixelToHex } from '../utils/hexMath.js';

// Constants (will be imported from constants module when available)
const HEX_SIZE = 48;
const MAP_PAD = HEX_SIZE;

// Global variables that will be set by main game
let gameState = null;
let mapCanvas = null;
let mapCtx = null;
let canvas = null;
let ctx = null;
let canvasRect = null;
let mapDirty = true;

// Camera state
let camera = { x: 0, y: 0, zoom: 1.0 };

// Initialize rendering system
function initRendering(gameStateRef, canvasElement, mapCanvasElement) {
  gameState = gameStateRef;
  canvas = canvasElement;
  ctx = canvas.getContext('2d');
  mapCanvas = mapCanvasElement;
  mapCtx = mapCanvas.getContext('2d');
  canvasRect = canvas.getBoundingClientRect();
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
  const dx = wp.x + MAP_PAD, dy = wp.y + MAP_PAD;

  if (!hex.revealed) {
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
}

// ---- TERRAIN DETAIL RENDERING ----

function drawTerrainDetail(c, hex, cx, cy, size) {
  const terrain = TERRAIN[hex.terrain];
  if (terrain.patterns) {
    c.globalAlpha = 0.4;
    for (const pattern of terrain.patterns) {
      if (hex.variation > pattern.threshold) {
        c.fillStyle = pattern.color;
        if (pattern.shape === 'circle') {
          c.beginPath();
          c.arc(cx + pattern.x * size, cy + pattern.y * size, pattern.size * size, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
  }
}

// Export functions for module use
export {
  initRendering,
  pageToCanvas,
  drawHexPath,
  drawHexStatic,
  drawTerrainDetail
};

// For browser compatibility, attach to window if available
if (typeof window !== 'undefined') {
  window.Rendering = {
    initRendering,
    pageToCanvas,
    drawHexPath,
    drawHexStatic,
    drawTerrainDetail,
    // Camera and state setters
    setCamera: (newCamera) => { camera = newCamera; },
    setMapDirty: (dirty) => { mapDirty = dirty; },
    updateCanvasRect: () => { canvasRect = canvas.getBoundingClientRect(); }
  };
}