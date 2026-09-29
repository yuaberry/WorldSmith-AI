/**
 * Metroidvania system library — WORLD.
 * GameState (abilities/checkpoints/cinema/prompt/sparks/save-versionado),
 * room loader driven by data/rooms.json (interconnected doors/transitions),
 * checkpoint save points, ability pickups with HUD toast, weather (rain).
 */
import type { GameSpec } from "../types";

export function mvGameStateScript(spec: GameSpec): string {
  return `extends Node
# GameState — MV core: vida, shards, habilidades, checkpoint, cinema, save
# versionado (user://save_slot_1.cfg). Consulte data/spec.json no projeto.

signal won
signal died
signal boss_hp_updated(value: int)
signal cinema(title: String)
signal cinema_end
signal parried
signal open_dialogue(id: String)
signal toast(text: String)
signal prompt_changed(text: String)
signal room_changed(room_id: String)

const SAVE_VERSION := 2
var health := 100
var max_health := 100
var score := 0
var abilities := {}
var checkpoint_room := "hub"
var checkpoint_pos := Vector2(200, 540)
var discovered := {}
var current_room := "hub"
var boss_defeated := {}
var elapsed := 0.0
var finished := false
var _sfx := {}
var _tex_cache := {}

func _ready() -> void:
	randomize()
	register_inputs()
	discovered["hub"] = true

## INPUT SYSTEM (§9): action-based, keyboard + gamepad, remappable.
func register_inputs() -> void:
	var actions := {
		"move_left": [["key", KEY_A], ["key", KEY_LEFT], ["joy_axis", 0]],
		"move_right": [["key", KEY_D], ["key", KEY_RIGHT], ["joy_axis", 1]],
		"jump": [["key", KEY_SPACE], ["key", KEY_W], ["joy_button", 0]],
		"attack": [["key", KEY_J], ["key", KEY_X], ["joy_button", 2]],
		"parry": [["key", KEY_K], ["key", KEY_C], ["joy_button", 3]],
		"dash": [["key", KEY_L], ["key", KEY_Z], ["joy_button", 1]],
		"interact": [["key", KEY_E], ["joy_button", 7]],
		"map": [["key", KEY_TAB], ["joy_button", 8]],
	}
	for action in actions:
		if not InputMap.has_action(action):
			InputMap.add_action(action)
		for def in actions[action]:
			var ev := InputEventKey.new()
			var kind: String = def[0]
			if kind == "key":
				ev.physical_keycode = def[1]
				InputMap.action_add_event(action, ev)
			elif kind == "joy_button":
				var jb := InputEventJoypadButton.new()
				jb.button_index = def[1] as int
				InputMap.action_add_event(action, jb)
			elif kind == "joy_axis":
				var ja := InputEventJoypadMotion.new()
				ja.axis = def[1] as int
				if action == "move_left":
					ja.axis_value = -0.6
				else:
					ja.axis_value = 0.6
				InputMap.action_add_event(action, ja)

func tex(path: String) -> Texture2D:
	if _tex_cache.has(path):
		return _tex_cache[path]
	if ResourceLoader.exists(path):
		var imported: Texture2D = load(path)
		if imported != null:
			_tex_cache[path] = imported
			return imported
	if FileAccess.file_exists(path):
		var img := Image.new()
		if img.load_png_from_buffer(FileAccess.get_file_as_bytes(path)) == OK:
			var t := ImageTexture.create_from_image(img)
			_tex_cache[path] = t
			return t
	return null

func anim_frames(base: String, max_frames: int = 8) -> Array[Texture2D]:
	var out: Array[Texture2D] = []
	for i in range(max_frames):
		var t: Texture2D = tex("%s_%d.png" % [base, i])
		if t == null:
			return out
		out.append(t)
	return out

func play_sfx(id: String) -> void:
	if not _sfx.has(id):
		var path := "res://audio/%s.wav" % id
		if not ResourceLoader.exists(path):
			return
		var player := AudioStreamPlayer.new()
		add_child(player)
		player.stream = load(path)
		_sfx[id] = player
	var p: AudioStreamPlayer = _sfx[id]
	p.play()

## ANIMATION PACK BUILDER (§5): reads data/animations.json and builds named
## SpriteFrames (FPS, loop, events) from assets/anims/<char>/<ANIM>_<i>.png.
## Falls back to the legacy single-strip in assets/sprites/ when no pack.
func sprite_frames_for(char_id: String) -> SpriteFrames:
	var sf := SpriteFrames.new()
	var pack: Dictionary = {}
	var raw := FileAccess.get_file_as_string("res://data/animations.json")
	var parsed = JSON.parse_string(raw) if raw != "" else null
	if parsed:
		pack = parsed.get(char_id, {})
	if not pack.is_empty():
		for anim_name in pack:
			var def: Dictionary = pack[anim_name]
			var n: int = int(def.get("frames", 1))
			var first: Texture2D = tex("res://assets/anims/%s/%s_0.png" % [char_id, anim_name])
			if first == null:
				continue
			sf.add_animation(anim_name)
			sf.set_animation_speed(anim_name, float(def.get("fps", 8)))
			sf.set_animation_loop(anim_name, bool(def.get("loop", true)))
			for i in range(n):
				var t: Texture2D = tex("res://assets/anims/%s/%s_%d.png" % [char_id, anim_name, i])
				if t != null:
					sf.add_frame(anim_name, t)
		return sf
	# legacy single-strip fallback
	var frames: Array[Texture2D] = anim_frames("res://assets/sprites/" + char_id)
	if frames.size() > 0:
		sf.add_animation("IDLE")
		sf.set_animation_speed("IDLE", 6.0)
		sf.set_animation_loop("IDLE", true)
		for f in frames:
			sf.add_frame("IDLE", f)
	return sf

func play_on(node: Node, anim: String) -> void:
	if node is AnimatedSprite2D:
		var a: AnimatedSprite2D = node as AnimatedSprite2D
		if a.sprite_frames and a.sprite_frames.has_animation(anim):
			if a.animation != anim:
				a.play(anim)

func spawn_spark(pos: Vector2) -> void:
	for n in get_tree().get_nodes_in_group("world_root"):
		if n.has_method("spawn_spark"):
			n.spawn_spark(pos)

func set_prompt(text: String) -> void:
	prompt_changed.emit(text)

func unlock_ability(id: String) -> void:
	abilities[id] = true
	toast.emit("Habilidade desbloqueada: %s" % id.to_upper())
	play_sfx("pickup")
	save_game()

func on_player_death() -> void:
	died.emit()

## Scoring API — enemies/bosses award points; the HUD reads the score var.
func add_score(points: int) -> void:
	score += points

func on_boss_defeated() -> void:
	boss_defeated["sovereign"] = true
	score += 10
	toast.emit("O soberano caiu. A saída se abre…")
	room_changed.emit(current_room)
	save_game()

func emit_parry() -> void:
	parried.emit()

## SAVE SYSTEM (§4): versioned slots + checkpoint + world state.
func save_game() -> void:
	var cfg := ConfigFile.new()
	cfg.set_value("meta", "version", SAVE_VERSION)
	cfg.set_value("run", "health", health)
	cfg.set_value("run", "score", score)
	cfg.set_value("run", "room", current_room)
	cfg.set_value("run", "checkpoint_pos_x", checkpoint_pos.x)
	cfg.set_value("run", "checkpoint_pos_y", checkpoint_pos.y)
	cfg.set_value("run", "abilities", abilities.keys())
	cfg.set_value("run", "discovered", discovered.keys())
	cfg.set_value("run", "boss_defeated", boss_defeated.keys())
	cfg.save("user://save_slot_1.cfg")

func load_game() -> bool:
	var cfg := ConfigFile.new()
	if cfg.load("user://save_slot_1.cfg") != OK:
		return false
	var v := int(cfg.get_value("meta", "version", 1))
	if v < SAVE_VERSION:
		pass
	health = int(cfg.get_value("run", "health", max_health))
	score = int(cfg.get_value("run", "score", 0))
	current_room = String(cfg.get_value("run", "room", "hub"))
	checkpoint_pos = Vector2(float(cfg.get_value("run", "checkpoint_pos_x", 200)), float(cfg.get_value("run", "checkpoint_pos_y", 540)))
	abilities = {}
	for a in cfg.get_value("run", "abilities", []):
		abilities[a] = true
	discovered = {}
	for r in cfg.get_value("run", "discovered", ["hub"]):
		discovered[r] = true
	boss_defeated = {}
	for b in cfg.get_value("run", "boss_defeated", []):
		boss_defeated[b] = true
	return true

func clock_text() -> String:
	return "%02d:%02d" % [int(elapsed / 60.0), int(elapsed) % 60]
`;
}

export function mvMainScript(): string {
  return `extends Node
# World loader — builds rooms from data/rooms.json, manages transitions,
# parallax depth (2.5D), weather, sparks pool, cinematic fades.

const ROOMS_PATH := "res://data/rooms.json"
var rooms := {}
var current_room_id := ""
var world_root: Node2D
var fade: ColorRect
var sparks: Array[CPUParticles2D] = []
var rain: CPUParticles2D
var modulate: CanvasModulate

func _ready() -> void:
	add_to_group("world_root")
	var raw := FileAccess.get_file_as_string(ROOMS_PATH)
	var parsed = JSON.parse_string(raw)
	if parsed:
		for r in parsed:
			rooms[r["id"]] = r
	GameState.room_changed.connect(load_room)
	GameState.open_dialogue.connect(_on_open_dialogue)
	_build_fade()
	_build_parallax()
	_build_rain()
	_build_vignette()
	modulate = CanvasModulate.new()
	add_child(modulate)
	load_room("hub", Vector2(200, 540))
	GameState.discovered["hub"] = true

func spawn_spark(pos: Vector2) -> void:
	var p := CPUParticles2D.new()
	p.position = pos
	p.emitting = true
	p.one_shot = true
	p.amount = 12
	p.lifetime = 0.4
	p.explosiveness = 1.0
	p.direction = Vector2(0, -1)
	p.spread = 180.0
	p.initial_velocity_min = 60.0
	p.initial_velocity_max = 160.0
	p.gravity = Vector2(0, 240)
	p.scale_amount_min = 1.5
	p.scale_amount_max = 3.0
	p.color = Color("#9ecbff")
	world_root.add_child(p)
	sparks.append(p)
	if sparks.size() > 24:
		sparks[0].queue_free()
		sparks.remove_at(0)

func _build_fade() -> void:
	fade = ColorRect.new()
	fade.color = Color(0, 0, 0, 0)
	fade.z_index = 90
	fade.size = Vector2(1400, 760)
	fade.position = Vector2(-60, -20)
	fade.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(fade)

func _build_parallax() -> void:
	var bg := ParallaxBackground.new()
	add_child(bg)
	for layer_data in [["sky", 0.15, -200.0, 1.2], ["tile_wall", 0.45, -60.0, 1.5]]:
		var layer := ParallaxLayer.new()
		layer.motion_scale = Vector2(layer_data[1], layer_data[1])
		var tex: Texture2D = GameState.tex("res://assets/sprites/%s.png" % layer_data[0])
		if tex == null:
			tex = _flat_texture(Color("#10131c"))
		var tr := TextureRect.new()
		tr.texture = tex
		tr.stretch_mode = TextureRect.STRETCH_TILE
		tr.size = Vector2(2600, 900)
		tr.position = Vector2(0, layer_data[2])
		layer.add_child(tr)
		bg.add_child(layer)

func _flat_texture(color: Color) -> Texture2D:
	var img := Image.create(16, 16, false, Image.FORMAT_RGBA8)
	img.fill(color)
	return ImageTexture.create_from_image(img)

func _build_rain() -> void:
	rain = CPUParticles2D.new()
	rain.amount = 220
	rain.lifetime = 1.1
	rain.preprocess = 1.0
	rain.position = Vector2(640, -80)
	rain.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
	rain.emission_rect_extents = Vector2(900, 20)
	rain.direction = Vector2(0.12, 1)
	rain.spread = 8.0
	rain.initial_velocity_min = 420.0
	rain.initial_velocity_max = 620.0
	rain.gravity = Vector2(0, 300)
	rain.scale_amount_min = 0.6
	rain.scale_amount_max = 1.4
	rain.color = Color(0.62, 0.72, 0.95, 0.55)
	add_child(rain)

func load_room(id: String, spawn_override: Vector2 = Vector2(-1, -1)) -> void:
	var r: Dictionary = rooms.get(id, {})
	if r.is_empty():
		return
	if world_root:
		world_root.queue_free()
	world_root = Node2D.new()
	world_root.name = "RoomRoot"
	add_child(world_root)
	current_room_id = id
	GameState.current_room = id
	GameState.discovered[id] = true
	var m: Color = Color(String(r.get("modulate", "#cfd6e8")))
	modulate.color = m.darkened(0.18)
	var ground_t: Texture2D = GameState.tex("res://assets/sprites/tile_wall.png")
	var floor_t: Texture2D = GameState.tex("res://assets/sprites/tile_ground.png")
	for plat in r.get("platforms", []):
		var body := StaticBody2D.new()
		body.position = Vector2(plat["x"] + float(plat["w"]) / 2.0, plat["y"] + float(plat["h"]) / 2.0)
		var shape := CollisionShape2D.new()
		var rect := RectangleShape2D.new()
		rect.size = Vector2(plat["w"], plat["h"])
		shape.shape = rect
		body.add_child(shape)
		var tex: Texture2D = floor_t if float(plat["y"]) > 600.0 else ground_t
		if tex:
			var spr := Sprite2D.new()
			spr.texture = tex
			spr.centered = false
			spr.region_enabled = true
			spr.region_rect = Rect2(0, 0, float(plat["w"]), float(plat["h"]))
			spr.texture_repeat = CanvasItem.TEXTURE_REPEAT_ENABLED
			spr.position = Vector2(-float(plat["w"]) / 2.0, -float(plat["h"]) / 2.0)
			body.add_child(spr)
		world_root.add_child(body)
	for haz in r.get("hazards", []):
		var hz := Area2D.new()
		hz.position = Vector2(haz["x"] + float(haz["w"]) / 2.0, haz["y"] + float(haz["h"]) / 2.0)
		var hs := CollisionShape2D.new()
		var hr := RectangleShape2D.new()
		hr.size = Vector2(haz["w"], haz["h"])
		hs.shape = hr
		hz.add_child(hs)
		hz.body_entered.connect(func(b): if b and b.is_in_group("player"): b.take_damage(100, b.global_position))
		world_root.add_child(hz)
	for door in r.get("doors", []):
		var dr := Area2D.new()
		var req: String = door.get("requires", "")
		if req != "" and not GameState.abilities.has(req):
			dr.set_meta("locked", req)
		var ds := CollisionShape2D.new()
		var drs := RectangleShape2D.new()
		drs.size = Vector2(48, 120)
		ds.shape = drs
		dr.add_child(ds)
		dr.body_entered.connect(func(b):
			if b and b.is_in_group("player"):
				if dr.has_meta("locked"):
					GameState.toast.emit("Selado. Requer: %s" % (dr.get_meta("locked") as String).to_upper())
					return
				_transition(door["to"]))
		world_root.add_child(dr)
	for sp in r.get("spawns", []):
		_spawn(String(sp["type"]), String(sp["id"]), Vector2(sp["x"], sp["y"]))
	_decor(r)  # §15: rooms are PLACES, not collision shells — light, props, ambience
	var spawn: Vector2 = spawn_override if spawn_override.x >= 0.0 else Vector2(r["playerSpawn"]["x"], r["playerSpawn"]["y"])
	var player := preload("res://scenes/player.tscn").instantiate()
	player.position = spawn
	world_root.add_child(player)
	_fade_out()

## §15 decor — each room is a PLACE: torches on ledges (real light + animated
## flame), arcane crystals on the ground, floating ember motes. Deterministic
## per room id (same room ⇒ same dressing). Uses only forged assets.
func _decor(r: Dictionary) -> void:
	var rng := RandomNumberGenerator.new()
	rng.seed = hash(String(r.get("id", "room")))
	var flame: Array[Texture2D] = GameState.anim_frames("res://assets/sprites/checkpoint")
	var glow_tex: Texture2D = GameState.tex("res://assets/sprites/glow.png")
	var crystal_tex: Texture2D = GameState.tex("res://assets/materials/tile_magical_crystal.png")
	var GROUND_Y := 600.0
	for plat in r.get("platforms", []):
		var py: float = float(plat["y"])
		var px: float = float(plat["x"])
		var pw: float = float(plat["w"])
		if py > GROUND_Y:
			continue  # the main ground reads cleaner without clutter
		# wall torch on floating ledges (light first — the flame sells the space)
		if pw >= 96.0 and flame.size() > 1:
			var tx: float = px + 18.0 + float(rng.randi() % int(max(8.0, pw - 36.0)))
			if glow_tex:
				var halo := Sprite2D.new()
				halo.texture = glow_tex
				halo.position = Vector2(tx, py - 26.0)
				halo.scale = Vector2(0.85, 0.85)
				halo.modulate = Color(1.0, 0.62, 0.28, 0.5)
				halo.z_index = -2
				world_root.add_child(halo)
			var sf := SpriteFrames.new()
			sf.add_animation("burn")
			sf.set_animation_speed("burn", 7.0)
			sf.set_animation_loop("burn", true)
			for f in flame:
				sf.add_frame("burn", f)
			var fire := AnimatedSprite2D.new()
			fire.sprite_frames = sf
			fire.play("burn")
			fire.position = Vector2(tx, py - 38.0)
			fire.scale = Vector2(0.62, 0.62)
			fire.z_index = 4
			world_root.add_child(fire)
		# arcane crystals cluster on ledges (landmark + palette echo)
		if crystal_tex and pw >= 128.0 and rng.randf() < 0.45:
			for i in 3:
				var cr := Sprite2D.new()
				cr.texture = crystal_tex
				cr.region_enabled = true
				cr.region_rect = Rect2(rng.randi() % 16, rng.randi() % 16, 14, 14)
				cr.position = Vector2(px + 24.0 + float(i) * 13.0 + float(rng.randi() % 6), py - 8.0 - float(rng.randi() % 4))
				cr.scale = Vector2(0.55, 0.55)
				cr.z_index = 3
				world_root.add_child(cr)
	# ambient embers — the room breathes (slow warm motes drifting up)
	if glow_tex:
		var embers := CPUParticles2D.new()
		embers.texture = glow_tex
		embers.amount = 14
		embers.lifetime = 7.0
		embers.preprocess = 6.0
		embers.position = Vector2(float(r.get("width", 1280)) / 2.0, float(r.get("height", 720)) + 40.0)
		embers.emission_shape = CPUParticles2D.EMISSION_SHAPE_RECTANGLE
		embers.emission_rect_extents = Vector2(float(r.get("width", 1280)) / 2.0, 10.0)
		embers.direction = Vector2(0, -1)
		embers.spread = 12.0
		embers.initial_velocity_min = 12.0
		embers.initial_velocity_max = 34.0
		embers.gravity = Vector2(0, -6.0)
		embers.scale_amount_min = 0.04
		embers.scale_amount_max = 0.1
		embers.color = Color(1.0, 0.66, 0.3, 0.4)
		embers.z_index = 2
		world_root.add_child(embers)

## §7 vignette — one screen-space radial darkening (focus + mood), under the HUD.
func _build_vignette() -> void:
	var layer := CanvasLayer.new()
	layer.layer = 5
	var spr := Sprite2D.new()
	var g := Gradient.new()
	g.set_color(0, Color(0, 0, 0, 0))
	g.set_color(1, Color(0.04, 0.03, 0.09, 0.5))
	var gt := GradientTexture2D.new()
	gt.gradient = g
	gt.fill = GradientTexture2D.FILL_RADIAL
	gt.fill_from = Vector2(0.5, 0.5)
	gt.fill_to = Vector2(0.72, 0.5)
	gt.width = 512
	gt.height = 288
	spr.texture = gt
	spr.centered = false
	spr.position = Vector2(-80, -45)
	spr.scale = Vector2(1440.0 / 512.0, 810.0 / 288.0)
	layer.add_child(spr)
	add_child(layer)

func _spawn(kind: String, id: String, pos: Vector2) -> void:
	match kind:
		"enemy":
			var e := preload("res://scenes/enemy.tscn").instantiate()
			e.position = pos
			e.set_meta("kind", id)
			world_root.add_child(e)
		"boss":
			if not GameState.boss_defeated.has(id):
				var b := preload("res://scenes/boss.tscn").instantiate()
				b.position = pos
				world_root.add_child(b)
		"npc":
			var n := preload("res://scenes/npc.tscn").instantiate()
			n.position = pos
			n.set_meta("dialogue", id)
			world_root.add_child(n)
		"checkpoint":
			var c := preload("res://scenes/checkpoint.tscn").instantiate()
			c.position = pos
			world_root.add_child(c)
		"pickup":
			var p := preload("res://scenes/ability_pickup.tscn").instantiate()
			p.position = pos
			p.set_meta("ability", id)
			world_root.add_child(p)
		"secret":
			var s := preload("res://scenes/ability_pickup.tscn").instantiate()
			s.position = pos
			s.set_meta("ability", "relic")
			world_root.add_child(s)

func _transition(to: String) -> void:
	_fade_in()
	await get_tree().create_timer(0.22).timeout
	var entry: Vector2 = Vector2(200, 540)
	var target: Dictionary = rooms.get(to, {})
	if not target.is_empty():
		var from_left: bool = true
		for d in target.get("doors", []):
			if d["to"] == current_room_id:
				entry = Vector2(200, 540) if d["dir"] == "left" else Vector2(1080, 540)
		load_room(to, entry)
		GameState.room_changed.emit(to)
		GameState.save_game()

func _fade_in() -> void:
	fade.color = Color(0, 0, 0, 0.92)

func _fade_out() -> void:
	fade.color = Color(0, 0, 0, 0)

func _on_open_dialogue(id: String) -> void:
	var hud := get_tree().get_first_node_in_group("hud")
	if hud and hud.has_method("open_tree"):
		hud.open_tree(id)
`;
}

export function mvCheckpointScript(): string {
  return `extends Area2D
# Checkpoint (save point): interact → heal, set respawn, save slot.

var lit := false
var visual: CanvasItem = null

func _ready() -> void:
	var shape := CollisionShape2D.new()
	var circ := CircleShape2D.new()
	circ.radius = 34.0
	shape.shape = circ
	add_child(shape)
	visual = _build_visual("checkpoint", Color("#fbbf24"), Vector2(24, 24))
	add_child(visual)
	body_entered.connect(_on_body)

func _build_visual(base: String, fallback_color: Color, fallback_size: Vector2) -> CanvasItem:
	var frames: Array[Texture2D] = GameState.anim_frames("res://assets/sprites/" + base)
	if frames.size() > 1:
		var sf := SpriteFrames.new()
		sf.add_animation("idle")
		sf.set_animation_speed("idle", 5.0)
		sf.set_animation_loop("idle", true)
		for f in frames:
			sf.add_frame("idle", f)
		var aspr := AnimatedSprite2D.new()
		aspr.sprite_frames = sf
		aspr.play("idle")
		aspr.scale = Vector2(2.0, 2.0)
		return aspr
	var cr := ColorRect.new()
	cr.size = fallback_size
	cr.color = fallback_color
	cr.position = fallback_size / -2.0
	return cr

func _on_body(body: Node2D) -> void:
	if body.is_in_group("player"):
		lit = true
		GameState.checkpoint_pos = global_position
		GameState.checkpoint_room = GameState.current_room
		GameState.health = GameState.max_health
		GameState.save_game()
		GameState.toast.emit("Ponto de salvamento ativado.")
		GameState.play_sfx("pickup")
`;
}

export function mvPickupScript(): string {
  return `extends Area2D
# Ability pickup / relic — unlocks traversal, gates open via GameState.

var visual: CanvasItem = null
var t := 0.0

func _ready() -> void:
	var shape := CollisionShape2D.new()
	var circ := CircleShape2D.new()
	circ.radius = 26.0
	shape.shape = circ
	add_child(shape)
	visual = _build_visual("pickup", Color("#22d3ee"), Vector2(20, 20))
	add_child(visual)
	body_entered.connect(_on_body)

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
	var cr := ColorRect.new()
	cr.size = fallback_size
	cr.color = fallback_color
	cr.position = fallback_size / -2.0
	return cr

func _process(delta: float) -> void:
	t += delta
	if visual is Node2D:
		(visual as Node2D).position.y = sin(t * 3.0) * 5.0

func _on_body(body: Node2D) -> void:
	if body.is_in_group("player"):
		var ability: String = String(get_meta("ability", "dash"))
		GameState.unlock_ability(ability)
		queue_free()
`;
}
