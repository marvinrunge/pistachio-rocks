extends Node2D
## Lightweight particle system.
##
## Thousands of tiny sprites would be wasteful here, so particles are plain
## dictionaries updated and drawn in bulk, exactly like the canvas version.

enum Kind { ROCK, WATER, DUST, LEAF, FIRE }

var _particles: Array[Dictionary] = []


func clear() -> void:
	_particles.clear()
	queue_redraw()


func count() -> int:
	return _particles.size()


func spawn(particle: Dictionary) -> void:
	if _particles.size() >= Consts.MAX_PARTICLES:
		_particles.remove_at(0)
	_particles.append(particle)


func spawn_rock_burst(center: Vector2, color: Color, golden: bool = false) -> void:
	var burst_color := Color8(255, 215, 0) if golden else color
	for i in 4:
		var angle := randf() * TAU
		var speed := 100.0 + randf() * 180.0
		spawn({
			"kind": Kind.ROCK,
			"position": center,
			"velocity": Vector2(cos(angle), sin(angle)) * speed - Vector2(0.0, 200.0),
			"size": 2.0 + randf() * 4.0,
			"color": burst_color,
			"lifespan": 0.8 + randf() * 0.7,
			"rotation": 0.0,
			"spin": 0.0,
		})


func spawn_water_splash(center: Vector2) -> void:
	for i in 4:
		var angle := PI + randf() * PI
		var speed := 60.0 + randf() * 100.0
		spawn({
			"kind": Kind.WATER,
			"position": center,
			"velocity": Vector2(cos(angle) * speed, -absf(sin(angle)) * speed * 2.2),
			"size": 1.0 + randf() * 2.0,
			"color": Color(1, 1, 1, 0.8),
			"lifespan": 0.5 + randf() * 0.5,
			"rotation": 0.0,
			"spin": 0.0,
		})


func spawn_dust(origin: Vector2, count_: int, intensity: float) -> void:
	for i in count_:
		var angle := PI + randf() * PI
		var speed := intensity * (0.5 + randf())
		spawn({
			"kind": Kind.DUST,
			"position": origin,
			"velocity": Vector2(cos(angle) * speed, -absf(sin(angle)) * speed * 0.6),
			"size": 2.0 + randf() * 3.0,
			"color": Color(0.55, 0.45, 0.33, 0.7),
			"lifespan": 0.4 + randf() * 0.4,
			"rotation": 0.0,
			"spin": 0.0,
		})


func spawn_phoenix(origin: Vector2) -> void:
	var colors := [Color8(239, 68, 68), Color8(249, 115, 22), Color8(234, 179, 8)]
	for i in 30:
		var angle := -PI * 0.5 + (randf() - 0.5) * 2.0
		var speed := 100.0 + randf() * 200.0
		spawn({
			"kind": Kind.FIRE,
			"position": origin,
			"velocity": Vector2(cos(angle), sin(angle)) * speed,
			"size": 3.0 + randf() * 5.0,
			"color": colors[randi() % colors.size()],
			"lifespan": 0.5 + randf() * 0.8,
			"rotation": randf() * TAU,
			"spin": (randf() - 0.5) * 2.0,
		})


func spawn_autumn_leaf(game_width: float) -> void:
	var colors := [Color8(217, 119, 6), Color8(245, 158, 11), Color8(180, 83, 9)]
	spawn({
		"kind": Kind.LEAF,
		"position": Vector2(randf() * game_width, -10.0),
		"velocity": Vector2(20.0 - randf() * 40.0, 50.0 + randf() * 20.0),
		"size": 8.0 + randf() * 4.0,
		"color": colors[randi() % colors.size()],
		"lifespan": 10.0,
		"rotation": randf() * TAU,
		"spin": (randf() - 0.5) * 2.0,
	})


func update(delta: float) -> void:
	var alive: Array[Dictionary] = []
	for particle in _particles:
		particle["lifespan"] -= delta
		if particle["lifespan"] <= 0.0:
			continue
		match particle["kind"]:
			Kind.ROCK, Kind.DUST:
				particle["velocity"].y += Consts.GRAVITY * 0.8 * delta
			Kind.FIRE:
				particle["velocity"].y -= Consts.GRAVITY * 0.2 * delta
				particle["size"] = maxf(0.0, particle["size"] - delta * 2.0)
		particle["position"] += particle["velocity"] * delta
		particle["rotation"] += particle["spin"] * delta
		alive.append(particle)
	_particles = alive
	queue_redraw()


func _draw() -> void:
	for particle in _particles:
		var color: Color = particle["color"]
		var fade: float = clampf(particle["lifespan"], 0.0, 1.0)
		color.a *= fade
		match particle["kind"]:
			Kind.LEAF:
				draw_set_transform(particle["position"], particle["rotation"], Vector2.ONE)
				var leaf := Vector2(particle["size"], particle["size"] * 0.5)
				draw_rect(Rect2(-leaf * 0.5, leaf), color, true)
				draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)
			Kind.FIRE:
				draw_circle(particle["position"], particle["size"] * 0.5, color)
			_:
				draw_rect(
					Rect2(
						particle["position"] - Vector2(particle["size"], particle["size"]) * 0.5,
						Vector2(particle["size"], particle["size"])
					),
					color,
					true
				)
