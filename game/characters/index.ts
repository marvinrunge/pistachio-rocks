import type { CharacterId } from '../../types';
import { PISTACHIO_CHARACTER } from './pistachio';
import { WALNUT_CHARACTER } from './walnut';
import { CHESTNUT_CHARACTER } from './chestnut';
import type { Character } from './factory';
export type { Character } from './factory';

// FIX: Add new characters to the array to make them selectable in-game.
export const CHARACTERS: Character[] = [
    PISTACHIO_CHARACTER,
    WALNUT_CHARACTER,
    CHESTNUT_CHARACTER,
];

export const getCharacterById = (id: CharacterId): Character => {
    return CHARACTERS.find(c => c.id === id) || PISTACHIO_CHARACTER;
};