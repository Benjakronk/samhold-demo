# Samhold Modular Refactoring Plan

## Goal
Transform samhold-phase7.html (9,489 lines) into maintainable modular code organized by game systems, loading from index.html with separate files for each system.

## Method
Incremental extraction - one system at a time, testing functionality after each extraction to ensure nothing breaks.

## Current Status (Updated March 2026)
- ✅ **Phases 1-3 Complete**: All major data and core game systems extracted
- ✅ **Phase 4 Started**: Map Generation system successfully extracted
- ✅ **Development Environment**: Stable modular development workflow at http://localhost:3001
- ✅ **Progress**: Reduced from 9,489 lines → 6,865 lines (2,624 lines extracted across 12 modules)
- 🎯 **Current**: Phase 4+ extractions - Complex interconnected systems

## Extraction Progress

### ✅ **Phase 1: Data & Utilities (COMPLETE)**
1. ✅ **Data Definitions** → `data/terrain.js`, `data/buildings.js`, `data/units.js`, `data/threats.js`, `data/governance.js`, `data/events.js`, `data/constants.js`
2. ✅ **Hex Math & Utilities** → `utils/hexMath.js`, `utils/random.js`

### ✅ **Phase 2: Self-Contained Systems (COMPLETE)**
3. ✅ **External Threats** → `systems/externalThreats.js`
4. ✅ **Combat System** → `systems/combat.js`
5. ✅ **Governance Models** → `systems/governance.js`

### ✅ **Phase 3: Game Logic Systems (COMPLETE)**
6. ✅ **Economy System** → `systems/economy.js` (includes territory functions)
7. ✅ **Event System** → `systems/events.js`
8. ✅ **Cohesion System** → `systems/cohesion.js`

### 🔄 **Phase 4: Complex Systems (IN PROGRESS)**
9. ✅ **Map Generation** → `systems/mapGeneration.js` (COMPLETED)
10. 🔄 **Remaining High-Complexity Systems**:
    - **Rendering System** (~300 lines): Canvas drawing, hex rendering, overlays, minimap
    - **UI System** (~400 lines): HTML panels, overlays, form handling, DOM manipulation
    - **Input System** (~200 lines): Mouse/keyboard events, camera controls
    - **Turn Processing** (~100 lines): Game loop, phase management
    - **Save/Load System** (~150 lines): Serialization, persistence

## Current Architecture (12 Modules Extracted)

### **Data Layer (7 modules)**
- `data/terrain.js` - Terrain type definitions and properties
- `data/buildings.js` - Building definitions and costs
- `data/units.js` - Unit types and capabilities
- `data/threats.js` - External threat definitions
- `data/governance.js` - Governance model definitions
- `data/events.js` - Event library and consequences
- `data/constants.js` - Game constants and configuration

### **Utility Layer (2 modules)**
- `utils/hexMath.js` - Hexagonal grid mathematics
- `utils/random.js` - Seeded random number generation

### **Game Systems (5 modules)**
- `systems/externalThreats.js` - AI threat spawning and behavior
- `systems/combat.js` - Unit vs unit and unit vs threat combat
- `systems/governance.js` - Policy management and governance effects
- `systems/events.js` - Event triggering and resolution
- `systems/economy.js` - Resource management and territory
- `systems/cohesion.js` - Social cohesion calculation
- `systems/mapGeneration.js` - Procedural map generation

### **Integration Layer**
- `js/loader.js` - Module import and window binding system
- `js/core/gameState.js` - Central game state factory

## Remaining Challenges
- **Complex interconnected systems**: Rendering, UI, and Input systems have many cross-dependencies
- **Shared canvas context** - Multiple systems draw to same canvas
- **Event coordination** - Turn processing coordinates all systems
- **State management** - Careful handling of gameState references

## Success Criteria
- ✅ Game remains fully playable after each extraction
- ✅ All existing functionality preserved
- ✅ Code organized into logical, maintainable modules
- ✅ Clear separation of concerns between systems
- ✅ **12 modules successfully extracted** with stable functionality

## Current Phase: Phase 4+ Complex System Extractions