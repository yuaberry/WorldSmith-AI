/**
 * mv_music.gd — Music Director autoload for metroidvania projects (§11.7).
 *
 * Plays the soundtrack forged by musicForge (audio/music_{explore,combat,boss}.wav)
 * and crossfades between states by SCANNING hostiles — zero edits to the FSMs:
 *   · any boss alive                     → boss   (dramatic)
 *   · any hostile in CHASE/TELEGRAPH/ATTACK/STAGGER → combat
 *   · otherwise                          → explore
 *
 * Loops are seamless via AudioStreamWAV.loop_mode set at runtime (no .import
 * surgery). Volume: explore −11 dB (ambient), combat −8, boss −7 (in your face).
 */
export function mvMusicScript(): string {
  return `extends Node
## Music Director — state-driven crossfading soundtrack (WorldSmith AI).

const COMBAT_STATES: Array[int] = [2, 3, 4, 5]  # CHASE, TELEGRAPH, ATTACK, STAGGER
const BASE_DB := {"explore": -11.0, "combat": -8.0, "boss": -7.0}

var players := {}
var current := ""
var scan_t := 0.0

func _ready() -> void:
	for k in ["explore", "combat", "boss"]:
		var path := "res://audio/music_%s.wav" % k
		if not ResourceLoader.exists(path):
			continue
		var p := AudioStreamPlayer.new()
		var s: AudioStream = load(path)
		if s is AudioStreamWAV:
			var w := s as AudioStreamWAV
			w.loop_mode = AudioStreamWAV.LOOP_FORWARD
			w.loop_begin = 0
			w.loop_end = w.data.size() / 2  # PCM16 mono → frames
		p.stream = s
		p.bus = "Master"
		p.volume_db = -40.0
		add_child(p)
		players[k] = p
	set_state("explore")

func _process(delta: float) -> void:
	scan_t -= delta
	if scan_t > 0.0:
		return
	scan_t = 0.4
	set_state(_scan_state())

func _scan_state() -> String:
	for b in get_tree().get_nodes_in_group("boss"):
		if b is Node:
			var bhp = b.get("hp")
			if bhp != null and int(bhp) > 0:
				return "boss"
	for e in get_tree().get_nodes_in_group("hostile"):
		if e is Node:
			var st = e.get("state")
			if st != null and int(st) in COMBAT_STATES:
				return "combat"
	return "explore"

func set_state(state: String) -> void:
	if state == current or not players.has(state):
		return
	var fade_out: AudioStreamPlayer = players.get(current, null)
	var fade_in: AudioStreamPlayer = players[state]
	current = state
	if fade_out != null:
		var tw := create_tween()
		tw.tween_property(fade_out, "volume_db", -40.0, 0.9)
		tw.tween_callback(fade_out.stop)
	fade_in.volume_db = -40.0
	fade_in.play()
	var tw2 := create_tween()
	tw2.tween_property(fade_in, "volume_db", float(BASE_DB.get(state, -8.0)), 0.9)
`;
}
