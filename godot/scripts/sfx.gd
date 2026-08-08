extends Node
## Procedural sound effects.
##
## The web version synthesises every sound with the Web Audio API. This autoload
## does the same thing in Godot: short PCM buffers are generated on demand,
## cached as [AudioStreamWAV] resources and played through a small voice pool.

const MIX_RATE := 22050
const VOICE_COUNT := 12
const MASTER_VOLUME := 0.35

enum Wave { SINE, SQUARE, SAW, TRIANGLE, NOISE }

var _voices: Array[AudioStreamPlayer] = []
var _next_voice := 0
var _cache: Dictionary = {}
var _muted := false


func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	for i in VOICE_COUNT:
		var player := AudioStreamPlayer.new()
		player.bus = "Master"
		add_child(player)
		_voices.append(player)
	_muted = SaveData.get_muted()


func is_muted() -> bool:
	return _muted


func set_muted(value: bool) -> void:
	_muted = value
	SaveData.set_muted(value)
	if _muted:
		for voice in _voices:
			voice.stop()


func toggle_muted() -> bool:
	set_muted(not _muted)
	return _muted


# --- Game sounds -------------------------------------------------------------


func play_jump() -> void:
	_play("jump", [_layer(Wave.SINE, 220.0, 520.0, 0.18, 0.6)])


func play_impact(size: float, volume: float = 1.0) -> void:
	## Bigger rocks thud lower than small pebbles.
	var pitch: float = clampf(remap(size, Consts.MIN_ELEMENT_SIZE, Consts.MAX_ELEMENT_SIZE, 1.4, 0.7), 0.5, 2.0)
	_play_with_pitch("impact", [
		_layer(Wave.NOISE, 0.0, 0.0, 0.12, 0.5),
		_layer(Wave.TRIANGLE, 180.0, 60.0, 0.16, 0.5),
	], pitch, volume)


func play_meteor_impact() -> void:
	_play("meteor", [
		_layer(Wave.NOISE, 0.0, 0.0, 0.45, 0.6),
		_layer(Wave.SAW, 160.0, 40.0, 0.5, 0.5),
	])


func play_damage() -> void:
	_play("damage", [_layer(Wave.SQUARE, 320.0, 120.0, 0.16, 0.4)])


func play_block() -> void:
	_play("block", [
		_layer(Wave.SQUARE, 640.0, 640.0, 0.05, 0.3),
		_layer(Wave.TRIANGLE, 880.0, 660.0, 0.14, 0.35),
	])


func play_water_collect() -> void:
	_play("water", [_layer(Wave.SINE, 660.0, 1180.0, 0.18, 0.4)])


func play_shell_crack() -> void:
	_play("crack", [
		_layer(Wave.NOISE, 0.0, 0.0, 0.28, 0.6),
		_layer(Wave.SAW, 420.0, 90.0, 0.3, 0.4),
	])


func play_game_over() -> void:
	_play("game_over", [
		_layer(Wave.TRIANGLE, 440.0, 110.0, 0.9, 0.5),
		_layer(Wave.SINE, 220.0, 55.0, 0.9, 0.4),
	])


func play_resurrect() -> void:
	_play("resurrect", [
		_layer(Wave.SINE, 260.0, 900.0, 0.6, 0.45),
		_layer(Wave.TRIANGLE, 520.0, 1400.0, 0.6, 0.25),
	])


func play_golden_touch() -> void:
	_play("golden", [
		_layer(Wave.SINE, 880.0, 1320.0, 0.16, 0.35),
		_layer(Wave.SINE, 1320.0, 1760.0, 0.26, 0.3),
	])


func play_achievement() -> void:
	_play("achievement", [
		_layer(Wave.SINE, 523.0, 523.0, 0.12, 0.35),
		_layer(Wave.SINE, 659.0, 659.0, 0.24, 0.3),
		_layer(Wave.SINE, 784.0, 784.0, 0.42, 0.3),
	])


func play_photosynthesis() -> void:
	_play("photosynthesis", [_layer(Wave.SINE, 520.0, 780.0, 0.25, 0.25)])


func play_seismic_slam() -> void:
	_play("slam", [
		_layer(Wave.NOISE, 0.0, 0.0, 0.6, 0.7),
		_layer(Wave.SINE, 90.0, 30.0, 0.7, 0.7),
	])


func play_thunder() -> void:
	_play("thunder", [
		_layer(Wave.NOISE, 0.0, 0.0, 1.1, 0.5),
		_layer(Wave.SINE, 70.0, 35.0, 1.1, 0.4),
	])


func play_lightning_strike() -> void:
	_play("lightning", [
		_layer(Wave.NOISE, 0.0, 0.0, 0.5, 0.8),
		_layer(Wave.SQUARE, 1400.0, 120.0, 0.28, 0.35),
	])


func play_storm() -> void:
	_play("storm", [_layer(Wave.NOISE, 0.0, 0.0, 1.4, 0.35)])


func play_earthquake() -> void:
	_play("earthquake", [
		_layer(Wave.SINE, 60.0, 28.0, 1.6, 0.7),
		_layer(Wave.NOISE, 0.0, 0.0, 1.6, 0.25),
	])


func play_blizzard() -> void:
	_play("blizzard", [_layer(Wave.NOISE, 0.0, 0.0, 1.6, 0.3)])


func play_level_up() -> void:
	_play("level_up", [
		_layer(Wave.TRIANGLE, 440.0, 660.0, 0.14, 0.3),
		_layer(Wave.TRIANGLE, 660.0, 880.0, 0.3, 0.28),
	])


func play_ui_select() -> void:
	_play("ui_select", [_layer(Wave.TRIANGLE, 520.0, 780.0, 0.1, 0.25)])


# --- Synthesis ---------------------------------------------------------------


func _layer(
	wave: Wave, freq_start: float, freq_end: float, duration: float, volume: float
) -> Dictionary:
	return {
		"wave": wave,
		"freq_start": freq_start,
		"freq_end": freq_end,
		"duration": duration,
		"volume": volume,
	}


func _play(key: String, layers: Array) -> void:
	_play_with_pitch(key, layers, 1.0, 1.0)


func _play_with_pitch(key: String, layers: Array, pitch: float, volume: float) -> void:
	if _muted or _voices.is_empty():
		return
	var stream: AudioStreamWAV = _cache.get(key)
	if stream == null:
		stream = _render(layers)
		_cache[key] = stream
	var voice := _voices[_next_voice]
	_next_voice = (_next_voice + 1) % _voices.size()
	voice.stream = stream
	voice.pitch_scale = clampf(pitch, 0.1, 4.0)
	voice.volume_db = linear_to_db(clampf(volume, 0.0, 1.0) * MASTER_VOLUME)
	voice.play()


## Mixes every layer into a single 16 bit mono buffer with an exponential decay.
func _render(layers: Array) -> AudioStreamWAV:
	var longest := 0.0
	for layer in layers:
		longest = maxf(longest, float(layer["duration"]))
	var frames := int(longest * MIX_RATE)
	var samples := PackedFloat32Array()
	samples.resize(frames)

	for layer in layers:
		var duration := float(layer["duration"])
		var layer_frames: int = min(frames, int(duration * MIX_RATE))
		var phase := 0.0
		for i in layer_frames:
			var t := float(i) / float(MIX_RATE)
			var progress := t / maxf(duration, 0.0001)
			var frequency: float = lerpf(
				float(layer["freq_start"]), float(layer["freq_end"]), progress
			)
			phase += TAU * frequency / float(MIX_RATE)
			var envelope: float = pow(1.0 - progress, 2.0)
			samples[i] += (
				_wave_sample(layer["wave"], phase) * float(layer["volume"]) * envelope
			)

	var data := PackedByteArray()
	data.resize(frames * 2)
	for i in frames:
		var value := int(clampf(samples[i], -1.0, 1.0) * 32767.0)
		data.encode_s16(i * 2, value)

	var stream := AudioStreamWAV.new()
	stream.format = AudioStreamWAV.FORMAT_16_BITS
	stream.mix_rate = MIX_RATE
	stream.stereo = false
	stream.data = data
	return stream


func _wave_sample(wave: Wave, phase: float) -> float:
	match wave:
		Wave.SINE:
			return sin(phase)
		Wave.SQUARE:
			return 1.0 if sin(phase) >= 0.0 else -1.0
		Wave.SAW:
			return fmod(phase, TAU) / PI - 1.0
		Wave.TRIANGLE:
			return asin(sin(phase)) * 2.0 / PI
		Wave.NOISE:
			return randf() * 2.0 - 1.0
	return 0.0
