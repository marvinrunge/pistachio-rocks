extends Node2D
## A single falling element: rock, meteor, water drop or snowflake.
##
## `position` is the top-left corner of the element's square hitbox, matching the
## coordinates used by the original canvas renderer.

enum Kind { ROCK, WATER, SNOW, METEOR }

var kind: Kind = Kind.ROCK
var size := Consts.MIN_ELEMENT_SIZE
var speed := Consts.MIN_ELEMENT_SPEED
var damage := 0
var tint := Color.TRANSPARENT
var spin := 0.0


func setup(
	element_kind: int, element_size: float, element_speed: float, element_damage: int, element_tint: Color
) -> void:
	kind = element_kind
	size = element_size
	speed = element_speed
	damage = element_damage
	tint = element_tint
	spin = randf() * TAU
	queue_redraw()


func advance(delta: float) -> void:
	position.y += speed * delta


## Collision rectangle. Water drops are drawn taller than wide, so their hitbox
## is nudged down to line up with the visible drop.
func hitbox() -> Rect2:
	var offset := size * 0.5 if kind == Kind.WATER else 0.0
	return Rect2(position.x, position.y + offset, size, size)


func is_hazard() -> bool:
	return kind == Kind.ROCK or kind == Kind.METEOR


## Y coordinate at which the element touches the ground.
func ground_contact_y() -> float:
	return position.y + size



func _draw() -> void:
	match kind:
		Kind.SNOW:
			_draw_snow()
		Kind.WATER:
			_draw_water()
		Kind.METEOR:
			_draw_meteor()
		_:
			_draw_rock()


func _draw_rock() -> void:
	var color: Color = tint if tint.a > 0.0 else Color8(110, 110, 110)
	var points := _rounded_square(size, size * 0.28)
	draw_set_transform(Vector2(size, size) * 0.5, spin, Vector2.ONE)
	draw_colored_polygon(points, color)
	draw_polyline(points + PackedVector2Array([points[0]]), Color8(74, 74, 74), 2.0)
	# Cheap fake lighting: a smaller, brighter shape nudged towards the light.
	var highlight := _rounded_square(size * 0.6, size * 0.2)
	for i in highlight.size():
		highlight[i] += Vector2(-size, -size) * 0.1
	draw_colored_polygon(highlight, Color(1, 1, 1, 0.12))
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


func _draw_water() -> void:
	var width := size
	var height := size * 1.5
	var tip := Vector2(width * 0.5, 0.0)
	var belly := width * 0.5
	var center := Vector2(width * 0.5, height - belly)
	var points := PackedVector2Array()
	# Right flank, bezier from the pointed tip down to the belly.
	for i in 9:
		points.append(_quad_bezier(tip, Vector2(width, height * 0.45), center + Vector2(belly, 0.0), float(i) / 8.0))
	# Bottom half circle.
	for i in range(1, 9):
		var angle := PI * (float(i) / 8.0)
		points.append(center + Vector2(cos(angle), sin(angle)) * belly)
	# Left flank back up to the tip.
	for i in range(1, 9):
		points.append(_quad_bezier(center - Vector2(belly, 0.0), Vector2(0.0, height * 0.45), tip, float(i) / 8.0))
	draw_colored_polygon(points, Color(0.23, 0.51, 0.96, 0.85))
	draw_polyline(points + PackedVector2Array([points[0]]), Color8(173, 216, 230), 2.0)
	draw_circle(Vector2(width * 0.4, height * 0.55), width * 0.12, Color(1, 1, 1, 0.75))


func _quad_bezier(from: Vector2, control: Vector2, to: Vector2, t: float) -> Vector2:
	return from.lerp(control, t).lerp(control.lerp(to, t), t)


func _draw_snow() -> void:
	var half := size * 0.5
	for i in 3:
		var angle := spin + PI / 3.0 * i
		var arm := Vector2(cos(angle), sin(angle)) * half
		draw_line(Vector2(half, half) - arm, Vector2(half, half) + arm, Color.WHITE, size * 0.2)


func _draw_meteor() -> void:
	var center := Vector2(size, size) * 0.5
	var radius := size * 0.5
	# Trail first so the head draws on top of it.
	var trail_length := size * 2.5
	var steps := 8
	for i in steps:
		var t := float(i) / float(steps)
		var color := Color(0.98, 0.45, 0.09, 0.6 * (1.0 - t))
		draw_line(
			center - Vector2(0.0, trail_length * t),
			center - Vector2(0.0, trail_length * (t + 1.0 / steps)),
			color,
			radius * (1.0 - t)
		)
	draw_circle(center, radius, Color(0.94, 0.27, 0.27, 0.5))
	draw_circle(center, radius * 0.8, Color8(249, 115, 22))
	draw_circle(center, radius * 0.4, Color8(254, 240, 138))
	draw_circle(center, radius * 0.15, Color.WHITE)


## Builds a rounded square centred on the origin.
func _rounded_square(length: float, radius: float) -> PackedVector2Array:
	var half := length * 0.5
	var corner_radius: float = minf(radius, half)
	var points := PackedVector2Array()
	var corners := [
		Vector2(half - corner_radius, half - corner_radius),
		Vector2(-half + corner_radius, half - corner_radius),
		Vector2(-half + corner_radius, -half + corner_radius),
		Vector2(half - corner_radius, -half + corner_radius),
	]
	for i in corners.size():
		var start_angle := PI * 0.5 * i
		for step in 5:
			var angle := start_angle + PI * 0.5 * (float(step) / 4.0)
			points.append(corners[i] + Vector2(cos(angle), sin(angle)) * corner_radius)
	return points
