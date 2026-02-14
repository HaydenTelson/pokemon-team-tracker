// ===== Utility Functions =====

/**
 * Format Pokemon name for display
 */
function formatPokemonName(name) {
    return name.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

/**
 * Format move name for display
 */
function formatMoveName(name) {
    return name.split('-').map(word =>
        word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
}

/**
 * Get Pokemon generation from ID
 */
function getPokemonGeneration(id) {
    if (id <= 151) return 1;
    if (id <= 251) return 2;
    if (id <= 386) return 3;
    if (id <= 493) return 4;
    if (id <= 649) return 5;
    if (id <= 721) return 6;
    if (id <= 809) return 7;
    if (id <= 905) return 8;
    return 9;
}

/**
 * Filter Pokemon by selected generations
 */
function filterByGenerations(pokemonId, selectedGens) {
    const gen = getPokemonGeneration(pokemonId);
    return selectedGens.includes(gen);
}

/**
 * Calculate type effectiveness multiplier
 */
function calculateTypeEffectiveness(attackType, defenderTypes, typeData) {
    let multiplier = 1;

    defenderTypes.forEach(defType => {
        const defenderTypeData = typeData[defType];
        if (!defenderTypeData) return;

        if (defenderTypeData.doubleDamageFrom.includes(attackType)) {
            multiplier *= 2;
        } else if (defenderTypeData.halfDamageFrom.includes(attackType)) {
            multiplier *= 0.5;
        } else if (defenderTypeData.noDamageFrom.includes(attackType)) {
            multiplier *= 0;
        }
    });

    return multiplier;
}

/**
 * Get type effectiveness for a Pokemon
 */
function getPokemonTypeEffectiveness(pokemonTypes, typeData) {
    const weaknesses = {};
    const resistances = {};
    const immunities = [];

    // Calculate effectiveness for each attacking type
    Object.keys(typeData).forEach(attackType => {
        const multiplier = calculateTypeEffectiveness(attackType, pokemonTypes, typeData);

        if (multiplier === 0) {
            immunities.push(attackType);
        } else if (multiplier >= 2) {
            weaknesses[attackType] = multiplier;
        } else if (multiplier <= 0.5) {
            resistances[attackType] = multiplier;
        }
    });

    return { weaknesses, resistances, immunities };
}

/**
 * Analyze team type coverage (offensive)
 */
function analyzeTeamCoverage(team, typeData) {
    const coverage = {};

    // For each team member's selected moves
    team.forEach(member => {
        if (!member.selectedMoves) return;

        member.selectedMoves.forEach(move => {
            const moveType = move.type;

            // Check what this move is super effective against
            Object.keys(typeData).forEach(defenderType => {
                const multiplier = calculateTypeEffectiveness(moveType, [defenderType], typeData);

                if (multiplier >= 2) {
                    if (!coverage[defenderType]) {
                        coverage[defenderType] = [];
                    }
                    coverage[defenderType].push({
                        pokemon: member.name,
                        move: move.name,
                        multiplier
                    });
                }
            });
        });
    });

    return coverage;
}

/**
 * Analyze team weaknesses (defensive)
 */
function analyzeTeamWeaknesses(team, typeData) {
    const weaknessCounts = {};

    team.forEach(member => {
        const effectiveness = getPokemonTypeEffectiveness(member.types, typeData);

        Object.entries(effectiveness.weaknesses).forEach(([type, multiplier]) => {
            if (!weaknessCounts[type]) {
                weaknessCounts[type] = {
                    count: 0,
                    multipliers: []
                };
            }
            weaknessCounts[type].count++;
            weaknessCounts[type].multipliers.push(multiplier);
        });
    });

    return weaknessCounts;
}

/**
 * Find coverage gaps in team
 */
function findCoverageGaps(team, typeData) {
    const coverage = analyzeTeamCoverage(team, typeData);
    const allTypes = Object.keys(typeData);

    return allTypes.filter(type => !coverage[type]);
}

/**
 * Recommend Pokemon to fill team gaps
 */
async function recommendPokemon(team, typeData, selectedGens, maxRecommendations = 10) {
    if (team.length === 0) return [];

    const weaknesses = analyzeTeamWeaknesses(team, typeData);
    const gaps = findCoverageGaps(team, typeData);

    const recommendations = [];
    const maxPokemonId = Math.max(...selectedGens.map(gen => {
        if (gen === 1) return 151;
        if (gen === 2) return 251;
        if (gen === 3) return 386;
        if (gen === 4) return 493;
        if (gen === 5) return 649;
        if (gen === 6) return 721;
        if (gen === 7) return 809;
        if (gen === 8) return 905;
        return 1025;
    }));

    const minPokemonId = Math.min(...selectedGens.map(gen => {
        if (gen === 1) return 1;
        if (gen === 2) return 152;
        if (gen === 3) return 252;
        if (gen === 4) return 387;
        if (gen === 5) return 494;
        if (gen === 6) return 650;
        if (gen === 7) return 722;
        if (gen === 8) return 810;
        return 906;
    }));

    // Sample Pokemon from selected generations
    const sampleSize = Math.min(50, maxPokemonId - minPokemonId + 1);
    const step = Math.floor((maxPokemonId - minPokemonId) / sampleSize);

    for (let i = minPokemonId; i <= maxPokemonId && recommendations.length < maxRecommendations; i += step) {
        if (!filterByGenerations(i, selectedGens)) continue;

        try {
            const pokemon = await getPokemon(i);
            const pokemonTypes = pokemon.types.map(t => t.type.name);

            // Skip if already in team
            if (team.some(member => member.id === pokemon.id)) continue;

            const score = calculateRecommendationScore(pokemon, pokemonTypes, weaknesses, gaps, typeData);

            if (score.total > 0) {
                recommendations.push({
                    pokemon,
                    score: score.total,
                    reasons: score.reasons
                });
            }
        } catch (error) {
            continue;
        }
    }

    return recommendations
        .sort((a, b) => b.score - a.score)
        .slice(0, maxRecommendations);
}

/**
 * Calculate recommendation score for a Pokemon
 */
function calculateRecommendationScore(pokemon, pokemonTypes, teamWeaknesses, coverageGaps, typeData) {
    let score = 0;
    const reasons = [];

    // Check if this Pokemon resists common team weaknesses
    const effectiveness = getPokemonTypeEffectiveness(pokemonTypes, typeData);

    Object.keys(teamWeaknesses).forEach(weakType => {
        if (effectiveness.resistances[weakType] || effectiveness.immunities.includes(weakType)) {
            score += teamWeaknesses[weakType].count * 2;
            reasons.push(`Resists ${formatPokemonName(weakType)}`);
        }
    });

    // Check if this Pokemon's types provide coverage for gaps
    pokemonTypes.forEach(type => {
        const typeInfo = typeData[type];
        if (!typeInfo) return;

        typeInfo.doubleDamageTo.forEach(targetType => {
            if (coverageGaps.includes(targetType)) {
                score += 1;
                if (!reasons.includes(`Provides ${formatPokemonName(type)} coverage`)) {
                    reasons.push(`Provides ${formatPokemonName(type)} coverage`);
                }
            }
        });
    });

    return {
        total: score,
        reasons: reasons.slice(0, 2) // Limit to top 2 reasons
    };
}

/**
 * Parse evolution chain recursively
 */
function parseEvolutionChain(chain) {
    const evolutions = [];

    function traverse(node) {
        evolutions.push({
            species: node.species.name,
            minLevel: node.evolution_details[0]?.min_level || null,
            trigger: node.evolution_details[0]?.trigger?.name || null,
            item: node.evolution_details[0]?.item?.name || null,
            minHappiness: node.evolution_details[0]?.min_happiness || null,
            timeOfDay: node.evolution_details[0]?.time_of_day || null
        });

        node.evolves_to.forEach(evolution => traverse(evolution));
    }

    traverse(chain);
    return evolutions;
}

/**
 * Format evolution condition for display
 */
function formatEvolutionCondition(evolution) {
    if (!evolution.trigger) return 'Does not evolve';

    if (evolution.trigger === 'level-up') {
        if (evolution.minLevel) {
            return `Level ${evolution.minLevel}`;
        }
        if (evolution.minHappiness) {
            return `High friendship`;
        }
        if (evolution.timeOfDay) {
            return `Level up (${evolution.timeOfDay})`;
        }
        return 'Level up';
    }

    if (evolution.trigger === 'use-item' && evolution.item) {
        return formatPokemonName(evolution.item);
    }

    if (evolution.trigger === 'trade') {
        if (evolution.item) {
            return `Trade holding ${formatPokemonName(evolution.item)}`;
        }
        return 'Trade';
    }

    return formatPokemonName(evolution.trigger);
}

/**
 * Get next evolution for a Pokemon
 */
function getNextEvolution(pokemonName, evolutionChain) {
    const evolutions = parseEvolutionChain(evolutionChain.chain);
    const currentIndex = evolutions.findIndex(e => e.species === pokemonName);

    if (currentIndex === -1 || currentIndex === evolutions.length - 1) {
        return null;
    }

    return evolutions[currentIndex + 1];
}

/**
 * Debounce function for search inputs
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Local storage helpers
 */
const Storage = {
    save(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    },

    load(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error loading from localStorage:', error);
            return null;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
        } catch (error) {
            console.error('Error removing from localStorage:', error);
        }
    }
};
