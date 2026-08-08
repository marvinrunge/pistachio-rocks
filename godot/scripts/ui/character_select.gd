extends Control
## Lets the player pick which nut to play, and remembers the choice.

signal character_chosen(id: String)
signal back_pressed

@onready var _list: HBoxContainer = %CardList


func _ready() -> void:
	%BackButton.pressed.connect(func():
		Sfx.play_ui_select()
		back_pressed.emit())
	_build_cards()


func _build_cards() -> void:
	Ui.clear_children(_list)
	for character in Characters.LIST:
		_list.add_child(_build_card(character))


func _build_card(character: Dictionary) -> Control:
	var card := VBoxContainer.new()
	card.custom_minimum_size = Vector2(210, 0)
	card.add_theme_constant_override("separation", 8)

	var portrait := TextureRect.new()
	portrait.texture = load("res://assets/%s-seed.svg" % character["id"])
	portrait.custom_minimum_size = Vector2(0, 120)
	portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
	portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
	card.add_child(portrait)

	var name_label := Label.new()
	name_label.text = character["name"]
	name_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	name_label.add_theme_font_size_override("font_size", 24)
	card.add_child(name_label)

	var description := Label.new()
	description.text = character["description"]
	description.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	description.custom_minimum_size = Vector2(190, 56)
	description.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	description.add_theme_font_size_override("font_size", 14)
	card.add_child(description)

	var stats := Label.new()
	stats.text = _describe_stats(character)
	stats.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	stats.add_theme_font_size_override("font_size", 14)
	stats.add_theme_color_override("font_color", Color8(148, 197, 255))
	card.add_child(stats)

	var button := Button.new()
	button.text = "Choose"
	button.pressed.connect(func():
		Sfx.play_ui_select()
		character_chosen.emit(character["id"]))
	card.add_child(button)
	return card


func _describe_stats(character: Dictionary) -> String:
	var lines := PackedStringArray()
	var health := Characters.stat(character, "max_health")
	var speed := Characters.stat(character, "max_speed")
	if not is_zero_approx(health):
		lines.append("%+d max HP" % int(health))
	if not is_zero_approx(speed):
		lines.append("%+d speed" % int(speed))
	if lines.is_empty():
		lines.append("Balanced")
	return "\n".join(lines)
