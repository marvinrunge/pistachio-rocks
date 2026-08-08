extends Control
## Reusable text screen used for "How To Play" and "About".

signal back_pressed


func _ready() -> void:
	%BackButton.pressed.connect(func():
		Sfx.play_ui_select()
		back_pressed.emit())


func show_content(title: String, body: String) -> void:
	%Title.text = title
	%Body.text = body
