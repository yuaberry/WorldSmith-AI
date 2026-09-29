/**
 * Metroidvania system library — ENTITIES.
 * Enemy FSM (idle/patrol/chase/telegraph/attack/stagger/dead) data-driven
 * from data/enemies.json; Boss with PHASES + CINEMATIC INTRO (letterbox,
 * title card, zoom, invulnerable windup) from data/bosses.json; NPC with
 * interaction opening dialogue trees. Parry → enemy stagger via signal.
 */
import type { GameSpec } from "../types";

export function mvEnemyScript(): string {
  return `extends CharacterBody2D
# Enemy — finite state machine, data-driven (data/enemies.json).

var data := {}
enum E { IDLE, PATROL, CHASE, TELEGRAPH, ATTACK, STAGGER, DEAD }
var state: int = E.IDLE
var visual: CanvasItem = null
var target: Node2D = null
var hp := 30
var speed := 120.0
var damage := 8
var telegraph_time := 0.45
var attack_range := 34.0
var aggro_range := 260.0
var patrol_dir := 1.0
var state_t := 0.0
var home_x := 0.0
var mode := "chaser"   # §15 enemy variety: chaser | turret | flyer (data-driven)
var home := Vector2.ZERO
var hover_t := 0.0
var base_scale := Vector2.ZERO  # §7 telegraph pulse reference (set after visual build)

func _ready() -> void:
	add_to_group("hostile")
	var cfg := FileAccess.get_file_as_string("res://data/enemies.json")
	var all = JSON.parse_string(cfg) if cfg != "" else {}
	var kind: String = get_meta("kind", "wraith")
	var d: Dictionary = all.get(kind, {}) if all else {}
	if d.is_empty():
		d = {"hp": 30, "speed": 120.0, "damage": 8, "telegraph": 0.45, "range": 34.0, "aggro": 260.0}
	hp = int(d.get("hp", 30))
	speed = float(d.get("speed", 120.0))
	damage = int(d.get("damage", 8))
	telegraph_time = float(d.get("telegraph", 0.45))
	attack_range = float(d.get("range", 34.0))
	aggro_range = float(d.get("aggro", 260.0))
	mode = String(d.get("mode", "chaser"))
	home = global_position
	home_x = global_position.x
	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = Vector2(22, 28)
	shape.shape = rect
	add_child(shape)
	visual = _build_visual("enemy", Color("#e5484d"), Vector2(22, 28))
	add_child(visual)
	if visual is Node2D:
		base_scale = (visual as Node2D).scale
	GameState.parried.connect(_on_parried)

func _build_visual(base: String, fallback_color: Color, fallback_size: Vector2) -> CanvasItem:
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
	state_t -= delta
	var players := get_tree().get_nodes_in_group("player")
	target = players[0] if players.size() > 0 else null
	match state:
		E.IDLE, E.PATROL:
			if mode == "flyer":
				# §15 wisps: gravity-free sine hover around home; dive when provoked
				hover_t += delta
				global_position = home + Vector2(sin(hover_t * 0.9) * 42.0, sin(hover_t * 2.2) * 24.0)
				if target and is_instance_valid(target):
					if global_position.distance_to(target.global_position) < aggro_range:
						state = E.CHASE
						hover_t = 0.0
			elif mode == "turret":
				velocity = Vector2.ZERO
				if visual is CanvasItem and state == E.IDLE:
					(visual as CanvasItem).modulate = Color(1, 1, 1)
				if target and is_instance_valid(target):
					if global_position.distance_to(target.global_position) < aggro_range:
						state = E.TELEGRAPH
						state_t = telegraph_time
				move_and_slide()
			else:
				velocity.y += 900.0 * delta
				velocity.x = patrol_dir * speed * 0.45
				if global_position.x > home_x + 90.0:
					patrol_dir = -1.0
				elif global_position.x < home_x - 90.0:
					patrol_dir = 1.0
				if target and is_instance_valid(target):
					if global_position.distance_to(target.global_position) < aggro_range:
						state = E.CHASE
				move_and_slide()
		E.CHASE:
			if mode == "flyer":
				# dive straight at the player — commits, then recovers home
				hover_t += delta
				if target and is_instance_valid(target):
					var to_p: Vector2 = target.global_position - global_position
					if to_p.length() < attack_range:
						state = E.TELEGRAPH
						state_t = 0.12
					elif hover_t < 2.2:
						global_position += to_p.normalized() * speed * delta
					else:
						state = E.IDLE
						hover_t = 0.0
			else:
				velocity.y += 900.0 * delta
				if target and is_instance_valid(target):
					var d: float = global_position.distance_to(target.global_position)
					if d < attack_range:
						state = E.TELEGRAPH
						state_t = telegraph_time
						velocity.x = 0.0
					else:
						velocity.x = sign(target.global_position.x - global_position.x) * speed
				move_and_slide()
		E.TELEGRAPH:
			if mode != "flyer":
				velocity.x = 0.0
				velocity.y += 900.0 * delta
			if visual is CanvasItem:
				(visual as CanvasItem).modulate = Color(1.6, 0.8, 0.8)
			if visual is Node2D and base_scale.length() > 0.01:
				# §7: the wind-up BREATES — a pulsing scale tells "it's coming"
				(visual as Node2D).scale = base_scale * (1.0 + 0.09 * abs(sin(state_t * 34.0)))
			if state_t <= 0.0:
				state = E.ATTACK
				state_t = 0.22
				if mode == "turret":
					_shoot()
			if mode != "flyer":
				move_and_slide()
		E.ATTACK:
			if visual is CanvasItem:
				(visual as CanvasItem).modulate = Color(1, 1, 1)
			if visual is Node2D and base_scale.length() > 0.01:
				(visual as Node2D).scale = base_scale
			if state_t > 0.0 and mode != "turret":
				if target and is_instance_valid(target):
					if global_position.distance_to(target.global_position) < attack_range + 10.0:
						target.take_damage(damage, global_position)
			state = E.IDLE if mode == "turret" else E.CHASE
		E.STAGGER:
			velocity.x = 0.0
			if mode != "flyer":
				velocity.y += 900.0 * delta
			if state_t <= 0.0:
				state = E.CHASE if mode != "turret" else E.IDLE
			if mode != "flyer":
				move_and_slide()

## §15 turret payload: an arcane bolt (tween-driven Area2D, glow sprite).
func _shoot() -> void:
	GameState.play_sfx("click")
	var p := Area2D.new()
	var s := CollisionShape2D.new()
	var c := CircleShape2D.new()
	c.radius = 7.0
	s.shape = c
	p.add_child(s)
	var spr := Sprite2D.new()
	var tex: Texture2D = GameState.tex("res://assets/sprites/glow.png")
	if tex:
		spr.texture = tex
		spr.scale = Vector2(0.32, 0.32)
	p.add_child(spr)
	p.global_position = global_position
	p.body_entered.connect(func(b):
		if b and b.is_in_group("player"):
			b.take_damage(damage, p.global_position)
			p.queue_free()
	)
	get_tree().current_scene.add_child(p)
	var dir: Vector2 = (target.global_position - global_position).normalized() if target and is_instance_valid(target) else Vector2(facing_dir(), 0.0)
	var tw := p.create_tween()
	tw.tween_property(p, "global_position", global_position + dir * 520.0, 1.6)
	tw.tween_callback(p.queue_free)

func facing_dir() -> float:
	return sign(target.global_position.x - global_position.x) if target and is_instance_valid(target) else 1.0

func take_hit(amount: int, from: Vector2) -> void:
	if state == E.DEAD:
		return
	hp -= amount
	var knock: Vector2 = (global_position - from).normalized() * 160.0
	velocity = knock
	velocity.y = -120.0
	GameState.play_sfx("hit")
	GameState.spawn_spark(global_position)
	if hp <= 0:
		_die()
	else:
		state = E.STAGGER
		state_t = 0.35

func _on_parried() -> void:
	if state == E.ATTACK or state == E.TELEGRAPH:
		state = E.STAGGER
		state_t = 0.9
		hp -= 6
		if hp <= 0:
			_die()

func _die() -> void:
	state = E.DEAD
	remove_from_group("hostile")  # no more hits/deals during the death anim
	GameState.add_score(1)
	GameState.play_sfx("pickup")
	Feel.sparks(global_position, 22)  # §7 death burst
	Feel.shake(3.5)
	Feel.hitstop(0.07)
	# §7 studio death: squash-flat + fade out — reads as DEFEAT, not a pop
	if visual is Node2D:
		var tw := create_tween()
		tw.set_parallel(true)
		tw.tween_property(visual, "scale", Vector2((visual as Node2D).scale.x * 1.15, (visual as Node2D).scale.y * 0.15), 0.26)
		if visual is CanvasItem:
			tw.tween_property(visual, "modulate:a", 0.0, 0.26)
		tw.chain().tween_callback(queue_free)
	else:
		queue_free()
`;
}

export function mvBossScript(spec: GameSpec): string {
  return `extends CharacterBody2D
# Boss — cinematic intro + phases + patterns, data-driven (data/bosses.json).

var data := {}
var visual: CanvasItem = null
var target: Node2D = null
var hp := 120
var phase := 1
var intro_done := false
var pattern_t := 0.0
var pattern := ""
var state_t := 0.0
var boss_name := "${spec.title.includes("Sovereign") ? "The Hollow Sovereign" : "The Hollow Sovereign"}"

func _ready() -> void:
	add_to_group("hostile")
	add_to_group("boss")
	var cfg := FileAccess.get_file_as_string("res://data/bosses.json")
	var all = JSON.parse_string(cfg) if cfg != "" else {}
	if all and all.size() > 0:
		data = all.values()[0]
	else:
		data = {"hp": 120, "name": "The Hollow Sovereign"}
	boss_name = String(data.get("name", boss_name))
	hp = int(data.get("hp", 120))
	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = Vector2(44, 56)
	shape.shape = rect
	add_child(shape)
	visual = _build_visual("boss", Color("#a78bfa"), Vector2(44, 56))
	add_child(visual)
	_start_intro()

func _build_visual(base: String, fallback_color: Color, fallback_size: Vector2) -> CanvasItem:
	var frames: Array[Texture2D] = GameState.anim_frames("res://assets/sprites/" + base)
	if frames.size() > 1:
		var sf := SpriteFrames.new()
		sf.add_animation("idle")
		sf.set_animation_speed("idle", 4.0)
		sf.set_animation_loop("idle", true)
		for f in frames:
			sf.add_frame("idle", f)
		var aspr := AnimatedSprite2D.new()
		aspr.sprite_frames = sf
		aspr.play("idle")
		aspr.scale = Vector2(2.0, 2.0)
		return aspr
	elif frames.size() == 1:
		var single := Sprite2D.new()
		single.texture = frames[0]
		single.scale = Vector2(2.0, 2.0)
		return single
	var cr := ColorRect.new()
	cr.size = fallback_size
	cr.color = fallback_color
	cr.position = fallback_size / -2.0
	return cr

## CINEMATIC INTRO (§ cinematic boss introductions): letterbox, title card,
## zoom, invulnerable while it plays.
func _start_intro() -> void:
	GameState.cinema.emit(boss_name)
	var players := get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		var cam: Camera2D = (players[0] as Node2D).get("camera_rig")
		if cam and cam.has_method("cinematic_zoom"):
			cam.cinematic_zoom(0.62)
	state_t = 2.6

func _physics_process(delta: float) -> void:
	var players := get_tree().get_nodes_in_group("player")
	target = players[0] if players.size() > 0 else null
	if not intro_done:
		state_t -= delta
		velocity = Vector2.ZERO
		move_and_slide()
		if state_t <= 0.0:
			intro_done = true
			GameState.cinema_end.emit()
			if target:
				var cam2: Camera2D = (target as Node2D).get("camera_rig")
				if cam2 and cam2.has_method("cinematic_zoom"):
					cam2.cinematic_zoom(1.0)
		return
	pattern_t -= delta
	velocity.y += 900.0 * delta
	if phase == 1:
		if pattern_t <= 0.0:
			pattern = "charge" if randf() > 0.5 else "slam"
			pattern_t = 2.2
		_exec_pattern(delta)
	else:
		if pattern_t <= 0.0:
			pattern = ["charge", "slam", "burst"].pick_random()
			pattern_t = 1.7
		_exec_pattern(delta)
	if target and is_instance_valid(target):
		if global_position.distance_to(target.global_position) < 40.0:
			target.take_damage(int(data.get("damage", 14)) if data else 14, global_position)
	move_and_slide()

func _exec_pattern(_delta: float) -> void:
	if not target or not is_instance_valid(target):
		return
	if pattern == "charge":
		velocity.x = sign(target.global_position.x - global_position.x) * (260.0 if phase == 1 else 340.0)
		if visual is Node2D:
			(visual as Node2D).scale = Vector2(3.2 * sign(velocity.x), 3.2)
	elif pattern == "burst":
		velocity.x = 0.0
		if int(pattern_t * 10.0) % 6 == 0:
			GameState.spawn_spark(global_position + Vector2(0, -20))
	elif pattern == "slam":
		velocity.x = move_toward(velocity.x, 0.0, 900.0 * _delta)
		if pattern_t < 1.0 and int(pattern_t * 8.0) % 4 == 0:
			if global_position.distance_to(target.global_position) < 160.0:
				target.take_damage(8, global_position)
			GameState.spawn_spark(global_position + Vector2(0, 10))

func take_hit(amount: int, _from: Vector2) -> void:
	if not intro_done:
		return
	hp -= amount
	GameState.play_sfx("hit")
	GameState.spawn_spark(global_position)
	GameState.boss_hp_updated.emit(hp)
	Feel.impact(global_position, 3.0)  # §7: boss hits carry weight
	var threshold := int(float(data.get("hp", 120)) * 0.5) if data else 60
	if phase == 1 and hp <= threshold:
		phase = 2
		velocity.y = -260.0
		Feel.shake(7.0)          # phase shift: the room answers
		Feel.sparks(global_position, 30)
		GameState.spawn_spark(global_position)
		GameState.play_sfx("hit")
	if hp <= 0:
		_die()

func _die() -> void:
	# §7 boss finale: slow-mo + a storm of sparks — the fall of the sovereign
	Feel.hitstop(0.28)
	Feel.shake(9.0)
	Feel.sparks(global_position, 40)
	GameState.boss_hp_updated.emit(0)
	GameState.play_sfx("pickup")
	GameState.on_boss_defeated()
	queue_free()
`;
}

export function mvNpcScript(): string {
  return `extends CharacterBody2D
# NPC — idle bob, interaction opens the dialogue tree via DialogueUI.

var dialogue_id := ""
var visual: CanvasItem = null
var bob_t := 0.0

func _ready() -> void:
	dialogue_id = String(get_meta("dialogue", "keeper"))
	var shape := CollisionShape2D.new()
	var rect := RectangleShape2D.new()
	rect.size = Vector2(24, 34)
	shape.shape = rect
	add_child(shape)
	visual = _build_visual("npc", Color("#7cd6a8"), Vector2(24, 34))
	add_child(visual)

func _build_visual(base: String, fallback_color: Color, fallback_size: Vector2) -> CanvasItem:
	var frames: Array[Texture2D] = GameState.anim_frames("res://assets/sprites/" + base)
	if frames.size() > 1:
		var sf := SpriteFrames.new()
		sf.add_animation("idle")
		sf.set_animation_speed("idle", 3.0)
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
	velocity.y += 900.0 * delta
	velocity.x = 0.0
	bob_t += delta
	move_and_slide()
	var players := get_tree().get_nodes_in_group("player")
	if players.size() > 0:
		var p: Node2D = players[0]
		var near: bool = global_position.distance_to(p.global_position) < 70.0
		GameState.set_prompt("E — Falar" if near else "")
		if near and Input.is_action_just_pressed("interact"):
			GameState.open_dialogue.emit(dialogue_id)
`;
}
