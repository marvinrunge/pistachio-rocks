extends Node2D
## Gameplay orchestration: pacing, spawning, collisions, events and rewards.
##
## This is the Godot port of `hooks/useGameLogic.ts` and the systems it pulls
## together. The scene is inert until [method start_run] is called.

const ElementScript := preload("res://scripts/element.gd")
const ParticleScript := preload("res://scripts/particle_field.gd")

## Emitted every frame while a run is active so the HUD can refresh.
signal hud_changed
## Emitted when a month ends; `choices` holds up to three skill dictionaries.
signal level_up(choices: Array)
## Emitted when the nut dies; `stats` describes the finished run.
signal run_over(stats: Dictionary)
## Emitted when an in-run achievement reaches its target.
signal achievement_completed(entry: Dictionary)

@onready var background: Node2D = $Background
@onready var elements_root: Node2D = $Elements
@onready var fountains: Node2D = $Fountains
@onready var player: Node2D = $Player
@onready var particles: Node2D = $Particles
@onready var weather: Node2D = $Weather
@onready var floating_text: Node2D = $FloatingText
@onready var flash_rect: ColorRect = $Flash/ColorRect

var running := false

# --- Run state ---
var score := 0.0
var month_counter := 1
var time_in_month := 0.0
var season := "spring"
var current_event := ""
var incoming_event := ""
var wind_direction := 0
var rocks_destroyed := 0
var character_id := Characters.DEFAULT_ID
var acquired_skills: Array = []

# --- Player stats ---
var max_health := Consts.INITIAL_MAX_HEALTH
var max_speed := Consts.MAX_PLAYER_SPEED
var extra_lives := 0
var block_chance := 0.0
var bonus_heal := 0.0
var water_spawn_interval := Consts.INITIAL_WATER_SPAWN_INTERVAL
var photosynthesis_level := 0
var golden_touch_chance := 0.0

var achievements := Achievements.new()

var _game_width := Consts.GAME_WIDTH
var _rock_timer := 0.0
var _water_timer := 0.0
var _slow_timer := 0.0
var _stand_still_timer := 0.0
var _heal_accumulator := 0.0
var _fire_damage_accumulator := 0.0
var _shake_timer := 0.0
var _shake_strength := 0.0
var _flash := 0.0
var _jump_buffer := false
var _touch_sides: Dictionary = {}
var _touch_origins: Dictionary = {}


func _ready() -> void:
	achievements.completed.connect(_on_achievement_completed)
	set_process(true)
	_refresh_width()
	set_world_visible(false)


## Shows or hides everything except the animated background, so the menus can
## use the seasonal backdrop without a stray nut standing around.
func set_world_visible(value: bool) -> void:
	for node in [fountains, elements_root, player, particles, weather, floating_text]:
		node.visible = value


## Returns the menu backdrop to a calm spring day.
func reset_background() -> void:
	background.season = "spring"
	background.current_event = ""
	background.wind_direction = 0
	background.time_in_month = 0.0
	background.clear_storm_clouds()
	flash_rect.color = Color(1, 1, 1, 0)
	position = Vector2.ZERO


func _unhandled_input(event: InputEvent) -> void:
	if not running:
		return
	if event.is_action_pressed("jump"):
		_jump_buffer = true
	elif event is InputEventScreenTouch:
		_handle_touch(event)
	elif event is InputEventScreenDrag:
		_handle_drag(event)


## Touch controls mirror the web build: hold a screen half to walk that way and
## swipe up to jump.
func _handle_touch(event: InputEventScreenTouch) -> void:
	if event.pressed:
		_touch_sides[event.index] = -1 if event.position.x < _game_width * 0.5 else 1
		_touch_origins[event.index] = event.position.y
	else:
		_touch_sides.erase(event.index)
		_touch_origins.erase(event.index)


func _handle_drag(event: InputEventScreenDrag) -> void:
	if not _touch_origins.has(event.index):
		return
	if _touch_origins[event.index] - event.position.y > Consts.JUMP_SWIPE_THRESHOLD:
		_jump_buffer = true
		_touch_origins.erase(event.index)


func _touch_direction() -> int:
	var direction := 0
	for side in _touch_sides.values():
		direction += side
	return signi(direction)


func agility_stacks() -> int:
	var stacks := 0
	for skill in acquired_skills:
		if skill["id"] == "increasedAgility":
			stacks += 1
	return stacks


## Resets every system and begins a fresh run with `id` as the chosen character.
func start_run(id: String) -> void:
	character_id = id
	var character := Characters.get_by_id(id)

	score = 0.0
	month_counter = 1
	time_in_month = 0.0
	season = "spring"
	current_event = ""
	incoming_event = ""
	wind_direction = 0
	rocks_destroyed = 0
	acquired_skills = []

	max_health = Consts.INITIAL_MAX_HEALTH + Characters.stat(character, "max_health")
	max_speed = Consts.MAX_PLAYER_SPEED + Characters.stat(character, "max_speed")
	extra_lives = int(Characters.stat(character, "extra_lives"))
	block_chance = Characters.stat(character, "block_chance")
	bonus_heal = Characters.stat(character, "bonus_heal")
	water_spawn_interval = Consts.INITIAL_WATER_SPAWN_INTERVAL
	photosynthesis_level = 0
	golden_touch_chance = Characters.stat(character, "golden_touch_chance")

	achievements.reset()

	_rock_timer = 0.0
	_water_timer = 0.0
	_slow_timer = 0.0
	_stand_still_timer = 0.0
	_heal_accumulator = 0.0
	_fire_damage_accumulator = 0.0
	_shake_timer = 0.0
	_shake_strength = 0.0
	_flash = 0.0
	_jump_buffer = false
	_touch_sides.clear()
	_touch_origins.clear()
	position = Vector2.ZERO

	_refresh_width()
	_clear_elements()
	particles.clear()
	floating_text.clear()
	weather.clear()
	fountains.clear()
	background.season = season
	background.current_event = current_event
	background.wind_direction = 0
	background.time_in_month = 0.0
	background.regenerate(_game_width)
	player.reset(id, _game_width * 0.5, max_health, max_health)

	running = true
	hud_changed.emit()


## Applies the chosen skill and starts the next month.
func apply_skill(skill: Dictionary) -> void:
	acquired_skills.append(skill)
	match skill["id"]:
		"shellFortification":
			max_health += 5.0
			player.max_health = max_health
			player.heal(5.0)
		"increasedAgility":
			max_speed += 45.0
		"waterAffinity":
			bonus_heal += 1.0
		"soothingRains":
			water_spawn_interval *= 0.9
		"extraLife":
			extra_lives += 1
		"blockChance":
			block_chance = minf(block_chance + 0.1, Skills.MAX_BLOCK_CHANCE)
		"photosynthesis":
			photosynthesis_level += 1
		"goldenTouch":
			golden_touch_chance += Consts.GOLDEN_TOUCH_CHANCE_INCREASE

	month_counter += 1
	time_in_month = 0.0
	season = Consts.season_for_month(month_counter)
	background.season = season
	_start_event_if_due()
	_jump_buffer = false
	_touch_sides.clear()
	_touch_origins.clear()
	running = true
	hud_changed.emit()


func stop() -> void:
	running = false


func _process(delta: float) -> void:
	if not running:
		# Keep the menu backdrop alive even while no run is in progress.
		background.update_clouds(minf(delta, 0.1))
		return
	delta = minf(delta, 0.1)
	_refresh_width()

	time_in_month += delta
	if time_in_month >= Consts.MONTH_DURATION:
		time_in_month = Consts.MONTH_DURATION
		_begin_level_up()
		return

	score += delta
	_slow_timer = maxf(0.0, _slow_timer - delta)
	player.frozen = _slow_timer > 0.0

	_update_incoming_event()
	_update_player(delta)
	_update_weather(delta)
	_spawn_elements(delta)
	_update_elements(delta)
	_update_fountains(delta)
	_update_effects(delta)

	background.current_event = current_event
	background.wind_direction = wind_direction
	background.time_in_month = time_in_month
	background.update_clouds(delta)
	particles.update(delta)
	floating_text.update(delta)

	hud_changed.emit()


# --- Player ------------------------------------------------------------------


func _update_player(delta: float) -> void:
	var wind := 0.0
	if current_event == "storm":
		wind = Consts.WIND_FORCE * wind_direction

	var touch_direction := _touch_direction()
	var effects: Array = player.update_physics(
		delta,
		Input.is_action_pressed("move_left") or touch_direction < 0,
		Input.is_action_pressed("move_right") or touch_direction > 0,
		_jump_buffer or Input.is_action_pressed("jump"),
		max_speed,
		_slow_timer > 0.0,
		agility_stacks(),
		current_event == "blizzard",
		wind,
		_game_width
	)
	_jump_buffer = false

	for effect in effects:
		match effect["type"]:
			"dust":
				particles.spawn_dust(effect["position"], effect["count"], effect["intensity"])
			"landed":
				_try_seismic_slam()

	_update_photosynthesis(delta)


func _update_photosynthesis(delta: float) -> void:
	var idle: bool = (
		photosynthesis_level > 0
		and absf(player.velocity.x) < 1.0
		and player.is_on_ground()
		and player.health < max_health
	)
	if not idle:
		_stand_still_timer = 0.0
		return
	_stand_still_timer += delta
	if _stand_still_timer < 1.0:
		return
	_stand_still_timer -= 1.0
	var amount := float(photosynthesis_level)
	var recovered: bool = player.heal(amount)
	Sfx.play_photosynthesis()
	floating_text.add("+%d" % int(amount), _player_label_anchor(), Color8(16, 185, 129), 0.8)
	if recovered:
		achievements.add_progress("shellEvader")


func _try_seismic_slam() -> void:
	if not player.seismic_slam_ready:
		return
	player.seismic_slam_ready = false
	Sfx.play_seismic_slam()
	_shake_timer = 3.0
	_shake_strength = 5.0
	var destroyed := 0
	for element in elements_root.get_children():
		if element.is_queued_for_deletion() or element.kind != ElementScript.Kind.ROCK:
			continue
		score += 10.0
		destroyed += 1
		particles.spawn_rock_burst(element.hitbox().get_center(), element.tint)
		floating_text.add_score(10, element.hitbox().get_center(), false)
		element.queue_free()
	if destroyed > 0:
		rocks_destroyed += destroyed


# --- Elements ----------------------------------------------------------------


func _spawn_elements(delta: float) -> void:
	var width_ratio := _game_width / Consts.GAME_WIDTH

	var rock_interval: float = Consts.ELEMENT_SPAWN_INTERVAL * pow(0.92, month_counter - 1)
	rock_interval /= width_ratio
	rock_interval = maxf(rock_interval, Consts.MIN_ELEMENT_SPAWN_INTERVAL)
	match current_event:
		"earthquake":
			rock_interval /= 1.5
		"thunderstorm":
			rock_interval *= 2.0
		"meteorShower":
			rock_interval = maxf(rock_interval * 0.6, 0.1)

	_rock_timer += delta
	var spawned := 0
	while _rock_timer >= rock_interval and spawned < 5:
		_rock_timer -= rock_interval
		_spawn_hazard()
		spawned += 1
	if _rock_timer > rock_interval * 5.0:
		_rock_timer = 0.0

	var drop_interval := water_spawn_interval / width_ratio
	if current_event == "thunderstorm":
		drop_interval /= 3.0
	_water_timer += delta
	if _water_timer >= drop_interval:
		_water_timer = 0.0
		_spawn_drop()

	if season == "autumn" and randf() < delta * 10.0:
		particles.spawn_autumn_leaf(_game_width)


func _spawn_hazard() -> void:
	var kind: int = ElementScript.Kind.ROCK
	var speed_multiplier := 1.0
	var size := randf_range(Consts.MIN_ELEMENT_SIZE, Consts.MAX_ELEMENT_SIZE)
	if current_event == "meteorShower":
		kind = ElementScript.Kind.METEOR
		speed_multiplier = 1.5
	elif current_event == "earthquake":
		size = randf_range(Consts.MIN_ELEMENT_SIZE, 25.0)

	var damage_multiplier := 1.0 + (month_counter - 1) * 0.1
	var base_damage: int = int(round(size / 10.0))
	if kind == ElementScript.Kind.METEOR:
		base_damage *= 2
	var damage: int = maxi(1, int(round(base_damage * damage_multiplier)))

	var difficulty := 1.0 + sqrt(maxf(0.0, month_counter - 1.0)) * 0.15
	var speed := (
		randf_range(Consts.MIN_ELEMENT_SPEED, Consts.MAX_ELEMENT_SPEED)
		* difficulty
		* speed_multiplier
	)

	_add_element(kind, size, speed, damage, _hazard_color(damage_multiplier))


## Rocks darken and redden as their damage multiplier grows.
func _hazard_color(damage_multiplier: float) -> Color:
	if damage_multiplier <= 1.5:
		match season:
			"summer":
				return Color8(190 + randi() % 20, 170 + randi() % 20, 140 + randi() % 20)
			"winter":
				return Color8(220 + randi() % 20, 225 + randi() % 20, 230 + randi() % 20)
			_:
				return Color8(100 + randi() % 20, 100 + randi() % 20, 100 + randi() % 20)
	var intensity: float = minf(1.0, (damage_multiplier - 1.5) / 2.0)
	var r := int(100 - intensity * 50)
	var g := int(100 - intensity * 80)
	var b := int(100 - intensity * 80)
	if intensity > 0.5:
		r += 40
	return Color8(r, g, b)


func _spawn_drop() -> void:
	var size := Consts.WATER_DROP_SIZE
	var kind: int = ElementScript.Kind.WATER
	match season:
		"summer":
			size *= 0.7
		"autumn":
			size *= 1.3
		"winter":
			kind = ElementScript.Kind.SNOW
	_add_element(kind, size, Consts.MIN_ELEMENT_SPEED, 0, Color.TRANSPARENT)


func _add_element(kind: int, size: float, speed: float, damage: int, tint: Color) -> void:
	var element := ElementScript.new()
	element.position = Vector2(randf() * maxf(1.0, _game_width - size), -size)
	elements_root.add_child(element)
	element.setup(kind, size, speed, damage, tint)


func _update_elements(delta: float) -> void:
	var player_rect: Rect2 = player.hitbox()
	var consumed := false
	for element in elements_root.get_children():
		if element.is_queued_for_deletion():
			continue
		element.advance(delta)
		if not consumed and running and player_rect.intersects(element.hitbox()):
			consumed = true
			_resolve_player_collision(element)
			element.queue_free()
			if not running:
				return
			continue
		if element.ground_contact_y() >= Consts.GROUND_Y:
			_resolve_ground_collision(element)
			element.queue_free()


func _resolve_player_collision(element: Node2D) -> void:
	var center: Vector2 = element.hitbox().get_center()
	if element.is_hazard():
		var points: int = maxi(1, int(round(element.size / 10.0)))
		var golden := golden_touch_chance > 0.0 and randf() < golden_touch_chance
		if golden:
			points *= 10
			Sfx.play_golden_touch()
		score += points
		rocks_destroyed += 1
		floating_text.add_score(points, center, golden)
		particles.spawn_rock_burst(center, element.tint, golden)
		achievements.add_progress("rockBreaker")

		if element.kind == ElementScript.Kind.METEOR:
			Sfx.play_meteor_impact()
		else:
			Sfx.play_impact(element.size)

		var blockable: bool = element.kind != ElementScript.Kind.METEOR
		if blockable and block_chance > 0.0 and randf() < block_chance:
			Sfx.play_block()
			floating_text.add("BLOCK!", _player_label_anchor(), Color8(96, 165, 250))
			return
		_damage_player(float(element.damage), Color8(239, 68, 68))
		return

	# Water and snow heal, snow additionally freezes the nut for a moment.
	Sfx.play_water_collect()
	particles.spawn_water_splash(center)
	var heal := Consts.WATER_HEAL_AMOUNT
	match season:
		"summer":
			heal *= 0.5
		"autumn":
			heal *= 1.5
	heal = snappedf(heal + bonus_heal, 0.1)
	if element.kind == ElementScript.Kind.SNOW:
		_slow_timer = 2.0
	floating_text.add("+%s" % _format_number(heal), _player_label_anchor(), Color8(34, 197, 94))
	if player.heal(heal):
		achievements.add_progress("shellEvader")
	achievements.add_progress("rainDancer")


func _resolve_ground_collision(element: Node2D) -> void:
	var center := Vector2(
		element.position.x + element.size * 0.5, Consts.GROUND_Y - element.size * 0.5
	)
	if element.kind == ElementScript.Kind.METEOR:
		Sfx.play_meteor_impact()
		weather.add_patch(element.position.x, element.size)
		particles.spawn_rock_burst(center, element.tint)
	elif element.kind == ElementScript.Kind.ROCK:
		Sfx.play_impact(element.size, 0.2)
		particles.spawn_rock_burst(center, element.tint)
	else:
		particles.spawn_water_splash(Vector2(center.x, Consts.GROUND_Y))


func _clear_elements() -> void:
	for element in elements_root.get_children():
		element.queue_free()


# --- Damage and death --------------------------------------------------------


func _damage_player(amount: float, color: Color, show_text := true) -> void:
	if amount <= 0.0:
		return
	if show_text:
		floating_text.add("-%s" % _format_number(amount), _player_label_anchor(), color)
	var remaining: float = maxf(0.0, player.health - amount)
	if remaining > 0.0:
		player.health = remaining
		Sfx.play_damage()
		return

	if extra_lives > 0:
		extra_lives -= 1
		Sfx.play_resurrect()
		_flash = 0.8
		player.revive()
		particles.spawn_phoenix(player.center())
		return

	if player.break_shell():
		Sfx.play_game_over()
		_finish_run()
	else:
		Sfx.play_shell_crack()


func _finish_run() -> void:
	running = false
	var months_survived := month_counter - 1
	run_over.emit({
		"score": int(score),
		"year": int(months_survived / 12),
		"month": months_survived % 12,
		"rocks_destroyed": rocks_destroyed,
		"max_health": max_health,
		"final_speed": max_speed,
		"acquired_skills": acquired_skills.duplicate(),
		"character_id": character_id,
		"version": Consts.GAME_VERSION,
		"achievements": achievements.completed_entries(),
	})


# --- Weather events ----------------------------------------------------------


func _start_event_if_due() -> void:
	_clear_event_effects()
	if (month_counter - 1) % 3 != 2:
		return
	current_event = _event_for_month(month_counter)
	background.current_event = current_event
	match current_event:
		"storm":
			wind_direction = -1 if randf() < 0.5 else 1
			background.wind_direction = wind_direction
			background.add_storm_clouds(10)
			Sfx.play_storm()
		"thunderstorm":
			background.add_storm_clouds(7)
		"earthquake":
			Sfx.play_earthquake()
		"blizzard":
			Sfx.play_blizzard()


func _clear_event_effects() -> void:
	current_event = ""
	wind_direction = 0
	incoming_event = ""
	background.current_event = ""
	background.wind_direction = 0
	background.clear_storm_clouds()
	weather.clear()


## Returns the event that runs during `month`, or an empty string.
func _event_for_month(month: int) -> String:
	if (month - 1) % 3 != 2:
		return ""
	var season_index := int(floor((month - 1) / 3.0)) % 4
	var year := Consts.year_for_month(month)
	if year >= 2 and (year - 2) % 3 == 0 and season_index == 1:
		return "meteorShower"
	match season_index:
		0:
			return "storm"
		1:
			return "thunderstorm"
		2:
			return "earthquake"
		_:
			return "blizzard"


func _update_incoming_event() -> void:
	var warning := ""
	if (month_counter - 1) % 3 == 1 and time_in_month >= Consts.MONTH_DURATION - 6.0:
		var upcoming := _event_for_month(month_counter + 1)
		if upcoming != "":
			warning = "%s INCOMING" % _event_display_name(upcoming).to_upper()
	incoming_event = warning


func _event_display_name(event: String) -> String:
	match event:
		"meteorShower":
			return "Meteor Shower"
		"thunderstorm":
			return "Thunderstorm"
		"storm":
			return "Storm"
		"earthquake":
			return "Earthquake"
		"blizzard":
			return "Blizzard"
	return ""


func event_display_name() -> String:
	return _event_display_name(current_event)


func _update_weather(delta: float) -> void:
	match current_event:
		"thunderstorm":
			if randf() < delta * 1.5 * (_game_width / Consts.GAME_WIDTH):
				weather.add_strike(randf() * maxf(1.0, _game_width - 50.0), 40.0 + randf() * 20.0)
			if randf() < delta * 0.3:
				Sfx.play_thunder()
		"earthquake":
			if randf() < delta * 20.0:
				particles.spawn_dust(
					Vector2(randf() * _game_width, Consts.GROUND_Y), 1, 40.0
				)
		"blizzard":
			if randf() < delta * 60.0:
				particles.spawn({
					"kind": ParticleScript.Kind.WATER,
					"position": Vector2(randf() * _game_width, -10.0),
					"velocity": Vector2((randf() - 0.5) * 40.0, 40.0 + randf() * 30.0),
					"size": 2.0 + randf() * 4.0,
					"color": Color(1, 1, 1, 0.8),
					"lifespan": 6.0 + randf() * 4.0,
					"rotation": 0.0,
					"spin": 0.0,
				})
		"storm":
			if wind_direction != 0 and randf() < delta * 60.0:
				var from_left := wind_direction > 0
				particles.spawn({
					"kind": ParticleScript.Kind.DUST,
					"position": Vector2(-20.0 if from_left else _game_width + 20.0, randf() * Consts.GROUND_Y),
					"velocity": Vector2((700.0 + randf() * 400.0) * wind_direction, (randf() - 0.5) * 30.0),
					"size": 1.0 + randf() * 2.0,
					"color": Color(1, 1, 1, 0.6),
					"lifespan": 0.6 + randf() * 0.6,
					"rotation": 0.0,
					"spin": 0.0,
				})

	var strikes: Array = weather.update(delta)
	var player_rect: Rect2 = player.hitbox()
	for span in strikes:
		_flash = 0.8
		if player_rect.position.x < span.y and player_rect.position.x + player_rect.size.x > span.x:
			_damage_player(ceilf(max_health * 0.33), Color8(239, 68, 68))
			if not running:
				return

	if weather.has_patches() and player.is_on_ground() and weather.is_over_patch(player_rect):
		# Standing in meteor fire deals 1 HP per second, batched into readable ticks.
		var fire_damage := 1.0 * delta
		_fire_damage_accumulator += fire_damage
		_damage_player(fire_damage, Color8(249, 115, 22), false)
		if _fire_damage_accumulator >= 1.0:
			floating_text.add(
				"-%d" % int(_fire_damage_accumulator), _player_label_anchor(), Color8(249, 115, 22)
			)
			_fire_damage_accumulator -= floorf(_fire_damage_accumulator)


# --- Rewards and effects -----------------------------------------------------


func _update_fountains(delta: float) -> void:
	var amount: float = fountains.drain(player.hitbox(), delta)
	if amount <= 0.0:
		return
	if player.heal(amount):
		achievements.add_progress("shellEvader")
	_heal_accumulator += amount
	if _heal_accumulator >= 1.0:
		floating_text.add(
			"+%d" % int(_heal_accumulator), _player_label_anchor(), Color8(0, 255, 255)
		)
		_heal_accumulator -= floorf(_heal_accumulator)


func _update_effects(delta: float) -> void:
	var offset := Vector2.ZERO
	if current_event == "earthquake":
		offset += Vector2(randf() - 0.5, randf() - 0.5) * 4.0
	if _shake_timer > 0.0:
		_shake_timer -= delta
		var strength := _shake_strength * clampf(_shake_timer / 3.0, 0.0, 1.0)
		offset += Vector2(randf() - 0.5, randf() - 0.5) * strength * 2.0
	position = offset

	_flash = maxf(0.0, _flash - delta * 4.0)
	flash_rect.color = Color(1, 1, 1, _flash)


func _on_achievement_completed(entry: Dictionary) -> void:
	match entry["id"]:
		"rainDancer":
			fountains.add(player.center().x, float(entry["target"]))
		"rockBreaker":
			player.seismic_slam_ready = true
		"shellEvader":
			player.has_reinforced_shell = true
	achievement_completed.emit(entry)


# --- Helpers -----------------------------------------------------------------


func _begin_level_up() -> void:
	running = false
	incoming_event = ""
	_clear_event_effects()
	level_up.emit(Skills.roll_choices(month_counter, block_chance))


func _refresh_width() -> void:
	_game_width = maxf(Consts.GAME_WIDTH, get_viewport_rect().size.x)
	background.game_width = _game_width


func _player_label_anchor() -> Vector2:
	return Vector2(player.center().x, player.position.y - 8.0)


func _format_number(value: float) -> String:
	if is_equal_approx(value, roundf(value)):
		return str(int(roundf(value)))
	return "%.1f" % value
