extends Control
## Local score table for the current game version.

signal back_pressed

@onready var _rows: VBoxContainer = %Rows


func _ready() -> void:
	%BackButton.pressed.connect(func():
		Sfx.play_ui_select()
		back_pressed.emit())


func present(highlight_rank: int = 0) -> void:
	Ui.clear_children(_rows)
	var scores := SaveData.get_high_scores()
	if scores.is_empty():
		var empty := Label.new()
		empty.text = "No runs yet. Go crack some rocks!"
		empty.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
		_rows.add_child(empty)
		return
	for i in scores.size():
		_rows.add_child(_build_row(i + 1, scores[i], i + 1 == highlight_rank))


func _build_row(rank: int, entry: Dictionary, highlight: bool) -> Control:
	var row := HBoxContainer.new()
	row.add_theme_constant_override("separation", 12)

	var color := Color8(250, 204, 21) if highlight else Color.WHITE
	row.add_child(_cell("%d." % rank, 40, color, HORIZONTAL_ALIGNMENT_RIGHT))
	row.add_child(_cell(str(entry.get("name", "Anonymous Nut")), 220, color))
	row.add_child(_cell(_character_name(entry), 110, color))
	row.add_child(_cell(
		"Y%d M%d" % [int(entry.get("year", 0)), int(entry.get("month", 0))], 100, color
	))
	row.add_child(_cell(str(int(entry.get("score", 0))), 90, color, HORIZONTAL_ALIGNMENT_RIGHT))
	return row


func _cell(
	text: String,
	width: float,
	color: Color,
	alignment := HORIZONTAL_ALIGNMENT_LEFT
) -> Label:
	var label := Label.new()
	label.text = text
	label.custom_minimum_size = Vector2(width, 0)
	label.horizontal_alignment = alignment
	label.add_theme_font_size_override("font_size", 18)
	label.add_theme_color_override("font_color", color)
	return label


func _character_name(entry: Dictionary) -> String:
	var character := Characters.get_by_id(str(entry.get("character_id", Characters.DEFAULT_ID)))
	return str(character["name"])
