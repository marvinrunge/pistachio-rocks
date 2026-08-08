extends Node2D
## Healing fountains, the reward for completing the Rain Dancer achievement.

const WIDTH := 60.0
const HEIGHT := 100.0
const HEAL_RATE := 5.0

var _fountains: Array[Dictionary] = []


func clear() -> void:
	_fountains.clear()
	queue_redraw()


## Spawns a fountain at `x`, or tops up the existing one.
func add(x: float, capacity: float) -> void:
	if _fountains.is_empty():
		_fountains.append({
			"x": x - WIDTH * 0.5,
			"capacity": capacity,
			"max_capacity": capacity,
		})
	else:
		_fountains[0]["capacity"] += capacity
		_fountains[0]["max_capacity"] += capacity
	queue_redraw()


## Returns how much health the player standing at `player_rect` may drain.
func drain(player_rect: Rect2, delta: float) -> float:
	if _fountains.is_empty():
		return 0.0
	var available := 0.0
	for fountain in _fountains:
		var fountain_rect := Rect2(fountain["x"], Consts.GROUND_Y - HEIGHT, WIDTH, HEIGHT)
		if not player_rect.intersects(fountain_rect):
			continue
		var amount: float = minf(HEAL_RATE * delta, fountain["capacity"])
		fountain["capacity"] -= amount
		available += amount
	_fountains = _fountains.filter(func(fountain): return fountain["capacity"] > 0.0)
	queue_redraw()
	return available


func _draw() -> void:
	for fountain in _fountains:
		var base := Rect2(fountain["x"], Consts.GROUND_Y - 12.0, WIDTH, 12.0)
		draw_rect(base, Color8(100, 116, 139), true)
		var ratio: float = clampf(fountain["capacity"] / maxf(fountain["max_capacity"], 0.001), 0.0, 1.0)
		var column_height := HEIGHT * ratio
		draw_rect(
			Rect2(fountain["x"] + WIDTH * 0.25, Consts.GROUND_Y - 12.0 - column_height, WIDTH * 0.5, column_height),
			Color(0.0, 1.0, 1.0, 0.45),
			true
		)
		for i in 6:
			var drop := Vector2(
				fountain["x"] + WIDTH * 0.5 + (randf() - 0.5) * WIDTH * 0.6,
				Consts.GROUND_Y - 12.0 - randf() * column_height
			)
			draw_circle(drop, 2.0, Color(0.6, 1.0, 1.0, 0.8))
