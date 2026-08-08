extends Node2D
## The playable nut: physics, shell state and rendering.
##
## `position` is the top-left corner of the shelled hitbox, so the naked body can
## be aligned inside it exactly like the web version does.

const SHELL_MAX_OPEN_ANGLE := 20.0
const SHELL_REFORM_DURATION := 0.5
const SHELL_DEBRIS_LIFESPAN := 1.5

var character: Dictionary = Characters.get_by_id(Characters.DEFAULT_ID)
var velocity := Vector2.ZERO
var health := 0.0
var max_health := Consts.INITIAL_MAX_HEALTH
var is_naked := false
var is_half_shell := false
var has_reinforced_shell := false
var seismic_slam_ready := false
var frozen := false

var _seed_texture: Texture2D
var _shell_left_texture: Texture2D
var _shell_right_texture: Texture2D
var _debris: Array[Dictionary] = []
var _reform_progress := -1.0


func _ready() -> void:
	set_character(Characters.DEFAULT_ID)


func set_character(id: String) -> void:
	character = Characters.get_by_id(id)
	_seed_texture = load("res://assets/%s-seed.svg" % id)
	_shell_left_texture = load("res://assets/%s-shell-left.svg" % id)
	_shell_right_texture = load("res://assets/%s-shell-right.svg" % id)
	queue_redraw()


func shelled_size() -> Vector2:
	return Characters.shelled_size(character)


func naked_size() -> Vector2:
	return Characters.naked_size(character)


## Current collision rectangle in canvas space.
func hitbox() -> Rect2:
	var shelled := shelled_size()
	if is_naked:
		var naked := naked_size()
		return Rect2(
			position + Vector2((shelled.x - naked.x) * 0.5, shelled.y - naked.y), naked
		)
	return Rect2(position, shelled)


func center() -> Vector2:
	return position + shelled_size() * 0.5


func is_on_ground() -> bool:
	return position.y >= _ground_top() - 0.001


func reset(character_id: String, start_x: float, start_health: float, start_max_health: float) -> void:
	set_character(character_id)
	max_health = start_max_health
	health = start_health
	is_naked = false
	is_half_shell = false
	has_reinforced_shell = false
	seismic_slam_ready = false
	frozen = false
	velocity = Vector2.ZERO
	_debris.clear()
	_reform_progress = -1.0
	position = Vector2(start_x - shelled_size().x * 0.5, _ground_top())
	queue_redraw()


## Advances physics for one frame and returns dust particle spawn requests.
func update_physics(
	delta: float,
	input_left: bool,
	input_right: bool,
	jump_pressed: bool,
	max_speed: float,
	slowed: bool,
	agility_stacks: int,
	icy_ground: bool,
	wind: float,
	game_width: float
) -> Array[Dictionary]:
	var effects: Array[Dictionary] = []
	var grounded := is_on_ground()

	var friction := Consts.ICE_FRICTION if (icy_ground and grounded) else Consts.GROUND_FRICTION
	if agility_stacks > 0 and not icy_ground:
		friction += friction * (agility_stacks * 0.5)

	var acceleration := Consts.PLAYER_ACCELERATION * (1.0 + agility_stacks * 0.25)
	if slowed:
		acceleration *= 0.5

	if input_left:
		velocity.x -= acceleration * delta
	elif input_right:
		velocity.x += acceleration * delta

	velocity.x += wind * delta

	if not input_left and not input_right and grounded and not is_zero_approx(velocity.x):
		var previous_speed := absf(velocity.x)
		velocity.x = move_toward(velocity.x, 0.0, friction * delta)
		if agility_stacks > 0 and previous_speed > 50.0 and randf() < 0.3:
			effects.append({"type": "dust", "position": _feet(), "count": 2, "intensity": 30.0})

	var speed_cap := max_speed * (0.5 if slowed else 1.0)
	velocity.x = clampf(velocity.x, -speed_cap, speed_cap)
	position.x += velocity.x * delta

	if jump_pressed and grounded:
		velocity.y = -Consts.JUMP_STRENGTH
		Sfx.play_jump()
		effects.append({"type": "dust", "position": _feet(), "count": 10, "intensity": 60.0})

	velocity.y += Consts.GRAVITY * delta
	position.y += velocity.y * delta

	var landed := false
	if position.y > _ground_top():
		landed = not grounded
		position.y = _ground_top()
		velocity.y = 0.0

	position.x = clampf(position.x, 0.0, maxf(0.0, game_width - shelled_size().x))
	if is_zero_approx(position.x) or is_equal_approx(position.x, game_width - shelled_size().x):
		velocity.x = 0.0

	if landed:
		effects.append({"type": "landed", "position": _feet(), "count": 0, "intensity": 0.0})

	_update_animations(delta)
	queue_redraw()
	return effects


## Applies healing and returns true when the shell grew back from 0 HP.
func heal(amount: float) -> bool:
	if amount <= 0.0:
		return false
	var previous := health
	health = minf(max_health, health + amount)
	if health <= previous:
		return false
	if (is_naked or is_half_shell) and is_zero_approx(previous):
		is_naked = false
		is_half_shell = false
		_reform_progress = 0.0
		return true
	return false


## Revives the nut with a full shell (Phoenix Kernel).
func revive() -> void:
	health = max_health
	is_naked = false
	is_half_shell = false
	_reform_progress = 0.0


## Breaks the next shell stage. Returns true when the nut has no shell left.
func break_shell() -> bool:
	health = 0.0
	if has_reinforced_shell and not is_half_shell and not is_naked:
		has_reinforced_shell = false
		is_half_shell = true
		_spawn_debris(true, false)
		return false
	if is_half_shell:
		is_half_shell = false
		is_naked = true
		_spawn_debris(false, true)
		return false
	if is_naked:
		return true
	is_naked = true
	_spawn_debris(true, true)
	return false


func _ground_top() -> float:
	return Consts.GROUND_Y - shelled_size().y


func _feet() -> Vector2:
	return Vector2(position.x + shelled_size().x * 0.5, Consts.GROUND_Y)


func _spawn_debris(left: bool, right: bool) -> void:
	var origin := center()
	if left:
		_debris.append({
			"texture": _shell_left_texture,
			"position": origin,
			"velocity": Vector2(-100.0 - randf() * 50.0, -400.0 - randf() * 100.0),
			"rotation": 0.0,
			"spin": deg_to_rad(-200.0 - randf() * 100.0),
			"lifespan": SHELL_DEBRIS_LIFESPAN,
		})
	if right:
		_debris.append({
			"texture": _shell_right_texture,
			"position": origin,
			"velocity": Vector2(100.0 + randf() * 50.0, -400.0 - randf() * 100.0),
			"rotation": 0.0,
			"spin": deg_to_rad(200.0 + randf() * 100.0),
			"lifespan": SHELL_DEBRIS_LIFESPAN,
		})


func _update_animations(delta: float) -> void:
	for piece in _debris:
		piece["velocity"].y += Consts.GRAVITY * 0.8 * delta
		piece["position"] += piece["velocity"] * delta
		piece["rotation"] += piece["spin"] * delta
		piece["lifespan"] -= delta
	_debris = _debris.filter(func(piece): return piece["lifespan"] > 0.0)

	if _reform_progress >= 0.0:
		_reform_progress += delta / SHELL_REFORM_DURATION
		if _reform_progress >= 1.0:
			_reform_progress = -1.0


func _draw() -> void:
	if _seed_texture == null or _shell_left_texture == null:
		return

	var shelled := shelled_size()
	var naked := naked_size()
	var aspect := float(_shell_left_texture.get_width()) / float(_shell_left_texture.get_height())
	var draw_size := Vector2(shelled.y * aspect, shelled.y)
	var draw_origin := Vector2((shelled.x - draw_size.x) * 0.5, 0.0)

	for piece in _debris:
		draw_set_transform(to_local(piece["position"]), piece["rotation"], Vector2.ONE)
		draw_texture_rect(piece["texture"], Rect2(-draw_size * 0.5, draw_size), false)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	# The seed body is always visible; it sits on the ground once the shell is gone.
	var seed_size := Vector2(naked.y * aspect, naked.y)
	var seed_origin := Vector2((shelled.x - seed_size.x) * 0.5, (shelled.y - seed_size.y) * 0.5)
	if is_naked and _reform_progress < 0.0:
		seed_origin.y = shelled.y - seed_size.y
	draw_texture_rect(_seed_texture, Rect2(seed_origin, seed_size), false)

	if not is_naked or _reform_progress >= 0.0:
		_draw_shells(shelled, draw_size, draw_origin)

	if frozen:
		_draw_ice_overlay(draw_origin, draw_size)


func _draw_shells(shelled: Vector2, draw_size: Vector2, draw_origin: Vector2) -> void:
	var health_ratio := 0.0 if max_health <= 0.0 else clampf(health / max_health, 0.0, 1.0)
	var angle := deg_to_rad((1.0 - health_ratio) * SHELL_MAX_OPEN_ANGLE)
	var pivot := Vector2(shelled.x * 0.5, shelled.y)

	var slide := 0.0
	if _reform_progress >= 0.0:
		var eased := 1.0 - pow(1.0 - _reform_progress, 3.0)
		slide = draw_size.x * 0.25 * (1.0 - eased)

	if not is_half_shell:
		_draw_shell_half(_shell_left_texture, draw_origin - Vector2(slide, 0.0), draw_size, pivot, -angle)
	_draw_shell_half(_shell_right_texture, draw_origin + Vector2(slide, 0.0), draw_size, pivot, angle)


func _draw_shell_half(
	texture: Texture2D, origin: Vector2, size: Vector2, pivot: Vector2, angle: float
) -> void:
	# Rotate around the pivot by translating it to the origin first.
	var offset := pivot - Vector2(cos(angle) * pivot.x - sin(angle) * pivot.y,
		sin(angle) * pivot.x + cos(angle) * pivot.y)
	draw_set_transform(offset, angle, Vector2.ONE)
	draw_texture_rect(texture, Rect2(origin, size), false)
	draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)


func _draw_ice_overlay(origin: Vector2, size: Vector2) -> void:
	var padding := 5.0
	var rect := Rect2(origin - Vector2(padding, padding), size + Vector2(padding, padding) * 2.0)
	draw_rect(rect, Color(0.68, 0.85, 0.9, 0.6), true)
	draw_rect(rect, Color(1, 1, 1, 0.8), false, 2.0)
	draw_line(rect.position + Vector2(10, 10), rect.position + Vector2(20, 25), Color(1, 1, 1, 0.9), 1.0)
	draw_line(
		rect.position + rect.size - Vector2(15, 25),
		rect.position + rect.size - Vector2(10, 10),
		Color(1, 1, 1, 0.9),
		1.0
	)
