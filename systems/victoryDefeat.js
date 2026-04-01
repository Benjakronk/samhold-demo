// systems/victoryDefeat.js
// Victory and defeat conditions, scoring, and end-game dialogs
// Handles win/loss detection, final scoring, and educational feedback systems

let gameState = null;

// Victory scoring system - evaluates at target turn (60-80)
const VICTORY_TARGET_TURN = 400; // Extended to 100 years for deeper societal development

export function initVictoryDefeat(gameStateRef) {
    gameState = gameStateRef;
}

// Main victory/defeat checking function
export function checkVictoryConditions() {
    // Don't check win/loss conditions if game has already ended
    if (gameState.gameEnded) {
        return;
    }

    // Check for loss conditions first
    const lossCondition = checkLossConditions();
    if (lossCondition) {
        gameState.gameEnded = true;
        updateEndTurnButton();
        showDefeatSummary(lossCondition);
        return;
    }

    // Check if we've reached the victory evaluation point
    if (gameState.turn >= VICTORY_TARGET_TURN) {
        console.log(`🏆 Victory condition reached at turn ${gameState.turn}!`);
        gameState.gameEnded = true;
        updateEndTurnButton();
        const scores = calculateVictoryScores();
        console.log('📊 Victory scores calculated:', scores);
        showPostGameSummary(scores);
    }
}

// Loss condition detection
export function checkLossConditions() {
    // 1. Total Population Collapse (respecting sole survivor protection)
    // Loss only occurs if BOTH adult population AND all children are gone
    const totalAdults = gameState.population.total;
    const totalChildren = gameState.childCohorts.reduce((sum, cohort) => sum + cohort.count, 0);

    if (totalAdults === 0 && totalChildren === 0) {
        return {
            type: 'extinction',
            title: 'Civilization Lost',
            message: 'Your people have disappeared from history. The last survivors succumbed to the harsh realities of early civilization.',
            icon: '💀'
        };
    }

    // 2. Complete Social Collapse (cohesion at 0 for extended period)
    // Only triggers if cohesion has been at or below 5 for multiple turns
    if (!gameState.victoryTracking.collapseTimer) {
        gameState.victoryTracking.collapseTimer = 0;
    }

    if (gameState.cohesion.total <= 5) {
        gameState.victoryTracking.collapseTimer++;
        if (gameState.victoryTracking.collapseTimer >= 3) {
            return {
                type: 'collapse',
                title: 'Society Collapsed',
                message: 'Your society has completely fractured. Without unity, identity, or shared purpose, your people have scattered to the winds.',
                icon: '💔'
            };
        }
    } else {
        gameState.victoryTracking.collapseTimer = 0;
    }

    // 3. Total Settlement Loss (all settlements destroyed)
    if (gameState.settlements.length === 0 && gameState.turn > 5) {
        return {
            type: 'homeless',
            title: 'Lost and Wandering',
            message: 'With no settlements remaining, your people have become nomads without purpose or direction. Civilization has returned to the wild.',
            icon: '🏚️'
        };
    }

    return null; // No loss condition met
}

// Victory scoring calculation
export function calculateVictoryScores() {
    const scores = {};

    // 1. Survival - Did you make it to the end?
    scores.survival = {
        achieved: true,
        score: 100,
        description: "Your society survived to see the future"
    };

    // 2. Prosperity - Food surplus, population size, material wealth
    const totalResources = gameState.resources.food + gameState.resources.materials;
    const populationScore = Math.min(100, (gameState.population.total / 60) * 100); // Adjusted for better scaling
    const resourceScore = Math.min(100, (totalResources / 600) * 100); // Adjusted for higher starting resources
    scores.prosperity = {
        score: Math.floor((populationScore + resourceScore) / 2),
        description: `Population: ${gameState.population.total}, Resources: ${totalResources}`,
        details: { population: gameState.population.total, resources: totalResources }
    };

    // 3. Cohesion - Final cohesion score across all four pillars
    scores.cohesion = {
        score: Math.floor(gameState.cohesion.total),
        description: `Identity: ${gameState.cohesion.identity}, Legitimacy: ${gameState.cohesion.legitimacy}, Satisfaction: ${gameState.cohesion.satisfaction}, Bonds: ${gameState.cohesion.bonds}`,
        details: {
            identity: gameState.cohesion.identity,
            legitimacy: gameState.cohesion.legitimacy,
            satisfaction: gameState.cohesion.satisfaction,
            bonds: gameState.cohesion.bonds,
            total: gameState.cohesion.total
        }
    };

    // 4. Legacy - Stories, traditions, monuments, cultural artifacts
    // Count cultural buildings and settlements as legacy markers
    const culturalBuildings = countBuildingsByType(['monument', 'temple', 'council']);
    const settlements = gameState.settlements.length;
    const legacyScore = Math.min(100, (culturalBuildings * 15 + settlements * 10));
    scores.legacy = {
        score: legacyScore,
        description: `Settlements: ${settlements}, Cultural buildings: ${culturalBuildings}`,
        details: { settlements, culturalBuildings }
    };

    // 5. Resilience - Crises survived without cohesion dropping below 40
    // Track minimum cohesion reached during the game
    if (!gameState.victoryTracking) {
        gameState.victoryTracking = { minCohesion: gameState.cohesion.total };
    }
    gameState.victoryTracking.minCohesion = Math.min(gameState.victoryTracking.minCohesion, gameState.cohesion.total);

    const resilienceScore = gameState.victoryTracking.minCohesion >= 40 ? 100 : Math.max(0, gameState.victoryTracking.minCohesion * 2.5);
    scores.resilience = {
        score: Math.floor(resilienceScore),
        description: `Minimum cohesion reached: ${Math.floor(gameState.victoryTracking.minCohesion)}`,
        details: { minCohesion: gameState.victoryTracking.minCohesion }
    };

    // 6. Adaptability - Governance/policy changes made successfully
    const governanceChanges = gameState.victoryTracking?.governanceChanges || 0;
    const adaptabilityScore = Math.min(100, governanceChanges * 25);
    scores.adaptability = {
        score: adaptabilityScore,
        description: `Successful governance transitions: ${governanceChanges}`,
        details: { governanceChanges }
    };

    // Calculate overall score
    const totalScore = Math.floor((scores.survival.score + scores.prosperity.score + scores.cohesion.score + scores.legacy.score + scores.resilience.score + scores.adaptability.score) / 6);
    scores.overall = {
        score: totalScore,
        description: getOverallRating(totalScore)
    };

    return scores;
}

// Defeat dialog display
export function showDefeatSummary(lossCondition) {
    // Calculate some basic stats for the defeat summary
    const finalStats = {
        turns: gameState.turn,
        year: gameState.year,
        season: window.SEASONS[gameState.season],
        population: gameState.population.total,
        children: gameState.childCohorts.reduce((sum, cohort) => sum + cohort.count, 0),
        settlements: gameState.settlements.length,
        cohesion: Math.floor(gameState.cohesion.total),
        food: gameState.resources.food,
        materials: gameState.resources.materials
    };

    // Create the defeat overlay
    const overlay = document.createElement('div');
    overlay.id = 'defeat-overlay';
    overlay.innerHTML = `
        <div class="defeat-dialog">
            <h2>${lossCondition.icon} ${lossCondition.title}</h2>
            <div class="defeat-subtitle">Turn ${finalStats.turns} — ${finalStats.season} of Year ${finalStats.year}</div>

            <div class="defeat-message">
                <p>${lossCondition.message}</p>
            </div>

            <div class="defeat-final-state">
                <h3>📊 Final State of Your Civilization</h3>
                <div class="defeat-stats">
                    <div class="defeat-stat">
                        <span class="defeat-stat-label">👥 Population:</span>
                        <span class="defeat-stat-value">${finalStats.population} adults, ${finalStats.children} children</span>
                    </div>
                    <div class="defeat-stat">
                        <span class="defeat-stat-label">🏛️ Settlements:</span>
                        <span class="defeat-stat-value">${finalStats.settlements}</span>
                    </div>
                    <div class="defeat-stat">
                        <span class="defeat-stat-label">🤝 Cohesion:</span>
                        <span class="defeat-stat-value">${finalStats.cohesion}/100</span>
                    </div>
                    <div class="defeat-stat">
                        <span class="defeat-stat-label">🍞 Food:</span>
                        <span class="defeat-stat-value">${finalStats.food}</span>
                    </div>
                    <div class="defeat-stat">
                        <span class="defeat-stat-label">🪵 Materials:</span>
                        <span class="defeat-stat-value">${finalStats.materials}</span>
                    </div>
                </div>
            </div>

            <div class="defeat-lesson">
                <h3>📚 Lessons Learned</h3>
                ${getDefeatLesson(lossCondition.type)}
            </div>

            <div class="defeat-actions">
                <button class="defeat-btn" onclick="closeDefeatSummary()">📈 New Game</button>
                <button class="defeat-btn secondary" onclick="closeDefeatSummary()">🔍 Continue Observing</button>
            </div>
        </div>
    `;

    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 1000;
        background: rgba(10,8,6,0.9);
        display: flex; justify-content: center; align-items: center;
        padding: 20px;
    `;

    document.body.appendChild(overlay);
}

// Educational lessons for different defeat types
export function getDefeatLesson(defeatType) {
    switch(defeatType) {
        case 'extinction':
            return `
                <p>Population management is the foundation of civilization. Consider:</p>
                <ul>
                    <li>Balance food production with population growth</li>
                    <li>Protect children during crises - they are your future</li>
                    <li>Maintain multiple food sources to survive disasters</li>
                    <li>Monitor seasonal patterns and plan ahead for winter</li>
                </ul>
            `;
        case 'collapse':
            return `
                <p>Social cohesion holds civilizations together. Remember:</p>
                <ul>
                    <li>Balance material needs with cultural satisfaction</li>
                    <li>Governance policies have long-term social consequences</li>
                    <li>Identity, legitimacy, satisfaction, and bonds all matter</li>
                    <li>Crisis management requires both resources and unity</li>
                </ul>
            `;
        case 'homeless':
            return `
                <p>Settlements provide the foundation for organized society:</p>
                <ul>
                    <li>Protect your settlements from external threats</li>
                    <li>Build defensive units when threats appear</li>
                    <li>Maintain cohesion to prevent internal collapse</li>
                    <li>Don't overextend - multiple settlements can be harder to defend</li>
                </ul>
            `;
        default:
            return '<p>Every failure teaches valuable lessons about the complexities of early civilization.</p>';
    }
}

// Victory dialog display
export function showPostGameSummary(scores) {
    console.log('🎯 Victory dialog triggered!', scores);
    // Create the victory overlay
    const overlay = document.createElement('div');
    overlay.id = 'victory-overlay';
    overlay.innerHTML = `
        <div class="victory-dialog">
            <h2>🏛️ The Story of Your Civilization</h2>
            <div class="victory-subtitle">Turn ${gameState.turn} — ${window.SEASONS[gameState.season]} of Year ${gameState.year}</div>

            <div class="victory-overall">
                <div class="victory-overall-score">${scores.overall.score}/100</div>
                <div class="victory-overall-rating">${scores.overall.description}</div>
            </div>

            <div class="victory-categories">
                <div class="victory-category">
                    <div class="victory-category-header">
                        <span class="victory-category-name">🛡️ Survival</span>
                        <span class="victory-category-score">${scores.survival.score}/100</span>
                    </div>
                    <div class="victory-category-desc">${scores.survival.description}</div>
                </div>

                <div class="victory-category">
                    <div class="victory-category-header">
                        <span class="victory-category-name">💰 Prosperity</span>
                        <span class="victory-category-score">${scores.prosperity.score}/100</span>
                    </div>
                    <div class="victory-category-desc">${scores.prosperity.description}</div>
                </div>

                <div class="victory-category">
                    <div class="victory-category-header">
                        <span class="victory-category-name">🤝 Cohesion</span>
                        <span class="victory-category-score">${scores.cohesion.score}/100</span>
                    </div>
                    <div class="victory-category-desc">${scores.cohesion.description}</div>
                </div>

                <div class="victory-category">
                    <div class="victory-category-header">
                        <span class="victory-category-name">📚 Legacy</span>
                        <span class="victory-category-score">${scores.legacy.score}/100</span>
                    </div>
                    <div class="victory-category-desc">${scores.legacy.description}</div>
                </div>

                <div class="victory-category">
                    <div class="victory-category-header">
                        <span class="victory-category-name">💪 Resilience</span>
                        <span class="victory-category-score">${scores.resilience.score}/100</span>
                    </div>
                    <div class="victory-category-desc">${scores.resilience.description}</div>
                </div>

                <div class="victory-category">
                    <div class="victory-category-header">
                        <span class="victory-category-name">🔄 Adaptability</span>
                        <span class="victory-category-score">${scores.adaptability.score}/100</span>
                    </div>
                    <div class="victory-category-desc">${scores.adaptability.description}</div>
                </div>
            </div>

            <div class="victory-story">
                <h3>Your Civilization's Story</h3>
                <div class="victory-narrative">${generateCivilizationNarrative(scores)}</div>
            </div>

            <div class="victory-actions">
                <button onclick="continuePlay()" class="victory-continue">Continue Playing</button>
                <button onclick="restartGame()" class="victory-restart">Start New Game</button>
            </div>
        </div>
    `;

    overlay.style.cssText = `
        position: fixed; inset: 0; z-index: 1000;
        background: rgba(10,8,6,0.9);
        display: flex; justify-content: center; align-items: center;
        padding: 20px;
    `;

    console.log('🎯 About to append victory dialog to body');
    document.body.appendChild(overlay);
    console.log('✅ Victory dialog appended successfully!');
}

// Generate educational narrative based on scores
export function generateCivilizationNarrative(scores) {
    const narratives = [];

    // Opening based on overall score
    if (scores.overall.score >= 80) {
        narratives.push("Your people built a civilization that will be remembered for generations.");
    } else if (scores.overall.score >= 60) {
        narratives.push("Through challenge and growth, your society found its place in the world.");
    } else if (scores.overall.score >= 40) {
        narratives.push("Despite many hardships, your people persevered and survived.");
    } else {
        narratives.push("Your society faced overwhelming challenges, yet something endures.");
    }

    // Prosperity narrative
    if (scores.prosperity.score >= 70) {
        narratives.push("Abundance flowed through your lands, providing security and comfort for all.");
    } else if (scores.prosperity.score >= 40) {
        narratives.push("Your people worked hard to meet their needs, finding modest prosperity.");
    } else {
        narratives.push("Scarcity was a constant companion, testing your society's resolve.");
    }

    // Cohesion narrative
    if (scores.cohesion.score >= 80) {
        narratives.push("Strong bonds united your people in shared purpose and identity.");
    } else if (scores.cohesion.score >= 60) {
        narratives.push("Your society maintained its unity through good times and bad.");
    } else if (scores.cohesion.score >= 40) {
        narratives.push("Internal tensions challenged your people, but they held together.");
    } else {
        narratives.push("Division and strife marked your society's path, yet it endured.");
    }

    // Legacy ending
    if (scores.legacy.score >= 50) {
        narratives.push("The traditions and monuments you built will inspire future generations.");
    } else {
        narratives.push("Your people's story, though humble, adds to the great tapestry of human experience.");
    }

    return narratives.join(" ");
}

// Support functions
export function countBuildingsByType(types) {
    let count = 0;
    for (let r = 0; r < window.MAP_ROWS; r++) {
        for (let c = 0; c < window.MAP_COLS; c++) {
            const hex = gameState.map[r][c];
            if (hex.building && types.includes(hex.building)) {
                count++;
            }
        }
    }
    return count;
}

export function getOverallRating(score) {
    if (score >= 90) return "Legendary Civilization";
    if (score >= 80) return "Great Society";
    if (score >= 70) return "Flourishing Culture";
    if (score >= 60) return "Stable Community";
    if (score >= 50) return "Growing Settlement";
    if (score >= 40) return "Struggling Society";
    return "Barely Surviving";
}

export function trackGovernanceChange() {
    if (!gameState.victoryTracking) {
        gameState.victoryTracking = { governanceChanges: 0, minCohesion: gameState.cohesion.total };
    }
    gameState.victoryTracking.governanceChanges = (gameState.victoryTracking.governanceChanges || 0) + 1;
}

export function updateEndTurnButton() {
    const button = document.getElementById('end-turn-btn');
    if (gameState.gameEnded) {
        button.textContent = 'Game Ended';
        button.style.opacity = '0.5';
        button.style.cursor = 'not-allowed';
        button.title = 'The game has ended. Start a new game to continue.';
    } else {
        button.textContent = 'End Turn';
        button.style.opacity = '1';
        button.style.cursor = 'pointer';
        button.title = '';
    }
}

// Dialog close functions
export function closeDefeatSummary() {
    const overlay = document.getElementById('defeat-overlay');
    if (overlay) {
        overlay.remove();
    }
    // For now, just close the overlay. In a full implementation,
    // this could restart the game or return to a main menu
}

export function continuePlay() {
    const overlay = document.getElementById('victory-overlay');
    if (overlay) overlay.remove();
}

export function restartGame() {
    if (confirm('Are you sure you want to start a new game? Your current progress will be lost.')) {
        location.reload();
    }
}

// Expose victory target constant
export { VICTORY_TARGET_TURN };