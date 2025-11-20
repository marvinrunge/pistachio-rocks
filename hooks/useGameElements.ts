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
import { playMeteorImpactSound, playImpactSound } from '../utils/audio';

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

        if (currentEvent === 'earthquake') rockSpawnInterval /= 1.5;
        if (currentEvent === 'thunderstorm') rockSpawnInterval *= 2;
        if (currentEvent === 'meteorShower') rockSpawnInterval *= 1.25;

        const speedMultiplier = 1 + Math.sqrt(Math.max(0, monthCounter - 1)) * 0.15;
        const minRockSpeed = MIN_ELEMENT_SPEED * speedMultiplier;
        const maxRockSpeed = MAX_ELEMENT_SPEED * speedMultiplier;

        let effectiveWaterSpawnInterval = waterSpawnInterval;
        effectiveWaterSpawnInterval /= widthRatio;
        if (currentEvent === 'thunderstorm') effectiveWaterSpawnInterval /= 3;

        if (currentTime - lastRockSpawnTime.current > rockSpawnInterval) {
            lastRockSpawnTime.current = currentTime;
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
            nextElements.push({
                id: Date.now() + Math.random(),
                x: Math.random() * (gameDimensions.width - size),
                y: -size,
                size: size,
                speed: (Math.random() * (maxRockSpeed - minRockSpeed) + minRockSpeed) * elementSpeedMultiplier,
                type
            });
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
