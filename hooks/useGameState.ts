
import { useState } from 'react';
import type { PlayerState, ElementState, ParticleState, Skill, LightningStrike, Season, FloatingTextState, HighScoreEntry, GameStatus, CloudState, FloatingScoreState, ShellBreakAnimationState, SubmissionResult, CharacterId, ShellReformAnimationState, BurningPatchState } from '../types';
import { getInitialPlayerState, generateInitialClouds } from '../game/state';
import { INITIAL_MAX_HEALTH, MAX_PLAYER_SPEED, INITIAL_WATER_SPAWN_INTERVAL } from '../constants';
import { getCharacterById, type Character } from '../game/characters/index';

export const useGameState = (gameDimensions: { width: number, height: number }) => {
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

  const resetGameState = (characterId: CharacterId) => {
    const selectedChar = getCharacterById(characterId);
    setCharacter(selectedChar);

    setGameState({player: {...getInitialPlayerState(characterId), x: gameDimensions.width / 2}, elements: []});
    setParticles([]);
    setFloatingScores([]);
    setFloatingTexts([]);
    setScore(0);
    setDifficultyLevel(1);
    setMonthCounter(1);
    setTimeInMonth(0);
    setClouds(generateInitialClouds(gameDimensions.width));
    setSeason('spring');
    setPlayerSlowTimer(0);
    setRocksDestroyed(0);
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
  };

  return {
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
  };
};
