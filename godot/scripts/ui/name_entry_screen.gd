extends Control
## Run summary plus the name prompt for the local score table.

signal name_submitted(name: String)

@onready var _name_edit: LineEdit = %NameEdit


func present(stats: Dictionary) -> void:
	%Summary.text = (
		"Score %d\nSurvived %d year(s) and %d month(s)\n%d rocks smashed\n%d skills collected"
		% [
			stats["score"],
			stats["year"],
			stats["month"],
			stats["rocks_destroyed"],
			stats["acquired_skills"].size(),
		]
	)
	_name_edit.text = SaveData.get_player_name()
	_name_edit.grab_focus()


func _ready() -> void:
	%SubmitButton.pressed.connect(_submit)
	_name_edit.text_submitted.connect(func(_text): _submit())


func _submit() -> void:
	var player_name := _name_edit.text.strip_edges()
	if player_name.is_empty():
		player_name = "Anonymous Nut"
	Sfx.play_ui_select()
	name_submitted.emit(player_name.substr(0, 20))
