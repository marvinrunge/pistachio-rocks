// Game area dimensions
export const GAME_HEIGHT = 700;
export const GROUND_HEIGHT = 180;

// Player properties
export const PLAYER_WIDTH = 40;
export const PLAYER_HEIGHT = 50;
export const JUMP_STRENGTH = 600;
export const GRAVITY = 1500;
export const INITIAL_MAX_HEALTH = 20;

// New Player Physics properties
export const PLAYER_ACCELERATION = 1200; // pixels per second^2
export const MAX_PLAYER_SPEED = 300; // pixels per second
export const GROUND_FRICTION = 800; // pixels per second^2
export const ICE_FRICTION = 100; // Much lower friction for blizzard event
export const WIND_FORCE = 400; // a constant force during storm events

// Naked player hitbox (derived from visual size in Player.tsx)
export const NAKED_PLAYER_WIDTH = PLAYER_WIDTH * 0.55;
export const NAKED_PLAYER_HEIGHT = PLAYER_HEIGHT * 0.85;

// Raining element properties
export const ELEMENT_SPAWN_INTERVAL = 450; // ms
export const MIN_ELEMENT_SIZE = 15;
export const MAX_ELEMENT_SIZE = 40;
export const MIN_ELEMENT_SPEED = 100; // pixels per second
export const MAX_ELEMENT_SPEED = 250; // pixels per second

// Waterdrop properties
export const INITIAL_WATER_SPAWN_INTERVAL = 2500; // ms
export const WATER_DROP_SIZE = 15;
export const WATER_HEAL_AMOUNT = 2;

// Legendary Skill Properties
export const GOLDEN_TOUCH_CHANCE_INCREASE = 0.05; // 5% chance per level

// Performance
export const MAX_PARTICLES = 150;

// Versioning
export const GAME_VERSION = '0.2.0';
export const ARCHIVED_GAME_VERSIONS: string[] = ['0.1.0'];

// Backend API
export const LEADERBOARD_API_URL = 'https://us-west1-gen-lang-client-0224535657.cloudfunctions.net/pistachio-leaderboard-s7w6x0f3';