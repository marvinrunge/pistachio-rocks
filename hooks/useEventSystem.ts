import { useEffect, useRef, useCallback, Dispatch, SetStateAction } from 'react';
import type {
    PlayerState,
    LightningStrike,
    BurningPatchState,
    FloatingTextState,
    CloudState,
    GameStatus,
    ParticleState
} from '../types';
import {
    GAME_HEIGHT,
    GROUND_HEIGHT,
    PLAYER_WIDTH,
    PLAYER_HEIGHT
} from '../constants';
import {
    playLightningStrikeSound,
    playEarthquakeSound,
    playBlizzardSound,
    playStormSound,
    playGameOverSound,
    playDamageSound,
    playShellCrackSound,
    playResurrectSound
} from '../utils/audio';
import { updateEvents } from '../game/eventLogic';

interface UseEventSystemProps {
    monthCounter: number;
    gameStatus: GameStatus;
    gameDimensions: { width: number; height: number };
    currentEvent: string | null;
    lightningStrikes: LightningStrike[];
    burningPatches: BurningPatchState[];
    windDirection: 'left' | 'right' | null;
    setCurrentEvent: (event: string | null) => void;
    setWindDirection: (dir: 'left' | 'right' | null) => void;
    setClouds: Dispatch<SetStateAction<CloudState[]>>;
    setLightningStrikes: Dispatch<SetStateAction<LightningStrike[]>>;
    setBurningPatches: Dispatch<SetStateAction<BurningPatchState[]>>;
    extraLives: number;
    maxHealth: number;
    setExtraLives: Dispatch<SetStateAction<number>>;
    handleGameOver: () => void;
}

interface LightningStrikeResult {
    updatedPlayer: PlayerState;
    screenFlash: number;
    floatingTexts: FloatingTextState[];
    updatedStrikes: LightningStrike[];
}

interface BurningPatchResult {
    updatedPlayer: PlayerState;
    screenFlash: number;
    floatingTexts: FloatingTextState[];
    updatedPatches: BurningPatchState[];
}

interface EventStateUpdateResult {
    updatedPlayer: PlayerState;
    screenFlash: number;
    floatingTexts: FloatingTextState[];
    newParticles: ParticleState[];
    screenShake: { x: number; y: number };
    newLightningStrikes: LightningStrike[];
    newBurningPatches: BurningPatchState[];
}

export const useEventSystem = ({
    monthCounter,
    gameStatus,
    gameDimensions,
    currentEvent,
    lightningStrikes,
    burningPatches,
    windDirection,
    setCurrentEvent,
    setWindDirection,
    setClouds,
    setLightningStrikes,
    setBurningPatches,
    extraLives,
    maxHealth,
    setExtraLives,
    handleGameOver
}: UseEventSystemProps) => {
    const groundDamageAccumulator = useRef(0);
    const lastGroundDamageTime = useRef(0);

    // Event triggering based on month/season
    useEffect(() => {
        if (gameStatus !== 'playing') return;

        if ((monthCounter - 1) % 3 === 2) {
            const currentYear = Math.floor((monthCounter - 1) / 12) + 1;
            const seasonIndex = Math.floor((monthCounter - 1) / 3) % 4;
            let eventName = '';

            // Meteor shower logic
            const isMeteorYear = currentYear >= 2 && (currentYear - 2) % 3 === 0;

            if (isMeteorYear && seasonIndex === 1) { // Summer of a meteor year
                eventName = 'meteorShower';
            } else {
                switch (seasonIndex) {
                    case 0: // Spring -> Storm
                        eventName = 'storm';
                        const dir = Math.random() < 0.5 ? 'left' : 'right';
                        setWindDirection(dir);
                        playStormSound();
                        setClouds(prevClouds => {
                            const stormClouds: CloudState[] = [];
                            for (let i = 0; i < 10; i++) {
                                stormClouds.push({
                                    x: Math.random() * gameDimensions.width,
                                    y: 60 + Math.random() * 120,
                                    speed: 40 + Math.random() * 40,
                                    width: 100 + Math.random() * 80,
                                    height: 30 + Math.random() * 20,
                                    isStormCloud: true,
                                });
                            }
                            return [...prevClouds.filter(c => !c.isStormCloud), ...stormClouds];
                        });
                        break;
                    case 1: // Summer -> Thunderstorm
                        eventName = 'thunderstorm';
                        setClouds(prevClouds => {
                            const stormClouds: CloudState[] = [];
                            for (let i = 0; i < 7; i++) {
                                stormClouds.push({
                                    x: Math.random() * gameDimensions.width,
                                    y: 40 + Math.random() * 100,
                                    speed: 30 + Math.random() * 30,
                                    width: 120 + Math.random() * 100,
                                    height: 35 + Math.random() * 25,
                                    isStormCloud: true,
                                });
                            }
                            return [...prevClouds.filter(c => !c.isStormCloud), ...stormClouds];
                        });
                        break;
                    case 2: // Autumn -> Earthquake
                        eventName = 'earthquake';
                        playEarthquakeSound();
                        break;
                    case 3: // Winter -> Blizzard
                        eventName = 'blizzard';
                        playBlizzardSound();
                        break;
                }
            }
            setCurrentEvent(eventName);
        }
    }, [monthCounter, gameStatus, gameDimensions.width, setCurrentEvent, setWindDirection, setClouds]);

    const processLightningStrikes = useCallback((
        player: PlayerState,
        playerHitbox: { x: number; y: number; width: number; height: number },
        currentFrameTime: number,
        deltaTime: number,
        currentLightningStrikes: LightningStrike[]
    ): LightningStrikeResult => {
        let updatedPlayer = { ...player };
        let screenFlash = 0;
        const floatingTexts: FloatingTextState[] = [];
        let updatedStrikes = [...currentLightningStrikes];

        for (const strike of updatedStrikes) {
            if (!strike.hasStruck && currentFrameTime >= strike.strikeTime && currentFrameTime < strike.strikeTime + 100) {
                playLightningStrikeSound();
                strike.hasStruck = true;
                screenFlash = 0.8;

                const strikeHitbox = { x: strike.x, y: 0, width: strike.width, height: GAME_HEIGHT - GROUND_HEIGHT };
                if (playerHitbox.x < strikeHitbox.x + strikeHitbox.width &&
                    playerHitbox.x + playerHitbox.width > strikeHitbox.x) {
                    const damage = 10;
                    if (updatedPlayer.isNaked) {
                        playGameOverSound();
                        handleGameOver();
                    } else {
                        floatingTexts.push({
                            id: Date.now() + Math.random(),
                            x: updatedPlayer.x + PLAYER_WIDTH / 2,
                            y: GAME_HEIGHT - updatedPlayer.y - PLAYER_HEIGHT,
                            text: `-${damage}`,
                            color: '#ef4444',
                            lifespan: 1.0,
                        });
                        const newHealth = Math.max(0, updatedPlayer.health - damage);
                        if (newHealth <= 0) {
                            if (extraLives > 0) {
                                setExtraLives(e => e - 1);
                                playResurrectSound();
                                screenFlash = 0.8;
                                updatedPlayer.health = maxHealth;
                                updatedPlayer.isNaked = false; // Restore shell on resurrection
                            } else {
                                if (updatedPlayer.health > 0) playShellCrackSound();
                                updatedPlayer.health = 0;
                                updatedPlayer.isNaked = true;
                            }
                        } else {
                            playDamageSound();
                            updatedPlayer.health = newHealth;
                        }
                    }
                }
            }
        }
        updatedStrikes = updatedStrikes.filter(s => currentFrameTime < s.strikeTime + 100);

        return { updatedPlayer, screenFlash, floatingTexts, updatedStrikes };
    }, [extraLives, maxHealth, setExtraLives, handleGameOver]);

    const processBurningPatches = useCallback((
        player: PlayerState,
        playerHitbox: { x: number; y: number; width: number; height: number },
        deltaTime: number,
        currentBurningPatches: BurningPatchState[]
    ): BurningPatchResult => {
        let updatedPlayer = { ...player };
        let screenFlash = 0;
        const floatingTexts: FloatingTextState[] = [];
        let updatedPatches = [...currentBurningPatches];

        if (updatedPatches.length > 0) {
            const playerFeetY = GAME_HEIGHT - updatedPlayer.y;
            if (playerFeetY >= GAME_HEIGHT - GROUND_HEIGHT && playerFeetY < GAME_HEIGHT - GROUND_HEIGHT + 10) {
                for (const patch of updatedPatches) {
                    if (playerHitbox.x + playerHitbox.width > patch.x && playerHitbox.x < patch.x + patch.width) {
                        const damagePerSecond = 5;
                        const damage = damagePerSecond * deltaTime;
                        const newHealth = Math.max(0, updatedPlayer.health - damage);
                        if (newHealth < updatedPlayer.health) {
                            const damageTaken = updatedPlayer.health - newHealth;
                            groundDamageAccumulator.current += damageTaken;

                            const now = performance.now();
                            if (now - lastGroundDamageTime.current > 400 && groundDamageAccumulator.current >= 1) {
                                const roundedDamage = Math.round(groundDamageAccumulator.current);
                                floatingTexts.push({
                                    id: Date.now() + Math.random(),
                                    x: updatedPlayer.x + PLAYER_WIDTH / 2,
                                    y: GAME_HEIGHT - updatedPlayer.y - PLAYER_HEIGHT,
                                    text: `-${roundedDamage}`,
                                    color: '#f97316', // Orange for fire damage
                                    lifespan: 1.0,
                                });
                                groundDamageAccumulator.current = 0;
                                lastGroundDamageTime.current = now;
                            }

                            if (newHealth <= 0) {
                                if (extraLives > 0) {
                                    setExtraLives(e => e - 1);
                                    playResurrectSound();
                                    screenFlash = 0.8;
                                    updatedPlayer.health = maxHealth;
                                    updatedPlayer.isNaked = false; // Restore shell on resurrection
                                } else {
                                    if (updatedPlayer.health > 0) playShellCrackSound();
                                    updatedPlayer.health = 0;
                                    updatedPlayer.isNaked = true;
                                }
                            } else {
                                updatedPlayer.health = newHealth;
                            }
                        }
                    }
                }
            }
            updatedPatches = updatedPatches.map(p => ({ ...p, lifespan: p.lifespan - deltaTime })).filter(p => p.lifespan > 0);
        }

        return { updatedPlayer, screenFlash, floatingTexts, updatedPatches };
    }, [extraLives, maxHealth, setExtraLives]);

    const addBurningPatch = useCallback((x: number, width: number) => {
        setBurningPatches(prev => [...prev, {
            id: Date.now() + Math.random(),
            x: x - 10,
            width: width + 20,
            lifespan: 3.0
        }]);
    }, [setBurningPatches]);

    const clearEventEffects = useCallback(() => {
        if (currentEvent) {
            if (currentEvent === 'thunderstorm' || currentEvent === 'storm') {
                setClouds(prev => prev.filter(c => !c.isStormCloud));
            }
            if (currentEvent === 'thunderstorm') setLightningStrikes([]);
            if (currentEvent === 'meteorShower') setBurningPatches([]);
            setCurrentEvent(null);
            setWindDirection(null);
        }
    }, [currentEvent, setClouds, setLightningStrikes, setBurningPatches, setCurrentEvent, setWindDirection]);

    const updateEventState = useCallback((
        player: PlayerState,
        deltaTime: number,
        currentFrameTime: number
    ): EventStateUpdateResult => {
        const eventResult = updateEvents(
            {
                currentEvent,
                deltaTime,
                gameDimensions,
                currentFrameTime,
                windDirection
            },
            lightningStrikes,
            burningPatches
        );

        // Return the new lightning strikes and burning patches
        // The game loop will then process them with processLightningStrikes and processBurningPatches

        return {
            updatedPlayer: player,
            screenFlash: 0,
            floatingTexts: [],
            newParticles: eventResult.newParticles,
            screenShake: eventResult.screenShake,
            newLightningStrikes: eventResult.newLightningStrikes,
            newBurningPatches: eventResult.newBurningPatches
        };
    }, [currentEvent, gameDimensions, windDirection, lightningStrikes, burningPatches]);

    return {
        processLightningStrikes,
        processBurningPatches,
        addBurningPatch,
        clearEventEffects,
        updateEventState
    };
};
