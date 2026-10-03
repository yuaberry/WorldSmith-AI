/**
 * qa/functional.gd — Functional QA harness (§12), GENERATED INTO EVERY GAME.
 *
 * Boots with the real game (all autoloads, real scene, real player) and, when
 * WORLDSMITH_QA=1, runs evidence-based probes of the ACTUAL gameplay flows.
 *
 * DESIGN (measured the hard way): a POLLING state machine in _process — no
 * SceneTreeTimers anywhere. QA-caught freeze classes that kill timer-based
 * harnesses: (1) the game boots paused on the title screen, (2) combat
 * hitstop sets Engine.time_scale=0, (3) SceneTreeTimers created while paused
 * or frozen never fire (0.7/0 = infinity). _process + wall-clock ticks are
 * immune to all three.
 */
export function mvQaScript(): string {
  return `extends Node
## Functional QA (WorldSmith AI §12) — inert in normal play, active with env.

var _pass := 0
var _fail := 0
var _step := -1
var _t := 0.0
var _armed := {}

func _check(name: String, ok: bool, detail := "") -> void:
	var line := "[QA] " + ("PASS" if ok else "FAIL") + " · " + name
	if detail != "":
		line += " — " + detail
	print(line)
	if ok:
		_pass += 1
	else:
		_fail += 1

func _ready() -> void:
	if OS.get_environment("WORLDSMITH_QA") != "1":
		return
	# ALWAYS: the game boots PAUSED on the title screen (by design) — a
	# pausable _process never runs and the harness would sleep forever.
	process_mode = Node.PROCESS_MODE_ALWAYS
	set_process(true)

func _process(delta: float) -> void:
	if OS.get_environment("WORLDSMITH_QA") != "1":
		return
	_t += delta  # real-time accumulation; delta may be 0 under hitstop — harmless
	if _step == -1:
		_step = 0
		_t = 0.0
		# 0 · START through the REAL title-screen path (the game boots paused
		#     on the title screen by design — QA presses DESPERTAR like a player)
		var menu := get_node_or_null("/root/GameMenu")
		if menu and menu.has_method("_action"):
			menu._action("DESPERTAR")
		_check("boot/title-start", not get_tree().paused, "unpaused via the real start action")
		return
	match _step:
		0:
			if _t > 0.8:
				_probes_static()
				_step = 1
				_t = 0.0
		1:
			# 8 · room transition — the REAL player path: walk into the actual door
			#    (the old probe called _transition directly and MISSED the P0 bug
			#    where door Areas were never positioned — QA must play the game.)
			if not _armed.has("door"):
				var players := get_tree().get_nodes_in_group("player")
				var door = null
				for d in get_tree().get_nodes_in_group("door"):
					if d and String(d.get_meta("to")) == "west":
						door = d
						break
				if door != null and players.size() > 0:
					(players[0] as Node2D).global_position = (door as Node2D).global_position + Vector2(0.0, -8.0)
					_armed["door"] = true
				elif _t > 1.0:
					_check("world/transition", false, "no door with to=west found in hub")
					_step = 2
					_t = 0.0
			elif _t > 1.6:
				_check("world/transition", GameState.current_room == "west", "hub → " + str(GameState.current_room))
				_step = 2
				_t = 0.0
		2:
			# 9 · enemy kill flow — a hostile takes the hit and dies
			if not _armed.has("kill"):
				var hostiles := get_tree().get_nodes_in_group("hostile")
				_check("enemy/present-in-room", hostiles.size() > 0, str(hostiles.size()) + " hostiles")
				if hostiles.size() > 0 and hostiles[0] and (hostiles[0] as Node).has_method("take_hit"):
					(hostiles[0] as Node).take_hit(9999, (hostiles[0] as Node2D).global_position + Vector2(8.0, 0.0))
					_armed["kill"] = hostiles[0]
				else:
					_step = 3
					_t = 0.0
			elif _t > 0.8:
				var hk = _armed["kill"]
				var gone: bool = not is_instance_valid(hk) or (hk as Node).is_queued_for_deletion()
				_check("enemy/dies-on-lethal-hit", gone)
				_step = 3
				_t = 0.0
		3:
			# 10 · ability grant — the pickup path unlocks the gate key
			var pickup = _find_ability_pickup("dash")
			if pickup != null and not _armed.has("ab"):
				var pl := get_tree().get_nodes_in_group("player")
				if pl.size() > 0:
					pickup._on_body(pl[0])
					_armed["ab"] = true
			elif _armed.has("ab") and _t > 0.3:
				_check("ability/grant-dash", GameState.abilities.has("dash"))
				_step = 4
				_t = 0.0
			elif pickup == null and _t > 0.5:
				_check("ability/pickup-found", false, "no pickup with meta ability=dash in room")
				_step = 4
				_t = 0.0
		4:
			# 11 · music director logic — scanning returns a sane state
			var music: Node = get_node_or_null("/root/Music")
			if music and music.has_method("_scan_state"):
				_check("music/scan-state", str(music._scan_state()) == "explore", "scan → " + str(music._scan_state()))
			print("[QA] RESULT pass=" + str(_pass) + " fail=" + str(_fail))
			get_tree().quit(1 if _fail > 0 else 0)

func _probes_static() -> void:
	# 1 · boot integrity — real scene, loaded room
	var scene_ok: bool = get_tree().current_scene != null
	var world := get_tree().get_first_node_in_group("world_root")
	_check("boot/main-scene", scene_ok and world != null, "room: " + str(GameState.current_room))
	# 2 · the player exists with the gameplay API
	var players := get_tree().get_nodes_in_group("player")
	var p = players[0] if players.size() > 0 else null
	_check("player/present", p != null and p is Node2D)
	if p == null:
		return
	_check("player/api", p.has_method("take_damage") and p.has_method("_try_hit"))
	# 3 · HUD booted
	var hud: Node = get_node_or_null("/root/HUD")
	_check("hud/present", hud != null and hud.get_child_count() > 0)
	# 4 · music director carries the 3 state tracks
	var music: Node = get_node_or_null("/root/Music")
	var music_ok: bool = music != null and music.get("players") != null and (music.get("players") as Dictionary).size() == 3
	_check("music/three-tracks", music_ok)
	# 5 · feel director exposes the juice API
	var feel: Node = get_node_or_null("/root/Feel")
	_check("feel/api", feel != null and feel.has_method("impact") and feel.has_method("dust"))
	# 6 · damage flow (knock pushed away from doors — no side effects)
	var h0: int = GameState.health
	p.take_damage(5, (p as Node2D).global_position - Vector2(48.0, 0.0))
	_check("combat/damage-applied", GameState.health == h0 - 5, "health " + str(h0) + " → " + str(GameState.health))
	# 7 · save/load roundtrip — persistence actually persists
	GameState.save_game()
	GameState.health = 7
	var loaded: bool = GameState.load_game()
	_check("save/roundtrip", loaded and GameState.health == h0 - 5,
		"restored:" + str(GameState.health))

func _find_ability_pickup(ability: String) -> Node:
	if get_tree().current_scene == null:
		return null
	var found := get_tree().current_scene.find_children("*", "Area2D", true, false)
	for n in found:
		if n and n.has_meta("ability") and String(n.get_meta("ability")) == ability and n.has_method("_on_body"):
			return n
	return null
`;
}
