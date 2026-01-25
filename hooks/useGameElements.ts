import { useRef, useCallback } from 'react';
import type { ElementState, ElementType, Season, GameDimensions } from '../types';
import {
    ELEMENT_SPAWN_INTERVAL,
    MIN_ELEMENT_SIZE,
    MAX_ELEMENT_SIZE,
    MIN_ELEMENT_SPEED,
    MAX_ELEMENT_SPEED,
    WATER_DROP_SIZE,
} from '../constants';

interface UseGameElementsProps {
    gameDimensions: GameDimensions;
    monthCounter: number;
    currentEvent: string | null;
    waterSpawnInterval: number;
    season: Season;
}

export const useGameElements = ({
    gameDimensions,
    monthCounter,
    currentEvent,
    waterSpawnInterval,
    season,
}: UseGameElementsProps) => {
    const lastRockSpawnTime = useRef(0);
    const lastWaterSpawnTime = useRef(0);

    const resetSpawnTimers = useCallback(() => {
        lastRockSpawnTime.current = 0;
        lastWaterSpawnTime.current = 0;
    }, []);

    const spawnGameElements = useCallback((currentTime: number, currentElements: ElementState[]): ElementState[] => {
        const nextElements = [...currentElements];
        const widthRatio = gameDimensions.width / 800;
        let rockSpawnInterval = ELEMENT_SPAWN_INTERVAL * Math.pow(0.92, monthCounter - 1);
        rockSpawnInterval /= widthRatio;

        // CAP: Minimum spawn interval of 160ms to prevent an unavoidable wall of rocks
        if (rockSpawnInterval < 160) rockSpawnInterval = 160;

        if (currentEvent === 'earthquake') rockSpawnInterval /= 1.5;
        if (currentEvent === 'thunderstorm') rockSpawnInterval *= 2;
        if (currentEvent === 'meteorShower') rockSpawnInterval *= 1.25;

        // Damage multiplier based on months survived
        // Starts at 1.0, increases by 10% per month
        const damageMultiplier = 1 + (monthCounter - 1) * 0.1;

        const speedMultiplier = 1 + Math.sqrt(Math.max(0, monthCounter - 1)) * 0.15;
        const minRockSpeed = MIN_ELEMENT_SPEED * speedMultiplier;
        const maxRockSpeed = MAX_ELEMENT_SPEED * speedMultiplier;

        let effectiveWaterSpawnInterval = waterSpawnInterval;
        effectiveWaterSpawnInterval /= widthRatio;
        if (currentEvent === 'thunderstorm') effectiveWaterSpawnInterval /= 3;

        if (lastRockSpawnTime.current === 0) {
            lastRockSpawnTime.current = currentTime;
        }

        const timeSinceLastRock = currentTime - lastRockSpawnTime.current;
        // If we've missed a lot of time (e.g. > 2 seconds), we likely just came back from a pause.
        // Reset the timer to currentTime to prevent a massive burst of rocks.
        if (timeSinceLastRock > 2000) {
            lastRockSpawnTime.current = currentTime;
        }

        const timeToSpawn = currentTime - lastRockSpawnTime.current;
        if (timeToSpawn > rockSpawnInterval) {
            // Calculate how many rocks should have spawned
            const rocksToSpawnCount = Math.floor(timeToSpawn / rockSpawnInterval);
            // Cap spawns per frame to 5 to prevent extreme bursts/performance issues
            const actualSpawns = Math.min(rocksToSpawnCount, 5);

            // Advance the timer by the amount we are actually spawning
            lastRockSpawnTime.current += actualSpawns * rockSpawnInterval;

            for (let i = 0; i < actualSpawns; i++) {
                let size;
                let type: ElementType = 'rock';
                let elementSpeedMultiplier = 1;

                if (currentEvent === 'meteorShower') {
                    type = 'meteor';
                    elementSpeedMultiplier = 1.5;
                    size = Math.random() * (MAX_ELEMENT_SIZE - MIN_ELEMENT_SIZE) + MIN_ELEMENT_SIZE;
                } else if (currentEvent === 'earthquake') {
                    size = Math.random() * (25 - MIN_ELEMENT_SIZE) + MIN_ELEMENT_SIZE;
                } else {
                    size = Math.random() * (MAX_ELEMENT_SIZE - MIN_ELEMENT_SIZE) + MIN_ELEMENT_SIZE;
                }

                // Base damage is size-based, then scales with month
                const baseDamage = Math.round(size / 10);
                const scaledDamage = Math.round(baseDamage * damageMultiplier);

                // Visual feedback: Calculate custom color if damage is high
                // Starts gray, shifts to dark red/charcoal
                let customColor: string | undefined;
                if (damageMultiplier > 1.5) {
                    const intensity = Math.min(1, (damageMultiplier - 1.5) / 2); // 0 to 1
                    const r = Math.round(100 - intensity * 50); // Shifts from 100 to 50
                    const g = Math.round(100 - intensity * 80); // Shifts from 100 to 20
                    const b = Math.round(100 - intensity * 80);
                    customColor = `rgb(${r}, ${g}, ${b})`;
                    // If very dangerous, add a reddish glow hint in the color string
                    if (intensity > 0.5) {
                        customColor = `rgb(${r + 40}, ${g}, ${b})`;
                    }
                }

                nextElements.push({
                    id: Date.now() + Math.random() + i, // Ensure unique IDs in loop
                    x: Math.random() * (gameDimensions.width - size),
                    y: -size - (i * 20), // Stagger slightly if multiple spawn at once
                    size: size,
                    speed: (Math.random() * (maxRockSpeed - minRockSpeed) + minRockSpeed) * elementSpeedMultiplier,
                    type,
                    damage: scaledDamage,
                    customColor
                });
            }
        }

        const timeSinceLastWater = currentTime - lastWaterSpawnTime.current;
        if (timeSinceLastWater > 2000) {
            lastWaterSpawnTime.current = currentTime;
        }

        if (currentTime - lastWaterSpawnTime.current > effectiveWaterSpawnInterval) {
            lastWaterSpawnTime.current = currentTime;
            let waterSize = WATER_DROP_SIZE;
            let waterType: 'water' | 'snow' = 'water';
            if (season === 'summer') waterSize *= 0.7;
            if (season === 'autumn') waterSize *= 1.3;
            if (season === 'winter') waterType = 'snow';
            nextElements.push({
                id: Date.now() + Math.random(),
                x: Math.random() * (gameDimensions.width - waterSize),
                y: -waterSize,
                size: waterSize,
                speed: MIN_ELEMENT_SPEED,
                type: waterType,
                damage: 0 // Water/Snow deals no damage
            });
        }

        return nextElements;
    }, [gameDimensions, monthCounter, currentEvent, waterSpawnInterval, season]);

    const updateGameElements = useCallback((elements: ElementState[], deltaTime: number): ElementState[] => {
        return elements.map(el => ({
            ...el,
            y: el.y + el.speed * deltaTime
        }));
    }, []);

    return { spawnGameElements, updateGameElements, resetSpawnTimers };
};
