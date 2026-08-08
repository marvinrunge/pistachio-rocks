extends Node2D
## Sky, clouds and ground.
##
## Colours follow the season and the currently running weather event, mirroring
## `game/drawing.ts`.

const CLOUD_SPACING := 250.0

var season := "spring"
var current_event := ""
var wind_direction := 0
var time_in_month := 0.0
var game_width := Consts.GAME_WIDTH

var _clouds: Array[Dictionary] = []
var _ground_details: Array[Dictionary] = []


func _ready() -> void:
	regenerate(Consts.GAME_WIDTH)


func regenerate(width: float) -> void:
	game_width = width
	_clouds.clear()
	var count: int = maxi(3, int(width / CLOUD_SPACING))
	for i in count:
		_clouds.append(_make_cloud(randf() * width, false))
	_ground_details.clear()
	for i in 20:
		_ground_details.append({
			"position": Vector2(randf(), randf()),
			"color": [Color8(217, 119, 6), Color8(245, 158, 11), Color8(180, 83, 9)][i % 3],
			"rotation": randf() * TAU,
			"size": randf() * 10.0 + 8.0,
		})
	queue_redraw()


## Adds the dense, fast cloud cover used by storms and thunderstorms.
func add_storm_clouds(count: int) -> void:
	clear_storm_clouds()
	for i in count:
		_clouds.append(_make_cloud(randf() * game_width, true))


func clear_storm_clouds() -> void:
	_clouds = _clouds.filter(func(cloud): return not cloud["storm"])


func update_clouds(delta: float) -> void:
	for cloud in _clouds:
		var speed: float = cloud["speed"]
		if current_event == "storm" and wind_direction != 0:
			speed *= 2.5 if cloud["storm"] else 1.5
			cloud["position"].x += speed * delta * wind_direction
		else:
			cloud["position"].x -= speed * delta
		if cloud["position"].x < -cloud["size"].x:
			cloud["position"].x = game_width
		elif cloud["position"].x > game_width:
			cloud["position"].x = -cloud["size"].x
	queue_redraw()


func _make_cloud(x: float, storm: bool) -> Dictionary:
	if storm:
		return {
			"position": Vector2(x, 60.0 + randf() * 120.0),
			"size": Vector2(100.0 + randf() * 80.0, 30.0 + randf() * 20.0),
			"speed": 40.0 + randf() * 40.0,
			"storm": true,
		}
	return {
		"position": Vector2(x, 40.0 + randf() * 100.0),
		"size": Vector2(80.0 + randf() * 70.0, 25.0 + randf() * 15.0),
		"speed": 8.0 + randf() * 12.0,
		"storm": false,
	}


func _draw() -> void:
	_draw_sky()
	_draw_clouds()
	_draw_ground()


func _draw_sky() -> void:
	var colors := _sky_colors()
	var steps := 24
	var band := Consts.GROUND_Y / float(steps)
	for i in steps:
		var t := float(i) / float(steps - 1)
		draw_rect(Rect2(0.0, band * i, game_width, band + 1.0), colors[0].lerp(colors[1], t), true)


func _sky_colors() -> Array[Color]:
	match current_event:
		"thunderstorm":
			return [Color8(30, 41, 59), Color8(71, 85, 105)]
		"storm":
			return [Color8(51, 65, 85), Color8(100, 116, 139)]
		"blizzard":
			return [Color8(148, 163, 184), Color8(226, 232, 240)]
		"meteorShower":
			return [Color8(30, 27, 75), Color8(88, 28, 135)]
	match season:
		"summer":
			return [Color8(56, 189, 248), Color8(186, 230, 253)]
		"autumn":
			return [Color8(251, 146, 60), Color8(254, 215, 170)]
		"winter":
			return [Color8(148, 163, 184), Color8(241, 245, 249)]
		_:
			return [Color8(96, 165, 250), Color8(191, 219, 254)]


func _draw_clouds() -> void:
	for cloud in _clouds:
		var color := Color(1, 1, 1, 0.85)
		if cloud["storm"]:
			color = Color(0.35, 0.38, 0.45, 0.9)
		var size: Vector2 = cloud["size"]
		var origin: Vector2 = cloud["position"]
		draw_circle(origin + Vector2(size.x * 0.3, size.y * 0.5), size.y * 0.7, color)
		draw_circle(origin + Vector2(size.x * 0.55, size.y * 0.35), size.y * 0.9, color)
		draw_circle(origin + Vector2(size.x * 0.8, size.y * 0.55), size.y * 0.6, color)
		draw_rect(Rect2(origin + Vector2(size.x * 0.25, size.y * 0.5), Vector2(size.x * 0.6, size.y * 0.5)), color, true)


func _draw_ground() -> void:
	var rect := Rect2(0.0, Consts.GROUND_Y, game_width, Consts.GROUND_HEIGHT)
	var colors := _ground_colors()
	var steps := 12
	var band := Consts.GROUND_HEIGHT / float(steps)
	for i in steps:
		var t := float(i) / float(steps - 1)
		draw_rect(
			Rect2(0.0, Consts.GROUND_Y + band * i, game_width, band + 1.0),
			colors[0].lerp(colors[1], t),
			true
		)

	if season == "autumn":
		for detail in _ground_details:
			var pos := Vector2(
				detail["position"].x * game_width,
				Consts.GROUND_Y + detail["position"].y * Consts.GROUND_HEIGHT
			)
			draw_set_transform(pos, detail["rotation"], Vector2.ONE)
			draw_rect(
				Rect2(-Vector2(detail["size"], detail["size"] * 0.5) * 0.5,
					Vector2(detail["size"], detail["size"] * 0.5)),
				detail["color"],
				true
			)
		draw_set_transform(Vector2.ZERO, 0.0, Vector2.ONE)

	if season == "winter":
		draw_rect(rect, Color(1, 1, 1, 0.9), true)
		draw_rect(Rect2(0.0, Consts.GROUND_Y, game_width, 15.0), Color(0.59, 0.59, 0.78, 0.2), true)

	if current_event == "blizzard":
		# Snow slowly piles up over the course of the month.
		var height := clampf(time_in_month / Consts.MONTH_DURATION, 0.0, 1.0) * 40.0
		if height > 1.0:
			draw_rect(Rect2(0.0, Consts.GROUND_Y - height, game_width, height), Color.WHITE, true)

	if current_event == "storm":
		draw_rect(rect, Color(0.28, 0.33, 0.41, 0.4), true)


func _ground_colors() -> Array[Color]:
	var from := Color8(34, 197, 94)
	var to := Color8(22, 101, 52)
	if season == "summer" or current_event == "meteorShower":
		from = Color8(42, 116, 37)
		to = Color8(68, 161, 45)
	elif season == "autumn":
		from = Color8(249, 115, 22)
		to = Color8(180, 83, 9)
	if current_event == "thunderstorm":
		from = from.darkened(0.4)
		to = to.darkened(0.4)
	return [from, to]
