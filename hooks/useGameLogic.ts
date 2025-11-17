
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
import { spawnElements, updateElements } from '../game/elementLogic';
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
    resetGameState,
  } = useGameState(gameDimensions);

  const { getInputState, handleTouchStart, handleTouchMove, handleTouchEnd, resetGameInput } = useInput(gameStatus === 'playing');

  const lastRockSpawnTime = useRef(0);
  const lastWaterSpawnTime = useRef(0);
  const lastFrameTime = useRef<number>(performance.now());
  const audioInitialized = useRef(false);
  const standStillTimer = useRef(0);
  const groundDamageAccumulator = useRef(0);
  const lastGroundDamageTime = useRef(0);
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
    
    resetGameState(selectedCharacterId);
    
    standStillTimer.current = 0;
    groundDamageAccumulator.current = 0;
    lastGroundDamageTime.current = 0;
    lastRockSpawnTime.current = 0;
    lastWaterSpawnTime.current = 0;

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

  // Effect to trigger special events when a new season's last month starts
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
  }, [monthCounter, gameStatus, gameDimensions.width]);

  const handleLevelUp = useCallback(() => {
    // FIX: Reset touch and keyboard states to prevent unwanted movement after skill selection.
    resetGameInput();

    setIncomingEventTitle(null);
    const eventJustEnded = (monthCounter - 1) % 3 === 2;

    if (currentEvent) {
        if (currentEvent === 'thunderstorm' || currentEvent === 'storm') {
            setClouds(prev => prev.filter(c => !c.isStormCloud));
        }
        if (currentEvent === 'thunderstorm') setLightningStrikes([]);
        if (currentEvent === 'meteorShower') setBurningPatches([]);
        setCurrentEvent(null);
        setWindDirection(null);
    }

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
  }, [difficultyLevel, currentEvent, monthCounter]);

  const handleGameOver = () => {
    setGameStatus('enteringName');
  };

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

    switch(skillId) {
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
        let nextLightningStrikes = [...lightningStrikes];
        let nextBurningPatches = [...burningPatches];
        let screenFlashOpacity = screenFlash > 0 ? screenFlash - deltaTime * 4 : 0;
        let newPlayerSlowTimer = Math.max(0, playerSlowTimer - deltaTime);
        let shouldClearShellAnimation = false;
        
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

        const { isMovingLeft, isMovingRight, isTryingToJump, resetJump } = getInputState();

        const friction = (currentEvent === 'blizzard' && nextPlayerState.y <= GROUND_HEIGHT) ? ICE_FRICTION : GROUND_FRICTION;
        const effectiveAcceleration = newPlayerSlowTimer > 0 ? PLAYER_ACCELERATION * 0.5 : PLAYER_ACCELERATION;

        if (isMovingLeft) {
            nextPlayerState.xVelocity -= effectiveAcceleration * deltaTime;
        } else if (isMovingRight) {
            nextPlayerState.xVelocity += effectiveAcceleration * deltaTime;
        }

        if (currentEvent === 'storm') {
            if (windDirection === 'left') {
                nextPlayerState.xVelocity -= WIND_FORCE * deltaTime;
            } else if (windDirection === 'right') {
                nextPlayerState.xVelocity += WIND_FORCE * deltaTime;
            }
        }

        if (!isMovingLeft && !isMovingRight && nextPlayerState.y <= GROUND_HEIGHT) {
          if (nextPlayerState.xVelocity > 0) {
              nextPlayerState.xVelocity -= friction * deltaTime;
              if (nextPlayerState.xVelocity < 0) nextPlayerState.xVelocity = 0;
          } else if (nextPlayerState.xVelocity < 0) {
              nextPlayerState.xVelocity += friction * deltaTime;
              if (nextPlayerState.xVelocity > 0) nextPlayerState.xVelocity = 0;
          }
        }

        const effectiveMaxSpeed = newPlayerSlowTimer > 0 ? maxSpeed * 0.5 : maxSpeed;
        nextPlayerState.xVelocity = Math.max(-effectiveMaxSpeed, Math.min(effectiveMaxSpeed, nextPlayerState.xVelocity));

        nextPlayerState.x += nextPlayerState.xVelocity * deltaTime;

        if (isTryingToJump && nextPlayerState.y <= GROUND_HEIGHT) {
          nextPlayerState.yVelocity = JUMP_STRENGTH;
          playJumpSound();
          particlesToCreate.push(...createDustParticles({ x: nextPlayerState.x + PLAYER_WIDTH / 2, y: GAME_HEIGHT - GROUND_HEIGHT, count: 10, intensity: 60 }));
          resetJump();
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
        nextPlayerState.yVelocity -= GRAVITY * deltaTime;
        nextPlayerState.y += nextPlayerState.yVelocity * deltaTime;

        if (nextPlayerState.y < GROUND_HEIGHT) {
          nextPlayerState.y = GROUND_HEIGHT;
          nextPlayerState.yVelocity = 0;
        }
        if (nextPlayerState.x < 0) {
          nextPlayerState.x = 0;
          nextPlayerState.xVelocity = 0;
        }
        if (nextPlayerState.x > gameDimensions.width - PLAYER_WIDTH) {
          nextPlayerState.x = gameDimensions.width - PLAYER_WIDTH;
          nextPlayerState.xVelocity = 0;
        }
        
        const eventResult = updateEvents({ currentEvent, deltaTime, gameDimensions, currentFrameTime, windDirection }, lightningStrikes, burningPatches);

        nextScreenShake = eventResult.screenShake;
        if (eventResult.newParticles.length > 0) {
            particlesToCreate.push(...eventResult.newParticles);
        }

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
        
        let effectiveWaterSpawnInterval = waterSpawnInterval;
        effectiveWaterSpawnInterval /= widthRatio;
        if (currentEvent === 'thunderstorm') effectiveWaterSpawnInterval /= 3;

        if (currentTime - lastRockSpawnTime.current > rockSpawnInterval) {
          lastRockSpawnTime.current = currentTime;
          let size;
          let type: ElementType = 'rock';
          let speedMultiplier = 1;

          if (currentEvent === 'meteorShower') {
              type = 'meteor';
              speedMultiplier = 1.5;
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
            speed: (Math.random() * (maxRockSpeed - minRockSpeed) + minRockSpeed) * speedMultiplier,
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

        for (const el of nextElements) {
          const newEl = { ...el, y: el.y + el.speed * deltaTime };
          let hasCollided = false;

          const elementYPos = el.type === 'water' ? newEl.y + el.size * 0.5 : newEl.y;

          if (!playerHitThisFrame) {
             const elementHitbox = { x: newEl.x, y: elementYPos, width: newEl.size, height: newEl.size };
              
             if (playerHitbox.x <= elementHitbox.x + elementHitbox.width &&
                 playerHitbox.x + playerHitbox.width >= elementHitbox.x &&
                 playerHitbox.y <= elementHitbox.y + elementHitbox.height &&
                 playerHitbox.y + playerHitbox.height >= elementHitbox.y)
             {
                hasCollided = true;
                playerHitThisFrame = true;

                if (el.type === 'rock' || el.type === 'meteor') {
                    if (nextPlayerState.isNaked) {
                        playGameOverSound();
                        handleGameOver();
                    } else { // Player is not naked and can interact with rocks/meteors
                        let points = Math.round(el.size / 10);
                        let isGolden = false;
                        if (goldenTouchChance > 0 && Math.random() < goldenTouchChance) {
                            isGolden = true;
                            points *= 10;
                            playGoldenTouchSound();
                        }
                
                        scoreGained += points;
                        rocksHitThisFrame++;
                        floatingScoresToCreate.push({
                            id: Date.now() + Math.random(),
                            x: newEl.x + newEl.size / 2,
                            y: newEl.y + newEl.size / 2,
                            amount: points,
                            lifespan: 1.0,
                            isGolden,
                        });
                        
                        if (el.type === 'meteor') playMeteorImpactSound();
                        else playImpactSound(el.size);

                        if (particles.length + particlesToCreate.length < MAX_PARTICLES) {
                            particlesToCreate.push(...createRockParticles(el, isGolden));
                        }
                        
                        const blocked = blockChance > 0 && Math.random() < blockChance;
                
                        if (blocked) {
                            playBlockSound();
                            floatingTextsToCreate.push({
                                id: Date.now() + Math.random(),
                                x: nextPlayerState.x + PLAYER_WIDTH / 2,
                                y: GAME_HEIGHT - nextPlayerState.y - PLAYER_HEIGHT,
                                text: '0',
                                color: '#ffffff',
                                lifespan: 1.0,
                            });
                        } else { // Not blocked, so take damage
                            const damage = Math.round(el.size / 10);
                            floatingTextsToCreate.push({
                                id: Date.now() + Math.random(),
                                x: nextPlayerState.x + PLAYER_WIDTH / 2,
                                y: GAME_HEIGHT - nextPlayerState.y - PLAYER_HEIGHT,
                                text: `-${damage}`,
                                color: '#ef4444',
                                lifespan: 1.0,
                            });
                            
                            const newHealth = Math.max(0, nextPlayerState.health - damage);
                            if (newHealth <= 0) {
                                if (extraLives > 0) {
                                    setExtraLives(e => e - 1);
                                    playResurrectSound();
                                    screenFlashOpacity = 0.8;
                                    nextPlayerState.health = maxHealth;
                                } else {
                                    if (nextPlayerState.health > 0) {
                                        playShellCrackSound();
                                        const playerCenterX = nextPlayerState.x + PLAYER_WIDTH / 2;
                                        const playerCenterY_canvas = GAME_HEIGHT - nextPlayerState.y - PLAYER_HEIGHT / 2;
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
                                    nextPlayerState.health = 0;
                                    nextPlayerState.isNaked = true;
                                }
                            } else {
                                playDamageSound();
                                nextPlayerState.health = newHealth;
                            }
                        }
                    }
                } else if (el.type === 'water' || el.type === 'snow') {
                  playWaterCollectSound();
                  if (particles.length + particlesToCreate.length < MAX_PARTICLES) {
                      particlesToCreate.push(...createWaterSplashParticles({x: el.x, y: el.y, size: el.size}));
                  }
                  let baseHeal = WATER_HEAL_AMOUNT;
                  if (season === 'summer') baseHeal *= 0.5;
                  if (season === 'autumn') baseHeal *= 1.5;
                  const totalHealAmount = baseHeal + bonusHeal;
                  const roundedHeal = Math.round(totalHealAmount * 10) / 10;
                  floatingTextsToCreate.push({
                      id: Date.now() + Math.random(),
                      x: nextPlayerState.x + PLAYER_WIDTH / 2,
                      y: GAME_HEIGHT - nextPlayerState.y - PLAYER_HEIGHT,
                      text: `+${roundedHeal}`,
                      color: '#22c55e',
                      lifespan: 1.0,
                  });
                  if (el.type === 'snow') {
                    newPlayerSlowTimer = 2.0;
                  }

                  const wasNaked = nextPlayerState.isNaked;
                  const newHealth = Math.min(maxHealth, nextPlayerState.health + totalHealAmount);
                  nextPlayerState.health = newHealth;

                  if (newHealth > 0 && wasNaked) {
                      if (shellBreakAnimation) {
                          shouldClearShellAnimation = true;
                      }
                      nextPlayerState.isNaked = false;
                      setShellReformAnimation({ progress: 0, duration: 0.3 });
                  } else if (newHealth > 0 && !wasNaked) {
                      if (shellBreakAnimation) {
                          shouldClearShellAnimation = true;
                      }
                  }
                }
             }
          }
          
          const groundContactY = el.type === 'water' ? newEl.y + el.size : newEl.y + el.size;
          const hitGround = groundContactY >= GAME_HEIGHT - GROUND_HEIGHT;

          if (!hitGround && !hasCollided) {
            updatedElements.push(newEl);
          } else if (hitGround && (el.type === 'rock' || el.type === 'meteor')) {
                if (el.type === 'meteor') {
                    playMeteorImpactSound();
                    nextBurningPatches.push({ id: Date.now() + Math.random(), x: newEl.x - 10, width: newEl.size + 20, lifespan: 3.0 });
                } else {
                    playImpactSound(el.size);
                }
                if (particles.length + particlesToCreate.length < MAX_PARTICLES) {
                    particlesToCreate.push(...createRockParticles({ ...newEl, y: GAME_HEIGHT - GROUND_HEIGHT - newEl.size }));
                }
          } else if (hitGround && (el.type === 'water' || el.type === 'snow')) {
             const splashY = el.type === 'water' ? GAME_HEIGHT - GROUND_HEIGHT : GAME_HEIGHT - GROUND_HEIGHT - newEl.size;
             if (particles.length + particlesToCreate.length < MAX_PARTICLES) {
                particlesToCreate.push(...createWaterSplashParticles({ x: newEl.x, y: splashY, size: newEl.size }));
             }
          }
        }
        
        for (const strike of nextLightningStrikes) {
            if (!strike.hasStruck && currentFrameTime >= strike.strikeTime && currentFrameTime < strike.strikeTime + 100) {
                playLightningStrikeSound();
                strike.hasStruck = true;
                screenFlashOpacity = 0.8;
                
                const strikeHitbox = { x: strike.x, y: 0, width: strike.width, height: GAME_HEIGHT - GROUND_HEIGHT };
                if (playerHitbox.x < strikeHitbox.x + strikeHitbox.width &&
                    playerHitbox.x + playerHitbox.width > strikeHitbox.x)
                {
                    const damage = 10;
                    if (nextPlayerState.isNaked) {
                        playGameOverSound();
                        handleGameOver();
                    } else {
                        floatingTextsToCreate.push({
                          id: Date.now() + Math.random(),
                          x: nextPlayerState.x + PLAYER_WIDTH / 2,
                          y: GAME_HEIGHT - nextPlayerState.y - PLAYER_HEIGHT,
                          text: `-${damage}`,
                          color: '#ef4444',
                          lifespan: 1.0,
                        });
                        const newHealth = Math.max(0, nextPlayerState.health - damage);
                         if (newHealth <= 0) {
                            if (extraLives > 0) {
                                setExtraLives(e => e - 1);
                                playResurrectSound();
                                screenFlashOpacity = 0.8;
                                nextPlayerState.health = maxHealth;
                            } else {
                                if(nextPlayerState.health > 0) playShellCrackSound();
                                nextPlayerState.health = 0;
                                nextPlayerState.isNaked = true;
                            }
                        } else {
                            playDamageSound();
                            nextPlayerState.health = newHealth;
                        }
                    }
                }
            }
        }
        nextLightningStrikes = nextLightningStrikes.filter(s => currentFrameTime < s.strikeTime + 100);

        // This logic runs whenever burning patches exist, ensuring they damage the player
        // and fade out correctly, even if the meteor shower event has ended.
        if (nextBurningPatches.length > 0) {
            const playerFeetY = GAME_HEIGHT - nextPlayerState.y;
            if (playerFeetY >= GAME_HEIGHT - GROUND_HEIGHT && playerFeetY < GAME_HEIGHT - GROUND_HEIGHT + 10) {
                for (const patch of nextBurningPatches) {
                    if (playerHitbox.x + playerHitbox.width > patch.x && playerHitbox.x < patch.x + patch.width) {
                        const damagePerSecond = 5;
                        const damage = damagePerSecond * deltaTime;
                        const newHealth = Math.max(0, nextPlayerState.health - damage);
                        if (newHealth < nextPlayerState.health) {
                            const damageTaken = nextPlayerState.health - newHealth;
                            groundDamageAccumulator.current += damageTaken;
                            
                            const now = performance.now();
                            if (now - lastGroundDamageTime.current > 400 && groundDamageAccumulator.current >= 1) {
                                const roundedDamage = Math.round(groundDamageAccumulator.current);
                                floatingTextsToCreate.push({
                                    id: Date.now() + Math.random(),
                                    x: nextPlayerState.x + PLAYER_WIDTH / 2,
                                    y: GAME_HEIGHT - nextPlayerState.y - PLAYER_HEIGHT,
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
                                    screenFlashOpacity = 0.8;
                                    nextPlayerState.health = maxHealth;
                                } else {
                                    if(nextPlayerState.health > 0) playShellCrackSound();
                                    nextPlayerState.health = 0;
                                    // FIX: Corrected typo 'next' to 'true'.
                                    nextPlayerState.isNaked = true;
                                }
                            } else {
                                nextPlayerState.health = newHealth;
                            }
                        }
                    }
                }
            }
            nextBurningPatches = nextBurningPatches.map(p => ({ ...p, lifespan: p.lifespan - deltaTime })).filter(p => p.lifespan > 0);
        }

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
  };
};
