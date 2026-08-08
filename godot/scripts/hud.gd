extends CanvasLayer
## In-game heads-up display.

const TOAST_LIFESPAN := 3.0

@onready var _health_bar: ProgressBar = %HealthBar
@onready var _health_label: Label = %HealthLabel
@onready var _lives_label: Label = %LivesLabel
@onready var _date_label: Label = %DateLabel
@onready var _month_bar: ProgressBar = %MonthBar
@onready var _event_label: Label = %EventLabel
@onready var _score_label: Label = %ScoreLabel
@onready var _rocks_label: Label = %RocksLabel
@onready var _warning_label: Label = %WarningLabel
@onready var _achievement_label: Label = %AchievementLabel
@onready var _toasts: VBoxContainer = %Toasts


## Clears leftover toasts from the previous run.
func reset() -> void:
	Ui.clear_children(_toasts)


func refresh(game: Node) -> void:
	_health_bar.max_value = maxf(1.0, game.max_health)
	_health_bar.value = game.player.health
	_health_label.text = "%d / %d HP" % [ceili(game.player.health), int(game.max_health)]

	var extras := []
	if game.extra_lives > 0:
		extras.append("🔥 x%d" % game.extra_lives)
	if game.block_chance > 0.0:
		extras.append("🪨 %d%%" % int(round(game.block_chance * 100.0)))
	if game.player.seismic_slam_ready:
		extras.append("💥 SLAM")
	if game.player.has_reinforced_shell:
		extras.append("🛡️ EXTRA SHELL")
	_lives_label.text = "  ".join(extras)
	_lives_label.visible = not extras.is_empty()

	var year: int = Consts.year_for_month(game.month_counter)
	var month_in_year: int = ((game.month_counter - 1) % 12) + 1
	_date_label.text = "Year %d · Month %d · %s" % [year, month_in_year, game.season.capitalize()]
	_month_bar.value = game.time_in_month / Consts.MONTH_DURATION * 100.0

	var event_name: String = game.event_display_name()
	_event_label.text = event_name.to_upper()
	_event_label.visible = event_name != ""

	_score_label.text = "%d" % int(game.score)
	_rocks_label.text = "Rocks smashed: %d" % game.rocks_destroyed

	_warning_label.text = game.incoming_event
	_warning_label.visible = game.incoming_event != ""

	var lines := PackedStringArray()
	for entry in game.achievements.all():
		lines.append(
			"%s %s  %d/%d (Lv %d)"
			% [entry["icon"], entry["title"], entry["progress"], entry["target"], entry["level"]]
		)
	_achievement_label.text = "\n".join(lines)


func show_achievement(entry: Dictionary) -> void:
	var label := Label.new()
	label.text = "%s %s unlocked! (Lv %d)" % [entry["icon"], entry["title"], entry["level"]]
	label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	label.add_theme_font_size_override("font_size", 22)
	label.add_theme_color_override("font_color", Color8(250, 204, 21))
	label.add_theme_color_override("font_outline_color", Color.BLACK)
	label.add_theme_constant_override("outline_size", 6)
	_toasts.add_child(label)
	var timer := get_tree().create_timer(TOAST_LIFESPAN)
	timer.timeout.connect(func():
		if is_instance_valid(label):
			label.queue_free())
