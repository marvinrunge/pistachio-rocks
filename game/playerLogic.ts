// This file will contain functions for updating the player's state.
// This includes handling movement, physics (gravity, friction), and world boundaries.
import type { PlayerState } from '../types';
import type { InputState } from '../hooks/useInput';
import {
  PLAYER_ACCELERATION,
  GROUND_FRICTION,
  ICE_FRICTION,
  WIND_FORCE,
  JUMP_STRENGTH,
  GRAVITY,
  PLAYER_WIDTH,
  GROUND_HEIGHT,
} from '../constants';

interface PlayerUpdateProps {
  playerState: PlayerState;
  inputState: InputState;
  deltaTime: number;
  gameDimensions: { width: number; height: number };
  currentEvent: string | null;
  windDirection: 'left' | 'right' | null;
  playerSlowTimer: number;
  maxSpeed: number;
}

export function updatePlayer({
  playerState,
  inputState,
  deltaTime,
  gameDimensions,
  currentEvent,
  windDirection,
  playerSlowTimer,
  maxSpeed,
}: PlayerUpdateProps): { nextPlayerState: PlayerState, didJump: boolean } {
  let nextPlayerState = { ...playerState };
  let didJump = false;

  const { isMovingLeft, isMovingRight, isTryingToJump, resetJump } = inputState;

  const friction = (currentEvent === 'blizzard' && nextPlayerState.y <= GROUND_HEIGHT) ? ICE_FRICTION : GROUND_FRICTION;
  const effectiveAcceleration = playerSlowTimer > 0 ? PLAYER_ACCELERATION * 0.5 : PLAYER_ACCELERATION;

  // Horizontal Movement
  if (isMovingLeft) {
    nextPlayerState.xVelocity -= effectiveAcceleration * deltaTime;
  } else if (isMovingRight) {
    nextPlayerState.xVelocity += effectiveAcceleration * deltaTime;
  }

  // Wind Force
  if (currentEvent === 'storm' && windDirection) {
    if (windDirection === 'left') {
      nextPlayerState.xVelocity -= WIND_FORCE * deltaTime;
    } else if (windDirection === 'right') {
      nextPlayerState.xVelocity += WIND_FORCE * deltaTime;
    }
  }

  // Friction
  if (!isMovingLeft && !isMovingRight && nextPlayerState.y <= GROUND_HEIGHT) {
    if (nextPlayerState.xVelocity > 0) {
      nextPlayerState.xVelocity = Math.max(0, nextPlayerState.xVelocity - friction * deltaTime);
    } else if (nextPlayerState.xVelocity < 0) {
      nextPlayerState.xVelocity = Math.min(0, nextPlayerState.xVelocity + friction * deltaTime);
    }
  }

  // Speed Cap
  const effectiveMaxSpeed = playerSlowTimer > 0 ? maxSpeed * 0.5 : maxSpeed;
  nextPlayerState.xVelocity = Math.max(-effectiveMaxSpeed, Math.min(effectiveMaxSpeed, nextPlayerState.xVelocity));

  // Update X Position
  nextPlayerState.x += nextPlayerState.xVelocity * deltaTime;

  // Jumping
  if (isTryingToJump && nextPlayerState.y <= GROUND_HEIGHT) {
    nextPlayerState.yVelocity = JUMP_STRENGTH;
    didJump = true;
    resetJump(); // Reset one-time jump triggers like swipe
  }

  // Vertical Movement (Gravity)
  nextPlayerState.yVelocity -= GRAVITY * deltaTime;
  nextPlayerState.y += nextPlayerState.yVelocity * deltaTime;

  // Ground Collision
  if (nextPlayerState.y < GROUND_HEIGHT) {
    nextPlayerState.y = GROUND_HEIGHT;
    nextPlayerState.yVelocity = 0;
  }

  // Boundary Checks
  if (nextPlayerState.x < 0) {
    nextPlayerState.x = 0;
    nextPlayerState.xVelocity = 0;
  }
  if (nextPlayerState.x > gameDimensions.width - PLAYER_WIDTH) {
    nextPlayerState.x = gameDimensions.width - PLAYER_WIDTH;
    nextPlayerState.xVelocity = 0;
  }
  
  return { nextPlayerState, didJump };
}