// ===== Application State =====
const state = {
    team: [],
    typeData: null,
    selectedGenerations: [1, 2, 3, 4, 5, 6, 7, 8, 9],
    currentOpponent: null,
    currentPokedexPokemon: null
};

// ===== Initialization =====
document.addEventListener('DOMContentLoaded', async () => {
    // Load saved data
    loadFromStorage();

    // Initialize type data
    await initializeTypeData();

    // Set up event listeners
    setupEventListeners();

    // Render initial state
    renderTeam();
    renderTeamAnalysis();
});

/**
 * Initialize type effectiveness data
 */
async function initializeTypeData() {
    try {
        state.typeData = await getAllTypeEffectiveness();
    } catch (error) {
        console.error('Error loading type data:', error);
    }
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });

    // Team manager search
    const teamSearch = document.getElementById('pokemon-search');
    teamSearch.addEventListener('input', debounce(handleTeamSearch, 300));

    // Battle helper search
    const opponentSearch = document.getElementById('opponent-search');
    opponentSearch.addEventListener('input', debounce(handleOpponentSearch, 300));

    // Pokedex search
    const pokedexSearch = document.getElementById('pokedex-search');
    pokedexSearch.addEventListener('input', debounce(handlePokedexSearch, 300));

    // Bulk level up
    document.getElementById('bulk-level-up').addEventListener('click', bulkLevelUp);

    // Generation filter
    document.querySelectorAll('.gen-checkbox input').forEach(checkbox => {
        checkbox.addEventListener('change', handleGenerationChange);
    });

    // Modal close
    document.getElementById('pokemon-detail-modal').addEventListener('click', (e) => {
        if (e.target.classList.contains('modal') || e.target.classList.contains('modal-close')) {
            closeModal();
        }
    });

    // Click outside search results to close
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-box')) {
            document.querySelectorAll('.search-results').forEach(el => el.classList.add('hidden'));
        }
    });
}

/**
 * Switch between tabs
 */
function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.toggle('active', pane.id === tabName);
    });

    // Load tab-specific data
    if (tabName === 'research') {
        renderRecommendations();
    }
}

/**
 * Handle team search with autocomplete
 */
async function handleTeamSearch(e) {
    const query = e.target.value.trim();
    const resultsContainer = document.getElementById('search-results');

    if (query.length < 1) {
        resultsContainer.classList.add('hidden');
        return;
    }

    try {
        const results = await autocompletePokemon(query, 8);

        if (results.length > 0) {
            resultsContainer.innerHTML = results.map(result => {
                const types = result.types.map(type =>
                    `<span class="type-badge ${type}">${type}</span>`
                ).join('');

                return `
                    <div class="search-result-item" data-pokemon-id="${result.id}">
                        <img src="${result.sprite}" alt="${result.name}" class="search-result-sprite">
                        <div class="search-result-info">
                            <div class="search-result-name">${formatPokemonName(result.name)}</div>
                            <div class="search-result-number">#${String(result.id).padStart(3, '0')}</div>
                            <div class="type-badges">${types}</div>
                        </div>
                    </div>
                `;
            }).join('');
            resultsContainer.classList.remove('hidden');

            // Add click handlers
            resultsContainer.querySelectorAll('.search-result-item').forEach((item, index) => {
                item.addEventListener('click', () => {
                    addToTeam(results[index].pokemon);
                    e.target.value = '';
                    resultsContainer.classList.add('hidden');
                });
            });
        } else {
            resultsContainer.innerHTML = '<div class="empty-state">No Pokémon found</div>';
            resultsContainer.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Search error:', error);
        resultsContainer.innerHTML = '<div class="empty-state">Error searching Pokémon</div>';
        resultsContainer.classList.remove('hidden');
    }
}

/**
 * Handle opponent search with autocomplete
 */
async function handleOpponentSearch(e) {
    const query = e.target.value.trim();
    const resultsContainer = document.getElementById('opponent-results');

    if (query.length < 1) {
        resultsContainer.classList.add('hidden');
        return;
    }

    try {
        const results = await autocompletePokemon(query, 8);

        if (results.length > 0) {
            resultsContainer.innerHTML = results.map(result => {
                const types = result.types.map(type =>
                    `<span class="type-badge ${type}">${type}</span>`
                ).join('');

                return `
                    <div class="search-result-item" data-pokemon-id="${result.id}">
                        <img src="${result.sprite}" alt="${result.name}" class="search-result-sprite">
                        <div class="search-result-info">
                            <div class="search-result-name">${formatPokemonName(result.name)}</div>
                            <div class="search-result-number">#${String(result.id).padStart(3, '0')}</div>
                            <div class="type-badges">${types}</div>
                        </div>
                    </div>
                `;
            }).join('');
            resultsContainer.classList.remove('hidden');

            resultsContainer.querySelectorAll('.search-result-item').forEach((item, index) => {
                item.addEventListener('click', () => {
                    selectOpponent(results[index].pokemon);
                    e.target.value = '';
                    resultsContainer.classList.add('hidden');
                });
            });
        } else {
            resultsContainer.innerHTML = '<div class="empty-state">No Pokémon found</div>';
            resultsContainer.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Search error:', error);
        resultsContainer.innerHTML = '<div class="empty-state">Error searching Pokémon</div>';
        resultsContainer.classList.remove('hidden');
    }
}

/**
 * Handle pokedex search with autocomplete
 */
async function handlePokedexSearch(e) {
    const query = e.target.value.trim();
    const resultsContainer = document.getElementById('pokedex-results');

    if (query.length < 1) {
        resultsContainer.classList.add('hidden');
        return;
    }

    try {
        const results = await autocompletePokemon(query, 8);

        if (results.length > 0) {
            resultsContainer.innerHTML = results.map(result => {
                const types = result.types.map(type =>
                    `<span class="type-badge ${type}">${type}</span>`
                ).join('');

                return `
                    <div class="search-result-item" data-pokemon-id="${result.id}">
                        <img src="${result.sprite}" alt="${result.name}" class="search-result-sprite">
                        <div class="search-result-info">
                            <div class="search-result-name">${formatPokemonName(result.name)}</div>
                            <div class="search-result-number">#${String(result.id).padStart(3, '0')}</div>
                            <div class="type-badges">${types}</div>
                        </div>
                    </div>
                `;
            }).join('');
            resultsContainer.classList.remove('hidden');

            resultsContainer.querySelectorAll('.search-result-item').forEach((item, index) => {
                item.addEventListener('click', async () => {
                    await showPokedexDetail(results[index].pokemon);
                    resultsContainer.classList.add('hidden');
                });
            });
        } else {
            resultsContainer.innerHTML = '<div class="empty-state">No Pokémon found</div>';
            resultsContainer.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Search error:', error);
        resultsContainer.innerHTML = '<div class="empty-state">Error searching Pokémon</div>';
        resultsContainer.classList.remove('hidden');
    }
}

/**
 * Create search result HTML
 */
function createSearchResultHTML(pokemon) {
    const types = pokemon.types.map(t =>
        `<span class="type-badge ${t.type.name}">${t.type.name}</span>`
    ).join('');

    return `
        <div class="search-result-item">
            <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}" class="search-result-sprite">
            <div class="search-result-info">
                <div class="search-result-name">${formatPokemonName(pokemon.name)}</div>
                <div class="search-result-number">#${String(pokemon.id).padStart(3, '0')}</div>
                <div class="type-badges">${types}</div>
            </div>
        </div>
    `;
}

/**
 * Add Pokemon to team
 */
function addToTeam(pokemon) {
    if (state.team.length >= 6) {
        alert('Your team is full! Remove a Pokémon first.');
        return;
    }

    if (state.team.some(member => member.id === pokemon.id)) {
        alert('This Pokémon is already in your team!');
        return;
    }

    const teamMember = {
        id: pokemon.id,
        name: pokemon.name,
        level: 5,
        types: pokemon.types.map(t => t.type.name),
        sprite: pokemon.sprites.front_default,
        selectedMoves: [],
        pokemonData: pokemon
    };

    state.team.push(teamMember);
    saveToStorage();
    renderTeam();
    renderTeamAnalysis();
}

/**
 * Remove Pokemon from team
 */
function removeFromTeam(index) {
    state.team.splice(index, 1);
    saveToStorage();
    renderTeam();
    renderTeamAnalysis();
}

/**
 * Update Pokemon level
 */
function updateLevel(index, newLevel) {
    const level = Math.max(1, Math.min(100, parseInt(newLevel) || 1));
    state.team[index].level = level;
    saveToStorage();
    renderTeam();
}

/**
 * Bulk level up all team members
 */
function bulkLevelUp() {
    state.team.forEach(member => {
        member.level = Math.min(100, member.level + 1);
    });
    saveToStorage();
    renderTeam();
}

/**
 * Render team roster
 */
async function renderTeam() {
    const roster = document.getElementById('team-roster');
    const teamCount = document.getElementById('team-count');
    const bulkLevelBtn = document.getElementById('bulk-level-up');

    teamCount.textContent = `(${state.team.length}/6)`;
    bulkLevelBtn.disabled = state.team.length === 0;

    if (state.team.length === 0) {
        roster.innerHTML = `
            <div class="empty-team-message">
                <p>No Pokémon in your team yet!</p>
                <p class="hint">Search above to add your first team member</p>
            </div>
        `;
        return;
    }

    // Render each team member with enhanced info
    const teamHTML = await Promise.all(state.team.map(async (member, index) => {
        const types = member.types.map(type =>
            `<span class="type-badge ${type}">${type}</span>`
        ).join('');

        // Selected moves HTML
        const selectedMovesHTML = member.selectedMoves && member.selectedMoves.length > 0 ? `
            <div class="selected-moves">
                <h4>Moves</h4>
                ${member.selectedMoves.map(move => `
                    <div class="selected-move-item">
                        <span>${formatMoveName(move.name)}</span>
                        <span class="type-badge ${move.type}">${move.type}</span>
                    </div>
                `).join('')}
            </div>
        ` : '';

        // Get next move info
        let nextMoveHTML = '';
        try {
            const pokemon = member.pokemonData || await getPokemon(member.id);
            const upcomingMoves = getUpcomingMoves(pokemon, member.level, 1);
            if (upcomingMoves.length > 0) {
                const nextMove = upcomingMoves[0];
                nextMoveHTML = `
                    <div class="next-move-info">
                        <strong>Next Move:</strong> ${formatMoveName(nextMove.name)} <span class="level">(Lv. ${nextMove.learnedAt})</span>
                    </div>
                `;
            }

            // Get next evolution info
            const evolutionChain = await getPokemonEvolutionChain(pokemon.id);
            const nextEvolution = getNextEvolution(pokemon.name, evolutionChain);
            if (nextEvolution && nextEvolution.minLevel) {
                nextMoveHTML += `
                    <div class="next-evolution-info">
                        <strong>Evolution:</strong> <span class="level">Lv. ${nextEvolution.minLevel}</span> (${formatPokemonName(nextEvolution.species)})
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error fetching next move/evolution:', error);
        }

        return `
            <div class="team-member" data-index="${index}">
                <div class="team-member-header">
                    <img src="${member.sprite}" alt="${member.name}" class="team-member-sprite">
                    <div class="team-member-actions">
                        <button class="btn-icon danger" onclick="removeFromTeam(${index})" title="Remove">✕</button>
                    </div>
                </div>
                <div class="team-member-info">
                    <h3>${formatPokemonName(member.name)}</h3>
                    <div class="team-member-number">#${String(member.id).padStart(3, '0')}</div>
                    <div class="level-control">
                        <label>Level:</label>
                        <button class="level-btn" onclick="updateLevel(${index}, ${member.level - 1})">−</button>
                        <input 
                            type="number" 
                            class="level-input" 
                            value="${member.level}" 
                            min="1" 
                            max="100"
                            onchange="updateLevel(${index}, this.value)"
                        >
                        <button class="level-btn" onclick="updateLevel(${index}, ${member.level + 1})">+</button>
                    </div>
                    <div class="type-badges">${types}</div>
                    ${selectedMovesHTML}
                    ${nextMoveHTML}
                </div>
            </div>
        `;
    }));

    roster.innerHTML = teamHTML.join('');

    // Add click handlers to open detail modal
    document.querySelectorAll('.team-member').forEach((el, index) => {
        el.addEventListener('click', (e) => {
            if (!e.target.closest('button') && !e.target.closest('input')) {
                showPokemonDetail(index);
            }
        });
    });
}

/**
 * Show Pokemon detail modal
 */
async function showPokemonDetail(index) {
    const member = state.team[index];
    const modal = document.getElementById('pokemon-detail-modal');
    const content = document.getElementById('pokemon-detail-content');

    try {
        const pokemon = member.pokemonData || await getPokemon(member.id);
        const allMoves = getAllLearnableMoves(pokemon);
        const upcomingMoves = getUpcomingMoves(pokemon, member.level);
        const evolutionChain = await getPokemonEvolutionChain(pokemon.id);
        const nextEvolution = getNextEvolution(pokemon.name, evolutionChain);

        const effectiveness = getPokemonTypeEffectiveness(member.types, state.typeData);

        // Helper function to create move list HTML for a tab
        const createMoveListHTML = (moves, showLevel = false) => {
            if (moves.length === 0) {
                return '<p class="empty-state">No moves available</p>';
            }

            return moves.map(move => {
                const isSelected = member.selectedMoves.some(m => m.name === move.name);
                const levelInfo = showLevel && move.level ? ` (Lv. ${move.level})` : '';
                return `
                    <div class="move-item ${isSelected ? 'selected' : ''}" data-move="${move.name}">
                        <div>
                            <div class="move-name">${formatMoveName(move.name)}${levelInfo}</div>
                        </div>
                        <button class="btn-secondary" onclick="toggleMove(${index}, '${move.name}', event)">
                            ${isSelected ? 'Remove' : 'Add'}
                        </button>
                    </div>
                `;
            }).join('');
        };

        // Build tabbed move selection HTML
        const moveSelectionHTML = `
            <div class="move-selection">
                <h4>Select Moves (${member.selectedMoves.length}/4)</h4>
                
                <div class="move-tabs">
                    <button class="move-tab active" data-tab="level-up">Level-Up</button>
                    <button class="move-tab" data-tab="tm-hm">TM/HM</button>
                    <button class="move-tab" data-tab="egg">Egg Moves</button>
                    <button class="move-tab" data-tab="tutor">Tutor</button>
                </div>

                <div class="move-tab-content active" data-tab-content="level-up">
                    <div class="move-list">
                        ${createMoveListHTML(allMoves.levelUp, true)}
                    </div>
                </div>

                <div class="move-tab-content" data-tab-content="tm-hm">
                    <div class="move-list">
                        ${createMoveListHTML(allMoves.machine)}
                    </div>
                </div>

                <div class="move-tab-content" data-tab-content="egg">
                    <div class="move-list">
                        ${createMoveListHTML(allMoves.egg)}
                    </div>
                </div>

                <div class="move-tab-content" data-tab-content="tutor">
                    <div class="move-list">
                        ${createMoveListHTML(allMoves.tutor)}
                    </div>
                </div>
            </div>
        `;

        // Build upcoming moves HTML
        const upcomingHTML = upcomingMoves.length > 0 ? `
            <div class="upcoming-moves">
                <h4>Upcoming Moves</h4>
                <div class="move-list">
                    ${upcomingMoves.map(move => `
                        <div class="move-item">
                            <div class="move-name">${formatMoveName(move.name)}</div>
                            <div class="move-details">Level ${move.learnedAt}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        ` : '';

        // Build evolution HTML
        const evolutionHTML = nextEvolution ? `
            <div class="evolution-info">
                <h4>Evolution</h4>
                <p>Evolves into <strong>${formatPokemonName(nextEvolution.species)}</strong> at ${formatEvolutionCondition(nextEvolution)}</p>
            </div>
        ` : '<div class="evolution-info"><p>This Pokémon does not evolve further</p></div>';

        // Build type effectiveness HTML
        const weaknessesHTML = Object.entries(effectiveness.weaknesses).map(([type, mult]) =>
            `<span class="type-badge ${type}">${type} (${mult}x)</span>`
        ).join('');

        const resistancesHTML = Object.entries(effectiveness.resistances).map(([type, mult]) =>
            `<span class="type-badge ${type}">${type} (${mult}x)</span>`
        ).join('');

        const immunitiesHTML = effectiveness.immunities.map(type =>
            `<span class="type-badge ${type}">${type} (0x)</span>`
        ).join('');

        content.innerHTML = `
            <h2>${formatPokemonName(member.name)}</h2>
            ${moveSelectionHTML}
            ${upcomingHTML}
            ${evolutionHTML}
            <div class="type-effectiveness">
                <h4>Type Effectiveness</h4>
                <div class="effectiveness-section">
                    <h5>Weak to:</h5>
                    <div class="type-badges">${weaknessesHTML || '<p class="empty-state">None</p>'}</div>
                </div>
                <div class="effectiveness-section">
                    <h5>Resists:</h5>
                    <div class="type-badges">${resistancesHTML || '<p class="empty-state">None</p>'}</div>
                </div>
                ${immunitiesHTML ? `
                    <div class="effectiveness-section">
                        <h5>Immune to:</h5>
                        <div class="type-badges">${immunitiesHTML}</div>
                    </div>
                ` : ''}
            </div>
        `;

        // Add tab switching functionality
        const tabs = content.querySelectorAll('.move-tab');
        const tabContents = content.querySelectorAll('.move-tab-content');

        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;

                // Remove active class from all tabs and contents
                tabs.forEach(t => t.classList.remove('active'));
                tabContents.forEach(tc => tc.classList.remove('active'));

                // Add active class to clicked tab and corresponding content
                tab.classList.add('active');
                content.querySelector(`[data-tab-content="${tabName}"]`).classList.add('active');
            });
        });

        modal.classList.remove('hidden');
    } catch (error) {
        console.error('Error showing Pokemon detail:', error);
        content.innerHTML = '<p class="empty-state">Error loading Pokémon details</p>';
        modal.classList.remove('hidden');
    }
}

/**
 * Toggle move selection
 */
async function toggleMove(index, moveName, event) {
    event.stopPropagation();
    const member = state.team[index];
    const moveIndex = member.selectedMoves.findIndex(m => m.name === moveName);

    if (moveIndex >= 0) {
        // Remove move
        member.selectedMoves.splice(moveIndex, 1);
    } else {
        // Add move (max 4)
        if (member.selectedMoves.length >= 4) {
            alert('Maximum 4 moves! Remove a move first.');
            return;
        }

        try {
            const moveData = await getMove(moveName);
            member.selectedMoves.push({
                name: moveName,
                type: moveData.type.name,
                power: moveData.power,
                accuracy: moveData.accuracy,
                pp: moveData.pp
            });
        } catch (error) {
            console.error('Error loading move data:', error);
            return;
        }
    }

    saveToStorage();
    // Refresh the modal
    showPokemonDetail(index);
}

/**
 * Close modal
 */
function closeModal() {
    document.getElementById('pokemon-detail-modal').classList.add('hidden');
}

/**
 * Render team analysis
 */
function renderTeamAnalysis() {
    if (!state.typeData || state.team.length === 0) {
        document.getElementById('type-coverage').innerHTML = '<p class="empty-state">Add Pokémon to see coverage</p>';
        document.getElementById('team-weaknesses').innerHTML = '<p class="empty-state">Add Pokémon to see weaknesses</p>';
        return;
    }

    const coverage = analyzeTeamCoverage(state.team, state.typeData);
    const weaknesses = analyzeTeamWeaknesses(state.team, state.typeData);

    // Render coverage
    const coverageHTML = Object.keys(coverage).length > 0
        ? Object.keys(coverage).map(type =>
            `<span class="type-badge ${type}">${type}</span>`
        ).join('')
        : '<p class="empty-state">Select moves to see coverage</p>';

    document.getElementById('type-coverage').innerHTML = coverageHTML;

    // Render weaknesses
    const weaknessesHTML = Object.keys(weaknesses).length > 0
        ? Object.entries(weaknesses)
            .sort((a, b) => b[1].count - a[1].count)
            .map(([type, data]) =>
                `<span class="type-badge ${type}">${type} (${data.count})</span>`
            ).join('')
        : '<p class="empty-state">No common weaknesses</p>';

    document.getElementById('team-weaknesses').innerHTML = weaknessesHTML;
}

/**
 * Select opponent for battle helper
 */
function selectOpponent(pokemon) {
    state.currentOpponent = pokemon;
    renderBattleMatchup();
}

/**
 * Render battle matchup
 */
function renderBattleMatchup() {
    const container = document.getElementById('battle-matchup');

    if (!state.currentOpponent || state.team.length === 0) {
        container.classList.add('hidden');
        return;
    }

    const opponent = state.currentOpponent;
    const opponentTypes = opponent.types.map(t => t.type.name);

    // Find which team members have advantage
    const recommendations = [];

    state.team.forEach(member => {
        if (!member.selectedMoves || member.selectedMoves.length === 0) return;

        const effectiveMoves = member.selectedMoves.filter(move => {
            const effectiveness = calculateTypeEffectiveness(move.type, opponentTypes, state.typeData);
            return effectiveness >= 2;
        });

        if (effectiveMoves.length > 0) {
            recommendations.push({
                pokemon: member,
                moves: effectiveMoves
            });
        }
    });

    const typesHTML = opponentTypes.map(type =>
        `<span class="type-badge ${type}">${type}</span>`
    ).join('');

    const recommendationsHTML = recommendations.length > 0
        ? recommendations.map(rec => `
            <div class="recommendation-card">
                <img src="${rec.pokemon.sprite}" alt="${rec.pokemon.name}" class="recommendation-sprite">
                <div class="recommendation-name">${formatPokemonName(rec.pokemon.name)}</div>
                <div class="type-badges">${rec.pokemon.types.map(t => `<span class="type-badge ${t}">${t}</span>`).join('')}</div>
                <div class="recommendation-reason">
                    Super effective moves: ${rec.moves.map(m => formatMoveName(m.name)).join(', ')}
                </div>
            </div>
          `).join('')
        : '<p class="empty-state">No team members have super effective moves. Make sure to select moves for your team!</p>';

    container.innerHTML = `
        <div class="opponent-info">
            <img src="${opponent.sprites.front_default}" alt="${opponent.name}" class="opponent-sprite">
            <h3 class="opponent-name">${formatPokemonName(opponent.name)}</h3>
            <div class="type-badges">${typesHTML}</div>
        </div>
        <div class="matchup-section">
            <h3>Recommended Team Members</h3>
            <div class="recommendations-grid">
                ${recommendationsHTML}
            </div>
        </div>
    `;

    container.classList.remove('hidden');
}

/**
 * Handle generation filter change
 */
function handleGenerationChange() {
    const checkboxes = document.querySelectorAll('.gen-checkbox input');
    state.selectedGenerations = Array.from(checkboxes)
        .filter(cb => cb.checked)
        .map(cb => parseInt(cb.value));

    saveToStorage();
    renderRecommendations();
}

/**
 * Render Pokemon recommendations
 */
async function renderRecommendations() {
    const container = document.getElementById('recommendations');

    if (state.team.length === 0) {
        container.innerHTML = '<p class="empty-state">Add Pokémon to your team to see recommendations</p>';
        return;
    }

    container.innerHTML = '<p class="empty-state">Loading recommendations...</p>';

    try {
        const recommendations = await recommendPokemon(
            state.team,
            state.typeData,
            state.selectedGenerations,
            10
        );

        if (recommendations.length === 0) {
            container.innerHTML = '<p class="empty-state">No recommendations found for selected generations</p>';
            return;
        }

        container.innerHTML = recommendations.map(rec => {
            const pokemon = rec.pokemon;
            const types = pokemon.types.map(t =>
                `<span class="type-badge ${t.type.name}">${t.type.name}</span>`
            ).join('');

            return `
                <div class="recommendation-card" onclick="showPokedexDetailById(${pokemon.id})">
                    <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}" class="recommendation-sprite">
                    <div class="recommendation-name">${formatPokemonName(pokemon.name)}</div>
                    <div class="type-badges">${types}</div>
                    <div class="recommendation-reason">${rec.reasons.join(', ')}</div>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading recommendations:', error);
        container.innerHTML = '<p class="empty-state">Error loading recommendations</p>';
    }
}

/**
 * Show Pokedex detail
 */
async function showPokedexDetail(pokemon) {
    const container = document.getElementById('pokedex-detail');
    container.innerHTML = '<p class="empty-state">Loading...</p>';
    container.classList.remove('hidden');

    try {
        const allMoves = getAllLearnableMoves(pokemon);
        const evolutionChain = await getPokemonEvolutionChain(pokemon.id);
        const evolutions = parseEvolutionChain(evolutionChain.chain);

        const types = pokemon.types.map(t =>
            `<span class="type-badge ${t.type.name}">${t.type.name}</span>`
        ).join('');

        const stats = [
            { name: 'HP', value: pokemon.stats[0].base_stat },
            { name: 'Attack', value: pokemon.stats[1].base_stat },
            { name: 'Defense', value: pokemon.stats[2].base_stat },
            { name: 'Sp. Atk', value: pokemon.stats[3].base_stat },
            { name: 'Sp. Def', value: pokemon.stats[4].base_stat },
            { name: 'Speed', value: pokemon.stats[5].base_stat }
        ];

        const statsHTML = stats.map(stat => `
            <div class="stat-bar-container">
                <div class="stat-bar-label">
                    <span>${stat.name}</span>
                    <span>${stat.value}</span>
                </div>
                <div class="stat-bar">
                    <div class="stat-bar-fill" style="width: ${(stat.value / 255) * 100}%"></div>
                </div>
            </div>
        `).join('');

        const evolutionHTML = evolutions.map((evo, index) => {
            const condition = index > 0 ? formatEvolutionCondition(evo) : 'Base form';
            return `<div>${formatPokemonName(evo.species)} ${index > 0 ? `(${condition})` : ''}</div>`;
        }).join(' → ');

        const levelUpMovesHTML = allMoves.levelUp.map(move => `
            <div class="move-item">
                <div class="move-name">${formatMoveName(move.name)}</div>
                <div class="move-details">Level ${move.level}</div>
            </div>
        `).join('');

        const tmMovesHTML = allMoves.machine.length > 0 ? `
            <h4>TM/HM Moves</h4>
            <div class="move-list">
                ${allMoves.machine.slice(0, 20).map(move => `
                    <div class="move-item">
                        <div class="move-name">${formatMoveName(move.name)}</div>
                    </div>
                `).join('')}
            </div>
        ` : '';

        container.innerHTML = `
            <div class="pokedex-header">
                <img src="${pokemon.sprites.front_default}" alt="${pokemon.name}" class="pokedex-sprite">
                <div class="pokedex-basic-info">
                    <h3>${formatPokemonName(pokemon.name)}</h3>
                    <p>#${String(pokemon.id).padStart(3, '0')}</p>
                    <div class="type-badges">${types}</div>
                    <p>Height: ${pokemon.height / 10}m | Weight: ${pokemon.weight / 10}kg</p>
                </div>
            </div>
            
            <div class="pokedex-stats">
                <h4>Base Stats</h4>
                ${statsHTML}
            </div>
            
            <div class="pokedex-evolution">
                <h4>Evolution Chain</h4>
                <p>${evolutionHTML}</p>
            </div>
            
            <div class="pokedex-moves">
                <h4>Level-Up Moves</h4>
                <div class="move-list">
                    ${levelUpMovesHTML}
                </div>
                ${tmMovesHTML}
            </div>
        `;
    } catch (error) {
        console.error('Error showing Pokedex detail:', error);
        container.innerHTML = '<p class="empty-state">Error loading Pokémon details</p>';
    }
}

/**
 * Show Pokedex detail by ID (for recommendations)
 */
async function showPokedexDetailById(id) {
    try {
        const pokemon = await getPokemon(id);
        await showPokedexDetail(pokemon);
        // Switch to research tab if not already there
        switchTab('research');
        // Scroll to detail
        document.getElementById('pokedex-detail').scrollIntoView({ behavior: 'smooth' });
    } catch (error) {
        console.error('Error showing Pokemon detail:', error);
    }
}

/**
 * Save state to localStorage
 */
function saveToStorage() {
    Storage.save('pokemon-team', {
        team: state.team,
        selectedGenerations: state.selectedGenerations
    });
}

/**
 * Load state from localStorage
 */
function loadFromStorage() {
    const saved = Storage.load('pokemon-team');

    if (saved) {
        state.team = saved.team || [];
        state.selectedGenerations = saved.selectedGenerations || [1, 2, 3, 4, 5, 6, 7, 8, 9];

        // Update generation checkboxes
        document.querySelectorAll('.gen-checkbox input').forEach(checkbox => {
            checkbox.checked = state.selectedGenerations.includes(parseInt(checkbox.value));
        });

        // Reload Pokemon data for team members
        state.team.forEach(async (member, index) => {
            try {
                const pokemon = await getPokemon(member.id);
                state.team[index].pokemonData = pokemon;
            } catch (error) {
                console.error('Error reloading Pokemon data:', error);
            }
        });
    }
}
