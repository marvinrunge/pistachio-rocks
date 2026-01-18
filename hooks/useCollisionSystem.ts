import { useCallback, Dispatch, SetStateAction } from 'react';
import type {
    PlayerState,
    ElementState,
    ParticleState,
    FloatingScoreState,
    FloatingTextState,
    ShellBreakAnimationState,
    CharacterId,
    Season,
    ShellReformAnimationState
} from '../types';
import {
    PLAYER_WIDTH,
    PLAYER_HEIGHT,
    GAME_HEIGHT,
    WATER_HEAL_AMOUNT
} from '../constants';
import {
    playImpactSound,
    playWaterCollectSound,
    playGameOverSound,
    playShellCrackSound,
    playBlockSound,
    playGoldenTouchSound,
    playMeteorImpactSound,
    playResurrectSound,
    playDamageSound
} from '../utils/audio';
import { createRockParticles, createWaterSplashParticles, createPhoenixParticles } from '../game/particleLogic';
import { Character } from '../game/characters/index';

interface UseCollisionSystemProps {
    character: Character;
    goldenTouchChance: number;
    blockChance: number;
    extraLives: number;
    maxHealth: number;
    bonusHeal: number;
    season: Season;
    setExtraLives: Dispatch<SetStateAction<number>>;
    setShellBreakAnimation: Dispatch<SetStateAction<ShellBreakAnimationState | null>>;
    setShellReformAnimation: Dispatch<SetStateAction<ShellReformAnimationState | null>>;
    handleGameOver: () => void;
    onWaterCollect?: () => void;
    onShellRecovered?: () => void;
    playerSlowTimer: number;
}

export const useCollisionSystem = ({
    character,
    goldenTouchChance,
    blockChance,
    extraLives,
    maxHealth,
    bonusHeal,
    season,
    setExtraLives,
    setShellBreakAnimation,
    setShellReformAnimation,
    handleGameOver,
    onWaterCollect,
    onShellRecovered,
    playerSlowTimer
}: UseCollisionSystemProps) => {

    const checkCollisions = useCallback((
        player: PlayerState,
        elements: ElementState[],
        currentParticles: ParticleState[]
    ) => {
        let nextPlayer = { ...player };
        let scoreGained = 0;
        let rocksHit = 0;
        const particlesToCreate: ParticleState[] = [];
        const floatingScoresToCreate: FloatingScoreState[] = [];
        const floatingTextsToCreate: FloatingTextState[] = [];
        const collidedElementIds: number[] = [];
        let playerHitThisFrame = false;
        let screenFlashOpacity = 0;
        let newPlayerSlowTimer = 0;

        // Calculate player hitbox
        const characterHitbox = character.hitbox;
        let playerHitbox;

        if (nextPlayer.isNaked) {
            const nakedWidth = characterHitbox.naked.width;
            const nakedHeight = characterHitbox.naked.height;
            const xOffset = (characterHitbox.shelled.width - nakedWidth) / 2;
            playerHitbox = {
                x: nextPlayer.x + xOffset,
                y: GAME_HEIGHT - nextPlayer.y - nakedHeight,
                width: nakedWidth,
                height: nakedHeight,
            };
        } else {
            playerHitbox = {
                x: nextPlayer.x,
                y: GAME_HEIGHT - nextPlayer.y - characterHitbox.shelled.height,
                width: characterHitbox.shelled.width,
                height: characterHitbox.shelled.height,
            };
        }

        for (const el of elements) {
            if (playerHitThisFrame) break;

            const elementYPos = el.type === 'water' ? el.y + el.size * 0.5 : el.y;
            const elementHitbox = { x: el.x, y: elementYPos, width: el.size, height: el.size };

            if (playerHitbox.x <= elementHitbox.x + elementHitbox.width &&
                playerHitbox.x + playerHitbox.width >= elementHitbox.x &&
                playerHitbox.y <= elementHitbox.y + elementHitbox.height &&
                playerHitbox.y + playerHitbox.height >= elementHitbox.y) {

                playerHitThisFrame = true;
                collidedElementIds.push(el.id);

                if (el.type === 'rock' || el.type === 'meteor') {
                    // Score and Particles
                    let points = Math.round(el.size / 10);
                    let isGolden = false;
                    if (goldenTouchChance > 0 && Math.random() < goldenTouchChance) {
                        isGolden = true;
                        points *= 10;
                        playGoldenTouchSound();
                    }

                    scoreGained += points;
                    rocksHit++;
                    floatingScoresToCreate.push({
                        id: Date.now() + Math.random(),
                        x: el.x + el.size / 2,
                        y: el.y + el.size / 2,
                        amount: points,
                        lifespan: 1.0,
                        isGolden,
                    });

                    if (el.type === 'meteor') playMeteorImpactSound();
                    else playImpactSound(el.size, 1.0);

                    particlesToCreate.push(...createRockParticles(el, isGolden));

                    // Block chance
                    if (blockChance > 0 && Math.random() < blockChance) {
                        playBlockSound();
                        floatingTextsToCreate.push({
                            id: Date.now() + Math.random(),
                            x: nextPlayer.x + PLAYER_WIDTH / 2,
                            y: GAME_HEIGHT - nextPlayer.y - PLAYER_HEIGHT,
                            text: 'BLOCK!',
                            color: '#60a5fa',
                            lifespan: 1.0,
                        });
                    } else {
                        const damage = Math.round(el.size / 10);
                        floatingTextsToCreate.push({
                            id: Date.now() + Math.random(),
                            x: nextPlayer.x + PLAYER_WIDTH / 2,
                            y: GAME_HEIGHT - nextPlayer.y - PLAYER_HEIGHT,
                            text: `-${damage}`,
                            color: '#ef4444',
                            lifespan: 1.0,
                        });

                        const newHealth = Math.max(0, nextPlayer.health - damage);
                        if (newHealth <= 0) {
                            // Stage transition or Game Over
                            if (extraLives > 0) {
                                setExtraLives(prev => prev - 1);
                                playResurrectSound();
                                screenFlashOpacity = 0.8;
                                nextPlayer.health = maxHealth;
                                nextPlayer.isNaked = false;
                                nextPlayer.isHalfShell = false;
                                particlesToCreate.push(...createPhoenixParticles(nextPlayer.x + PLAYER_WIDTH / 2, GAME_HEIGHT - nextPlayer.y - PLAYER_HEIGHT / 2));
                            }
                            // Stage 1: Full -> Half (0 HP)
                            else if (nextPlayer.hasReinforcedShell && !nextPlayer.isHalfShell && !nextPlayer.isNaked) {
                                playShellCrackSound();
                                nextPlayer.health = 0;
                                nextPlayer.isHalfShell = true;
                                nextPlayer.hasReinforcedShell = false;

                                floatingTextsToCreate.push({
                                    id: Date.now() + Math.random(),
                                    x: nextPlayer.x + PLAYER_WIDTH / 2,
                                    y: GAME_HEIGHT - nextPlayer.y - PLAYER_HEIGHT,
                                    text: 'PARTIAL BREAK!',
                                    color: '#fbbf24',
                                    lifespan: 1.5,
                                });

                                // Left piece falls off
                                const playerCenterX = nextPlayer.x + PLAYER_WIDTH / 2;
                                const playerCenterY_canvas = GAME_HEIGHT - nextPlayer.y - PLAYER_HEIGHT / 2;
                                setShellBreakAnimation({
                                    leftPiece: {
                                        x: playerCenterX, y: playerCenterY_canvas,
                                        xVelocity: -100 - Math.random() * 50, yVelocity: -400 - Math.random() * 100,
                                        rotation: 0, rotationVelocity: -200 - Math.random() * 100,
                                    },
                                    lifespan: 1.5,
                                });
                            }
                            // Stage 2: Half -> Naked (0 HP)
                            else if (nextPlayer.isHalfShell) {
                                playShellCrackSound();
                                nextPlayer.health = 0;
                                nextPlayer.isHalfShell = false;
                                nextPlayer.isNaked = true;

                                // Right piece falls off
                                const playerCenterX = nextPlayer.x + PLAYER_WIDTH / 2;
                                const playerCenterY_canvas = GAME_HEIGHT - nextPlayer.y - PLAYER_HEIGHT / 2;
                                setShellBreakAnimation({
                                    rightPiece: {
                                        x: playerCenterX, y: playerCenterY_canvas,
                                        xVelocity: 100 + Math.random() * 50, yVelocity: -400 - Math.random() * 100,
                                        rotation: 0, rotationVelocity: 200 + Math.random() * 100,
                                    },
                                    lifespan: 1.5,
                                });
                            }
                            // Stage 3: Naked -> Dead
                            else if (nextPlayer.isNaked) {
                                playGameOverSound();
                                handleGameOver();
                            }
                            // Default: Normal break (Full -> Naked)
                            else {
                                playShellCrackSound();
                                nextPlayer.health = 0;
                                nextPlayer.isNaked = true;

                                const playerCenterX = nextPlayer.x + PLAYER_WIDTH / 2;
                                const playerCenterY_canvas = GAME_HEIGHT - nextPlayer.y - PLAYER_HEIGHT / 2;
                                setShellBreakAnimation({
                                    leftPiece: {
                                        x: playerCenterX, y: playerCenterY_canvas,
                                        xVelocity: -100 - Math.random() * 50, yVelocity: -400 - Math.random() * 100,
                                        rotation: 0, rotationVelocity: -200 - Math.random() * 100,
                                    },
                                    rightPiece: {
                                        x: playerCenterX, y: playerCenterY_canvas,
                                        xVelocity: 100 + Math.random() * 50, yVelocity: -400 - Math.random() * 100,
                                        rotation: 0, rotationVelocity: 200 + Math.random() * 100,
                                    },
                                    lifespan: 1.5,
                                });
                            }
                        } else {
                            playDamageSound();
                            nextPlayer.health = newHealth;
                        }
                    }
                } else if (el.type === 'water' || el.type === 'snow') {
                    // Healing
                    playWaterCollectSound();
                    particlesToCreate.push(...createWaterSplashParticles({ x: el.x, y: el.y, size: el.size }));

                    let baseHeal = WATER_HEAL_AMOUNT;
                    if (season === 'summer') baseHeal *= 0.5;
                    if (season === 'autumn') baseHeal *= 1.5;
                    const totalHealAmount = baseHeal + bonusHeal;
                    const roundedHeal = Math.round(totalHealAmount * 10) / 10;

                    floatingTextsToCreate.push({
                        id: Date.now() + Math.random(),
                        x: nextPlayer.x + PLAYER_WIDTH / 2,
                        y: GAME_HEIGHT - nextPlayer.y - PLAYER_HEIGHT,
                        text: `+${roundedHeal}`,
                        color: '#22c55e',
                        lifespan: 1.0,
                    });

                    if (el.type === 'snow') {
                        newPlayerSlowTimer = 2.0;
                    }

                    const newHealth = Math.min(maxHealth, nextPlayer.health + roundedHeal);

                    // Recovery Logic: Detect transition from 0 HP (Naked or Half) to > 0 HP
                    if ((nextPlayer.isNaked || nextPlayer.isHalfShell) && nextPlayer.health === 0 && newHealth > 0) {
                        nextPlayer.isNaked = false;
                        nextPlayer.isHalfShell = false;
                        setShellReformAnimation({ progress: 0, duration: 0.5 });
                        onShellRecovered?.();
                    }

                    nextPlayer.health = newHealth;
                    onWaterCollect?.();
                }
            }
        }

        return {
            nextPlayer,
            scoreGained,
            rocksHit,
            particlesToCreate,
            floatingScoresToCreate,
            floatingTextsToCreate,
            screenFlashOpacity,
            newPlayerSlowTimer,
            playerHitThisFrame,
            collidedElementIds
        };
    }, [
        character,
        goldenTouchChance,
        blockChance,
        extraLives,
        maxHealth,
        bonusHeal,
        season,
        setExtraLives,
        setShellBreakAnimation,
        setShellReformAnimation,
        handleGameOver,
        onWaterCollect,
        onShellRecovered,
        playerSlowTimer
    ]);

    return { checkCollisions };
};
