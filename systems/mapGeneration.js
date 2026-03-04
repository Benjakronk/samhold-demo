// Map Generation System for Samhold
// Extracted from main game file for modular architecture

// Import dependencies
import { TERRAIN } from '../data/terrain.js';
import { createRNG } from '../utils/random.js';
import { offsetToCube, hexToPixel, pixelToHex, hexNeighbor } from '../utils/hexMath.js';

// Constants
const MAP_COLS = 20;
const MAP_ROWS = 16;
const HEX_SIZE = 48;

// Global variables needed for map generation
let fogOfWarDisabled = true; // Will be set by main game

// Helper functions for map generation
function weightedPick(rng) {
  const weights = [
    ['grassland', 30],
    ['forest', 25],
    ['hills', 15],
    ['mountain', 8],
    ['desert', 8],
    ['wetland', 10],
    ['coast', 4]
  ];
  let random = rng() * 100;
  for (const [terrain, weight] of weights) {
    random -= weight;
    if (random <= 0) return terrain;
  }
  return 'grassland';
}

function mkHex(col, row, terrain, rng) {
  return {
    col,
    row,
    terrain,
    variation: rng(),
    building: null,
    buildProgress: 0,
    revealed: fogOfWarDisabled,
    workers: 0,
    hasRiver: false,
    lakeCluster: -1
  };
}

// Main map generation function
function generateMap(cols, rows, seed) {
  const rng = createRNG(seed || Date.now());
  const map = [];

  // Generate biome seeds
  const biomes = [];
  for (let i = 0, n = 6 + Math.floor(rng() * 4); i < n; i++) {
    biomes.push({
      col: Math.floor(rng() * cols),
      row: Math.floor(rng() * rows),
      type: weightedPick(rng),
      radius: 3 + Math.floor(rng() * 5)
    });
  }

  // Generate terrain based on biomes
  function _isLand(terrain) {
    return terrain !== 'coast' && terrain !== 'ocean' && terrain !== 'lake';
  }

  for (let r = 0; r < rows; r++) {
    const row = [];
    for (let c = 0; c < cols; c++) {
      let terrain = 'grassland';
      let minDist = Infinity;

      // Find closest biome
      for (const biome of biomes) {
        const dist = Math.sqrt((c - biome.col) ** 2 + (r - biome.row) ** 2);
        if (dist < minDist) {
          minDist = dist;
          terrain = biome.type;
        }
      }

      // Add some randomness
      if (rng() < 0.15) {
        terrain = weightedPick(rng);
      }

      row.push(mkHex(c, r, terrain, rng));
    }
    map.push(row);
  }

  // Helper function to check if adjacent to salt water
  function _adjToSaltWater(col, row) {
    for (let edge = 0; edge < 6; edge++) {
      const neighbor = hexNeighbor(col, row, edge, rows % 2 === 0 ? 'even' : 'odd');
      if (neighbor.col >= 0 && neighbor.col < cols && neighbor.row >= 0 && neighbor.row < rows) {
        const nHex = map[neighbor.row][neighbor.col];
        if (nHex.terrain === 'ocean' || nHex.terrain === 'coast') {
          return true;
        }
      }
    }
    return false;
  }

  // Generate lakes (1-3 hex clusters, inland only)
  const lakeClusters = [];
  const numLakes = 2 + Math.floor(rng() * 2); // 2-3 lakes

  for (let l = 0; l < numLakes; l++) {
    let attempts = 0;
    let seed;

    // Find valid inland location for lake
    do {
      const col = 2 + Math.floor(rng() * (cols - 4));
      const row = 2 + Math.floor(rng() * (rows - 4));
      seed = { col, row };
      attempts++;
    } while (_adjToSaltWater(seed.col, seed.row) && attempts < 50);

    if (attempts >= 50) continue;

    // Create lake cluster
    const cluster = [seed];
    const clusterSize = 1 + Math.floor(rng() * 3); // 1-3 hexes

    map[seed.row][seed.col].terrain = 'lake';
    map[seed.row][seed.col].lakeCluster = l;

    // Expand cluster
    for (let i = 1; i < clusterSize; i++) {
      const candidates = [];
      for (const hex of cluster) {
        for (let edge = 0; edge < 6; edge++) {
          const neighbor = hexNeighbor(hex.col, hex.row, edge, rows % 2 === 0 ? 'even' : 'odd');
          if (neighbor.col >= 0 && neighbor.col < cols && neighbor.row >= 0 && neighbor.row < rows) {
            const nHex = map[neighbor.row][neighbor.col];
            if (_isLand(nHex.terrain) && !_adjToSaltWater(neighbor.col, neighbor.row) &&
                !cluster.some(c => c.col === neighbor.col && c.row === neighbor.row)) {
              candidates.push(neighbor);
            }
          }
        }
      }

      if (candidates.length === 0) break;

      const chosen = candidates[Math.floor(rng() * candidates.length)];
      cluster.push(chosen);
      map[chosen.row][chosen.col].terrain = 'lake';
      map[chosen.row][chosen.col].lakeCluster = l;
    }

    lakeClusters.push(cluster);
  }

  // Generate ocean via flood-fill from coast
  let changed = true;
  while (changed) {
    changed = false;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const hex = map[r][c];
        if (hex.terrain === 'coast') {
          // Check if this coast hex has no land neighbors
          let hasLandNeighbor = false;
          for (let edge = 0; edge < 6; edge++) {
            const neighbor = hexNeighbor(c, r, edge, rows % 2 === 0 ? 'even' : 'odd');
            if (neighbor.col >= 0 && neighbor.col < cols && neighbor.row >= 0 && neighbor.row < rows) {
              const nHex = map[neighbor.row][neighbor.col];
              if (_isLand(nHex.terrain)) {
                hasLandNeighbor = true;
                break;
              }
            }
          }
          if (!hasLandNeighbor) {
            hex.terrain = 'ocean';
            changed = true;
          }
        }
      }
    }
  }

  // Generate rivers
  generateRivers(map, cols, rows, rng);

  return map;
}

// Vertex graph building for river generation
function buildVertexGraph(map, cols, rows) {
  const vertices = new Map();

  function vKey(x, y) {
    return `${Math.round(x * 10)},${Math.round(y * 10)}`;
  }

  // Build vertex adjacency graph
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const hexPos = hexToPixel(c, r, HEX_SIZE);

      // Generate the 6 corner vertices for this hex
      for (let corner = 0; corner < 6; corner++) {
        const angle = (Math.PI / 180) * (60 * corner - 30);
        const vx = hexPos.x + HEX_SIZE * Math.cos(angle);
        const vy = hexPos.y + HEX_SIZE * Math.sin(angle);
        const key = vKey(vx, vy);

        if (!vertices.has(key)) {
          vertices.set(key, {
            x: vx,
            y: vy,
            hexes: [],
            adjacents: new Set()
          });
        }

        vertices.get(key).hexes.push({ col: c, row: r });
      }
    }
  }

  // Build adjacency relationships
  for (const [key, vertex] of vertices) {
    for (const [otherKey, otherVertex] of vertices) {
      if (key !== otherKey) {
        const dist = Math.sqrt(
          (vertex.x - otherVertex.x) ** 2 + (vertex.y - otherVertex.y) ** 2
        );
        if (dist < HEX_SIZE * 1.1) {
          vertex.adjacents.add(otherKey);
        }
      }
    }
  }

  return vertices;
}

// River generation system
function generateRivers(map, cols, rows, rng) {
  const vertices = buildVertexGraph(map, cols, rows);

  // Segment tracking for river merging
  const segmentCount = new Map();

  function isWater(terrain) {
    return terrain === 'coast' || terrain === 'lake' || terrain === 'ocean';
  }

  function segKey(a, b) {
    return a < b ? `${a}|${b}` : `${b}|${a}`;
  }

  function addSeg(a, b) {
    const key = segKey(a, b);
    segmentCount.set(key, (segmentCount.get(key) || 0) + 1);
  }

  function vertexElev(vertex) {
    return vertex.hexes.reduce((sum, h) => {
      const terrain = map[h.row][h.col].terrain;
      return sum + (TERRAIN[terrain]?.elevation || 0);
    }, 0) / vertex.hexes.length;
  }

  function touchesWater(vertex) {
    return vertex.hexes.some(h => isWater(map[h.row][h.col].terrain));
  }

  function touchesCoast(vertex) {
    return vertex.hexes.some(h => map[h.row][h.col].terrain === 'coast');
  }

  function touchesLake(vertex) {
    return vertex.hexes.some(h => map[h.row][h.col].terrain === 'lake');
  }

  function isMapEdge(vertex) {
    return vertex.hexes.length < 3;
  }

  // Generate 3-5 rivers
  const numRivers = 3 + Math.floor(rng() * 3);

  for (let riverId = 0; riverId < numRivers; riverId++) {
    // Find source vertex (inland, higher elevation)
    const sourceVertices = Array.from(vertices.values()).filter(v =>
      !touchesWater(v) && !isMapEdge(v) && vertexElev(v) > 3
    );

    if (sourceVertices.length === 0) continue;

    const source = sourceVertices[Math.floor(rng() * sourceVertices.length)];
    const river = { id: riverId, path: [], segments: [] };

    let current = source;
    let visited = new Set();
    let coastUrgency = 0;

    // River pathfinding loop
    while (current && !touchesWater(current) && river.path.length < 50) {
      const currentKey = Array.from(vertices.entries()).find(([k, v]) => v === current)?.[0];
      if (!currentKey || visited.has(currentKey)) break;

      visited.add(currentKey);
      river.path.push(currentKey);

      // Score adjacent vertices
      const candidates = [];
      for (const adjKey of current.adjacents) {
        if (visited.has(adjKey)) continue;

        const adjacent = vertices.get(adjKey);
        if (!adjacent) continue;

        let score = 0;

        // Elevation preference (downhill)
        const elevDiff = vertexElev(current) - vertexElev(adjacent);
        score += Math.max(0, elevDiff * 10);

        // Coast attraction (increases over time)
        if (touchesCoast(adjacent)) {
          score += 50 + coastUrgency * 2;
        } else if (touchesLake(adjacent)) {
          score += 30 + coastUrgency;
        }

        // Tributary attraction (existing rivers)
        for (const otherKey of adjacent.adjacents) {
          if (segmentCount.has(segKey(adjKey, otherKey))) {
            score += 25;
          }
        }

        // Randomness (decreases over time)
        const randomWeight = Math.max(5, 20 - coastUrgency);
        score += rng() * randomWeight;

        candidates.push({ vertex: adjacent, key: adjKey, score });
      }

      if (candidates.length === 0) break;

      // Choose best candidate
      candidates.sort((a, b) => b.score - a.score);
      const chosen = candidates[0];

      // Add segment
      river.segments.push([currentKey, chosen.key]);
      addSeg(currentKey, chosen.key);

      current = chosen.vertex;
      coastUrgency++;
    }

    // Mark river hexes
    for (const segment of river.segments) {
      for (const vKey of segment) {
        const vertex = vertices.get(vKey);
        if (vertex) {
          for (const hex of vertex.hexes) {
            map[hex.row][hex.col].hasRiver = true;
          }
        }
      }
    }
  }
}

// Export functions for module use
export {
  generateMap,
  buildVertexGraph,
  generateRivers,
  mkHex,
  weightedPick
};

// For browser compatibility, attach to window if available
if (typeof window !== 'undefined') {
  window.MapGeneration = {
    generateMap,
    buildVertexGraph,
    generateRivers,
    mkHex,
    weightedPick,
    setFogOfWarDisabled: (value) => { fogOfWarDisabled = value; }
  };
}