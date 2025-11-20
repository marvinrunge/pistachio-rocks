// All shared type definitions for the application.

// FIX: Add new character IDs to support newly added characters.
export type CharacterId = 'pistachio' | 'walnut';

export type PlayerState = {
  x: number;
  y: number;
  yVelocity: number;
  xVelocity: number;
  health: number;
  isNaked: boolean;
  characterId: CharacterId;
};

export type ElementType = 'rock' | 'water' | 'snow' | 'meteor';

export type ElementState = {
  id: number;
  x: number;
  y: number;
  size: number;
  speed: number;
  type: ElementType;
};

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export type ShellPieceState = {
  x: number;
  y: number;
  xVelocity: number;
  yVelocity: number;
  rotation: number;
  rotationVelocity: number;
};

export type ShellBreakAnimationState = {
  leftPiece: ShellPieceState;
  rightPiece: ShellPieceState;
  lifespan: number;
};

export type ShellReformAnimationState = {
  progress: number; // 0 to 1
  duration: number;
};

export type Skill = {
  id: string;
  title: string;
  description: string;
  color: string;
};

export type HighScoreEntry = {
  id: number;
  name: string;
  score: number;
  year: number;
  month: number;
  rocksDestroyed: number;
  maxHealth: number;
  finalSpeed: number;
  acquiredSkills: Skill[];
  characterId: CharacterId;
  version: string;
};

export type SubmissionResult = {
  success: boolean;
  rank: number;
  userScore: HighScoreEntry;
};

export type ScorePayload = {
  gameId: string;
  name: string;
  score: number;
  year: number;
  month: number;
  rocksDestroyed: number;
  maxHealth: number;
  finalSpeed: number;
  acquiredSkills: Skill[];
  characterId: CharacterId;
  version: string;
};

export type GameStatus = 'start' | 'playing' | 'levelUp' | 'enteringName' | 'highScores' | 'instructions' | 'characterSelect' | 'about';

export type ParticleState = {
  id: number;
  x: number;
  y: number;
  xVelocity: number;
  yVelocity: number;
  size: number;
  color: string;
  lifespan: number;
  type: 'rock' | 'water' | 'dust' | 'leaf';
};

export type GameDimensions = {
  width: number;
  height: number;
};

export type LightningStrike = {
  id: number;
  x: number;
  width: number;
  warningStartTime: number;
  strikeTime: number;
  hasStruck?: boolean;
};

export type BurningPatchState = {
  id: number;
  x: number;
  width: number;
  lifespan: number;
};

export type FloatingTextState = {
  id: number;
  x: number;
  y: number;
  text: string;
  color: string;
  lifespan: number;
};

export type CloudState = {
  x: number;
  y: number;
  speed: number;
  width: number;
  height: number;
  isStormCloud?: boolean;
};

export type FloatingScoreState = {
  id: number;
  x: number;
  y: number;
  amount: number;
  lifespan: number;
  isGolden: boolean;
};