/**
 * Metroidvania system library — PLAYER.
 * Real state machine (§4): idle/run/jump/fall/dash/attack/parry/hurt/dead,
 * coyote time, jump buffering, i-frames, knockback, parry window with
 * counter, ability-gated dash, data-driven stats (data/player.json).
 */
import type { GameSpec } from "../types";

export function mvPlayerScript(spec: GameSpec): string {
  return `extends CharacterBody2D
# Player — state machine + parry + i-frames + ability-gated dash.
# Stats are data-driven: data/player.json (Change Engine edits data, not code).

var stats := {}
enum State { IDLE, RUN, JUMP, FALL, DASH, ATTACK, PARRY, HURT, DEAD }
var state: int = State.IDLE
var visual: CanvasItem = null
var camera_rig: Camera2D = null
var facing := 1.0
var coyote := 0.0
var _prev_air := false   # §7 landing-dust tracking
var _prev_vy := 0.0
var jump_buffer := 0.0
var iframes := 0.0
var parry_window := 0.0
var parry_cd := 0.0
var attack_timer := 0.0
var attack_hit := false
var dash_cd := 0.0
var dead := false

func _ready() -> void:
	add_to_group("player")
	var cfg := FileAccess.get_file_as_string("res://data/player.json")
	if cfg != "":
		stats = JSON.parse_string(cfg)
	if stats.is_empty():
		stats = {"speed": 260.0, "jump": -420.0, "gravity": 1150.0, "parry_window": 0.22, "parry_cd": 0.9, "attack_cd": 0.38, "attack_damage": 12, "attack_range": 34.0, "iframes": 0.8, "dash_speed": 520.0, "dash_cd": 0.8}
	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = Vector2(20, 34)
	shape.shape = rect
	add_child(shape)
	visual = _build_visual("player", Color("#7fa0ff"), Vector2(20, 34))
	add_child(visual)
	if visual is AnimatedSprite2D:
		var av: AnimatedSprite2D = visual as AnimatedSprite2D
		av.animation_finished.connect(_on_anim_finished)
		av.frame_changed.connect(_on_frame_changed)
	camera_rig = Camera2D.new()
	camera_rig.position_smoothing_enabled = true
	camera_rig.position_smoothing_speed = 5.0
	add_child(camera_rig)
	camera_rig.make_current()

func s(key: String, fallback: float) -> float:
	return float(stats.get(key, fallback))

func _build_visual(base: String, fallback_color: Color, fallback_size: Vector2) -> CanvasItem:
	var pack: SpriteFrames = GameState.sprite_frames_for(base)
	if pack != null and pack.get_animation_names().size() > 0:
		var ap := AnimatedSprite2D.new()
		ap.sprite_frames = pack
		ap.scale = Vector2(1.5, 1.5)
		if pack.has_animation("IDLE"):
			ap.play("IDLE")
		return ap
	var frames: Array[Texture2D] = GameState.anim_frames("res://assets/sprites/" + base)
	if frames.size() > 1:
		var sf := SpriteFrames.new()
		sf.add_animation("idle")
		sf.set_animation_speed("idle", 6.0)
		sf.set_animation_loop("idle", true)
		for f in frames:
			sf.add_frame("idle", f)
		var aspr := AnimatedSprite2D.new()
		aspr.sprite_frames = sf
		aspr.play("idle")
		aspr.scale = Vector2(2.2, 2.2)
		return aspr
	elif frames.size() == 1:
		var single := Sprite2D.new()
		single.texture = frames[0]
		single.scale = Vector2(1.5, 1.5)
		return single
	var cr := ColorRect.new()
	cr.size = fallback_size
	cr.color = fallback_color
	cr.position = fallback_size / -2.0
	return cr

func _physics_process(delta: float) -> void:
	coyote = max(coyote - delta, 0.0)
	jump_buffer = max(jump_buffer - delta, 0.0)
	iframes = max(iframes - delta, 0.0)
	parry_window = max(parry_window - delta, 0.0)
	parry_cd = max(parry_cd - delta, 0.0)
	dash_cd = max(dash_cd - delta, 0.0)
	if attack_timer > 0.0:
		attack_timer -= delta
		if attack_timer <= 0.0 and state == State.ATTACK:
			state = State.FALL if not is_on_floor() else State.IDLE
	if dead:
		GameState.play_on(visual, "DEATH")
		return
	_map_state_anim()
	var grav: float = s("gravity", 1150.0)
	if is_on_floor():
		coyote = 0.12
	if Input.is_action_just_pressed("jump"):
		jump_buffer = 0.12
	# parry (and dash while unlocked) have priority over movement attacks
	if Input.is_action_just_pressed("parry") and parry_cd <= 0.0:
		parry_window = s("parry_window", 0.22)
		parry_cd = s("parry_cd", 0.9)
		state = State.PARRY
		GameState.play_sfx("click")
		GameState.spawn_spark(global_position)
	if Input.is_action_just_pressed("dash") and dash_cd <= 0.0 and GameState.abilities.has("dash"):
		velocity.x = facing * s("dash_speed", 520.0)
		velocity.y = 0.0
		dash_cd = s("dash_cd", 0.8)
		iframes = max(iframes, 0.18)
		state = State.DASH
		GameState.play_sfx("click")
	if Input.is_action_just_pressed("attack") and attack_timer <= 0.0:
		attack_timer = s("attack_cd", 0.38)
		attack_hit = false
		state = State.ATTACK
		GameState.play_sfx("hit")
	if jump_buffer > 0.0 and coyote > 0.0 and state != State.DASH:
		velocity.y = s("jump", -420.0)
		coyote = 0.0
		jump_buffer = 0.0
	if state != State.DASH and state != State.ATTACK:
		var dir: float = Input.get_axis("move_left", "move_right")
		if abs(dir) > 0.01:
			facing = sign(dir)
			velocity.x = dir * s("speed", 260.0)
			if visual is Node2D:
				(visual as Node2D).scale = Vector2(1.5 * facing, 1.5)
		else:
			velocity.x = move_toward(velocity.x, 0.0, 1800.0 * delta)
		if not is_on_floor():
			velocity.y += grav * delta
			state = State.JUMP if velocity.y < 0.0 else State.FALL
		else:
			state = State.RUN if abs(velocity.x) > 10.0 else State.IDLE
	elif state == State.DASH:
		velocity.y = 0.0
		_afterimage()  # §7: cyan afterimage trail — the dash READS as supernatural
		if dash_cd < s("dash_cd", 0.8) - 0.16:
			state = State.FALL if not is_on_floor() else State.IDLE
	move_and_slide()
	# §7 landing feel: dust puff when a real fall ends (not every frame on ground)
	var just_landed := _prev_air and is_on_floor() and _prev_vy > 300.0
	if just_landed:
		Feel.dust(global_position + Vector2(0, 10.0))
		if visual is Node2D:  # squash & stretch — the classic landing read
			var vs := visual as Node2D
			vs.scale = Vector2(1.5 * facing * 1.18, 1.5 * 0.78)
			var tw := create_tween()
			tw.tween_property(vs, "scale", Vector2(1.5 * facing, 1.5), 0.14)
	_prev_air = not is_on_floor()
	_prev_vy = velocity.y
	if iframes > 0.0 and visual is CanvasItem:
		(visual as CanvasItem).modulate = Color(1, 1, 1, 0.45)
	elif visual is CanvasItem:
		(visual as CanvasItem).modulate = Color(1, 1, 1, 1)

## Attack hitbox probe — hits hostiles in range once per swing.
## §7 dash afterimage: a fading cyan ghost of the current frame — sells speed.
func _afterimage() -> void:
	if visual == null:
		return
	var tex: Texture2D = null
	if visual is AnimatedSprite2D:
		var av := visual as AnimatedSprite2D
		if av.sprite_frames and av.sprite_frames.has_animation(av.animation):
			tex = av.sprite_frames.get_frame_texture(av.animation, av.frame)
	elif visual is Sprite2D:
		tex = (visual as Sprite2D).texture
	if tex == null:
		return
	var ghost := Sprite2D.new()
	ghost.texture = tex
	ghost.global_position = global_position
	ghost.scale = (visual as Node2D).scale
	ghost.modulate = Color(0.4, 0.9, 1.0, 0.5)
	get_tree().current_scene.add_child(ghost)
	var tw := ghost.create_tween()
	tw.tween_property(ghost, "modulate:a", 0.0, 0.22)
	tw.tween_callback(ghost.queue_free)

func _try_hit() -> void:
	if attack_hit:
		return
	var reach: float = s("attack_range", 34.0)
	for h in get_tree().get_nodes_in_group("hostile"):
		if h is Node2D and is_instance_valid(h):
			var d: float = global_position.distance_to((h as Node2D).global_position)
			var to_h: Vector2 = (h as Node2D).global_position - global_position
			if d < reach and sign(to_h.x) == facing:
				if h.has_method("take_hit"):
					h.take_hit(int(s("attack_damage", 12.0)), global_position)
					Feel.impact((h as Node2D).global_position, 2.5)  # §7 juice: hitstop + warm sparks
					attack_hit = true
					return

func take_damage(amount: int, from: Vector2) -> void:
	if iframes > 0.0 or parry_window > 0.0 or dead:
		if parry_window > 0.0:
			_parry_success(from)
		return
	GameState.health = max(GameState.health - amount, 0)
	GameState.play_sfx("hit")
	GameState.spawn_spark(global_position)
	Feel.impact(global_position, 6.0, false)  # §7: hitstop + shake + cool sparks on player hurt
	var knock: Vector2 = (global_position - from).normalized() * 240.0
	velocity = knock
	velocity.y = -180.0
	iframes = s("iframes", 0.8)
	state = State.HURT
	if GameState.health <= 0:
		_die()

func _parry_success(_from: Vector2) -> void:
	parry_window = 0.0
	parry_cd = 0.35
	GameState.play_sfx("pickup")
	GameState.spawn_spark(global_position)
	GameState.emit_parry()
	# §7 studio juice: a perfect parry FREEZES the frame and rewards the read
	Feel.hitstop(0.12)
	Feel.shake(5.0)
	Feel.sparks(global_position, 14, false)

func _die() -> void:
	dead = true
	state = State.DEAD
	GameState.on_player_death()

func respawn(pos: Vector2) -> void:
	dead = false
	global_position = pos
	velocity = Vector2.ZERO
	GameState.health = GameState.max_health
	iframes = 1.2
	state = State.IDLE

## STATE TO ANIMATION MAPPING (5): clean transitions between named anims.
func _map_state_anim() -> void:
	match state:
		State.ATTACK: GameState.play_on(visual, "ATTACK")
		State.PARRY: GameState.play_on(visual, "PARRY")
		State.DASH: GameState.play_on(visual, "RUN")
		State.HURT: GameState.play_on(visual, "HURT")
		State.JUMP: GameState.play_on(visual, "JUMP")
		State.FALL: GameState.play_on(visual, "FALL")
		State.IDLE: GameState.play_on(visual, "IDLE")
		State.RUN: GameState.play_on(visual, "RUN")

## ANIMATION EVENTS (§4): hit lands on the ATTACK impact frame, not a timer.
func _on_frame_changed() -> void:
	if visual is AnimatedSprite2D:
		var av: AnimatedSprite2D = visual as AnimatedSprite2D
		if av.animation == "ATTACK" and av.frame == 1:
			attack_hit = false
			_try_hit()

func _on_anim_finished() -> void:
	if visual is AnimatedSprite2D:
		var av: AnimatedSprite2D = visual as AnimatedSprite2D
		if av.animation == "ATTACK" or av.animation == "PARRY" or av.animation == "HURT":
			if state == State.ATTACK:
				state = State.FALL if not is_on_floor() else State.IDLE
			elif state != State.DEAD:
				state = State.FALL if not is_on_floor() else State.IDLE
`;
}

/** Camera rig — smooth follow + room limits + shake + cinematic zoom (§8). */
export function mvCameraScript(): string {
  return `extends Camera2D
# Context-aware camera: follow, shake on impact, cinematic zoom for boss
# introductions. Limits are set by the room loader each transition.

var shake_amount := 0.0
var target_zoom := Vector2(1, 1)

func _ready() -> void:
	process_mode = Node.PROCESS_MODE_ALWAYS
	add_to_group("camera")  # §7: the Feel director finds the camera by group

func shake(amount: float) -> void:
	shake_amount = max(shake_amount, amount)

func cinematic_zoom(z: float) -> void:
	target_zoom = Vector2(z, z)

func _process(delta: float) -> void:
	if shake_amount > 0.01:
		offset = Vector2(randf_range(-shake_amount, shake_amount), randf_range(-shake_amount, shake_amount))
		shake_amount = move_toward(shake_amount, 0.0, 24.0 * delta)
	else:
		offset = Vector2.ZERO
	zoom = zoom.lerp(target_zoom, 3.0 * delta)
`;
}
