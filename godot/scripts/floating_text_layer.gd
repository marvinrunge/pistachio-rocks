extends Node2D
## Damage numbers, heal numbers and floating score popups drawn in world space.

const RISE_SPEED := 20.0

var _labels: Array[Dictionary] = []


func clear() -> void:
	_labels.clear()
	queue_redraw()


func add(text: String, position_: Vector2, color: Color, lifespan := 1.0, font_size := 16) -> void:
	_labels.append({
		"text": text,
		"position": position_,
		"color": color,
		"lifespan": lifespan,
		"max_lifespan": lifespan,
		"font_size": font_size,
	})


func add_score(amount: int, position_: Vector2, golden: bool) -> void:
	add(
		"+%d" % amount,
		position_,
		Color8(251, 191, 36) if golden else Color.WHITE,
		1.0,
		24 if golden else 16
	)


func update(delta: float) -> void:
	var alive: Array[Dictionary] = []
	for label in _labels:
		label["lifespan"] -= delta
		if label["lifespan"] <= 0.0:
			continue
		label["position"].y -= RISE_SPEED * delta
		alive.append(label)
	_labels = alive
	queue_redraw()


func _draw() -> void:
	var font := ThemeDB.fallback_font
	for label in _labels:
		var color: Color = label["color"]
		color.a *= clampf(label["lifespan"] / label["max_lifespan"], 0.0, 1.0)
		var size: int = label["font_size"]
		var width := font.get_string_size(label["text"], HORIZONTAL_ALIGNMENT_LEFT, -1, size).x
		var origin: Vector2 = label["position"] - Vector2(width * 0.5, 0.0)
		draw_string(font, origin + Vector2(1, 1), label["text"], HORIZONTAL_ALIGNMENT_LEFT, -1, size, Color(0, 0, 0, color.a * 0.6))
		draw_string(font, origin, label["text"], HORIZONTAL_ALIGNMENT_LEFT, -1, size, color)
