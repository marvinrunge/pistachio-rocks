## In-run achievements and the rewards they grant.
##
## Mirrors `hooks/useAchievementSystem.ts`: every completion grants a one-off
## reward and raises the bar for the next level.
class_name Achievements
extends RefCounted

signal completed(achievement: Dictionary)

var _list: Array[Dictionary] = []


func _init() -> void:
	reset()


func reset() -> void:
	_list = [
		{
			"id": "rainDancer",
			"title": "Rain Dancer",
			"progress": 0,
			"target": Consts.RAIN_DANCER_TARGET,
			"level": 1,
			"icon": "🌧️",
		},
		{
			"id": "rockBreaker",
			"title": "Rock Breaker",
			"progress": 0,
			"target": Consts.ROCK_BREAKER_TARGET,
			"level": 1,
			"icon": "🔨",
		},
		{
			"id": "shellEvader",
			"title": "Escape The Reaper",
			"progress": 0,
			"target": Consts.SHELL_RECOVERY_TARGET,
			"level": 1,
			"icon": "👻",
		},
	]


func all() -> Array[Dictionary]:
	return _list


## Returns every achievement that has been completed at least once.
func completed_entries() -> Array[Dictionary]:
	return _list.filter(func(entry): return entry["level"] > 1)


func add_progress(id: String, amount: int = 1) -> void:
	for entry in _list:
		if entry["id"] != id:
			continue
		entry["progress"] += amount
		if entry["progress"] < entry["target"]:
			return
		var unlocked := entry.duplicate()
		entry["progress"] = 0
		# Escape The Reaper keeps its target so the shell reward stays reachable.
		if entry["id"] != "shellEvader":
			entry["target"] *= 2
		entry["level"] += 1
		Sfx.play_achievement()
		completed.emit(unlocked)
		return
