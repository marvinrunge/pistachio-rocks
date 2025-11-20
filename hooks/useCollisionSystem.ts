import { useCallback, Dispatch, SetStateAction } from 'react';
import type { PlayerState, ElementState, ParticleState, FloatingScoreState, FloatingTextState, ShellBreakAnimationState, ShellPieceState } from '../types';
import {
    GAME_HEIGHT,
    PLAYER_WIDTH,
    PLAYER_HEIGHT,
    WATER_HEAL_AMOUNT,
    MAX_PARTICLES,
    GRAVITY,
} from '../constants';
import {
    playGameOverSound,
    playGoldenTouchSound,
    playImpactSound,
    playMeteorImpactSound,
    playBlockSound,
    playResurrectSound,
    playShellCrackSound,
    playDamageSound,
    playWaterCollectSound,
} from '../utils/audio';
import { createRockParticles, createWaterSplashParticles } from '../game/particleLogic';
import { Character } from '@/game/characters/factory';

interface UseCollisionSystemProps {
    character: Character;
    goldenTouchChance: number;
    blockChance: number;
    extraLives: number;
    maxHealth: number;
    bonusHeal: number;
    season: string;
    setExtraLives: Dispatch<SetStateAction<number>>;
    setShellBreakAnimation: Dispatch<SetStateAction<ShellBreakAnimationState | null>>;
    handleGameOver: () => void;
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
    handleGameOver,
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

        let playerHitbox;
        const characterHitbox = character.hitbox;

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
            // We assume elements have already been moved for this frame in the main loop or separate hook
            // But here we just check intersection based on their current position (which should be updated)
            // Actually, the original logic updated position AND checked collision in the same loop.
            // We will assume 'el' is the updated element.

            const elementYPos = el.type === 'water' ? el.y + el.size * 0.5 : el.y;

            if (!playerHitThisFrame) {
                const elementHitbox = { x: el.x, y: elementYPos, width: el.size, height: el.size };

                if (playerHitbox.x <= elementHitbox.x + elementHitbox.width &&
                    playerHitbox.x + playerHitbox.width >= elementHitbox.x &&
                    playerHitbox.y <= elementHitbox.y + elementHitbox.height &&
                    playerHitbox.y + playerHitbox.height >= elementHitbox.y) {

                    playerHitThisFrame = true;
                    collidedElementIds.push(el.id);

                    if (el.type === 'rock' || el.type === 'meteor') {
                        if (nextPlayer.isNaked) {
                            playGameOverSound();
                            handleGameOver();
                        } else {
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
                            else playImpactSound(el.size);

                            if (currentParticles.length + particlesToCreate.length < MAX_PARTICLES) {
                                particlesToCreate.push(...createRockParticles(el, isGolden));
                            }

                            const blocked = blockChance > 0 && Math.random() < blockChance;

                            if (blocked) {
                                playBlockSound();
                                floatingTextsToCreate.push({
                                    id: Date.now() + Math.random(),
                                    x: nextPlayer.x + PLAYER_WIDTH / 2,
                                    y: GAME_HEIGHT - nextPlayer.y - PLAYER_HEIGHT,
                                    text: '0',
                                    color: '#ffffff',
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
                                    if (extraLives > 0) {
                                        setExtraLives(e => e - 1);
                                        playResurrectSound();
                                        screenFlashOpacity = 0.8;
                                        nextPlayer.health = maxHealth;
                                        nextPlayer.isNaked = false; // Restore shell on resurrection
                                    } else {
                                        if (nextPlayer.health > 0) {
                                            playShellCrackSound();
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
                                        nextPlayer.health = 0;
                                        nextPlayer.isNaked = true;
                                    }
                                } else {
                                    playDamageSound();
                                    nextPlayer.health = newHealth;
                                }
                            }
                        }
                    } else if (el.type === 'water' || el.type === 'snow') {
                        playWaterCollectSound();
                        if (currentParticles.length + particlesToCreate.length < MAX_PARTICLES) {
                            particlesToCreate.push(...createWaterSplashParticles({ x: el.x, y: el.y, size: el.size }));
                        }
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
                        nextPlayer.health = newHealth;

                        // Restore shell if player was naked and now has health
                        if (nextPlayer.isNaked && newHealth > 0) {
                            nextPlayer.isNaked = false;
                        }
                    }
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
    }, [character, goldenTouchChance, blockChance, extraLives, maxHealth, bonusHeal, season, setExtraLives, setShellBreakAnimation, handleGameOver]);

    return { checkCollisions };
};
