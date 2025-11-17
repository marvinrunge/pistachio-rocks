

import { NAKED_PLAYER_WIDTH, NAKED_PLAYER_HEIGHT, PLAYER_WIDTH, PLAYER_HEIGHT } from '../../constants';
import { createDrawFunction, type Character } from './factory';

const PISTACHIO_HITBOX = {
    shelled: { width: PLAYER_WIDTH, height: PLAYER_HEIGHT },
    naked: { width: NAKED_PLAYER_WIDTH, height: NAKED_PLAYER_HEIGHT },
};

export const PISTACHIO_CHARACTER: Character = {
    id: 'pistachio',
    name: 'Pistachio',
    description: 'The original nut. Balanced and classic.',
    hitbox: PISTACHIO_HITBOX,
    startingStats: {},
    draw: createDrawFunction(PISTACHIO_HITBOX, 'pistachio'),
};