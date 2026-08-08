extends Control
## Skill picker shown between months.

signal skill_chosen(skill: Dictionary)

@onready var _cards: HBoxContainer = %Cards


func present(month_counter: int, choices: Array) -> void:
	%Title.text = "Month %d survived!" % month_counter
	Ui.clear_children(_cards)
	for skill in choices:
		_cards.add_child(_build_card(skill))


func _build_card(skill: Dictionary) -> Control:
	var panel := PanelContainer.new()
	panel.custom_minimum_size = Vector2(230, 220)

	var column := VBoxContainer.new()
	column.add_theme_constant_override("separation", 10)
	panel.add_child(column)

	var icon := Label.new()
	icon.text = skill["icon"]
	icon.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	icon.add_theme_font_size_override("font_size", 40)
	column.add_child(icon)

	var title := Label.new()
	title.text = skill["title"]
	title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	title.add_theme_font_size_override("font_size", 22)
	title.add_theme_color_override("font_color", skill["color"])
	column.add_child(title)

	var description := Label.new()
	description.text = skill["description"]
	description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	description.custom_minimum_size = Vector2(200, 80)
	description.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	description.add_theme_font_size_override("font_size", 14)
	column.add_child(description)

	var button := Button.new()
	button.text = "Take it"
	button.pressed.connect(func():
		Sfx.play_ui_select()
		skill_chosen.emit(skill))
	column.add_child(button)
	return panel
