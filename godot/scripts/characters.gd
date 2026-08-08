## Playable characters and their starting stats.
##
## Mirrors `game/characters/*` from the web version.
class_name Characters
extends RefCounted

const DEFAULT_ID := "pistachio"

const LIST := [
	{
		"id": "pistachio",
		"name": "Pistachio",
		"description": "The original nut. Balanced and classic.",
		"width_scale": 1.0,
		"stats": {},
	},
	{
		"id": "walnut",
		"name": "Walnut",
		"description": "A tough nut to crack but a bit sluggish.",
		"width_scale": 1.1,
		"stats": {"max_health": 10.0, "max_speed": -20.0},
	},
	{
		"id": "chestnut",
		"name": "Chestnut",
		"description": "Small and spiky, quick on its feet.",
		"width_scale": 1.0,
		"stats": {},
	},
]

## Returns the character definition for `id`, falling back to the pistachio.
static func get_by_id(id: String) -> Dictionary:
	for character in LIST:
		if character["id"] == id:
			return character
	return LIST[0]

## Axis-aligned hitbox of a character while it still wears its shell.
static func shelled_size(character: Dictionary) -> Vector2:
	return Vector2(Consts.PLAYER_WIDTH * float(character["width_scale"]), Consts.PLAYER_HEIGHT)

## Axis-aligned hitbox of a character after its shell broke off.
static func naked_size(character: Dictionary) -> Vector2:
	return Vector2(
		Consts.NAKED_PLAYER_WIDTH * float(character["width_scale"]), Consts.NAKED_PLAYER_HEIGHT
	)

## Reads a starting stat modifier, defaulting to 0 when the character has none.
static func stat(character: Dictionary, key: String) -> float:
	var stats: Dictionary = character["stats"]
	return float(stats.get(key, 0.0))
