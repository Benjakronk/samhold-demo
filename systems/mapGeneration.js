// Map Generation System for Samhold
// Faithfully extracted from index.html.backup

// Import dependencies
import { TERRAIN } from '../data/terrain.js';
import { createRNG } from '../utils/random.js';
import { offsetToCube, hexToPixel, pixelToHex, hexNeighbor, cubeDistance } from '../utils/hexMath.js';
import { MAP_COLS, MAP_ROWS, HEX_SIZE } from '../data/constants.js';

// Global variables needed for map generation
let fogOfWarDisabled = false;

// Helper functions for map generation
function weightedPick(rng) {
  const w = [['grassland',30],['forest',25],['hills',15],['mountain',8],['desert',8],['wetland',10],['coast',4]];
  let r = rng() * 100;
  for (const [t, wt] of w) { r -= wt; if (r <= 0) return t; }
  return 'grassland';
}

function mkHex(col, row, terrain, rng) {
  return { col, row, terrain, variation: rng(), building: null, buildProgress: 0, revealed: fogOfWarDisabled, workers: 0, hasRiver: false, riverIds: [], lakeCluster: -1 };
}

// Main map generation function — faithful to original
function generateMap(cols, rows, seed) {
  const rng = createRNG(seed || Date.now()), map = [];
  const biomes = [];
  for (let i = 0, n = 6 + Math.floor(rng() * 4); i < n; i++)
    biomes.push({ col: Math.floor(rng() * cols), row: Math.floor(rng() * rows), type: weightedPick(rng), radius: 3 + Math.floor(rng() * 5) });

  // Generate terrain
  for (let row = 0; row < rows; row++) { map[row] = [];
    for (let col = 0; col < cols; col++) {
      let t = 'grassland', cd = Infinity;
      for (const b of biomes) { const d = cubeDistance(offsetToCube(col, row), offsetToCube(b.col, b.row)); if (d < b.radius && d < cd) { cd = d; t = b.type; } }
      if ((row === 0 || row === rows - 1 || col === 0 || col === cols - 1) && rng() > 0.4) t = 'coast';
      map[row][col] = mkHex(col, row, t, rng);
    }
  }

  // Ocean pass: any coast hex with NO land neighbors becomes ocean.
  // Iterate until stable — fills large seas from outside in.
  function _isLand(t) { return t !== 'coast' && t !== 'ocean' && t !== 'lake'; }
  let changed = true;
  while (changed) {
    changed = false;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      if (map[row][col].terrain !== 'coast') continue;
      let hasLandNb = false;
      for (let e = 0; e < 6; e++) {
        const nb = hexNeighbor(col, row, e);
        if (nb.col >= 0 && nb.col < cols && nb.row >= 0 && nb.row < rows) {
          if (_isLand(map[nb.row][nb.col].terrain)) { hasLandNb = true; break; }
        } // out-of-bounds counts as non-land (map edge = water)
      }
      if (!hasLandNb) { map[row][col].terrain = 'ocean'; changed = true; }
    }
  }

  // Generate lakes inland (not on map edges, not adjacent to coast/ocean)
  function _adjToSaltWater(c, r) {
    for (let e = 0; e < 6; e++) {
      const nb = hexNeighbor(c, r, e);
      if (nb.col >= 0 && nb.col < cols && nb.row >= 0 && nb.row < rows) {
        const t = map[nb.row][nb.col].terrain;
        if (t === 'coast' || t === 'ocean') return true;
      }
    }
    return false;
  }
  const numLakes = 1 + Math.floor(rng() * 3);
  for (let li = 0; li < numLakes; li++) {
    const lr = 3 + Math.floor(rng() * (rows - 6));
    const lc = 3 + Math.floor(rng() * (cols - 6));
    if (map[lr][lc].terrain !== 'coast' && map[lr][lc].terrain !== 'ocean'
        && map[lr][lc].terrain !== 'mountain' && !_adjToSaltWater(lc, lr)) {
      map[lr][lc].terrain = 'lake';
      // Place 1-3 adjacent lake hexes for larger lakes
      const lakeSize = Math.floor(rng() * 3); // 0-2 extra hexes
      for (let le = 0; le < lakeSize; le++) {
        const nb = hexNeighbor(lc, lr, Math.floor(rng() * 6));
        if (nb.row >= 2 && nb.row < rows - 2 && nb.col >= 2 && nb.col < cols - 2
            && map[nb.row][nb.col].terrain !== 'coast' && map[nb.row][nb.col].terrain !== 'ocean'
            && map[nb.row][nb.col].terrain !== 'mountain' && map[nb.row][nb.col].terrain !== 'lake'
            && !_adjToSaltWater(nb.col, nb.row)) {
          map[nb.row][nb.col].terrain = 'lake';
        }
      }
    }
  }

  // Assign lake cluster IDs via flood fill
  let clusterID = 0;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    if (map[r][c].terrain === 'lake' && map[r][c].lakeCluster === -1) {
      const queue = [{ col: c, row: r }];
      map[r][c].lakeCluster = clusterID;
      while (queue.length > 0) {
        const cur = queue.shift();
        for (let e = 0; e < 6; e++) {
          const nb = hexNeighbor(cur.col, cur.row, e);
          if (nb.col >= 0 && nb.col < cols && nb.row >= 0 && nb.row < rows
              && map[nb.row][nb.col].terrain === 'lake' && map[nb.row][nb.col].lakeCluster === -1) {
            map[nb.row][nb.col].lakeCluster = clusterID;
            queue.push(nb);
          }
        }
      }
      clusterID++;
    }
  }

  return map;
}

// Build graph of hex corner vertices for river pathing
// Each vertex is shared by up to 3 hexes; each hex edge connects 2 vertices
function buildVertexGraph(map, cols, rows) {
  const vertices = new Map();
  const vKey = (x, y) => `${Math.round(x * 10)},${Math.round(y * 10)}`;

  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const center = hexToPixel(c, r, HEX_SIZE);
    const vkeys = [];
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 30);
      const vx = center.x + HEX_SIZE * Math.cos(a);
      const vy = center.y + HEX_SIZE * Math.sin(a);
      const key = vKey(vx, vy);
      if (!vertices.has(key)) vertices.set(key, { x: vx, y: vy, hexes: [], adj: new Set() });
      const v = vertices.get(key);
      if (!v.hexes.some(h => h.col === c && h.row === r)) v.hexes.push({ col: c, row: r });
      vkeys.push(key);
    }
    for (let i = 0; i < 6; i++) {
      vertices.get(vkeys[i]).adj.add(vkeys[(i + 1) % 6]);
      vertices.get(vkeys[(i + 1) % 6]).adj.add(vkeys[i]);
    }
  }
  return vertices;
}

function generateRivers(map, cols, rows, rng, gameState) {
  const vGraph = buildVertexGraph(map, cols, rows);
  const NUM_RIVERS = 3 + Math.floor(rng() * 3); // 3-5 rivers for tributary networks
  const vKey = (x, y) => `${Math.round(x * 10)},${Math.round(y * 10)}`;

  function isWater(terrain) { return terrain === 'coast' || terrain === 'lake' || terrain === 'ocean'; }

  // Segment-based traversal counting for tributary width rendering
  const segmentCount = new Map();
  function segKey(a, b) { return a < b ? `${a}|${b}` : `${b}|${a}`; }
  function addSeg(a, b) { const k = segKey(a, b); segmentCount.set(k, (segmentCount.get(k) || 0) + 1); }

  // Source selection — mountains, hills, forests, lakes
  const sources = [];
  for (let r = 1; r < rows - 1; r++) for (let c = 1; c < cols - 1; c++) {
    const t = map[r][c].terrain;
    if (t === 'coast' || t === 'ocean') continue;
    if (t === 'mountain') sources.push({ col: c, row: r, priority: 20 + rng() * 2 });
    else if (t === 'hills') sources.push({ col: c, row: r, priority: 12 + rng() * 2 });
    else if (t === 'lake') sources.push({ col: c, row: r, priority: 15 + rng() * 2 });
    else if (t === 'forest') sources.push({ col: c, row: r, priority: 4 + rng() * 2 });
  }
  if (sources.length < NUM_RIVERS) {
    for (let r = 3; r < rows - 3; r += 2) for (let c = 3; c < cols - 3; c += 2)
      if (!isWater(map[r][c].terrain)) sources.push({ col: c, row: r, priority: 1 + rng() });
  }
  sources.sort((a, b) => b.priority - a.priority);

  function vertexElev(v) {
    let s = 0;
    for (const h of v.hexes) s += TERRAIN[map[h.row][h.col].terrain]?.elevation ?? 1;
    return s / v.hexes.length;
  }
  function touchesWater(v) { return v.hexes.some(h => isWater(map[h.row][h.col].terrain)); }
  function touchesCoast(v) { return v.hexes.some(h => map[h.row][h.col].terrain === 'coast'); }
  function touchesLake(v) { return v.hexes.some(h => map[h.row][h.col].terrain === 'lake'); }
  function isMapEdge(v) { return v.hexes.length < 3; }
  function edgeAllWater(v1, v2) {
    const shared = v1.hexes.filter(a => v2.hexes.some(b => a.col === b.col && a.row === b.row));
    return shared.length > 0 && shared.every(h => isWater(map[h.row][h.col].terrain));
  }

  const usedSources = [];
  const allRiverVerts = new Set(); // all vertices used by any completed river

  // Pre-compute terminus vertices (coast-touching and map-edge)
  const terminusVerts = [];
  for (const [key, v] of vGraph) {
    if (touchesWater(v) || isMapEdge(v)) terminusVerts.push({ key, x: v.x, y: v.y });
  }

  for (let ri = 0; ri < NUM_RIVERS && sources.length > 0; ri++) {
    let src = null;
    for (let si = 0; si < sources.length; si++) {
      const s = sources[si];
      let tooClose = false;
      for (const u of usedSources)
        if (cubeDistance(offsetToCube(s.col, s.row), offsetToCube(u.col, u.row)) < 4) { tooClose = true; break; }
      if (!tooClose) { src = s; sources.splice(si, 1); break; }
    }
    if (!src) break;
    usedSources.push(src);

    const sourceIsLake = map[src.row][src.col].terrain === 'lake';
    const sourceCluster = sourceIsLake ? map[src.row][src.col].lakeCluster : -1;

    // Helper: does a vertex touch a lake hex in the source cluster?
    function touchesSourceCluster(v) {
      return sourceCluster >= 0 && v.hexes.some(h => map[h.row][h.col].lakeCluster === sourceCluster);
    }
    // Helper: get all lake cluster IDs touched by a vertex
    function vertexLakeClusters(v) {
      const clusters = new Set();
      for (const h of v.hexes) {
        if (map[h.row][h.col].terrain === 'lake') clusters.add(map[h.row][h.col].lakeCluster);
      }
      return clusters;
    }

    // Initial target: nearest terminus vertex
    const srcPx = hexToPixel(src.col, src.row, HEX_SIZE);
    let bestDist = Infinity, targetX = srcPx.x, targetY = srcPx.y;
    for (const tv of terminusVerts) {
      const d = Math.hypot(srcPx.x - tv.x, srcPx.y - tv.y);
      if (d < bestDist) { bestDist = d; targetX = tv.x; targetY = tv.y; }
    }
    // Also consider existing rivers as merge targets
    for (const vk of allRiverVerts) {
      const v = vGraph.get(vk);
      if (v) {
        const d = Math.hypot(srcPx.x - v.x, srcPx.y - v.y);
        if (d < bestDist && d > HEX_SIZE * 3) { bestDist = d; targetX = v.x; targetY = v.y; }
      }
    }
    if (bestDist === Infinity) { targetX = 0; targetY = hexToPixel(0, Math.floor(rows / 2), HEX_SIZE).y; }

    // Pick starting vertex — avoid vertices already used by existing rivers
    const srcCenter = hexToPixel(src.col, src.row, HEX_SIZE);
    let bestStartKey = null, bestSD = Infinity;
    for (let i = 0; i < 6; i++) {
      const a = (Math.PI / 180) * (60 * i - 30);
      const vx = srcCenter.x + HEX_SIZE * Math.cos(a);
      const vy = srcCenter.y + HEX_SIZE * Math.sin(a);
      const key = vKey(vx, vy);
      if (!vGraph.has(key)) continue;
      if (allRiverVerts.has(key)) continue; // don't start on existing river
      const d = Math.hypot(vx - targetX, vy - targetY);
      if (d < bestSD) { bestSD = d; bestStartKey = key; }
    }
    if (!bestStartKey) continue; // all vertices taken by rivers, skip source

    // For lake sources, prefer vertex on land-side edge of lake
    if (sourceIsLake) {
      let best = null, bScore = -Infinity;
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 180) * (60 * i - 30);
        const vx = srcCenter.x + HEX_SIZE * Math.cos(a);
        const vy = srcCenter.y + HEX_SIZE * Math.sin(a);
        const key = vKey(vx, vy);
        if (!vGraph.has(key)) continue;
        if (allRiverVerts.has(key)) continue; // don't start on existing river
        const v = vGraph.get(key);
        const hasLand = v.hexes.some(h => !isWater(map[h.row][h.col].terrain));
        const d = Math.hypot(vx - targetX, vy - targetY);
        const score = (hasLand ? 1000 : 0) - d;
        if (score > bScore) { bScore = score; best = key; }
      }
      if (best) bestStartKey = best;
    }

    map[src.row][src.col].hasRiver = true;
    if (!map[src.row][src.col].riverIds.includes(ri)) map[src.row][src.col].riverIds.push(ri);

    // Walk vertex to vertex
    const pathKeys = [bestStartKey];
    const visited = new Set([bestStartKey]);
    let curKey = bestStartKey, prevKey = null, reachedTerminus = false;
    let mergedIntoExisting = false;

    for (let step = 0; step < 80; step++) {
      const curV = vGraph.get(curKey);

      // Dynamic target: nearest terminus OR existing river vertex from current pos
      let nearestDist = Infinity, dynTargetX = targetX, dynTargetY = targetY;
      for (const tv of terminusVerts) {
        if (sourceCluster >= 0) {
          const tvV = vGraph.get(tv.key);
          if (tvV && touchesSourceCluster(tvV)) continue;
        }
        const d = Math.hypot(curV.x - tv.x, curV.y - tv.y);
        if (d < nearestDist) { nearestDist = d; dynTargetX = tv.x; dynTargetY = tv.y; }
      }
      // Existing rivers as tributary merge targets (after some meandering)
      if (step > 3) {
        for (const vk of allRiverVerts) {
          if (visited.has(vk)) continue;
          const v = vGraph.get(vk);
          if (!v) continue;
          const d = Math.hypot(curV.x - v.x, curV.y - v.y);
          if (d < nearestDist * 0.7) { nearestDist = d / 0.7; dynTargetX = v.x; dynTargetY = v.y; }
        }
      }

      const urgency = 0.01 + step * 0.003;
      const randomness = Math.max(1.5, 4 - step * 0.05);

      const candidates = [];
      // Get lake clusters touched by current vertex (for lake-edge prevention)
      const curClusters = vertexLakeClusters(curV);
      // Track if we've left the source lake (no longer touching it)
      const leftSourceLake = sourceCluster >= 0 && !touchesSourceCluster(curV);

      for (const adjKey of curV.adj) {
        if (adjKey === prevKey) continue;
        if (visited.has(adjKey)) continue;
        const adjV = vGraph.get(adjKey);
        if (!adjV) continue;
        if (edgeAllWater(curV, adjV)) continue;

        // Hard block: once we've left the source lake, never return to it
        if (leftSourceLake && touchesSourceCluster(adjV)) continue;

        // Prevent rivers from running along lake edges:
        // Skip if both vertices touch lake hexes from the same cluster
        if (curClusters.size > 0) {
          const adjClusters = vertexLakeClusters(adjV);
          let sharedCluster = false;
          for (const c of curClusters) { if (adjClusters.has(c)) { sharedCluster = true; break; } }
          if (sharedCluster) continue;
        }

        let score = 0;
        const curE = vertexElev(curV), adjE = vertexElev(adjV);
        if (adjE < curE) score += (curE - adjE) * 3;
        else if (Math.abs(adjE - curE) < 0.01) score += 1.5;
        else if (adjE <= curE + 0.5) score += 0.3;
        else continue;

        const dCur = Math.hypot(curV.x - dynTargetX, curV.y - dynTargetY);
        const dAdj = Math.hypot(adjV.x - dynTargetX, adjV.y - dynTargetY);
        score += (dCur - dAdj) * urgency;

        // Terminus bonuses
        if (touchesCoast(adjV) && step >= 4) score += 2 + step * 0.3;
        if (isMapEdge(adjV) && step >= 8) score += 1.5 + step * 0.2;
        // Lake terminus (not same cluster as source)
        if (touchesLake(adjV) && step >= 5) {
          const adjClusters = vertexLakeClusters(adjV);
          let isSrcCluster = false;
          if (sourceCluster >= 0) for (const c of adjClusters) { if (c === sourceCluster) { isSrcCluster = true; break; } }
          if (!isSrcCluster) score += 2.5 + step * 0.25;
        }
        // Tributary: bonus for merging into existing river
        if (allRiverVerts.has(adjKey) && step >= 3) score += 4 + step * 0.15;

        // Anti-loop
        let loopRisk = 0;
        for (const nn of adjV.adj) { if (nn !== curKey && visited.has(nn)) loopRisk++; }
        if (loopRisk > 0) score -= loopRisk * 5;

        score += rng() * randomness;
        candidates.push({ key: adjKey, score });
      }

      if (candidates.length === 0) break;
      candidates.sort((a, b) => b.score - a.score);

      let pick;
      if (candidates.length >= 2 && step < 20 && rng() < 0.25) pick = candidates[1];
      else pick = candidates[0];

      prevKey = curKey;
      curKey = pick.key;
      pathKeys.push(curKey);
      visited.add(curKey);

      // Track segment traversal for width
      addSeg(prevKey, curKey);

      // Mark hexes sharing this edge
      const pV = vGraph.get(prevKey), cV = vGraph.get(curKey);
      for (const h1 of pV.hexes)
        for (const h2 of cV.hexes)
          if (h1.col === h2.col && h1.row === h2.row) {
            map[h1.row][h1.col].hasRiver = true;
            if (!map[h1.row][h1.col].riverIds.includes(ri)) map[h1.row][h1.col].riverIds.push(ri);
          }

      // Terminate at coast
      if (touchesCoast(cV)) { reachedTerminus = true; break; }
      // Terminate at lake (not source cluster)
      if (touchesLake(cV)) {
        const termClusters = vertexLakeClusters(cV);
        let isSrcCluster = false;
        if (sourceCluster >= 0) for (const c of termClusters) { if (c === sourceCluster) { isSrcCluster = true; break; } }
        if (!isSrcCluster) {
          reachedTerminus = true;
          for (const lh of cV.hexes) if (map[lh.row][lh.col].terrain === 'lake') {
            map[lh.row][lh.col].hasRiver = true;
            if (!map[lh.row][lh.col].riverIds.includes(ri)) map[lh.row][lh.col].riverIds.push(ri);
          }
          break;
        }
      }
      // Terminate by merging into existing river (tributary!)
      if (allRiverVerts.has(curKey) && step >= 3) { reachedTerminus = true; mergedIntoExisting = true; break; }
      // Terminate at map edge
      if (isMapEdge(cV) && step >= 8) { reachedTerminus = true; break; }
    }

    // Discard degenerate rivers that never left their source vertex (0 segments).
    // These occur when the starting vertex has no valid outward candidates
    // (e.g. surrounded by already-used river verts or all-uphill neighbours).
    // Undo the hasRiver / riverIds marks on the source hex so it is not left
    // with a stale reference to a river that has no drawable path.
    if (pathKeys.length < 2) {
      map[src.row][src.col].hasRiver = false;
      map[src.row][src.col].riverIds = map[src.row][src.col].riverIds.filter(id => id !== ri);
      ri--; // don't consume this river index; reuse it for the next attempt
      continue;
    }

    // Record vertices
    for (const k of pathKeys) allRiverVerts.add(k);
    const path = pathKeys.map(k => { const v = vGraph.get(k); return { x: v.x, y: v.y, key: k }; });

    // Determine terminus type
    let terminusType = 'none';
    if (reachedTerminus) {
      if (mergedIntoExisting) terminusType = 'merge';
      else {
        const endV = vGraph.get(pathKeys[pathKeys.length - 1]);
        if (touchesCoast(endV)) terminusType = 'coast';
        else if (touchesLake(endV)) terminusType = 'lake';
        else if (isMapEdge(endV)) terminusType = 'edge';
      }
    }

    // Find which river we merged into
    let mergedIntoRiverId = -1;
    if (mergedIntoExisting) {
      const mergeKey = pathKeys[pathKeys.length - 1];
      for (const prev of gameState.rivers) {
        if (prev.path.some(p => p.key === mergeKey)) { mergedIntoRiverId = prev.id; break; }
      }
    }

    gameState.rivers.push({
      id: ri, path, reachedTerminus, mergedIntoExisting,
      sourceKey: pathKeys[0],
      terminusKey: pathKeys[pathKeys.length - 1],
      terminusType,
      mergedIntoRiverId,
      segments: pathKeys.length - 1
    });
  }

  // Build river systems: trace each river to its final terminus
  // A "system" shares the same ultimate endpoint (coast/lake/edge)
  for (const river of gameState.rivers) {
    // Find the main river by following merge chains
    let mainRiver = river;
    const visited = new Set();
    while (mainRiver.mergedIntoRiverId >= 0 && !visited.has(mainRiver.id)) {
      visited.add(mainRiver.id);
      const target = gameState.rivers.find(r => r.id === mainRiver.mergedIntoRiverId);
      if (target) mainRiver = target; else break;
    }
    river.systemId = mainRiver.id;
    // River is a tributary if it merges into another
    river.isTributary = river.mergedIntoExisting;
  }

  // Downstream width propagation: when a tributary merges into a river,
  // all segments of the target river DOWNSTREAM of the merge point should get wider.
  // Process tributaries and propagate through merge chains.
  for (const trib of gameState.rivers) {
    if (!trib.mergedIntoExisting || trib.mergedIntoRiverId < 0) continue;
    const mergeKey = trib.terminusKey;

    // Follow the merge chain downstream
    let targetId = trib.mergedIntoRiverId;
    let curMergeKey = mergeKey;
    const chainVisited = new Set();
    while (targetId >= 0 && !chainVisited.has(targetId)) {
      chainVisited.add(targetId);
      const target = gameState.rivers.find(r => r.id === targetId);
      if (!target) break;

      // Find merge point index in target's path
      let mergeIdx = target.path.findIndex(p => p.key === curMergeKey);
      if (mergeIdx < 0) mergeIdx = 0; // fallback: whole river

      // Increment all downstream segments
      for (let i = mergeIdx; i < target.path.length - 1; i++) {
        addSeg(target.path[i].key, target.path[i + 1].key);
      }

      // If this target also merges, continue the chain
      if (target.mergedIntoRiverId >= 0) {
        curMergeKey = target.terminusKey;
        targetId = target.mergedIntoRiverId;
      } else {
        break;
      }
    }
  }

  // Store segment counts for rendering
  gameState.riverSegmentCounts = segmentCount;
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
