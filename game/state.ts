import type { PlayerState, CloudState, CharacterId } from '../types';
import { PLAYER_WIDTH, GROUND_HEIGHT } from '../constants';

export const getInitialPlayerState = (characterId: CharacterId): PlayerState => ({
  x: 800 / 2 - PLAYER_WIDTH / 2,
  y: GROUND_HEIGHT,
  yVelocity: 0,
  xVelocity: 0,
  health: 0,
  isNaked: true,
  characterId,
});

export const generateInitialClouds = (width: number): CloudState[] => {
    const cloudCount = Math.max(3, Math.floor(width / 250));
    return Array.from({ length: cloudCount }).map(() => ({
        x: Math.random() * width,
        y: 40 + Math.random() * 100,
        speed: 8 + Math.random() * 12,
        width: 80 + Math.random() * 70,
        height: 25 + Math.random() * 15,
    }));
};

// Pre-generate random ground details to prevent them from changing on every render.
export const groundDetails = {
    spring: Array.from({ length: 30 }).map((_, i) => ({
        id: i,
        x: Math.random(), // Use normalized coordinates
        y: Math.random(),
        color: ['#f87171', '#fbbf24', '#a78bfa', '#f472b6', '#60a5fa', '#ffffff'][i % 6],
        size: Math.random() * 8 + 6,
    })),
    autumn: Array.from({ length: 20 }).map((_, i) => ({
        id: i,
        x: Math.random(),
        y: Math.random(),
        color: ['#d97706', '#f59e0b', '#b45309'][i % 3],
        rotation: Math.random() * 360,
        size: Math.random() * 10 + 8,
    })),
};
