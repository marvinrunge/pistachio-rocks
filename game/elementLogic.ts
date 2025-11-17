// This file will manage the lifecycle of raining elements (rocks, water, etc.).
// This includes spawning new elements and updating their positions each frame.
// FIX: Import React to provide the namespace for React.MutableRefObject.
import React from 'react';
import type { ElementState, Season, ElementType } from '../types';
import {
    ELEMENT_SPAWN_INTERVAL,
    MIN_ELEMENT_SIZE,
    MAX_ELEMENT_SIZE,
    MIN_ELEMENT_SPEED,
    MAX_ELEMENT_SPEED,
    WATER_DROP_SIZE
} from '../constants';

interface SpawnProps {
  currentTime: number;
  lastRockSpawnTimeRef: React.MutableRefObject<number>;
  lastWaterSpawnTimeRef: React.MutableRefObject<number>;
  gameDimensions: { width: number; height: number };
  monthCounter: number;
  waterSpawnInterval: number;
  currentEvent: string | null;
  season: Season;
}

export function spawnElements(props: SpawnProps): ElementState[] {
  const {
    currentTime,
    lastRockSpawnTimeRef,
    lastWaterSpawnTimeRef,
    gameDimensions,
    monthCounter,
    waterSpawnInterval,
    currentEvent,
    season,
  } = props;
  
  const newElements: ElementState[] = [];
  const widthRatio = gameDimensions.width / 800;

  // --- Rock Spawning ---
  let rockSpawnInterval = ELEMENT_SPAWN_INTERVAL * Math.pow(0.92, monthCounter - 1);
  rockSpawnInterval /= widthRatio;
  if (currentEvent === 'earthquake') rockSpawnInterval /= 1.5;
  if (currentEvent === 'thunderstorm') rockSpawnInterval *= 2;
  if (currentEvent === 'meteorShower') rockSpawnInterval *= 1.25;

  if (currentTime - lastRockSpawnTimeRef.current > rockSpawnInterval) {
    lastRockSpawnTimeRef.current = currentTime;
    
    let size;
    let type: ElementType = 'rock';
    let speedMultiplier = 1;
    
    // Slower, non-linear speed scaling for rocks.
    const difficultySpeedMultiplier = 1 + Math.sqrt(Math.max(0, monthCounter - 1)) * 0.15;
    const minRockSpeed = MIN_ELEMENT_SPEED * difficultySpeedMultiplier;
    const maxRockSpeed = MAX_ELEMENT_SPEED * difficultySpeedMultiplier;

    if (currentEvent === 'meteorShower') {
        type = 'meteor';
        speedMultiplier = 1.5;
        size = Math.random() * (MAX_ELEMENT_SIZE - MIN_ELEMENT_SIZE) + MIN_ELEMENT_SIZE;
    } else if (currentEvent === 'earthquake') {
        size = Math.random() * (25 - MIN_ELEMENT_SIZE) + MIN_ELEMENT_SIZE;
    } else {
        size = Math.random() * (MAX_ELEMENT_SIZE - MIN_ELEMENT_SIZE) + MIN_ELEMENT_SIZE;
    }

    newElements.push({
      id: Date.now() + Math.random(),
      x: Math.random() * (gameDimensions.width - size),
      y: -size,
      size: size,
      speed: (Math.random() * (maxRockSpeed - minRockSpeed) + minRockSpeed) * speedMultiplier,
      type
    });
  }

  // --- Water/Snow Spawning ---
  let effectiveWaterSpawnInterval = waterSpawnInterval / widthRatio;
  if (currentEvent === 'thunderstorm') effectiveWaterSpawnInterval /= 3;

  if (currentTime - lastWaterSpawnTimeRef.current > effectiveWaterSpawnInterval) {
    lastWaterSpawnTimeRef.current = currentTime;
    let waterSize = WATER_DROP_SIZE;
    let waterType: 'water' | 'snow' = 'water';
    if (season === 'summer') waterSize *= 0.7;
    if (season === 'autumn') waterSize *= 1.3;
    if (season === 'winter') waterType = 'snow';

    newElements.push({
        id: Date.now() + Math.random(),
        x: Math.random() * (gameDimensions.width - waterSize),
        y: -waterSize,
        size: waterSize,
        speed: MIN_ELEMENT_SPEED,
        type: waterType,
    });
  }

  return newElements;
}

export function updateElements(elements: ElementState[], deltaTime: number): ElementState[] {
  return elements.map(el => ({
    ...el,
    y: el.y + el.speed * deltaTime,
  }));
}