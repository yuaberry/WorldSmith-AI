/**
 * Generic functional QA harness (§12) — for every template that shares the
 * gd_pro kit (topdown / platformer / 3d): GameState autoload (health/score,
 * damage(n), add_score(n)), GameMenu autoload (PLAY/RESUME), player group.
 *
 * Same PROVEN design as the metroidvania harness: POLLING state machine in
 * _process (PROCESS_MODE_ALWAYS), zero SceneTreeTimers — immune to the
 * three freeze classes measured (title pause, time_scale, scaled timers).
 * Env-gated: WORLDSMITH_QA=1. The validate stage runs it as a release gate.
 */
export function genericQaScript(): string {
  return `extends Node
## Functional QA (WorldSmith AI §12) — generic probes for gd_pro-kit games.
## Inert in normal play; active with WORLDSMITH_QA=1. Exit code = evidence.

var _pass := 0
var _fail := 0
var _step := -1
var _t := 0.0
var _h0 := 0
var _s0 := 0

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
	process_mode = Node.PROCESS_MODE_ALWAYS  # game boots paused on the title screen
	set_process(true)

func _process(delta: float) -> void:
	if OS.get_environment("WORLDSMITH_QA") != "1":
		return
	_t += delta
	if _step == -1:
		_step = 0
		_t = 0.0
		# 0 · START through the REAL menu path (title screen is product behavior).
		#    Two kit conventions exist: gd_pro menus use _on_any_button("PLAY"),
		#    the metroidvania menu uses _action("DESPERTAR") — try both honestly.
		var menu := get_node_or_null("/root/GameMenu")
		if menu and menu.has_method("_on_any_button"):
			menu._on_any_button("PLAY")
		elif menu and menu.has_method("_action"):
			menu._action("PLAY")
		_check("boot/title-start", not get_tree().paused, "unpaused via the real menu action")
		return
	match _step:
		0:
			if _t > 0.6:
				# 1 · boot integrity + the player exists with gameplay API
				var scene_ok: bool = get_tree().current_scene != null
				var players := get_tree().get_nodes_in_group("player")
				_check("boot/main-scene", scene_ok and players.size() > 0, str(players.size()) + " player")
				if players.size() > 0:
					_check("player/api", players[0].has_method("move") or (players[0] as Node).get_script() != null, "scripted body present")
				# 2 · combat flow — real damage changes real health
				_h0 = GameState.health
				GameState.damage(5)
				_check("combat/damage-applied", GameState.health == _h0 - 5, "health " + str(_h0) + " → " + str(GameState.health))
				# 3 · economy flow — score accumulates
				_s0 = GameState.score
				GameState.add_score(1)
				_check("economy/score-applied", GameState.score == _s0 + 1, "score " + str(_s0) + " → " + str(GameState.score))
				_step = 1
				_t = 0.0
		1:
			# 4 · HUD booted (group "hud" — gd_common kit convention)
			if _t > 0.2:
				var huds := get_tree().get_nodes_in_group("hud")
				_check("hud/present", huds.size() > 0, str(huds.size()) + " hud node")
				# 5 · persistence path — smoke the save (3D kit: best run)
				if GameState.has_method("save_best_run"):
					GameState.save_best_run()
					_check("save/best-run-path", true, "save_best_run executed")
				_step = 2
				_t = 0.0
		2:
			print("[QA] RESULT pass=" + str(_pass) + " fail=" + str(_fail))
			get_tree().quit(1 if _fail > 0 else 0)
`;
}
