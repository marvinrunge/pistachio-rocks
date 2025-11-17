// This hook will encapsulate all user input logic (keyboard, touch, gamepad).
// It will be responsible for tracking which actions (move left, move right, jump) are active.
import React, { useCallback, useEffect, useRef } from 'react';

const JUMP_SWIPE_THRESHOLD = 50; // pixels

// Defines the shape of the input state object returned by the hook
export interface InputState {
  isMovingLeft: boolean;
  isMovingRight: boolean;
  isTryingToJump: boolean;
  resetJump: () => void; // A function to reset the jump state after it's been processed
}

export const useInput = (isGamePlaying: boolean) => {
  const keysPressed = useRef<Record<string, boolean>>({});
  const activeTouches = useRef<Map<number, 'left' | 'right'>>(new Map());
  const touchStartPos = useRef<Map<number, number>>(new Map());

  // --- Keyboard Handlers ---
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysPressed.current[e.key.toLowerCase()] = true;
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysPressed.current[e.key.toLowerCase()] = false;
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  // --- Touch Control Handlers ---
  const updateMovementFromTouches = useCallback(() => {
    let moveLeft = false;
    let moveRight = false;
    for (const side of activeTouches.current.values()) {
        if (side === 'left') moveLeft = true;
        if (side === 'right') moveRight = true;
    }
    keysPressed.current['touchleft'] = moveLeft;
    keysPressed.current['touchright'] = moveRight;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isGamePlaying) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const side = touch.clientX < window.innerWidth / 2 ? 'left' : 'right';
        activeTouches.current.set(touch.identifier, side);
        touchStartPos.current.set(touch.identifier, touch.clientY);
    }
    updateMovementFromTouches();
  }, [updateMovementFromTouches, isGamePlaying]);

  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isGamePlaying) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        const startY = touchStartPos.current.get(touch.identifier);
        if (startY !== undefined) {
            const deltaY = startY - touch.clientY;
            if (deltaY > JUMP_SWIPE_THRESHOLD) {
                keysPressed.current['touchjump'] = true;
                touchStartPos.current.delete(touch.identifier); 
            }
        }
    }
  }, [isGamePlaying]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
    if (!isGamePlaying) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        activeTouches.current.delete(touch.identifier);
        touchStartPos.current.delete(touch.identifier);
    }
    updateMovementFromTouches();
  }, [updateMovementFromTouches, isGamePlaying]);

  const resetGameInput = useCallback(() => {
    keysPressed.current = {};
    activeTouches.current.clear();
    touchStartPos.current.clear();
  }, []);

  // --- Main Input State Reader Function ---
  const getInputState = (): InputState => {
    keysPressed.current['gamepadleft'] = false;
    keysPressed.current['gamepadright'] = false;
    keysPressed.current['gamepadjump'] = false;
    
    const gamepads = navigator.getGamepads();
    const gamepad = gamepads[0];

    if (gamepad) {
        const DEADZONE = 0.25;
        const leftStickX = gamepad.axes[0];

        if (gamepad.buttons[14] && gamepad.buttons[14].pressed) keysPressed.current['gamepadleft'] = true;
        if (gamepad.buttons[15] && gamepad.buttons[15].pressed) keysPressed.current['gamepadright'] = true;
        if (leftStickX < -DEADZONE) keysPressed.current['gamepadleft'] = true;
        if (leftStickX > DEADZONE) keysPressed.current['gamepadright'] = true;
        if (gamepad.buttons[0] && gamepad.buttons[0].pressed) keysPressed.current['gamepadjump'] = true;
    }

    const state: InputState = {
      isMovingLeft: keysPressed.current['a'] || keysPressed.current['arrowleft'] || keysPressed.current['touchleft'] || keysPressed.current['gamepadleft'],
      isMovingRight: keysPressed.current['d'] || keysPressed.current['arrowright'] || keysPressed.current['touchright'] || keysPressed.current['gamepadright'],
      isTryingToJump: keysPressed.current['w'] || keysPressed.current['arrowup'] || keysPressed.current[' '] || keysPressed.current['touchjump'] || keysPressed.current['gamepadjump'],
      resetJump: () => {
        // Specifically reset one-time jump triggers
        if (keysPressed.current['touchjump']) {
          keysPressed.current['touchjump'] = false;
        }
      }
    };

    return state;
  };

  return {
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
    getInputState,
    resetGameInput,
  };
};