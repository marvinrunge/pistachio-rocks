
import React, { useState, useEffect, useRef, useCallback } from 'react';
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
import { drawRainingElement, drawGround, drawPlayer } from '../game/drawing';
import { assetManager } from '../game/assets';
// FIX: Corrected import path for characters module.
import { getCharacterById, type Character } from '../game/characters/index';

const JUMP_SWIPE_THRESHOLD = 50; // pixels

interface UseGameLogicProps {
    canvasRef: React.RefObject<HTMLCanvasElement>;
    gameDimensions: { width: number; height: number };
}

export const useGameLogic = ({ canvasRef, gameDimensions }: UseGameLogicProps) => {
  const [clouds, setClouds] = useState<CloudState[]>([]);
  
  const [gameState, setGameState] = useState<{player: PlayerState, elements: ElementState[]}>({player: getInitialPlayerState('pistachio'), elements: []});
  const [particles, setParticles] = useState<ParticleState[]>([]);
  const [floatingScores, setFloatingScores] = useState<FloatingScoreState[]>([]);
  const [floatingTexts, setFloatingTexts] = useState<FloatingTextState[]>([]);
  const [gameStatus, setGameStatus] = useState<GameStatus>('start');
  const [score, setScore] = useState(0);
  const [difficultyLevel, setDifficultyLevel] = useState(1);
  const [monthCounter, setMonthCounter] = useState(1);
  const [timeInMonth, setTimeInMonth] = useState(0);
  const [availableSkills, setAvailableSkills] = useState<Skill[]>([]);
  const [season, setSeason] = useState<Season>('spring');
  const [playerSlowTimer, setPlayerSlowTimer] = useState(0);
  const [rocksDestroyed, setRocksDestroyed] = useState(0);
  const [highScores, setHighScores] = useState<HighScoreEntry[]>([]);
  const [leaderboardState, setLeaderboardState] = useState<'idle' | 'loading' | 'submitting' | 'error'>('idle');
  const [acquiredSkills, setAcquiredSkills] = useState<Skill[]>([]);
  const [lastSubmissionResult, setLastSubmissionResult] = useState<SubmissionResult | null>(null);
  const [assetsReady, setAssetsReady] = useState(false);
  
  const [selectedCharacterId, setSelectedCharacterId] = useState<CharacterId>(() => {
    try {
      return (localStorage.getItem('selectedCharacter') as CharacterId) || 'pistachio';
    } catch (e) {
      return 'pistachio';
    }
  });
  const [character, setCharacter] = useState<Character>(() => getCharacterById(selectedCharacterId));


  // --- Player Stats State ---
  const [maxHealth, setMaxHealth] = useState(INITIAL_MAX_HEALTH);
  const [maxSpeed, setMaxSpeed] = useState(MAX_PLAYER_SPEED);
  const [extraLives, setExtraLives] = useState(0);
  const [blockChance, setBlockChance] = useState(0);
  const [bonusHeal, setBonusHeal] = useState(0);
  const [waterSpawnInterval, setWaterSpawnInterval] = useState(INITIAL_WATER_SPAWN_INTERVAL);

  // --- Legendary Skill State ---
  const [photosynthesisLevel, setPhotosynthesisLevel] = useState(0);
  const [goldenTouchChance, setGoldenTouchChance] = useState(0);

  // --- Special Event State ---
  const [currentEvent, setCurrentEvent] = useState<string | null>(null);
  const [incomingEventTitle, setIncomingEventTitle] = useState<string | null>(null);
  const [lightningStrikes, setLightningStrikes] = useState<LightningStrike[]>([]);
  const [burningPatches, setBurningPatches] = useState<BurningPatchState[]>([]);
  const [screenFlash, setScreenFlash] = useState(0);
  const [screenShake, setScreenShake] = useState({ x: 0, y: 0 });
  const [windDirection, setWindDirection] = useState<'left' | 'right' | null>(null);
  const [shellBreakAnimation, setShellBreakAnimation] = useState<ShellBreakAnimationState | null>(null);
  const [shellReformAnimation, setShellReformAnimation] = useState<ShellReformAnimationState | null>(null);


  const keysPressed = useRef<Record<string, boolean>>({});
  const lastRockSpawnTime = useRef(0);
  const lastWaterSpawnTime = useRef(0);
  const lastFrameTime = useRef<number>(performance.now());
  const audioInitialized = useRef(false);
  const standStillTimer = useRef(0);
  const groundDamageAccumulator = useRef(0);
  const lastGroundDamageTime = useRef(0);
  const renderContext = useRef({ scale: 1, offsetX: 0, offsetY: 0 });
  const gameSessionIdRef = useRef<string | null>(null);

  // --- Touch Controls State ---
  const activeTouches = useRef<Map<number, 'left' | 'right'>>(new Map());
  const touchStartPos = useRef<Map<number, number>>(new Map());

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

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    keysPressed.current[e.key.toLowerCase()] = true;
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    keysPressed.current[e.key.toLowerCase()] = false;
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);
  
  useEffect(() => {
    const seasons: Season[] = ['spring', 'summer', 'autumn', 'winter'];
    const seasonIndex = Math.floor((monthCounter - 1) / 3) % 4;
    setSeason(seasons[seasonIndex]);
  }, [monthCounter]);

  // --- Touch Control Handlers ---
  const updateMovementFromTouches = useCallback(() => {
      let moveLeft = false;
      let moveRight = false;
      for (const side of activeTouches.current.values()) {
          if (side === 'left') moveLeft = true;
          if (side === 'right') moveRight = true;
      }
      keysPressed.current['touchleft'] = moveLeft;
      keysPressed.current['touchright'] = moveRight;
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
      if (gameStatus !== 'playing') return;
      for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          const side = touch.clientX < window.innerWidth / 2 ? 'left' : 'right';
          activeTouches.current.set(touch.identifier, side);
          touchStartPos.current.set(touch.identifier, touch.clientY);
      }
      updateMovementFromTouches();
  }, [updateMovementFromTouches, gameStatus]);
  
  const handleTouchMove = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
      if (gameStatus !== 'playing') return;
      for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          const startY = touchStartPos.current.get(touch.identifier);
          if (startY !== undefined) {
              const deltaY = startY - touch.clientY;
              if (deltaY > JUMP_SWIPE_THRESHOLD) {
                  keysPressed.current['touchjump'] = true;
                  touchStartPos.current.delete(touch.identifier); 
              }
          }
      }
  }, [gameStatus]);

  const handleTouchEnd = useCallback((e: React.TouchEvent<HTMLDivElement>) => {
      if (gameStatus !== 'playing') return;
      for (let i = 0; i < e.changedTouches.length; i++) {
          const touch = e.changedTouches[i];
          activeTouches.current.delete(touch.identifier);
          touchStartPos.current.delete(touch.identifier);
      }
      updateMovementFromTouches();
  }, [updateMovementFromTouches, gameStatus]);

  const startGame = () => {
    const selectedChar = getCharacterById(selectedCharacterId);
    setCharacter(selectedChar);

    if (!audioInitialized.current) {
        initAudio();
        audioInitialized.current = true;
    }
    setGameState({player: {...getInitialPlayerState(selectedCharacterId), x: gameDimensions.width / 2 - PLAYER_WIDTH / 2}, elements: []});
    setParticles([]);
    setFloatingScores([]);
    setFloatingTexts([]);
    setScore(0);
    setDifficultyLevel(1);
    setMonthCounter(1);
    setTimeInMonth(0);
    lastRockSpawnTime.current = 0;
    lastWaterSpawnTime.current = 0;
    setClouds(generateInitialClouds(gameDimensions.width));
    setSeason('spring');
    setPlayerSlowTimer(0);
    setRocksDestroyed(0);
    standStillTimer.current = 0;
    groundDamageAccumulator.current = 0;
    lastGroundDamageTime.current = 0;
    setAcquiredSkills([]);
    setLastSubmissionResult(null);

    // Reset Player Stats based on Character
    setMaxHealth(INITIAL_MAX_HEALTH + (selectedChar.startingStats.maxHealth || 0));
    setMaxSpeed(MAX_PLAYER_SPEED + (selectedChar.startingStats.maxSpeed || 0));
    setExtraLives(selectedChar.startingStats.extraLives || 0);
    setBlockChance(selectedChar.startingStats.blockChance || 0);
    setBonusHeal(selectedChar.startingStats.bonusHeal || 0);
    setWaterSpawnInterval(INITIAL_WATER_SPAWN_INTERVAL);

    // Reset Legendary Skills
    setPhotosynthesisLevel(0);
    setGoldenTouchChance(selectedChar.startingStats.goldenTouchChance || 0);

    // Reset Events
    setCurrentEvent(null);
    setLightningStrikes([]);
    setBurningPatches([]);
    setScreenShake({ x: 0, y: 0 });
    setWindDirection(null);
    setIncomingEventTitle(null);
    setShellBreakAnimation(null);
    setShellReformAnimation(null);
    
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
    activeTouches.current.clear();
    keysPressed.current = {};

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

        const isPreEventMonth = (monthCounter - 1) % 3 === 1;
        const isWarningTime = timeInMonth >= 24; // Show warning in the last 6 seconds (30 - 6)

        if (isPreEventMonth && isWarningTime) {
            if (!incomingEventTitle) {
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
                
                if (eventName) {
                    setIncomingEventTitle(`${eventName} INCOMING`);
                }
            }
        } else {
            if (incomingEventTitle) {
                setIncomingEventTitle(null);
            }
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

        const createRockParticles = (rock: { x: number, y: number, size: number, id: number }, isGolden: boolean = false) => {
            const numParticles = 8 + Math.floor(rock.size / 4);
            const random = (seed: number) => {
                const x = Math.sin(seed) * 10000;
                return x - Math.floor(x);
            };
            const rockColor = isGolden ? `rgb(255, 215, 0)` :`rgb(${100 + random(rock.id)*20}, ${100 + random(rock.id+1)*20}, ${100 + random(rock.id+2)*20})`;

            for (let i = 0; i < numParticles; i++) {
                if (particles.length + particlesToCreate.length >= MAX_PARTICLES) break;
                const angle = Math.random() * 2 * Math.PI;
                const speed = 100 + Math.random() * 180;
                particlesToCreate.push({
                    id: Math.random(),
                    x: rock.x + rock.size / 2,
                    y: rock.y + rock.size / 2,
                    xVelocity: Math.cos(angle) * speed,
                    yVelocity: Math.sin(angle) * speed - 200,
                    size: 2 + Math.random() * 4,
                    color: rockColor,
                    lifespan: 0.8 + Math.random() * 0.7,
                    type: 'rock',
                });
            }
        };
        
        const createWaterSplashParticles = (splash: {x: number, y: number, size: number}) => {
            const numParticles = 10 + Math.floor(splash.size / 2);
            for (let i = 0; i < numParticles; i++) {
                if (particles.length + particlesToCreate.length >= MAX_PARTICLES) break;
                const angle = Math.PI + Math.random() * Math.PI;
                const speed = 60 + Math.random() * 100;
                particlesToCreate.push({
                    id: Math.random(),
                    x: splash.x + splash.size / 2,
                    y: splash.y,
                    xVelocity: Math.cos(angle) * speed,
                    yVelocity: -Math.sin(angle) * speed * 2.2,
                    size: 1 + Math.random() * 2,
                    color: 'rgba(255, 255, 255, 0.8)',
                    lifespan: 0.5 + Math.random() * 0.5,
                    type: 'water',
                });
            }
        };
        
        const createDustParticles = (dust: {x: number, y: number, count: number, intensity: number}) => {
            for (let i = 0; i < dust.count; i++) {
                if (particles.length + particlesToCreate.length >= MAX_PARTICLES) break;
                const angle = Math.PI + Math.random() * Math.PI;
                const speed = dust.intensity * (0.5 + Math.random());
                particlesToCreate.push({
                    id: Math.random(),
                    x: dust.x,
                    y: dust.y,
                    xVelocity: Math.cos(angle) * speed,
                    yVelocity: -Math.sin(angle) * speed * 0.6,
                    size: 2 + Math.random() * 3,
                    color: 'rgba(139, 115, 85, 0.7)',
                    lifespan: 0.4 + Math.random() * 0.4,
                    type: 'dust',
                });
            }
        };

        const gamepads = navigator.getGamepads();
        const gamepad = gamepads[0];
        
        keysPressed.current['gamepadleft'] = false;
        keysPressed.current['gamepadright'] = false;
        keysPressed.current['gamepadjump'] = false;

        if (gamepad) {
            const DEADZONE = 0.25;
            const leftStickX = gamepad.axes[0];

            if (gamepad.buttons[14] && gamepad.buttons[14].pressed) keysPressed.current['gamepadleft'] = true;
            if (gamepad.buttons[15] && gamepad.buttons[15].pressed) keysPressed.current['gamepadright'] = true;

            if (leftStickX < -DEADZONE) keysPressed.current['gamepadleft'] = true;
            if (leftStickX > DEADZONE) keysPressed.current['gamepadright'] = true;
            
            if (gamepad.buttons[0] && gamepad.buttons[0].pressed) keysPressed.current['gamepadjump'] = true;
        }

        const isTryingToJump = keysPressed.current['w'] || keysPressed.current['arrowup'] || keysPressed.current[' '] || keysPressed.current['touchjump'] || keysPressed.current['gamepadjump'];
        const isMovingLeft = keysPressed.current['a'] || keysPressed.current['arrowleft'] || keysPressed.current['touchleft'] || keysPressed.current['gamepadleft'];
        const isMovingRight = keysPressed.current['d'] || keysPressed.current['arrowright'] || keysPressed.current['touchright'] || keysPressed.current['gamepadright'];

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
          createDustParticles({ x: nextPlayerState.x + PLAYER_WIDTH / 2, y: GAME_HEIGHT - GROUND_HEIGHT, count: 10, intensity: 60 });
          if (keysPressed.current['touchjump']) {
              keysPressed.current['touchjump'] = false;
          }
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
        
        if (currentEvent === 'thunderstorm') {
            // Balance spawn rate based on screen width to ensure consistent difficulty.
            const baseLightningSpawnRate = 1.5; // Strikes per second on an 800px wide screen.
            const widthRatio = gameDimensions.width / 800;
            const currentLightningSpawnRate = baseLightningSpawnRate * widthRatio;

            if (Math.random() < deltaTime * currentLightningSpawnRate) {
                nextLightningStrikes.push({
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
            nextScreenShake = { x: (Math.random() - 0.5) * shakeIntensity, y: (Math.random() - 0.5) * shakeIntensity };
            if (particles.length + particlesToCreate.length < MAX_PARTICLES && Math.random() < deltaTime * 20) {
                particlesToCreate.push({
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
            // Spawn dense, swirling snowflakes
            if (particles.length + particlesToCreate.length < MAX_PARTICLES && Math.random() < deltaTime * 900) { // Increased density
                particlesToCreate.push({
                    id: Math.random(),
                    x: Math.random() * gameDimensions.width,
                    y: -10,
                    xVelocity: (Math.random() - 0.5) * 40, // Gentle, random initial horizontal drift
                    yVelocity: 40 + Math.random() * 30,  // Slower fall speed
                    size: 2 + Math.random() * 4, // Bigger flakes
                    color: `rgba(255, 255, 255, ${0.6 + Math.random() * 0.3})`, // Varying opacity
                    lifespan: 6 + Math.random() * 4, // Longer lifespan to fill the screen
                    type: 'water', // These will be our snowflakes
                });
            }
            // Spawn fast wind streaks
            if (particles.length + particlesToCreate.length < MAX_PARTICLES && Math.random() < deltaTime * 20) {
                particlesToCreate.push({
                    id: Math.random(),
                    x: gameDimensions.width + 20,
                    y: Math.random() * GAME_HEIGHT,
                    xVelocity: -800 - Math.random() * 300, // Fast horizontal streaks
                    yVelocity: (Math.random() - 0.5) * 20,
                    size: 1 + Math.random(), // Thin streaks
                    color: 'rgba(255, 255, 255, 0.4)',
                    lifespan: 0.8 + Math.random() * 0.5,
                    type: 'dust', // Re-use the streak drawing logic
                });
            }
        } else if (currentEvent === 'storm') {
            // New wind streak particles
            if (particles.length + particlesToCreate.length < MAX_PARTICLES && Math.random() < deltaTime * 80) { // Increased spawn rate
                 particlesToCreate.push({
                    id: Math.random(),
                    x: windDirection === 'left' ? gameDimensions.width + 20 : -20,
                    y: Math.random() * (GAME_HEIGHT - GROUND_HEIGHT),
                    xVelocity: windDirection === 'left' ? -700 - Math.random() * 400 : 700 + Math.random() * 400, // much faster
                    yVelocity: (Math.random() - 0.5) * 30, // less vertical drift
                    size: 1 + Math.random() * 2, // will be used for line width
                    color: 'rgba(255, 255, 255, 0.6)', // misty white
                    lifespan: 0.6 + Math.random() * 0.6, // shorter lifespan
                    type: 'dust',
                });
            }
        }

        if (season === 'autumn' && particles.length + particlesToCreate.length < MAX_PARTICLES && Math.random() < deltaTime * 10) {
            particlesToCreate.push({
                id: Math.random(),
                x: Math.random() * gameDimensions.width,
                y: -10,
                xVelocity: 20 - Math.random() * 40,
                yVelocity: 50 + Math.random() * 20,
                size: 8 + Math.random() * 4,
                color: ['#d97706', '#f59e0b', '#b45309'][Math.floor(Math.random() * 3)],
                lifespan: 10,
                type: 'leaf',
            });
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

                        createRockParticles(el, isGolden);
                        
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
                  createWaterSplashParticles({x: el.x, y: el.y, size: el.size});
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
                createRockParticles({ ...newEl, y: GAME_HEIGHT - GROUND_HEIGHT - newEl.size });
          } else if (hitGround && (el.type === 'water' || el.type === 'snow')) {
             const splashY = el.type === 'water' ? GAME_HEIGHT - GROUND_HEIGHT : GAME_HEIGHT - GROUND_HEIGHT - newEl.size;
             createWaterSplashParticles({ x: newEl.x, y: splashY, size: newEl.size });
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
            ...particles.map(p => ({
                ...p,
                x: p.x + p.xVelocity * deltaTime,
                y: p.y + p.yVelocity * deltaTime,
                yVelocity: p.yVelocity + (p.type === 'rock' || p.type === 'dust' ? GRAVITY * 0.8 * deltaTime : 0),
                lifespan: p.lifespan - deltaTime,
            })).filter(p => p.lifespan > 0),
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
    
    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform to identity matrix
    ctx.clearRect(0, 0, clientWidth, clientHeight);
    
    // Apply global scaling and transformations
    ctx.save();
    ctx.translate(renderContext.current.offsetX, renderContext.current.offsetY);
    ctx.scale(renderContext.current.scale, renderContext.current.scale);
    ctx.translate(screenShake.x, screenShake.y);
    
    // Draw Background
    let bgColor = { from: '#87CEEB', to: '#4682B4' };
    if (season === 'summer') bgColor = { from: '#fca5a5', to: '#f97316' };
    if (season === 'autumn') bgColor = { from: '#fde68a', to: '#fb923c' };
    if (season === 'winter') bgColor = { from: '#e0f2fe', to: '#bae6fd' };
    if (currentEvent === 'thunderstorm' || currentEvent === 'storm') bgColor = { from: '#4b5563', to: '#1f2937' };
    if (currentEvent === 'meteorShower') bgColor = { from: '#1e1b4b', to: '#0c0a09'};
    const gradient = ctx.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    gradient.addColorStop(0, bgColor.from);
    gradient.addColorStop(1, bgColor.to);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, gameDimensions.width, GAME_HEIGHT);
    
    // Draw clouds
    clouds.forEach(cloud => {
        ctx.fillStyle = cloud.isStormCloud ? 'rgba(50, 50, 70, 0.7)' : 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.ellipse(cloud.x + cloud.width / 2, cloud.y, cloud.width / 2, cloud.height / 2, 0, 0, 2 * Math.PI);
        ctx.fill();
    });

    // Draw fog for blizzard
    if (currentEvent === 'blizzard') {
        const fogGradient = ctx.createLinearGradient(0, GAME_HEIGHT, 0, GAME_HEIGHT - GROUND_HEIGHT - 150);
        fogGradient.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        fogGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = fogGradient;
        ctx.fillRect(0, 0, gameDimensions.width, GAME_HEIGHT);
    }
    
    drawGround(ctx, season, currentEvent, gameDimensions.width, burningPatches, timeInMonth);
    
    // Draw elements
    gameState.elements.forEach(el => drawRainingElement(ctx, el, season));
    
    // Draw particles
    particles.forEach(p => {
        if (p.type === 'leaf') {
             ctx.save();
             ctx.translate(p.x, p.y);
             ctx.fillStyle = p.color;
             ctx.globalAlpha = Math.max(0, p.lifespan / 2);
             ctx.beginPath();
             ctx.ellipse(0, 0, p.size / 2, p.size * 0.35, 0, 0, 2*Math.PI);
             ctx.fill();
             ctx.restore();
        } else if (p.type === 'dust') {
             ctx.fillStyle = p.color;
             ctx.globalAlpha = Math.max(0, p.lifespan);
             ctx.fillRect(p.x, p.y, p.size * 5, p.size / 3);
             ctx.globalAlpha = 1;
        } else {
             ctx.fillStyle = p.color;
             ctx.globalAlpha = Math.max(0, p.lifespan);
             ctx.beginPath();
             ctx.arc(p.x, p.y, p.size, 0, 2 * Math.PI);
             ctx.fill();
             ctx.globalAlpha = 1;
        }
    });

    if (gameStatus === 'playing') {
        drawPlayer(ctx, gameState.player, shellBreakAnimation, character, maxHealth, shellReformAnimation);
    }
    
    // Draw floating scores and texts
    ctx.font = 'bold 20px "Press Start 2P", monospace';
    floatingScores.forEach(fs => {
        ctx.globalAlpha = fs.lifespan;
        ctx.fillStyle = fs.isGolden ? '#fef08a' : '#ffffff';
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        const text = `+${fs.amount}`;
        const textWidth = ctx.measureText(text).width;
        ctx.strokeText(text, fs.x - textWidth / 2, fs.y);
        ctx.fillText(text, fs.x - textWidth / 2, fs.y);
    });
    
    ctx.font = 'bold 24px "Press Start 2P", monospace';
    floatingTexts.forEach(ft => {
        ctx.globalAlpha = ft.lifespan;
        ctx.fillStyle = ft.color;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        const textWidth = ctx.measureText(ft.text).width;
        ctx.strokeText(ft.text, ft.x - textWidth / 2, ft.y);
        ctx.fillText(ft.text, ft.x - textWidth / 2, ft.y);
    });

    ctx.globalAlpha = 1;
    ctx.lineWidth = 1;

    // Draw lightning strikes
    if (currentEvent === 'thunderstorm') {
        lightningStrikes.forEach(strike => {
            const timeSinceWarning = currentFrameTime - strike.warningStartTime;
            if (timeSinceWarning > 0 && !strike.hasStruck) {
                // Warning indicator
                const warningOpacity = Math.min(0.5, timeSinceWarning / 1000);
                ctx.fillStyle = `rgba(255, 255, 100, ${warningOpacity})`;
                ctx.fillRect(strike.x, 0, strike.width, GAME_HEIGHT - GROUND_HEIGHT);
            }
            if (strike.hasStruck) {
                // Actual strike
                ctx.fillStyle = 'white';
                ctx.fillRect(strike.x, 0, strike.width, GAME_HEIGHT - GROUND_HEIGHT);
            }
        });
    }

    if (screenFlash > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${screenFlash})`;
        ctx.fillRect(0, 0, gameDimensions.width, GAME_HEIGHT);
    }

    ctx.restore(); // Restore from global scaling

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
