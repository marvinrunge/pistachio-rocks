extends Control
## Title screen. Emits [signal action] with the id of the pressed button.

signal action(id: String)

@onready var _mute_button: Button = %MuteButton


func _ready() -> void:
	for button in %Buttons.get_children():
		if button is Button:
			button.pressed.connect(_on_button_pressed.bind(button.name))
	_mute_button.pressed.connect(_on_mute_pressed)
	_refresh_mute()


func refresh(character_id: String) -> void:
	%CharacterButton.text = "Nut: %s" % Characters.get_by_id(character_id)["name"]
	%VersionLabel.text = "v%s" % Consts.GAME_VERSION
	_refresh_mute()


func _on_button_pressed(id: StringName) -> void:
	Sfx.play_ui_select()
	action.emit(String(id))


func _on_mute_pressed() -> void:
	Sfx.toggle_muted()
	Sfx.play_ui_select()
	_refresh_mute()


func _refresh_mute() -> void:
	_mute_button.text = "🔇 Sound off" if Sfx.is_muted() else "🔊 Sound on"
