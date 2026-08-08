## Shared tuning values for the game.
##
## Mirrors `constants.ts` from the web version so both builds stay balanced
## identically. All speeds are expressed in pixels per second.
class_name Consts
extends RefCounted

# --- Game area ---
const GAME_WIDTH := 800.0
const GAME_HEIGHT := 700.0
const GROUND_HEIGHT := 180.0
## Y coordinate of the ground surface in the game's canvas space.
const GROUND_Y := GAME_HEIGHT - GROUND_HEIGHT

# --- Player ---
const PLAYER_WIDTH := 40.0
const PLAYER_HEIGHT := 50.0
const JUMP_STRENGTH := 600.0
const GRAVITY := 1500.0
const INITIAL_MAX_HEALTH := 20.0
const PLAYER_ACCELERATION := 1200.0
const MAX_PLAYER_SPEED := 160.0
const GROUND_FRICTION := 1200.0
## Much lower friction, used while a blizzard freezes the ground.
const ICE_FRICTION := 100.0
const WIND_FORCE := 400.0
const NAKED_PLAYER_WIDTH := PLAYER_WIDTH * 0.55
const NAKED_PLAYER_HEIGHT := PLAYER_HEIGHT * 0.85

# --- Falling elements ---
const ELEMENT_SPAWN_INTERVAL := 0.45
const MIN_ELEMENT_SPAWN_INTERVAL := 0.16
const MIN_ELEMENT_SIZE := 15.0
const MAX_ELEMENT_SIZE := 40.0
const MIN_ELEMENT_SPEED := 100.0
const MAX_ELEMENT_SPEED := 250.0

# --- Water drops ---
const INITIAL_WATER_SPAWN_INTERVAL := 2.5
const WATER_DROP_SIZE := 15.0
const WATER_HEAL_AMOUNT := 2.0

# --- Achievements ---
const RAIN_DANCER_TARGET := 20
const ROCK_BREAKER_TARGET := 50
const SHELL_RECOVERY_TARGET := 10

# --- Legendary skills ---
const GOLDEN_TOUCH_CHANCE_INCREASE := 0.05

# --- Pacing ---
## Seconds of survival before the next month (and a skill choice) begins.
const MONTH_DURATION := 30.0
const MAX_PARTICLES := 800

# --- Versioning ---
const GAME_VERSION := "0.3.0"

# --- Seasons ---
const SEASONS := ["spring", "summer", "autumn", "winter"]

## Returns the season name for a 1-based month counter.
static func season_for_month(month_counter: int) -> String:
	var index := int(floor((month_counter - 1) / 3.0)) % 4
	return SEASONS[index]

## Returns the 1-based in-game year for a 1-based month counter.
static func year_for_month(month_counter: int) -> int:
	return int(floor((month_counter - 1) / 12.0)) + 1
