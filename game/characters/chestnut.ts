

import { NAKED_PLAYER_WIDTH, NAKED_PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT } from '../../constants';
import { createDrawFunction, type Character } from './factory';

const CHESTNUT_HITBOX = {
    shelled: { width: PLAYER_WIDTH, height: PLAYER_HEIGHT },
    naked: { width: NAKED_PLAYER_WIDTH, height: NAKED_PLAYER_HEIGHT },
};

export const CHESTNUT_CHARACTER: Character = {
    id: 'chestnut',
    name: 'Chestnut',
    description: 'The original nut. Balanced and classic.',
    hitbox: CHESTNUT_HITBOX,
    startingStats: {
    },
    draw: createDrawFunction(CHESTNUT_HITBOX, 'chestnut'),
};