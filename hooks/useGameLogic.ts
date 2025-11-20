
import React, { useEffect, useRef, useCallback } from 'react';
import type { PlayerState, ElementState, ParticleState, Skill, LightningStrike, Season, FloatingTextState, HighScoreEntry, ElementType, GameStatus, CloudState, FloatingScoreState, ShellBreakAnimationState, ShellPieceState, ScorePayload, SubmissionResult, CharacterId, ShellReformAnimationState, BurningPatchState } from '../types';
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
} from '../constants';
import { initAudio, playJumpSound, playDamageSound, playImpactSound, playWaterCollectSound, playThunderSound, playLightningStrikeSound, playEarthquakeSound, playBlizzardSound, playStormSound, playBlockSound, playResurrectSound, playShellCrackSound, playSeismicSlamSound, playPhotosynthesisHealSound, playGoldenTouchSound, playGameOverSound, playMeteorImpactSound } from '../utils/audio';
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
        getInputState
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

    const { processLightningStrikes, processBurningPatches, addBurningPatch, clearEventEffects, updateEventState } = useEventSystem({
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
    const renderContext = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
    const gameSessionIdRef = useRef<string | null>(null);

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

    const startGame = () => {
        if (!audioInitialized.current) {
            initAudio();
            audioInitialized.current = true;
        }

        resetGameStateInternal(selectedCharacterId);

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
    };



    const handleLevelUp = useCallback(() => {
        // FIX: Reset touch and keyboard states to prevent unwanted movement after skill selection.
        resetGameInput();

        setIncomingEventTitle(null);
        const eventJustEnded = (monthCounter - 1) % 3 === 2;

        clearEventEffects();

        const newLevel = difficultyLevel + 1;
        setDifficultyLevel(newLevel);

        setGameStatus('levelUp');

        if (eventJustEnded) {
            // At the end of month 12, 24, 36, etc., offer a powerful yearly skill.
            if (monthCounter > 0 && monthCounter % 12 === 0) {
                const shuffled = [...YEARLY_SKILL_POOL].sort(() => 0.5 - Math.random());
                setAvailableSkills(shuffled.slice(0, 3));
            } else {
                // At the end of other event months (3, 6, 9, 15...), offer a special event skill.
                const shuffled = [...EVENT_SKILL_POOL].sort(() => 0.5 - Math.random());
                setAvailableSkills(shuffled.slice(0, 3));
            }
        } else {
            // For all other months, offer a standard permanent skill.
            const shuffled = [...PERMANENT_SKILL_POOL].sort(() => 0.5 - Math.random());
            setAvailableSkills(shuffled.slice(0, 3));
        }
    }, [difficultyLevel, monthCounter, clearEventEffects]);

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
        handleGameOver,
    });

    const handleSaveScore = async (name: string) => {
        setLeaderboardState('submitting');
        savePlayerName(name);

        const totalMonthsSurvived = monthCounter - 1;
        const year = Math.floor(totalMonthsSurvived / 12);
        const month = totalMonthsSurvived % 12;

        // Save to local scores as a backup
        const newLocalScore: HighScoreEntry = {
            id: Date.now(), name, score: Math.floor(score), year, month, rocksDestroyed, maxHealth, finalSpeed: maxSpeed, acquiredSkills, characterId: gameState.player.characterId, version: GAME_VERSION,
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
    };

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
    }, []);

    const handleShowHighScores = async () => {
        setLastSubmissionResult(null);
        setGameStatus('highScores');
        await handleFetchVersionScores(GAME_VERSION);
    };

    const handleShowInstructions = () => {
        setGameStatus('instructions');
    };

    const handleShowAbout = () => {
        setGameStatus('about');
    };

    const handleShowCharacterSelect = () => {
        setGameStatus('characterSelect');
    };

    const handleSelectCharacter = (characterId: CharacterId) => {
        setSelectedCharacterId(characterId);
        try {
            localStorage.setItem('selectedCharacter', characterId);
        } catch (e) {
            console.warn('Could not save character selection to localStorage.');
        }
        setGameStatus('start');
    };

    // FIX: Added missing startDebugGame function.
    const startDebugGame = (year: number, month: number) => {
        startGame();
        const totalMonths = year * 12 + month;
        setDifficultyLevel(totalMonths + 1);
        setMonthCounter(totalMonths + 1);

        // Simulate skill acquisition for the skipped months
        for (let i = 1; i <= totalMonths; i++) {
            let pool = PERMANENT_SKILL_POOL;
            // Logic matches handleLevelUp:
            // Month 12, 24, 36... -> Yearly Skill
            // Month 3, 6, 9, 15... -> Event Skill
            // Others -> Permanent Skill
            if (i % 12 === 0) {
                pool = YEARLY_SKILL_POOL;
            } else if (i % 3 === 0) {
                pool = EVENT_SKILL_POOL;
            }

            const skill = pool[Math.floor(Math.random() * pool.length)];

            setAcquiredSkills(prev => [...prev, skill]);

            switch (skill.id) {
                case 'shellFortification':
                    setMaxHealth(prev => prev + 5);
                    break;
                case 'increasedAgility':
                    setMaxSpeed(prev => prev + 40);
                    break;
                case 'waterAffinity':
                    setBonusHeal(prev => prev + 1);
                    break;
                case 'soothingRains':
                    setWaterSpawnInterval(prev => prev * 0.9);
                    break;
                case 'extraLife':
                    setExtraLives(prev => prev + 1);
                    break;
                case 'blockChance':
                    setBlockChance(prev => Math.min(prev + 0.1, 0.9));
                    break;
                case 'photosynthesis':
                    setPhotosynthesisLevel(prev => prev + 1);
                    break;
                case 'goldenTouch':
                    setGoldenTouchChance(prev => prev + GOLDEN_TOUCH_CHANCE_INCREASE);
                    break;
            }
        }
    };

    const handleBackToMenu = () => {
        setLastSubmissionResult(null);
        setGameStatus('start');
    };


    const handleSkillSelect = (skillId: string) => {
        const selectedSkill = availableSkills.find(s => s.id === skillId);
        if (selectedSkill) {
            setAcquiredSkills(prev => [...prev, selectedSkill]);
        }

        switch (skillId) {
            case 'shellFortification':
                setMaxHealth(prev => prev + 5);
                break;
            case 'increasedAgility':
                setMaxSpeed(prev => prev + 40);
                break;
            case 'waterAffinity':
                setBonusHeal(prev => prev + 1);
                break;
            case 'soothingRains':
                setWaterSpawnInterval(prev => prev * 0.9);
                break;
            case 'extraLife':
                setExtraLives(prev => prev + 1);
                break;
            case 'blockChance':
                setBlockChance(prev => Math.min(prev + 0.1, 0.9));
                break;
            case 'photosynthesis':
                setPhotosynthesisLevel(prev => prev + 1);
                break;
            case 'goldenTouch':
                setGoldenTouchChance(prev => prev + GOLDEN_TOUCH_CHANCE_INCREASE);
                break;
        }

        setMonthCounter(prev => prev + 1);
        setTimeInMonth(0);
        setGameStatus('playing');
        lastFrameTime.current = performance.now();
    };

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

            let nextPlayerState = { ...gameState.player };
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
                    updatePiece(nextAnimationState.leftPiece);
                    updatePiece(nextAnimationState.rightPiece);
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

            const isStandingStill = photosynthesisLevel > 0 && Math.abs(nextPlayerState.xVelocity) < 1 && nextPlayerState.y <= GROUND_HEIGHT && !nextPlayerState.isNaked && nextPlayerState.health < maxHealth;
            if (isStandingStill) {
                standStillTimer.current += deltaTime;
                const healInterval = 1.0;
                if (standStillTimer.current >= healInterval) {
                    const healAmount = 1 * photosynthesisLevel;
                    const newHealth = Math.min(maxHealth, nextPlayerState.health + healAmount);
                    if (newHealth > nextPlayerState.health) {
                        playPhotosynthesisHealSound();
                        floatingTextsToCreate.push({
                            id: Date.now() + Math.random(),
                            x: nextPlayerState.x + PLAYER_WIDTH / 2,
                            y: GAME_HEIGHT - nextPlayerState.y - PLAYER_HEIGHT,
                            text: `+${healAmount}`,
                            color: '#10b981',
                            lifespan: 0.8,
                        });
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


            if (particles.length + particlesToCreate.length < MAX_PARTICLES) {
                particlesToCreate.push(...createSeasonalParticles(season, gameDimensions.width, deltaTime));
            }

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
            const movedElements = updateGameElements(nextElements, deltaTime);

            // 2. Check collisions
            const collisionResult = checkCollisions(nextPlayerState, movedElements, particles);
            nextPlayerState = collisionResult.nextPlayer;
            scoreGained += collisionResult.scoreGained;
            rocksHitThisFrame += collisionResult.rocksHit;
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
                            addBurningPatch(el.x, el.size);
                        } else {
                            playImpactSound(el.size);
                        }
                        if (particles.length + particlesToCreate.length < MAX_PARTICLES) {
                            particlesToCreate.push(...createRockParticles({ ...el, y: GAME_HEIGHT - GROUND_HEIGHT - el.size }));
                        }
                    } else if (el.type === 'water' || el.type === 'snow') {
                        const splashY = el.type === 'water' ? GAME_HEIGHT - GROUND_HEIGHT : GAME_HEIGHT - GROUND_HEIGHT - el.size;
                        if (particles.length + particlesToCreate.length < MAX_PARTICLES) {
                            particlesToCreate.push(...createWaterSplashParticles({ x: el.x, y: splashY, size: el.size }));
                        }
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

            const scoreFromTime = deltaTime * 1;

            setScore(prev => prev + scoreGained + scoreFromTime);
            setGameState({ player: nextPlayerState, elements: updatedElements });
            setParticles(nextParticles.slice(-MAX_PARTICLES));
            setFloatingScores(nextFloatingScores);
            setFloatingTexts(nextFloatingTexts);
            setTimeInMonth(nextTimeInMonth);
            setPlayerSlowTimer(newPlayerSlowTimer);
            setLightningStrikes(nextLightningStrikes);
            setBurningPatches(nextBurningPatches);
            setScreenFlash(screenFlashOpacity);
            setScreenShake(nextScreenShake);
            if (rocksHitThisFrame > 0) {
                setRocksDestroyed(prev => prev + rocksHitThisFrame);
            }
            if (shouldClearShellAnimation) {
                setShellBreakAnimation(null);
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
            gameState,
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
            currentFrameTime
        );

    }, [
        canvasRef, gameDimensions, gameStatus, gameState, particles, floatingScores, floatingTexts, timeInMonth, playerSlowTimer,
        handleLevelUp, handleGameOver, season, maxHealth, maxSpeed, extraLives, blockChance, bonusHeal, waterSpawnInterval,
        photosynthesisLevel, goldenTouchChance, currentEvent, incomingEventTitle, lightningStrikes, burningPatches, screenFlash,
        screenShake, windDirection, shellBreakAnimation, shellReformAnimation, clouds, monthCounter, character,
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
        resetGameState: (characterId?: CharacterId) => {
            resetGameStateInternal(characterId);
            resetSpawnTimers();
        },
        resetSpawnTimers,
    };
};
