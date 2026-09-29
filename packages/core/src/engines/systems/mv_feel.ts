/**
 * mv_feel.gd — Feel Director autoload (§7 game juice): hitstop, camera shake,
 * impact sparks and landing dust. Intensities are DATA-DRIVEN (data/feel.json)
 * so the Change Engine can retune the game feel without touching code.
 *
 * Uses existing forged assets only: glow.png as the spark/dust particle texture.
 * The camera is found via the "camera" group (set by camera_rig).
 */
export function mvFeelScript(): string {
  return `extends Node
## Feel Director (WorldSmith AI §7) — hitstop + shake + sparks + dust.

var cfg := {}
var hitstop_until := 0   # wall-clock (msec) — immune to Engine.time_scale

func _ready() -> void:
	# ALWAYS: hitstop must release on wall-clock even if the tree pauses mid-
	# freeze (QA-caught: a paused tree stops _process and the freeze stuck).
	process_mode = Node.PROCESS_MODE_ALWAYS
	var f := FileAccess.get_file_as_string("res://data/feel.json")
	var parsed = JSON.parse_string(f) if f != "" else null
	cfg = parsed if parsed is Dictionary else {}

func _process(_delta: float) -> void:
	# NOTE: during a hitstop, _delta arrives SCALED TO ZERO (that is the whole
	# point of time_scale=0) — so release on WALL-CLOCK, never on delta. The
	# functional QA harness caught the delta version freezing the game forever
	# on the first combat hit (measured: v0.12 QA run, probes froze at #8).
	if Engine.time_scale == 0.0 and Time.get_ticks_msec() >= hitstop_until:
		Engine.time_scale = 1.0

func _exit_tree() -> void:
	Engine.time_scale = 1.0  # never leave the game frozen

func _num(key: String, fallback: float) -> float:
	return float(cfg.get(key, fallback))

## Freeze frames on impact (the pro "hitstop" — makes hits read as WEIGHT).
## Released on wall-clock by _process (delta is 0 while frozen — QA-caught bug).
func hitstop(duration := -1.0) -> void:
	var d := _num("hitstop", 0.055) if duration < 0.0 else duration
	if d <= 0.0:
		return
	Engine.time_scale = 0.0
	hitstop_until = Time.get_ticks_msec() + int(d * 1000.0)

func shake(amount: float) -> void:
	var c := get_tree().get_first_node_in_group("camera")
	if c is Camera2D:
		(c as Camera2D).shake(amount)

## One-shot spark burst at a world position (impact feedback).
func sparks(pos: Vector2, count := 10, warm := true) -> void:
	var p := CPUParticles2D.new()
	var tex: Texture2D = GameState.tex("res://assets/sprites/glow.png")
	if tex:
		p.texture = tex
	p.position = pos
	p.amount = count
	p.lifetime = 0.38
	p.one_shot = true
	p.explosiveness = 1.0
	p.direction = Vector2(0, -1)
	p.spread = 180.0
	p.initial_velocity_min = 60.0
	p.initial_velocity_max = 190.0
	p.gravity = Vector2(0, 420)
	p.scale_amount_min = 0.05
	p.scale_amount_max = 0.14
	p.color = Color(1.0, 0.78, 0.36) if warm else Color(0.55, 0.85, 1.0)
	p.emitting = true
	get_tree().current_scene.add_child(p)
	p.finished.connect(p.queue_free)

## Landing dust puff (soft, cool, low-energy — weight without noise).
func dust(pos: Vector2) -> void:
	if _num("dust_on_land", 1.0) < 0.5:
		return
	var p := CPUParticles2D.new()
	var tex: Texture2D = GameState.tex("res://assets/sprites/glow.png")
	if tex:
		p.texture = tex
	p.position = pos
	p.amount = 6
	p.lifetime = 0.45
	p.one_shot = true
	p.explosiveness = 0.9
	p.direction = Vector2(0, -1)
	p.spread = 120.0
	p.initial_velocity_min = 18.0
	p.initial_velocity_max = 55.0
	p.gravity = Vector2(0, 60)
	p.scale_amount_min = 0.08
	p.scale_amount_max = 0.18
	p.color = Color(0.75, 0.78, 0.9, 0.55)
	p.emitting = true
	get_tree().current_scene.add_child(p)
	p.finished.connect(p.queue_free)

## Full impact combo: hitstop + shake + sparks (used by combat hooks).
func impact(pos: Vector2, shake_amt: float, warm := true) -> void:
	hitstop()
	shake(shake_amt)
	sparks(pos, int(_num("sparks_on_hit", 10.0)), warm)
`;
}
