

import React, { useEffect, useRef, useCallback, useState } from 'react';
import type { PlayerState, ElementState, ParticleState, Skill, LightningStrike, Season, FloatingTextState, HighScoreEntry, ElementType, GameStatus, CloudState, FloatingScoreState, ShellBreakAnimationState, ShellPieceState, ScorePayload, SubmissionResult, CharacterId, ShellReformAnimationState, BurningPatchState, AchievementNotification, HealingFountainState } from '../types';
import {
    GAME_HEIGHT,
    PLAYER_WIDTH,
    PLAYER_HEIGHT,
    PLAYER_ACCELERATION,
    MAX_PLAYER_SPEED,
    GROUND_FRICTION,
    ICE_FRICTION,
    WIND_FORCE,
    JUMP_STRENGTH,
    GRAVITY,
    INITIAL_MAX_HEALTH,
    ELEMENT_SPAWN_INTERVAL,
    MIN_ELEMENT_SIZE,
    MAX_ELEMENT_SIZE,
    MIN_ELEMENT_SPEED,
    MAX_ELEMENT_SPEED,
    GROUND_HEIGHT,
    INITIAL_WATER_SPAWN_INTERVAL,
    WATER_DROP_SIZE,
    WATER_HEAL_AMOUNT,
    GOLDEN_TOUCH_CHANCE_INCREASE,
    MAX_PARTICLES,
    GAME_VERSION,
    GAME_WIDTH,
} from '../constants';
import { initAudio, playJumpSound, playDamageSound, playImpactSound, playWaterCollectSound, playThunderSound, playLightningStrikeSound, playEarthquakeSound, playBlizzardSound, playStormSound, playBlockSound, playResurrectSound, playShellCrackSound, playSeismicSlamSound, playPhotosynthesisHealSound, playGoldenTouchSound, playGameOverSound, playMeteorImpactSound, playAchievementCompleteSound } from '../utils/audio';
import { loadLocalHighScores, saveLocalHighScores, savePlayerName } from '../utils/storage';
import { getHighScores, startNewGameSession, submitScore } from '../utils/leaderboard';
import { PERMANENT_SKILL_POOL, EVENT_SKILL_POOL, YEARLY_SKILL_POOL } from '../game/skills';
import { getInitialPlayerState, generateInitialClouds } from '../game/state';
import { drawGame } from '../game/drawing';
import { assetManager } from '../game/assets';
import { getCharacterById, type Character } from '../game/characters/index';
import { useInput } from './useInput';
import { useGameState } from './useGameState';
import { createRockParticles, createWaterSplashParticles, createDustParticles, createSeasonalParticles, updateParticles } from '../game/particleLogic';
import { usePlayerPhysics } from './usePlayerPhysics';
import { useCollisionSystem } from './useCollisionSystem';
import { useGameElements } from './useGameElements';
import { useEventSystem } from './useEventSystem';
import { useAchievementSystem } from './useAchievementSystem';
import { useSkillSystem } from './useSkillSystem';
import { updateEvents, getIncomingEventTitle } from '../game/eventLogic';

interface UseGameLogicProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    gameDimensions: { width: number; height: number };
}

export const useGameLogic = ({ canvasRef, gameDimensions }: UseGameLogicProps) => {
    const {
        clouds, setClouds,
        gameState, setGameState,
        particles, setParticles,
        floatingScores, setFloatingScores,
        floatingTexts, setFloatingTexts,
        gameStatus, setGameStatus,
        score, setScore,
        difficultyLevel, setDifficultyLevel,
        monthCounter, setMonthCounter,
        timeInMonth, setTimeInMonth,
        availableSkills, setAvailableSkills,
        season, setSeason,
        playerSlowTimer, setPlayerSlowTimer,
        rocksDestroyed, setRocksDestroyed,
        highScores, setHighScores,
        leaderboardState, setLeaderboardState,
        acquiredSkills, setAcquiredSkills,
        lastSubmissionResult, setLastSubmissionResult,
        assetsReady, setAssetsReady,
        selectedCharacterId, setSelectedCharacterId,
        character, setCharacter,
        maxHealth, setMaxHealth,
        maxSpeed, setMaxSpeed,
        extraLives, setExtraLives,
        blockChance, setBlockChance,
        bonusHeal, setBonusHeal,
        waterSpawnInterval, setWaterSpawnInterval,
        photosynthesisLevel, setPhotosynthesisLevel,
        goldenTouchChance, setGoldenTouchChance,
        currentEvent, setCurrentEvent,
        incomingEventTitle, setIncomingEventTitle,
        lightningStrikes, setLightningStrikes,
        burningPatches, setBurningPatches,
        screenFlash, setScreenFlash,
        screenShake, setScreenShake,
        windDirection, setWindDirection,
        shellBreakAnimation, setShellBreakAnimation,
        shellReformAnimation, setShellReformAnimation,
        resetGameState: resetGameStateInternal,
    } = useGameState(gameDimensions);

    const { getInputState, handleTouchStart, handleTouchMove, handleTouchEnd, resetGameInput } = useInput(gameStatus === 'playing');

    const { updatePlayerPhysics } = usePlayerPhysics({
        gameDimensions,
        maxSpeed,
        playerSlowTimer,
        currentEvent,
        windDirection,
        getInputState,
        acquiredSkills
    });

    const { spawnGameElements, updateGameElements, resetSpawnTimers } = useGameElements({
        gameDimensions,
        monthCounter,
        currentEvent,
        waterSpawnInterval,
        season
    });

    const handleGameOver = () => {
        setGameStatus('enteringName');
    };

    const { processLightningStrikes, processBurningPatches, clearEventEffects, updateEventState } = useEventSystem({
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
    });

    const lastRockSpawnTime = useRef(0);
    const lastWaterSpawnTime = useRef(0);
    const lastFrameTime = useRef<number>(performance.now());
    const audioInitialized = useRef(false);
    const standStillTimer = useRef(0);
    const seismicShakeTimerRef = useRef(0);
    const seismicSlamTriggeredRef = useRef(false);
    const reinforcedShellTriggeredRef = useRef(false);
    const renderContext = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
    const gameSessionIdRef = useRef<string | null>(null);
    const gameStateRef = useRef(gameState);
    gameStateRef.current = gameState;

    const healPlayer = useCallback((amount: number) => {
        setGameState(prev => ({
            ...prev,
            player: { ...prev.player, health: prev.player.health + amount }
        }));
    }, [setGameState]);

    const [achievementNotifications, setAchievementNotifications] = useState<AchievementNotification[]>([]);
    const [healingFountains, setHealingFountains] = useState<HealingFountainState[]>([]);
    const healingAccumulatorRef = useRef(0);

    const spawnHealingFountain = useCallback((amount: number) => {
        setHealingFountains(prev => {
            const existingFountain = prev[0]; // Assuming only one central fountain for now
            if (existingFountain) {
                return [{
                    ...existingFountain,
                    maxCapacity: existingFountain.maxCapacity + amount,
                    currentCapacity: existingFountain.currentCapacity + amount
                }];
            } else {
                return [{
                    id: Date.now(),
                    x: gameStateRef.current.player.x - 30, // Spawn at player position, centered (width 60)
                    y: GAME_HEIGHT - GROUND_HEIGHT,
                    width: 60,
                    height: 100,
                    maxCapacity: amount,
                    currentCapacity: amount
                }];
            }
        });
    }, []);

    const armSeismicSlam = useCallback(() => {
        setGameState(prev => ({
            ...prev,
            player: { ...prev.player, seismicSlamReady: true }
        }));
        // Use ref to signal inside game loop if it happens mid-frame or just to be safe
        seismicSlamTriggeredRef.current = true;
    }, [setGameState]);

    const triggerReinforcedShell = useCallback(() => {
        setGameState(prev => ({
            ...prev,
            player: { ...prev.player, hasReinforcedShell: true }
        }));
        reinforcedShellTriggeredRef.current = true;
    }, [setGameState]);



    const { checkAchievementProgress, achievements, resetAchievements } = useAchievementSystem({
        setNotifications: setAchievementNotifications,
        spawnHealingFountain,
        armSeismicSlam,
        triggerReinforcedShell
    });

    const { handleLevelUp, handleSkillSelect, simulateSkillsForDebug } = useSkillSystem({
        monthCounter,
        difficultyLevel,
        availableSkills,
        setDifficultyLevel,
        setGameStatus,
        setAvailableSkills,
        setAcquiredSkills,
        setIncomingEventTitle,
        setMonthCounter,
        setTimeInMonth,
        setMaxHealth,
        setMaxSpeed,
        setBonusHeal,
        setWaterSpawnInterval,
        setExtraLives,
        setBlockChance,
        setPhotosynthesisLevel,
        setGoldenTouchChance,
        clearEventEffects,
        resetGameInput,
        lastFrameTimeRef: lastFrameTime,
        healPlayer,
        blockChance
    });

    // Load assets on initial mount
    useEffect(() => {
        assetManager.loadAssets().then(() => {
            setAssetsReady(true);
        }).catch(error => {
            console.error("Failed to initialize game assets:", error);
            // NOTE: An error state could be set here to show a message to the user.
        });
        setClouds(generateInitialClouds(gameDimensions.width));
    }, []);

    useEffect(() => {
        const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
        const seasonIndex = Math.floor((monthCounter - 1) / 3) % 4;
        setSeason(seasons[seasonIndex]);
    }, [monthCounter]);

    const resetGame = useCallback((characterId?: CharacterId) => {
        const targetId = characterId || selectedCharacterId;
        resetGameStateInternal(targetId);
        resetSpawnTimers();
        resetAchievements();
        setHealingFountains([]);
        setAchievementNotifications([]);
        seismicSlamTriggeredRef.current = false;
        reinforcedShellTriggeredRef.current = false;
    }, [resetGameStateInternal, resetSpawnTimers, resetAchievements, selectedCharacterId]);

    const startGame = useCallback(() => {
        if (!audioInitialized.current) {
            initAudio();
            audioInitialized.current = true;
        }

        resetGame(selectedCharacterId);

        standStillTimer.current = 0;


        // Start a new game session with the backend
        startNewGameSession()
            .then(gameId => {
                gameSessionIdRef.current = gameId;
                console.log("Game session started:", gameId);
            })
            .catch(error => {
                console.error("Could not start online game session:", error);
                gameSessionIdRef.current = null; // Mark session as offline
            });

        setGameStatus('playing');
        const now = performance.now();
        lastFrameTime.current = now;
    }, [resetGameStateInternal, selectedCharacterId, setGameStatus]);


    const { checkCollisions } = useCollisionSystem({
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
        onWaterCollect: () => checkAchievementProgress('rainDancer'),
        onShellRecovered: () => checkAchievementProgress('shellEvader'),
        playerSlowTimer
    });

    const handleFetchVersionScores = useCallback(async (version: string) => {
        setLeaderboardState('loading');
        try {
            const scores = await getHighScores(version);
            setHighScores(scores);
            setLeaderboardState('idle');
        } catch (error) {
            console.error(`Failed to load scores for version ${version}`, error);
            setHighScores(loadLocalHighScores()); // Fallback to local
            setLeaderboardState('error');
        }
    }, [setHighScores, setLeaderboardState]);

    const handleSaveScore = useCallback(async (name: string) => {
        setLeaderboardState('submitting');
        savePlayerName(name);

        const totalMonthsSurvived = monthCounter - 1;
        const year = Math.floor(totalMonthsSurvived / 12);
        const month = totalMonthsSurvived % 12;

        // Save to local scores as a backup
        const newLocalScore: HighScoreEntry = {
            id: Date.now(), name, score: Math.floor(score), year, month, rocksDestroyed, maxHealth, finalSpeed: maxSpeed, acquiredSkills, characterId: gameState.player.characterId, version: GAME_VERSION,
            completedAchievements: achievements.filter(q => q.level > 1)
        };
        const updatedLocalScores = [...loadLocalHighScores(), newLocalScore].sort((a, b) => b.score - a.score).slice(0, 20);
        saveLocalHighScores(updatedLocalScores);

        // If we have a session ID, try to submit to the global leaderboard
        if (gameSessionIdRef.current) {
            const payload: ScorePayload = {
                gameId: gameSessionIdRef.current,
                name,
                score: Math.floor(score),
                year,
                month,
                rocksDestroyed,
                maxHealth,
                finalSpeed: maxSpeed,
                acquiredSkills,
                characterId: gameState.player.characterId,
                version: GAME_VERSION,
                completedAchievements: achievements.filter(q => q.level > 1)
            };
            try {
                const submissionResult = await submitScore(payload);
                setLastSubmissionResult(submissionResult);
                setGameStatus('highScores');
                await handleFetchVersionScores(GAME_VERSION);
            } catch (error) {
                console.error("Failed to submit score to global leaderboard:", error);
                setHighScores(updatedLocalScores); // Show local scores on failure
                setLastSubmissionResult(null);
                setLeaderboardState('error');
                setGameStatus('highScores');
            }
        } else {
            // If no session ID, we're in offline mode
            setHighScores(updatedLocalScores);
            setLastSubmissionResult(null);
            setLeaderboardState('idle');
            setGameStatus('highScores');
        }
    }, [score, monthCounter, rocksDestroyed, maxHealth, maxSpeed, acquiredSkills, gameState.player.characterId, handleFetchVersionScores, setGameStatus, setHighScores, setLastSubmissionResult, setLeaderboardState, achievements]);

    const handleShowHighScores = useCallback(async () => {
        setLastSubmissionResult(null);
        setGameStatus('highScores');
        await handleFetchVersionScores(GAME_VERSION);
    }, [handleFetchVersionScores, setGameStatus, setLastSubmissionResult]);

    const handleShowInstructions = useCallback(() => {
        setGameStatus('instructions');
    }, [setGameStatus]);

    const handleShowAbout = useCallback(() => {
        setGameStatus('about');
    }, [setGameStatus]);

    const handleShowCharacterSelect = useCallback(() => {
        setGameStatus('characterSelect');
    }, [setGameStatus]);

    const handleSelectCharacter = useCallback((characterId: CharacterId) => {
        setSelectedCharacterId(characterId);
        try {
            localStorage.setItem('selectedCharacter', characterId);
        } catch (e) {
            console.warn('Could not save character selection to localStorage.');
        }
        setGameStatus('start');
    }, [setSelectedCharacterId, setGameStatus]);

    const handleBackToMenu = useCallback(() => {
        setLastSubmissionResult(null);
        setGameStatus('start');
    }, [setGameStatus, setLastSubmissionResult]);


    const gameLoop = useCallback((currentTime: number) => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        let deltaTime = (currentTime - lastFrameTime.current) / 1000;
        // Cap delta time to prevent massive jumps when tab is inactive
        if (deltaTime > 0.1) deltaTime = 0.1;
        lastFrameTime.current = currentTime;

        const clientWidth = canvas.width;
        const clientHeight = canvas.height;
        const scale = clientHeight / GAME_HEIGHT;
        renderContext.current = { scale, offsetX: 0, offsetY: 0 };

        let currentFrameTime = performance.now();
        let nextScreenShake = { x: 0, y: 0 };

        // --- Update Logic ---
        if (gameStatus === 'start' || gameStatus === 'playing') {
            setClouds(prevClouds => prevClouds.map(cloud => {
                let speed = cloud.speed;
                let newX = cloud.x;
                if (gameStatus === 'playing' && currentEvent === 'storm' && windDirection) {
                    speed *= cloud.isStormCloud ? 2.5 : 1.5;
                    if (windDirection === 'right') {
                        newX = cloud.x + speed * deltaTime;
                        if (newX > gameDimensions.width) newX = -cloud.width;
                    } else {
                        newX = cloud.x - speed * deltaTime;
                        if (newX < -cloud.width) newX = gameDimensions.width;
                    }
                } else {
                    newX = cloud.x - speed * deltaTime;
                    if (newX < -cloud.width) newX = gameDimensions.width;
                }
                return { ...cloud, x: newX };
            }));
        }

        if (gameStatus === 'playing') {
            if (timeInMonth + deltaTime >= 30) {
                setTimeInMonth(30);
                handleLevelUp();
                return;
            }

            const nextTimeInMonth = timeInMonth + deltaTime;

            const newIncomingEventTitle = getIncomingEventTitle(monthCounter, timeInMonth);
            if (newIncomingEventTitle !== incomingEventTitle) {
                setIncomingEventTitle(newIncomingEventTitle);
            }

            if (newIncomingEventTitle !== incomingEventTitle) {
                setIncomingEventTitle(newIncomingEventTitle);
            }

            let nextPlayerState = { ...gameState.player };

            // Apply any pending triggers from refs (fixes race condition where quest completion update is overwritten)
            if (seismicSlamTriggeredRef.current) {
                nextPlayerState.seismicSlamReady = true;
                seismicSlamTriggeredRef.current = false;
            }
            if (reinforcedShellTriggeredRef.current) {
                nextPlayerState.hasReinforcedShell = true;
                reinforcedShellTriggeredRef.current = false;
            }

            let nextElements = [...gameState.elements];
            let scoreGained = 0;
            let rocksHitThisFrame = 0;
            let particlesToCreate: ParticleState[] = [];
            let floatingScoresToCreate: FloatingScoreState[] = [];
            let floatingTextsToCreate: FloatingTextState[] = [];
            let screenFlashOpacity = screenFlash > 0 ? screenFlash - deltaTime * 4 : 0;
            let newPlayerSlowTimer = Math.max(0, playerSlowTimer - deltaTime);
            let shouldClearShellAnimation = false;
            let nextLightningStrikes: LightningStrike[] = [];
            let nextBurningPatches: BurningPatchState[] = [];
            const patchesAddedThisFrame: BurningPatchState[] = [];

            if (shellBreakAnimation) {
                const nextAnimationState = JSON.parse(JSON.stringify(shellBreakAnimation));
                nextAnimationState.lifespan -= deltaTime;

                if (nextAnimationState.lifespan <= 0) {
                    setShellBreakAnimation(null);
                } else {
                    const updatePiece = (piece: ShellPieceState) => {
                        piece.yVelocity += GRAVITY * 0.8 * deltaTime;
                        piece.x += piece.xVelocity * deltaTime;
                        piece.y += piece.yVelocity * deltaTime;
                        piece.rotation += piece.rotationVelocity * deltaTime;
                    };
                    if (nextAnimationState.leftPiece) updatePiece(nextAnimationState.leftPiece);
                    if (nextAnimationState.rightPiece) updatePiece(nextAnimationState.rightPiece);
                    setShellBreakAnimation(nextAnimationState);
                }
            }

            if (shellReformAnimation) {
                const nextProgress = shellReformAnimation.progress + deltaTime / shellReformAnimation.duration;
                if (nextProgress >= 1) {
                    setShellReformAnimation(null);
                } else {
                    setShellReformAnimation(prev => ({ ...prev!, progress: nextProgress }));
                }
            }

            const { nextPlayer, newParticles } = updatePlayerPhysics(nextPlayerState, deltaTime);
            nextPlayerState = nextPlayer;
            if (newParticles.length > 0) {
                particlesToCreate.push(...newParticles);
            }

            const isStandingStill = photosynthesisLevel > 0 && Math.abs(nextPlayerState.xVelocity) < 1 && nextPlayerState.y <= GROUND_HEIGHT && nextPlayerState.health < maxHealth;
            if (isStandingStill) {
                standStillTimer.current += deltaTime;
                const healInterval = 1.0;
                if (standStillTimer.current >= healInterval) {
                    const healAmount = 1 * photosynthesisLevel;
                    const oldHealth = nextPlayerState.health;
                    const newHealth = Math.min(maxHealth, oldHealth + healAmount);

                    if (newHealth > oldHealth) {
                        playPhotosynthesisHealSound();
                        floatingTextsToCreate.push({
                            id: Date.now() + Math.random(),
                            x: nextPlayerState.x + PLAYER_WIDTH / 2,
                            y: GAME_HEIGHT - nextPlayerState.y - PLAYER_HEIGHT,
                            text: `+${healAmount}`,
                            color: '#10b981',
                            lifespan: 0.8,
                        });

                        // Shell Recovery Logic
                        if ((nextPlayerState.isNaked || nextPlayerState.isHalfShell) && oldHealth === 0) {
                            nextPlayerState.isNaked = false;
                            nextPlayerState.isHalfShell = false;
                            setShellReformAnimation({ progress: 0, duration: 0.5 });
                            checkAchievementProgress('shellEvader');
                        }

                        nextPlayerState.health = newHealth;
                    }
                    standStillTimer.current -= healInterval;
                }
            } else {
                standStillTimer.current = 0;
            }

            const eventResult = updateEventState(nextPlayerState, deltaTime, currentFrameTime);

            nextScreenShake = eventResult.screenShake;
            if (eventResult.newParticles.length > 0) {
                particlesToCreate.push(...eventResult.newParticles);
            }
            screenFlashOpacity = Math.max(screenFlashOpacity, eventResult.screenFlash);
            floatingTextsToCreate.push(...eventResult.floatingTexts);
            nextPlayerState = eventResult.updatedPlayer;

            // Use the lightning strikes and burning patches from the event system
            nextLightningStrikes = eventResult.newLightningStrikes;
            nextBurningPatches = eventResult.newBurningPatches;


            particlesToCreate.push(...createSeasonalParticles(season, gameDimensions.width, deltaTime));

            const widthRatio = gameDimensions.width / 800;
            let rockSpawnInterval = ELEMENT_SPAWN_INTERVAL * Math.pow(0.92, monthCounter - 1);
            rockSpawnInterval /= widthRatio;

            if (currentEvent === 'earthquake') rockSpawnInterval /= 1.5;
            if (currentEvent === 'thunderstorm') rockSpawnInterval *= 2;
            if (currentEvent === 'meteorShower') rockSpawnInterval *= 1.25; // Meteors fall less frequently

            // Slower, non-linear speed scaling for rocks.
            const speedMultiplier = 1 + Math.sqrt(Math.max(0, monthCounter - 1)) * 0.15;
            const minRockSpeed = MIN_ELEMENT_SPEED * speedMultiplier;
            const maxRockSpeed = MAX_ELEMENT_SPEED * speedMultiplier;

            // --- Element Spawning ---
            const elementsAfterSpawning = spawnGameElements(currentTime, nextElements);
            nextElements.length = 0; // Clear and repopulate to avoid reference issues if needed, or just reassign
            nextElements.push(...elementsAfterSpawning);

            const updatedElements: ElementState[] = [];
            let playerHitThisFrame = false;

            let playerHitbox;
            const characterHitbox = character.hitbox;

            if (nextPlayerState.isNaked) {
                const nakedWidth = characterHitbox.naked.width;
                const nakedHeight = characterHitbox.naked.height;
                const xOffset = (characterHitbox.shelled.width - nakedWidth) / 2;
                playerHitbox = {
                    x: nextPlayerState.x + xOffset,
                    y: GAME_HEIGHT - nextPlayerState.y - nakedHeight,
                    width: nakedWidth,
                    height: nakedHeight,
                };
            } else {
                playerHitbox = {
                    x: nextPlayerState.x,
                    y: GAME_HEIGHT - nextPlayerState.y - characterHitbox.shelled.height,
                    width: characterHitbox.shelled.width,
                    height: characterHitbox.shelled.height,
                };
            }

            // 1. Update element positions
            let movedElements = updateGameElements(nextElements, deltaTime);


            // 1.5 SEISMIC SLAM CHECK (Must happen before collisions to prevent death by rock on landing)
            let rocksHitBySlam = 0;
            if (nextPlayerState.seismicSlamReady && nextPlayerState.y <= GROUND_HEIGHT) {
                const wasInAir = gameState.player.y > GROUND_HEIGHT;
                const isOnGround = nextPlayerState.y <= GROUND_HEIGHT;

                if (wasInAir && isOnGround) {
                    // TRIGGER SEISMIC SLAM
                    nextPlayerState.seismicSlamReady = false;
                    playSeismicSlamSound();
                    setScreenShake({ x: 0, y: 15 }); // Initial shake
                    seismicShakeTimerRef.current = 3.0; // 3 seconds

                    const rocksToDestroy: number[] = [];

                    movedElements.forEach((el, index) => {
                        if (el.type === 'rock') {
                            rocksToDestroy.push(el.id); // Use ID or just filter
                            scoreGained += 10;
                            rocksHitBySlam += 1;

                            particlesToCreate.push(...createRockParticles({ ...el, y: GAME_HEIGHT - el.y - el.size }));

                            floatingScoresToCreate.push({
                                id: Date.now() + Math.random(), // Unique ID
                                x: el.x,
                                y: GAME_HEIGHT - el.y,
                                amount: 10,
                                lifespan: 1.0,
                                isGolden: false
                            });
                        }
                    });

                    // Remove rocks from movedElements so they don't collision check
                    movedElements = movedElements.filter(el => el.type !== 'rock');
                }
            }

            // 2. Check collisions
            const collisionResult = checkCollisions(nextPlayerState, movedElements, particles);
            nextPlayerState = collisionResult.nextPlayer;
            scoreGained += collisionResult.scoreGained;
            const rocksHitByCollision = collisionResult.rocksHit;
            rocksHitThisFrame = rocksHitBySlam + rocksHitByCollision; // Total for stats

            if (collisionResult.particlesToCreate.length > 0) {
                particlesToCreate.push(...collisionResult.particlesToCreate);
            }
            if (collisionResult.floatingScoresToCreate.length > 0) {
                floatingScoresToCreate.push(...collisionResult.floatingScoresToCreate);
            }
            if (collisionResult.floatingTextsToCreate.length > 0) {
                floatingTextsToCreate.push(...collisionResult.floatingTextsToCreate);
            }
            if (collisionResult.screenFlashOpacity > 0) {
                screenFlashOpacity = collisionResult.screenFlashOpacity;
            }
            if (collisionResult.newPlayerSlowTimer > 0) {
                newPlayerSlowTimer = collisionResult.newPlayerSlowTimer;
            }
            if (collisionResult.playerHitThisFrame) {
                playerHitThisFrame = true;
            }

            if (rocksHitByCollision > 0) {
                checkAchievementProgress('rockBreaker', rocksHitByCollision);
            }

            // 3. Filter elements and handle ground collisions
            for (const el of movedElements) {
                if (collisionResult.collidedElementIds.includes(el.id)) {
                    continue; // Element was consumed/destroyed by player
                }

                const groundContactY = el.type === 'water' ? el.y + el.size : el.y + el.size;
                const hitGround = groundContactY >= GAME_HEIGHT - GROUND_HEIGHT;

                if (!hitGround) {
                    updatedElements.push(el);
                } else {
                    // Handle ground collision effects
                    if (el.type === 'rock' || el.type === 'meteor') {
                        if (el.type === 'meteor') {
                            playMeteorImpactSound();
                            // addBurningPatch(el.x, el.size);
                            patchesAddedThisFrame.push({
                                id: Date.now() + Math.random(),
                                x: el.x - 10,
                                width: el.size + 20,
                                lifespan: 3.0
                            });
                        } else {
                            playImpactSound(el.size, 0.2);
                        }
                        particlesToCreate.push(...createRockParticles({ ...el, y: GAME_HEIGHT - GROUND_HEIGHT - el.size }));
                    } else if (el.type === 'water' || el.type === 'snow') {
                        const splashY = el.type === 'water' ? GAME_HEIGHT - GROUND_HEIGHT : GAME_HEIGHT - GROUND_HEIGHT - el.size;
                        particlesToCreate.push(...createWaterSplashParticles({ x: el.x, y: splashY, size: el.size }));
                    }
                }
            }

            const lightningResult = processLightningStrikes(nextPlayerState, playerHitbox, currentFrameTime, deltaTime, nextLightningStrikes);
            nextPlayerState = lightningResult.updatedPlayer;
            screenFlashOpacity = Math.max(screenFlashOpacity, lightningResult.screenFlash);
            floatingTextsToCreate.push(...lightningResult.floatingTexts);
            nextLightningStrikes = lightningResult.updatedStrikes;

            const burningPatchResult = processBurningPatches(nextPlayerState, playerHitbox, deltaTime, nextBurningPatches);
            nextPlayerState = burningPatchResult.updatedPlayer;
            screenFlashOpacity = Math.max(screenFlashOpacity, burningPatchResult.screenFlash);
            floatingTextsToCreate.push(...burningPatchResult.floatingTexts);
            nextBurningPatches = burningPatchResult.updatedPatches;

            const nextParticles = [
                ...updateParticles(particles, deltaTime),
                ...particlesToCreate
            ];

            const nextFloatingScores = [
                ...floatingScores.map(fs => ({
                    ...fs,
                    y: fs.y - 20 * deltaTime,
                    lifespan: fs.lifespan - deltaTime,
                })).filter(fs => fs.lifespan > 0),
                ...floatingScoresToCreate
            ];

            const nextFloatingTexts = [
                ...floatingTexts.map(ft => ({
                    ...ft,
                    y: ft.y - 20 * deltaTime,
                    lifespan: ft.lifespan - deltaTime,
                })).filter(ft => ft.lifespan > 0),
                ...floatingTextsToCreate
            ];

            // UPDATE QUEST NOTIFICATIONS
            // Moved to setTimeout in useQuestSystem

            // UPDATE HEALING FOUNTAINS
            let healingFountainsUpdate = [...healingFountains];
            let fountainsChanged = false;

            healingFountainsUpdate = healingFountainsUpdate.map(f => {
                if (f.currentCapacity <= 0) return f;

                const playerCenterX = nextPlayerState.x + PLAYER_WIDTH / 2;
                const fountainCenterX = f.x + f.width / 2;
                const dx = playerCenterX - fountainCenterX;

                if (Math.abs(dx) < (f.width / 2 + PLAYER_WIDTH / 2)) {
                    const healRate = 5 * deltaTime;
                    const actualHealPossible = Math.min(healRate, f.currentCapacity);
                    const newHealth = Math.min(maxHealth, nextPlayerState.health + actualHealPossible);

                    if (newHealth > nextPlayerState.health) {
                        const actualHealedAmount = newHealth - nextPlayerState.health;

                        // Shell Recovery Logic
                        if ((nextPlayerState.isNaked || nextPlayerState.isHalfShell) && nextPlayerState.health === 0) {
                            nextPlayerState.isNaked = false;
                            nextPlayerState.isHalfShell = false;
                            setShellReformAnimation({ progress: 0, duration: 0.5 });
                            checkAchievementProgress('shellEvader');
                        }

                        nextPlayerState.health = newHealth;
                        fountainsChanged = true;

                        // Accumulate healing for text display
                        healingAccumulatorRef.current += actualHealedAmount;
                        if (healingAccumulatorRef.current >= 1) {
                            const amountToShow = Math.floor(healingAccumulatorRef.current);
                            healingAccumulatorRef.current -= amountToShow;

                            floatingTextsToCreate.push({
                                id: Date.now() + Math.random(),
                                x: playerCenterX + (Math.random() - 0.5) * 20,
                                y: GAME_HEIGHT - nextPlayerState.y - PLAYER_HEIGHT - 20,
                                text: `+${amountToShow}`,
                                color: '#00ffff',
                                lifespan: 1.0
                            });
                        }

                        // Visual feedback
                        if (Math.random() < 0.1) {
                            particlesToCreate.push({
                                id: Date.now() + Math.random(),
                                x: playerCenterX + (Math.random() - 0.5) * 20,
                                y: GAME_HEIGHT - nextPlayerState.y - PLAYER_HEIGHT,
                                size: 3,
                                color: '#00ffff',
                                lifespan: 0.5,
                                type: 'water',
                                xVelocity: 0,
                                yVelocity: -50
                            });
                        }

                        return { ...f, currentCapacity: f.currentCapacity - actualHealedAmount };
                    }
                }
                return f;
            }).filter(f => f.currentCapacity > 0);

            if (fountainsChanged || healingFountainsUpdate.length !== healingFountains.length) {
                setHealingFountains(healingFountainsUpdate);
            }

            const scoreFromTime = deltaTime * 1;

            setScore(prev => prev + scoreGained + scoreFromTime);
            setGameState({ player: nextPlayerState, elements: updatedElements });
            setParticles(nextParticles.slice(-MAX_PARTICLES));
            setFloatingScores(nextFloatingScores);
            setFloatingTexts(nextFloatingTexts);
            setTimeInMonth(nextTimeInMonth);
            setPlayerSlowTimer(newPlayerSlowTimer);
            if (rocksHitThisFrame > 0) {
                setRocksDestroyed(prev => prev + rocksHitThisFrame);
            }

            // Append new patches synchronously
            nextBurningPatches.push(...patchesAddedThisFrame);

            setLightningStrikes(nextLightningStrikes);
            setBurningPatches(nextBurningPatches);
            setScreenShake(nextScreenShake);

            if (shouldClearShellAnimation) {
                setShellBreakAnimation(null);
            }



            // Handle Seismic Shake Timer
            if (seismicShakeTimerRef.current > 0) {
                seismicShakeTimerRef.current -= deltaTime;
                const shakeIntensity = 5 * (seismicShakeTimerRef.current / 3.0);
                nextScreenShake = {
                    x: (Math.random() - 0.5) * shakeIntensity * 2,
                    y: (Math.random() - 0.5) * shakeIntensity * 2
                };
            }
        }

        // --- Render Logic ---
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        drawGame(
            ctx,
            renderContext.current,
            screenShake,
            season,
            currentEvent,
            gameDimensions,
            clouds,
            burningPatches,
            timeInMonth,
            { ...gameState, healingFountains },
            particles,
            gameStatus,
            shellBreakAnimation,
            character,
            maxHealth,
            shellReformAnimation,
            floatingScores,
            floatingTexts,
            lightningStrikes,
            screenFlash,
            currentFrameTime,
            playerSlowTimer > 0
        );

    }, [
        canvasRef, gameDimensions, gameStatus, gameState, particles, floatingScores, floatingTexts, timeInMonth, playerSlowTimer,
        handleLevelUp, handleGameOver, season, maxHealth, maxSpeed, extraLives, blockChance, bonusHeal, waterSpawnInterval,
        photosynthesisLevel, goldenTouchChance, currentEvent, incomingEventTitle, lightningStrikes, burningPatches, screenFlash,
        screenShake, windDirection, shellBreakAnimation, shellReformAnimation, clouds, monthCounter, character, healingFountains,
    ]);

    useEffect(() => {
        let animationFrameId: number;
        if (gameStatus === 'playing' || (gameStatus === 'start' && assetsReady)) {
            const loop = (currentTime: number) => {
                gameLoop(currentTime);
                animationFrameId = requestAnimationFrame(loop);
            };
            animationFrameId = requestAnimationFrame(loop);
        }
        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId);
            }
        };
    }, [gameStatus, gameLoop, assetsReady]);

    // Wrapper for startDebugGame that uses the skill system hook
    const startDebugGame = (year: number, month: number) => {
        startGame();
        const totalMonths = year * 12 + month;
        setDifficultyLevel(totalMonths + 1);
        setMonthCounter(totalMonths + 1);
        simulateSkillsForDebug(totalMonths);
    };

    // FIX: Added a return statement to export state and handlers to the App component.
    return {
        status: gameStatus,
        playerHealth: gameState.player.health,
        maxHealth,
        score,
        startGame,
        monthCounter,
        timeInMonth,
        availableSkills,
        handleSkillSelect,
        season,
        rocksDestroyed,
        maxSpeed,
        handleSaveScore,
        highScores,
        handleShowHighScores,
        handleShowInstructions,
        handleShowAbout,
        handleBackToMenu,
        extraLives,
        acquiredSkills,
        leaderboardState,
        lastSubmissionResult,
        characterId: selectedCharacterId,
        handleShowCharacterSelect,
        handleSelectCharacter,
        startDebugGame,
        handleFetchVersionScores,
        incomingEventTitle,
        handleTouchStart,
        handleTouchMove,
        handleTouchEnd,
        assetsReady,
        resetGameState: resetGame,
        resetSpawnTimers,
        achievementNotifications,
        healingFountains,
        achievements,
    };
};
