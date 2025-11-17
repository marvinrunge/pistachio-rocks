

import { NAKED_PLAYER_WIDTH, NAKED_PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT } from '../../constants';
import { createDrawFunction, type Character } from './factory';

const WALNUT_HITBOX = {
    shelled: { width: PLAYER_WIDTH * 1.1, height: PLAYER_HEIGHT },
    naked: { width: NAKED_PLAYER_WIDTH * 1.1, height: NAKED_PLAYER_HEIGHT },
};

export const WALNUT_CHARACTER: Character = {
    id: 'walnut',
    name: 'Walnut',
    description: 'A tough nut to crack. Starts with extra shell fortification.',
    hitbox: WALNUT_HITBOX,
    startingStats: {
        maxHealth: 5,
    },
    draw: createDrawFunction(WALNUT_HITBOX, 'walnut'),
};