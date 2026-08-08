## Skill pools offered at the end of every month.
##
## Mirrors `game/skills.ts` from the web version.
class_name Skills
extends RefCounted

const PERMANENT_POOL := [
	{
		"id": "shellFortification",
		"title": "Shell Fortification",
		"description": "Permanently increases your maximum Shell HP by 5.",
		"color": Color("4ade80"),
		"icon": "🛡️",
	},
	{
		"id": "increasedAgility",
		"title": "Increased Agility",
		"description": "Permanently increases your maximum movement speed.",
		"color": Color("60a5fa"),
		"icon": "👟",
	},
	{
		"id": "soothingRains",
		"title": "Soothing Rains",
		"description": "Permanently reduces the time between water drops by 10%.",
		"color": Color("22d3ee"),
		"icon": "🌧️",
	},
]

const EVENT_POOL := [
	{
		"id": "waterAffinity",
		"title": "Water Affinity",
		"description": "Increases the healing from all water drops by 1. Stacks.",
		"color": Color("38bdf8"),
		"icon": "💧",
	},
	{
		"id": "blockChance",
		"title": "Stone Shell",
		"description": "Increase your chance to block rock damage by 10%. Stacks up to 75%.",
		"color": Color("c084fc"),
		"icon": "🪨",
	},
	{
		"id": "extraLife",
		"title": "Phoenix Kernel",
		"description": "Gain an extra life. A broken shell instantly revives at full HP.",
		"color": Color("facc15"),
		"icon": "🔥",
	},
]

const YEARLY_POOL := [
	{
		"id": "photosynthesis",
		"title": "Photosynthesis",
		"description": "Regenerate 1 HP for every second you stand still. Stacks.",
		"color": Color("34d399"),
		"icon": "🌱",
	},
	{
		"id": "goldenTouch",
		"title": "Golden Touch",
		"description": "Gain a 5% chance for destroyed rocks to grant 10x score. Stacks.",
		"color": Color("fbbf24"),
		"icon": "✨",
	},
]

const MAX_BLOCK_CHANCE := 0.75

## Picks up to three skills for the level-up screen.
##
## Yearly skills are offered after every twelfth month, event skills after the
## other event months and permanent skills for all remaining months.
static func roll_choices(month_counter: int, block_chance: float) -> Array:
	var pool: Array = []
	var event_just_ended := (month_counter - 1) % 3 == 2
	if event_just_ended and month_counter > 0 and month_counter % 12 == 0:
		pool = YEARLY_POOL.duplicate()
	elif event_just_ended:
		for skill in EVENT_POOL:
			if skill["id"] == "blockChance" and block_chance >= MAX_BLOCK_CHANCE:
				continue
			pool.append(skill)
	else:
		pool = PERMANENT_POOL.duplicate()
	pool.shuffle()
	return pool.slice(0, 3)
