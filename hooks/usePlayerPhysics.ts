import { useCallback } from 'react';
import type { PlayerState, GameDimensions, ParticleState } from '../types';
import {
    GAME_HEIGHT,
    PLAYER_WIDTH,
    PLAYER_HEIGHT,
    PLAYER_ACCELERATION,
    GROUND_FRICTION,
    ICE_FRICTION,
    WIND_FORCE,
    JUMP_STRENGTH,
    GRAVITY,
    GROUND_HEIGHT,
} from '../constants';
import { playJumpSound } from '../utils/audio';
import { createDustParticles } from '../game/particleLogic';

interface UsePlayerPhysicsProps {
    gameDimensions: GameDimensions;
    maxSpeed: number;
    playerSlowTimer: number;
    currentEvent: string | null;
    windDirection: 'left' | 'right' | null;
    getInputState: () => { isMovingLeft: boolean, isMovingRight: boolean, isTryingToJump: boolean, resetJump: () => void };
}

export const usePlayerPhysics = ({
    gameDimensions,
    maxSpeed,
    playerSlowTimer,
    currentEvent,
    windDirection,
    getInputState,
}: UsePlayerPhysicsProps) => {

    const updatePlayerPhysics = useCallback((player: PlayerState, deltaTime: number): { nextPlayer: PlayerState, newParticles: ParticleState[] } => {
        const nextPlayer = { ...player };
        const newParticles: ParticleState[] = [];
        const { isMovingLeft, isMovingRight, isTryingToJump, resetJump } = getInputState();

        const friction = (currentEvent === 'blizzard' && nextPlayer.y <= GROUND_HEIGHT) ? ICE_FRICTION : GROUND_FRICTION;
        const effectiveAcceleration = playerSlowTimer > 0 ? PLAYER_ACCELERATION * 0.5 : PLAYER_ACCELERATION;

        // Horizontal Movement
        if (isMovingLeft) {
            nextPlayer.xVelocity -= effectiveAcceleration * deltaTime;
        } else if (isMovingRight) {
            nextPlayer.xVelocity += effectiveAcceleration * deltaTime;
        }

        // Wind Effect
        if (currentEvent === 'storm') {
            if (windDirection === 'left') {
                nextPlayer.xVelocity -= WIND_FORCE * deltaTime;
            } else if (windDirection === 'right') {
                nextPlayer.xVelocity += WIND_FORCE * deltaTime;
            }
        }

        // Friction
        if (!isMovingLeft && !isMovingRight && nextPlayer.y <= GROUND_HEIGHT) {
            if (nextPlayer.xVelocity > 0) {
                nextPlayer.xVelocity -= friction * deltaTime;
                if (nextPlayer.xVelocity < 0) nextPlayer.xVelocity = 0;
            } else if (nextPlayer.xVelocity < 0) {
                nextPlayer.xVelocity += friction * deltaTime;
                if (nextPlayer.xVelocity > 0) nextPlayer.xVelocity = 0;
            }
        }

        // Speed Cap
        const effectiveMaxSpeed = playerSlowTimer > 0 ? maxSpeed * 0.5 : maxSpeed;
        nextPlayer.xVelocity = Math.max(-effectiveMaxSpeed, Math.min(effectiveMaxSpeed, nextPlayer.xVelocity));

        // Apply Velocity
        nextPlayer.x += nextPlayer.xVelocity * deltaTime;

        // Jumping
        if (isTryingToJump && nextPlayer.y <= GROUND_HEIGHT) {
            nextPlayer.yVelocity = JUMP_STRENGTH;
            playJumpSound();
            newParticles.push(...createDustParticles({ x: nextPlayer.x + PLAYER_WIDTH / 2, y: GAME_HEIGHT - GROUND_HEIGHT, count: 10, intensity: 60 }));
            resetJump();
        }

        // Gravity
        nextPlayer.yVelocity -= GRAVITY * deltaTime;
        nextPlayer.y += nextPlayer.yVelocity * deltaTime;

        // Ground Collision
        if (nextPlayer.y < GROUND_HEIGHT) {
            nextPlayer.y = GROUND_HEIGHT;
            nextPlayer.yVelocity = 0;
        }

        // Screen Boundaries
        if (nextPlayer.x < 0) {
            nextPlayer.x = 0;
            nextPlayer.xVelocity = 0;
        }
        if (nextPlayer.x > gameDimensions.width - PLAYER_WIDTH) {
            nextPlayer.x = gameDimensions.width - PLAYER_WIDTH;
            nextPlayer.xVelocity = 0;
        }

        return { nextPlayer, newParticles };
    }, [gameDimensions, maxSpeed, playerSlowTimer, currentEvent, windDirection, getInputState]);

    return { updatePlayerPhysics };
};
