extends Node2D
## Weather hazards drawn in front of the play field: lightning and meteor fires.

const WARNING_DURATION := 1.2
const STRIKE_VISIBLE := 0.1
const PATCH_LIFESPAN := 3.0

var _strikes: Array[Dictionary] = []
var _patches: Array[Dictionary] = []


func clear() -> void:
	_strikes.clear()
	_patches.clear()
	queue_redraw()


func clear_strikes() -> void:
	_strikes.clear()
	queue_redraw()


func clear_patches() -> void:
	_patches.clear()
	queue_redraw()


func has_patches() -> bool:
	return not _patches.is_empty()


func add_strike(x: float, width: float) -> void:
	_strikes.append({"x": x, "width": width, "elapsed": 0.0, "struck": false, "bolt": _make_bolt(x, width)})


func add_patch(x: float, width: float) -> void:
	_patches.append({"x": x - 10.0, "width": width + 20.0, "lifespan": PATCH_LIFESPAN})


## Returns true when the player's horizontal span overlaps a burning patch.
func is_over_patch(rect: Rect2) -> bool:
	for patch in _patches:
		if rect.position.x + rect.size.x > patch["x"] and rect.position.x < patch["x"] + patch["width"]:
			return true
	return false


## Advances hazards and returns the horizontal spans that struck this frame.
func update(delta: float) -> Array[Vector2]:
	var hits: Array[Vector2] = []
	for strike in _strikes:
		strike["elapsed"] += delta
		if not strike["struck"] and strike["elapsed"] >= WARNING_DURATION:
			strike["struck"] = true
			Sfx.play_lightning_strike()
			hits.append(Vector2(strike["x"], strike["x"] + strike["width"]))
	_strikes = _strikes.filter(
		func(strike): return strike["elapsed"] < WARNING_DURATION + STRIKE_VISIBLE
	)

	for patch in _patches:
		patch["lifespan"] -= delta
	_patches = _patches.filter(func(patch): return patch["lifespan"] > 0.0)

	queue_redraw()
	return hits


func _make_bolt(x: float, width: float) -> PackedVector2Array:
	var points := PackedVector2Array()
	var center := x + width * 0.5
	var segments := 10
	for i in segments + 1:
		var t := float(i) / float(segments)
		var jitter := 0.0 if i == 0 or i == segments else (randf() - 0.5) * width
		points.append(Vector2(center + jitter, Consts.GROUND_Y * t))
	return points


func _draw() -> void:
	for patch in _patches:
		var alpha: float = minf(1.0, patch["lifespan"] / 2.0)
		draw_rect(
			Rect2(patch["x"], Consts.GROUND_Y - 3.0, patch["width"], 8.0),
			Color(0.23, 0.18, 0.13, alpha),
			true
		)
		if randf() > 0.5:
			var ember := Vector2(
				patch["x"] + randf() * patch["width"], Consts.GROUND_Y + randf() * 8.0 - 4.0
			)
			draw_circle(ember, randf() * 2.0 + 1.0, Color(0.98, 0.45, 0.09, alpha))

	for strike in _strikes:
		if strike["struck"]:
			draw_polyline(strike["bolt"], Color(1, 1, 1, 0.9), 6.0)
			draw_polyline(strike["bolt"], Color(0.7, 0.85, 1.0, 0.9), 2.0)
		else:
			var progress: float = strike["elapsed"] / WARNING_DURATION
			var pulse: float = 0.15 + absf(sin(progress * PI * 6.0)) * 0.25
			draw_rect(
				Rect2(strike["x"], 0.0, strike["width"], Consts.GROUND_Y),
				Color(1.0, 0.9, 0.3, pulse),
				true
			)
