extends Node
## Root state machine: owns the game world, the HUD and every UI screen.

enum Screen { START, CHARACTER_SELECT, INFO, PLAYING, LEVEL_UP, NAME_ENTRY, HIGH_SCORES }

const INSTRUCTIONS_TEXT := """Move with A / D or the arrow keys, and jump with Space, W or the up arrow.

Falling rocks crack your shell. Lose the shell and the next hit is fatal, so smash rocks while shelled to build your score.

Water drops heal you, snow slows you down and meteors leave burning ground behind.

Survive a full month to pick a new skill. Every third month brings a weather event: storms push you around, thunderstorms strike with lightning, earthquakes shake rocks loose and blizzards bury the ground in snow."""

const ABOUT_TEXT := """Pistachio — a Godot 4 rework of the browser game in this repository.

The web build (React + Canvas) lives in the repository root; this folder is a stand-alone Godot project that reimplements the same gameplay, characters, skills, weather events and achievements in GDScript.

Scores in this build are stored locally on your device instead of an online leaderboard."""

@onready var _game: Node2D = $Game
@onready var _hud: CanvasLayer = $Hud
@onready var _start_screen: Control = %StartScreen
@onready var _character_select: Control = %CharacterSelect
@onready var _info_screen: Control = %InfoScreen
@onready var _level_up_screen: Control = %LevelUpScreen
@onready var _name_entry_screen: Control = %NameEntryScreen
@onready var _high_scores_screen: Control = %HighScoresScreen

var _screen := Screen.START
var _last_rank := 0
var _last_stats: Dictionary = {}


func _ready() -> void:
	_game.hud_changed.connect(_on_hud_changed)
	_game.level_up.connect(_on_level_up)
	_game.run_over.connect(_on_run_over)
	_game.achievement_completed.connect(_hud.show_achievement)

	_start_screen.action.connect(_on_start_action)
	_character_select.character_chosen.connect(_on_character_chosen)
	_character_select.back_pressed.connect(_show_start)
	_info_screen.back_pressed.connect(_show_start)
	_level_up_screen.skill_chosen.connect(_on_skill_chosen)
	_name_entry_screen.name_submitted.connect(_on_name_submitted)
	_high_scores_screen.back_pressed.connect(_show_start)

	_show_start()


func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("toggle_mute"):
		Sfx.toggle_muted()
		_start_screen.refresh(SaveData.get_selected_character())
		get_viewport().set_input_as_handled()
	elif event.is_action_pressed("ui_cancel") and _screen == Screen.PLAYING:
		_game.stop()
		_show_start()
		get_viewport().set_input_as_handled()


func _set_screen(screen: Screen) -> void:
	_screen = screen
	_start_screen.visible = screen == Screen.START
	_character_select.visible = screen == Screen.CHARACTER_SELECT
	_info_screen.visible = screen == Screen.INFO
	_level_up_screen.visible = screen == Screen.LEVEL_UP
	_name_entry_screen.visible = screen == Screen.NAME_ENTRY
	_high_scores_screen.visible = screen == Screen.HIGH_SCORES
	var in_world := screen == Screen.PLAYING or screen == Screen.LEVEL_UP
	_hud.visible = in_world
	_game.set_world_visible(in_world)


func _show_start() -> void:
	_game.stop()
	_game.reset_background()
	_start_screen.refresh(SaveData.get_selected_character())
	_set_screen(Screen.START)


func _on_start_action(id: String) -> void:
	match id:
		"PlayButton":
			_start_run()
		"CharacterButton":
			_set_screen(Screen.CHARACTER_SELECT)
		"ScoresButton":
			_last_rank = 0
			_high_scores_screen.present()
			_set_screen(Screen.HIGH_SCORES)
		"InstructionsButton":
			_info_screen.show_content("How To Play", INSTRUCTIONS_TEXT)
			_set_screen(Screen.INFO)
		"AboutButton":
			_info_screen.show_content("About", ABOUT_TEXT)
			_set_screen(Screen.INFO)


func _start_run() -> void:
	_game.start_run(SaveData.get_selected_character())
	_hud.reset()
	_set_screen(Screen.PLAYING)


func _on_character_chosen(id: String) -> void:
	SaveData.set_selected_character(id)
	_show_start()


func _on_hud_changed() -> void:
	_hud.refresh(_game)


func _on_level_up(choices: Array) -> void:
	Sfx.play_level_up()
	_level_up_screen.present(_game.month_counter, choices)
	_set_screen(Screen.LEVEL_UP)


func _on_skill_chosen(skill: Dictionary) -> void:
	_game.apply_skill(skill)
	_set_screen(Screen.PLAYING)


func _on_run_over(stats: Dictionary) -> void:
	Sfx.play_game_over()
	_last_stats = stats
	_name_entry_screen.present(stats)
	_set_screen(Screen.NAME_ENTRY)


func _on_name_submitted(player_name: String) -> void:
	SaveData.set_player_name(player_name)
	var entry := _last_stats.duplicate(true)
	entry["name"] = player_name
	entry["date"] = Time.get_datetime_string_from_system(true)
	_last_rank = SaveData.add_high_score(entry)
	_high_scores_screen.present(_last_rank)
	_set_screen(Screen.HIGH_SCORES)
