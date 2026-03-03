# Samhold Modular Refactoring Plan

## Goal
Transform samhold-phase7.html (9,489 lines) into maintainable modular code organized by game systems, loading from index.html with separate files for each system.

## Method
Incremental extraction - one system at a time, testing functionality after each extraction to ensure nothing breaks.

## Current Status
- ✅ **Baseline Setup Complete**: Development server running at http://localhost:3001
- ✅ **Starting Point**: index.html with full Phase 7 functionality (all systems working)
- 🎯 **Next**: Begin Phase 1 extractions

## Extraction Order (Based on Dependency Analysis)

### **Phase 1: Data & Utilities (Safest First)**
1. **Data Definitions** (lines 1814-2012) - TERRAIN, BUILDINGS, UNIT_TYPES, THREAT_TYPES
2. **Hex Math & Utilities** (lines 2013-2074) - Pure functions, no side effects
3. **Map Generation** (lines 2074-2552) - Self-contained, runs once

### **Phase 2: Self-Contained Systems**
4. **External Threats** (lines 3056-3314) - Clear boundaries, minimal dependencies
5. **Combat System** (lines 3314-3498) - Well-defined inputs/outputs
6. **Governance Models** (lines 3702-3770) - Mostly data definitions

### **Phase 3: Game Logic Systems**
7. **Territory System** (lines 2552-2650) - Foundational but used by many others
8. **Population & Aging** (lines 3624-3702) - Medium complexity, manageable dependencies
9. **Units System** (lines 2650-3056) - Depends on territory, needed by combat

### **Phase 4: Complex Core Systems**
10. **Economy System** (lines 3498-3624) - Complex but core functionality
11. **Event System** (lines 3770-4672) - Large but can be isolated
12. **Governance Functions** (lines 5039-5352) - Depends on governance models

### **Phase 5: High-Coupling Systems (Most Risky)**
13. **Cohesion System** (lines 4672-5039) - Reads from many systems
14. **Rendering System** (lines 5352-6096) - Needs access to most game state
15. **Input System** (lines 6096-6213) - Triggers actions across systems
16. **UI Systems** (lines 6213-6792) - Displays data from all systems
17. **Turn Processing** (lines 6792-6834) - Orchestrates everything (extract last)

## Key Challenges to Watch For
- **630+ references to `gameState`** - Need careful state management
- **Circular dependencies** between UI and game systems
- **Shared canvas context** - Multiple systems draw to same canvas
- **Cross-system event coordination** - Turn processing coordinates all systems

## Success Criteria
- ✅ Game remains fully playable after each extraction
- ✅ All existing functionality preserved
- ✅ Code organized into logical, maintainable modules
- ✅ Clear separation of concerns between systems

## Current Phase: Starting Phase 1 - Data Definitions