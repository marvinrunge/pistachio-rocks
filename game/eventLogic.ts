// This file will manage the logic for special game events like thunderstorms,
// earthquakes, blizzards, and meteor showers.
import type { LightningStrike, BurningPatchState, ParticleState } from '../types';
import { playThunderSound } from '../utils/audio';
import { GAME_HEIGHT, GROUND_HEIGHT } from '../constants';

interface EventUpdateProps {
    currentEvent: string | null;
    deltaTime: number;
    gameDimensions: { width: number; height: number };
    currentFrameTime: number;
    windDirection: 'left' | 'right' | null;
}

interface EventUpdateResult {
    newLightningStrikes: LightningStrike[];
    newBurningPatches: BurningPatchState[];
    newParticles: ParticleState[];
    screenShake: { x: number; y: number };
}

export function updateEvents(
    props: EventUpdateProps,
    currentLightning: LightningStrike[],
    currentPatches: BurningPatchState[]
): EventUpdateResult {
    const { currentEvent, deltaTime, gameDimensions, currentFrameTime, windDirection } = props;

    const result: EventUpdateResult = {
        newLightningStrikes: [...currentLightning],
        newBurningPatches: [...currentPatches],
        newParticles: [],
        screenShake: { x: 0, y: 0 },
    };

    if (currentEvent === 'thunderstorm') {
        const baseRate = 1.5; // strikes/sec on 800px screen
        const widthRatio = gameDimensions.width / 800;
        if (Math.random() < deltaTime * baseRate * widthRatio) {
            result.newLightningStrikes.push({
                id: currentFrameTime,
                x: Math.random() * (gameDimensions.width - 50),
                width: 40 + Math.random() * 20,
                warningStartTime: currentFrameTime,
                strikeTime: currentFrameTime + 1200,
            });
        }
        if (Math.random() < deltaTime * 0.3) {
            playThunderSound();
        }
    } else if (currentEvent === 'earthquake') {
        const shakeIntensity = 4;
        result.screenShake = { x: (Math.random() - 0.5) * shakeIntensity, y: (Math.random() - 0.5) * shakeIntensity };
        if (Math.random() < deltaTime * 20) {
            result.newParticles.push({
                id: Math.random(),
                x: Math.random() * gameDimensions.width,
                y: GAME_HEIGHT - GROUND_HEIGHT + 10,
                xVelocity: (Math.random() - 0.5) * 30,
                yVelocity: -Math.random() * 60,
                size: 2 + Math.random() * 4,
                color: 'rgba(160, 120, 90, 0.6)',
                lifespan: 0.5 + Math.random() * 0.8,
                type: 'dust',
            });
        }
    } else if (currentEvent === 'blizzard') {
        // Snowflakes
        if (Math.random() < deltaTime * 90) { // High density
            result.newParticles.push({
                id: Math.random(), x: Math.random() * gameDimensions.width, y: -10,
                xVelocity: (Math.random() - 0.5) * 40,
                yVelocity: 40 + Math.random() * 30,
                size: 2 + Math.random() * 4,
                color: `rgba(255, 255, 255, ${0.6 + Math.random() * 0.3})`,
                lifespan: 6 + Math.random() * 4,
                type: 'water',
            });
        }
        // Wind streaks
        if (Math.random() < deltaTime * 20) {
            result.newParticles.push({
                id: Math.random(), x: gameDimensions.width + 20, y: Math.random() * GAME_HEIGHT,
                xVelocity: -800 - Math.random() * 300,
                yVelocity: (Math.random() - 0.5) * 20,
                size: 1 + Math.random(),
                color: 'rgba(255, 255, 255, 0.4)',
                lifespan: 0.8 + Math.random() * 0.5,
                type: 'dust',
            });
        }
    } else if (currentEvent === 'storm' && windDirection) {
        if (Math.random() < deltaTime * 80) {
            result.newParticles.push({
                id: Math.random(),
                x: windDirection === 'left' ? gameDimensions.width + 20 : -20,
                y: Math.random() * (GAME_HEIGHT - GROUND_HEIGHT),
                xVelocity: windDirection === 'left' ? -700 - Math.random() * 400 : 700 + Math.random() * 400,
                yVelocity: (Math.random() - 0.5) * 30,
                size: 1 + Math.random() * 2,
                color: 'rgba(255, 255, 255, 0.6)',
                lifespan: 0.6 + Math.random() * 0.6,
                type: 'dust',
            });
        }
    }

    // Always update lifespans of burning patches
    result.newBurningPatches = currentPatches
        .map(p => ({ ...p, lifespan: p.lifespan - deltaTime }))
        .filter(p => p.lifespan > 0);
    
    // Filter out old lightning strikes
    result.newLightningStrikes = result.newLightningStrikes.filter(s => currentFrameTime < s.strikeTime + 100);

    return result;
}

export function getIncomingEventTitle(monthCounter: number, timeInMonth: number): string | null {
    const isPreEventMonth = (monthCounter - 1) % 3 === 1;
    const isWarningTime = timeInMonth >= 24; // Show warning in the last 6 seconds

    if (!isPreEventMonth || !isWarningTime) {
        return null;
    }

    const nextMonth = monthCounter + 1;
    const nextYear = Math.floor((nextMonth -1) / 12) + 1;
    const nextSeasonIndex = Math.floor((nextMonth - 1) / 3) % 4;
    let eventName = '';
    
    const isNextAMeteorYear = nextYear >= 2 && (nextYear - 2) % 3 === 0;

    if (isNextAMeteorYear && nextSeasonIndex === 1) {
        eventName = 'METEOR SHOWER';
    } else {
        switch (nextSeasonIndex) {
            case 0: eventName = 'STORM'; break;
            case 1: eventName = 'THUNDERSTORM'; break;
            case 2: eventName = 'EARTHQUAKE'; break;
            case 3: eventName = 'BLIZZARD'; break;
        }
    }
    
    return eventName ? `${eventName} INCOMING` : null;
}