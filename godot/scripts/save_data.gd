extends Node
## Local persistence for high scores, settings and the chosen character.
##
## The web version keeps this in `localStorage` (plus an online leaderboard).
## The Godot build stores everything in `user://savegame.cfg`, so a run can be
## played completely offline.

const SAVE_PATH := "user://savegame.cfg"
const MAX_SCORES := 20

var _config := ConfigFile.new()


func _ready() -> void:
	_config.load(SAVE_PATH)


func get_player_name() -> String:
	return str(_config.get_value("player", "name", ""))


func set_player_name(name: String) -> void:
	_config.set_value("player", "name", name)
	_save()


func get_selected_character() -> String:
	return str(_config.get_value("player", "character", Characters.DEFAULT_ID))


func set_selected_character(id: String) -> void:
	_config.set_value("player", "character", id)
	_save()


func get_muted() -> bool:
	return bool(_config.get_value("settings", "muted", false))


func set_muted(value: bool) -> void:
	_config.set_value("settings", "muted", value)
	_save()


## High score entries are dictionaries with the same fields the web build uses.
func get_high_scores() -> Array:
	var scores: Array = _config.get_value("scores", Consts.GAME_VERSION, [])
	return scores.duplicate(true)


## Stores `entry` and returns its 1-based rank in the (trimmed) score table.
func add_high_score(entry: Dictionary) -> int:
	var scores := get_high_scores()
	scores.append(entry)
	scores.sort_custom(func(a, b): return int(a["score"]) > int(b["score"]))
	if scores.size() > MAX_SCORES:
		scores = scores.slice(0, MAX_SCORES)
	_config.set_value("scores", Consts.GAME_VERSION, scores)
	_save()
	for i in scores.size():
		if scores[i] == entry:
			return i + 1
	return 0


func _save() -> void:
	var error := _config.save(SAVE_PATH)
	if error != OK:
		push_warning("Could not write save file: %s" % error_string(error))
