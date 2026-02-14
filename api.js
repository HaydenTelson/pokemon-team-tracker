// ===== PokéAPI Service Layer =====
// Base URL for PokéAPI
const API_BASE_URL = 'https://pokeapi.co/api/v2';

// Cache for API responses to minimize requests
const apiCache = new Map();

/**
 * Generic fetch function with caching
 */
async function fetchWithCache(url) {
    if (apiCache.has(url)) {
        return apiCache.get(url);
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        apiCache.set(url, data);
        return data;
    } catch (error) {
        console.error('API fetch error:', error);
        throw error;
    }
}

/**
 * Search Pokemon by name or ID
 */
async function searchPokemon(query) {
    const lowerQuery = query.toLowerCase().trim();

    // If it's a number, fetch directly
    if (!isNaN(lowerQuery) && lowerQuery !== '') {
        try {
            return await getPokemon(parseInt(lowerQuery));
        } catch {
            return null;
        }
    }

    // Otherwise, try to fetch by name
    try {
        return await getPokemon(lowerQuery);
    } catch {
        return null;
    }
}

/**
 * Get Pokemon data by ID or name
 */
async function getPokemon(idOrName) {
    const url = `${API_BASE_URL}/pokemon/${idOrName}`;
    return await fetchWithCache(url);
}

/**
 * Get Pokemon species data (for evolution chain)
 */
async function getPokemonSpecies(idOrName) {
    const url = `${API_BASE_URL}/pokemon-species/${idOrName}`;
    return await fetchWithCache(url);
}

/**
 * Get evolution chain data
 */
async function getEvolutionChain(id) {
    const url = `${API_BASE_URL}/evolution-chain/${id}`;
    return await fetchWithCache(url);
}

/**
 * Get type data (for type effectiveness)
 */
async function getType(idOrName) {
    const url = `${API_BASE_URL}/type/${idOrName}`;
    return await fetchWithCache(url);
}

/**
 * Get move data
 */
async function getMove(idOrName) {
    const url = `${API_BASE_URL}/move/${idOrName}`;
    return await fetchWithCache(url);
}

/**
 * Get generation data
 */
async function getGeneration(id) {
    const url = `${API_BASE_URL}/generation/${id}`;
    return await fetchWithCache(url);
}

/**
 * Get ability data
 */
async function getAbility(idOrName) {
    const url = `${API_BASE_URL}/ability/${idOrName}`;
    return await fetchWithCache(url);
}

/**
 * Get all Pokemon from a specific generation
 */
async function getPokemonByGeneration(genNumber) {
    const genData = await getGeneration(genNumber);
    return genData.pokemon_species;
}

/**
 * Get complete Pokemon data with species info
 */
async function getCompletePokemonData(idOrName) {
    const pokemon = await getPokemon(idOrName);
    const species = await getPokemonSpecies(pokemon.species.name);

    return {
        pokemon,
        species
    };
}

/**
 * Get evolution chain for a Pokemon
 */
async function getPokemonEvolutionChain(idOrName) {
    const species = await getPokemonSpecies(idOrName);
    const evolutionChainId = species.evolution_chain.url.split('/').slice(-2, -1)[0];
    return await getEvolutionChain(evolutionChainId);
}

/**
 * Get type effectiveness data for all types
 */
async function getAllTypeEffectiveness() {
    const types = [
        'normal', 'fire', 'water', 'electric', 'grass', 'ice',
        'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
        'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy'
    ];

    const typeData = {};

    for (const type of types) {
        const data = await getType(type);
        typeData[type] = {
            doubleDamageFrom: data.damage_relations.double_damage_from.map(t => t.name),
            halfDamageFrom: data.damage_relations.half_damage_from.map(t => t.name),
            noDamageFrom: data.damage_relations.no_damage_from.map(t => t.name),
            doubleDamageTo: data.damage_relations.double_damage_to.map(t => t.name),
            halfDamageTo: data.damage_relations.half_damage_to.map(t => t.name),
            noDamageTo: data.damage_relations.no_damage_to.map(t => t.name)
        };
    }

    return typeData;
}

/**
 * Get moves a Pokemon can learn at a specific level
 */
function getMovesAtLevel(pokemon, level) {
    const levelUpMoves = pokemon.moves.filter(move => {
        return move.version_group_details.some(detail =>
            detail.move_learn_method.name === 'level-up' &&
            detail.level_learned_at <= level
        );
    });

    return levelUpMoves.map(move => ({
        name: move.move.name,
        url: move.move.url,
        learnedAt: Math.max(...move.version_group_details
            .filter(d => d.move_learn_method.name === 'level-up')
            .map(d => d.level_learned_at))
    })).sort((a, b) => b.learnedAt - a.learnedAt);
}

/**
 * Get upcoming moves a Pokemon will learn
 */
function getUpcomingMoves(pokemon, currentLevel, count = 5) {
    const upcomingMoves = pokemon.moves.filter(move => {
        return move.version_group_details.some(detail =>
            detail.move_learn_method.name === 'level-up' &&
            detail.level_learned_at > currentLevel
        );
    });

    return upcomingMoves.map(move => ({
        name: move.move.name,
        url: move.move.url,
        learnedAt: Math.min(...move.version_group_details
            .filter(d => d.move_learn_method.name === 'level-up')
            .map(d => d.level_learned_at))
    }))
        .sort((a, b) => a.learnedAt - b.learnedAt)
        .slice(0, count);
}

/**
 * Get all learnable moves organized by method
 */
function getAllLearnableMoves(pokemon) {
    const movesByMethod = {
        levelUp: [],
        machine: [],
        egg: [],
        tutor: []
    };

    pokemon.moves.forEach(move => {
        move.version_group_details.forEach(detail => {
            const method = detail.move_learn_method.name;
            const moveData = {
                name: move.move.name,
                url: move.move.url,
                level: detail.level_learned_at
            };

            if (method === 'level-up') {
                if (!movesByMethod.levelUp.find(m => m.name === moveData.name)) {
                    movesByMethod.levelUp.push(moveData);
                }
            } else if (method === 'machine') {
                if (!movesByMethod.machine.find(m => m.name === moveData.name)) {
                    movesByMethod.machine.push(moveData);
                }
            } else if (method === 'egg') {
                if (!movesByMethod.egg.find(m => m.name === moveData.name)) {
                    movesByMethod.egg.push(moveData);
                }
            } else if (method === 'tutor') {
                if (!movesByMethod.tutor.find(m => m.name === moveData.name)) {
                    movesByMethod.tutor.push(moveData);
                }
            }
        });
    });

    // Sort level-up moves by level
    movesByMethod.levelUp.sort((a, b) => a.level - b.level);

    return movesByMethod;
}

/**
 * Autocomplete search for Pokemon with improved performance
 */
async function autocompletePokemon(query, limit = 10) {
    if (!query || query.length < 1) return [];
    
    const lowerQuery = query.toLowerCase();
    const results = [];
    
    // If it's a number, prioritize exact ID match
    if (!isNaN(lowerQuery) && lowerQuery !== '') {
        const id = parseInt(lowerQuery);
        if (id >= 1 && id <= 1025) {
            try {
                const pokemon = await getPokemon(id);
                results.push({
                    id: pokemon.id,
                    name: pokemon.name,
                    sprite: pokemon.sprites.front_default,
                    types: pokemon.types.map(t => t.type.name),
                    pokemon: pokemon
                });
                return results;
            } catch (error) {
                // Continue to name search
            }
        }
    }
    
    // Get the full Pokemon list
    const pokemonList = await getPokemonNameList();
    
    // Filter by name match
    const matches = pokemonList.filter(p => 
        p.name.includes(lowerQuery) || p.id.toString() === lowerQuery
    );
    
    // Fetch full data for top matches
    for (let i = 0; i < Math.min(matches.length, limit); i++) {
        try {
            const pokemon = await getPokemon(matches[i].id);
            results.push({
                id: pokemon.id,
                name: pokemon.name,
                sprite: pokemon.sprites.front_default,
                types: pokemon.types.map(t => t.type.name),
                pokemon: pokemon
            });
        } catch (error) {
            continue;
        }
    }
    
    return results;
}

/**
 * Get Pokemon name list (cached for performance)
 */
let pokemonNameListCache = null;

async function getPokemonNameList() {
    if (pokemonNameListCache) {
        return pokemonNameListCache;
    }
    
    // Fetch the complete Pokemon list from PokeAPI
    try {
        const response = await fetchWithCache(`${API_BASE_URL}/pokemon?limit=1025`);
        pokemonNameListCache = response.results.map((p, index) => ({
            id: index + 1,
            name: p.name
        }));
        return pokemonNameListCache;
    } catch (error) {
        console.error('Error fetching Pokemon list:', error);
        // Fallback to basic list
        const list = [];
        for (let i = 1; i <= 1025; i++) {
            list.push({ id: i, name: `pokemon-${i}` });
        }
        pokemonNameListCache = list;
        return list;
    }
}

/**
 * Get Pokemon list for autocomplete (cached list) - DEPRECATED
 * Use getPokemonNameList() instead
 */
let pokemonListCache = null;

async function getPokemonList(maxId = 1025) {
    return await getPokemonNameList();
}

