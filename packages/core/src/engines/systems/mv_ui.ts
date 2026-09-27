/**
 * Metroidvania system library — UI (§4).
 * HUD (health/boss bar/toast/prompt + letterbox cinema), DialogueUI with
 * typewriter + choices, Map screen of discovered rooms, GameMenu with
 * RESPAWN. All code-built, controller-navigable.
 */
import type { GameSpec } from "../types";

export function mvHudScript(spec: GameSpec): string {
  return `extends CanvasLayer
# HUD — health, shards, ability icons, boss bar, prompt, toasts, letterbox
# cinema + dialogue box host. layer above game, below menu.

var hp_bar: ColorRect
var hp_fill: ColorRect
var boss_bar: ColorRect
var boss_fill: ColorRect
var boss_label: Label
var toast_label: Label
var prompt_label: Label
var letter_top: ColorRect
var letter_bottom: ColorRect
var cinema_label: Label
var ability_icons: Label
var dlg_box: PanelContainer
var dlg_text: Label
var dlg_choices: Label
var dlg_portrait: TextureRect
var dialogue := {}
var active_tree: Dictionary = {}
var active_node: Dictionary = {}
var typing := ""
var type_idx := 0
var choice_idx := 0
var in_dialogue := false

func _ready() -> void:
	add_to_group("hud")
	layer = 40
	var root := Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)

	hp_bar = ColorRect.new(); hp_bar.color = Color("#12131a"); hp_bar.position = Vector2(24, 24); hp_bar.size = Vector2(220, 14); root.add_child(hp_bar)
	hp_fill = ColorRect.new(); hp_fill.color = Color("#e5484d"); hp_fill.position = Vector2(26, 26); hp_fill.size = Vector2(216, 10); root.add_child(hp_fill)
	ability_icons = Label.new(); ability_icons.position = Vector2(24, 44); ability_icons.add_theme_font_size_override("font_size", 12); ability_icons.add_theme_color_override("font_color", Color("#8d93a9")); root.add_child(ability_icons)
	prompt_label = Label.new(); prompt_label.position = Vector2(560, 560); prompt_label.add_theme_font_size_override("font_size", 13); prompt_label.add_theme_color_override("font_color", Color("#fbbf24")); prompt_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; prompt_label.size = Vector2(160, 20); root.add_child(prompt_label)

	boss_bar = ColorRect.new(); boss_bar.color = Color("#12131a"); boss_bar.position = Vector2(340, 26); boss_bar.size = Vector2(600, 12); boss_bar.visible = false; root.add_child(boss_bar)
	boss_fill = ColorRect.new(); boss_fill.color = Color("#a78bfa"); boss_fill.position = Vector2(342, 28); boss_fill.size = Vector2(596, 8); boss_fill.visible = false; root.add_child(boss_fill)
	boss_label = Label.new(); boss_label.position = Vector2(340, 40); boss_label.add_theme_font_size_override("font_size", 11); boss_label.add_theme_color_override("font_color", Color("#c4b5fd")); boss_label.visible = false; root.add_child(boss_label)

	toast_label = Label.new(); toast_label.position = Vector2(340, 120); toast_label.add_theme_font_size_override("font_size", 18); toast_label.add_theme_color_override("font_color", Color("#22d3ee")); toast_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; toast_label.size = Vector2(600, 26); root.add_child(toast_label)

	letter_top = ColorRect.new(); letter_top.color = Color(0, 0, 0, 0); letter_top.position = Vector2(0, 0); letter_top.size = Vector2(1280, 90); root.add_child(letter_top)
	letter_bottom = ColorRect.new(); letter_bottom.color = Color(0, 0, 0, 0); letter_bottom.position = Vector2(0, 630); letter_bottom.size = Vector2(1280, 90); root.add_child(letter_bottom)
	cinema_label = Label.new(); cinema_label.position = Vector2(340, 300); cinema_label.add_theme_font_size_override("font_size", 40); cinema_label.add_theme_color_override("font_color", Color("#e9ecf5")); cinema_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER; cinema_label.size = Vector2(600, 60); root.add_child(cinema_label)

	dlg_box = PanelContainer.new(); dlg_box.position = Vector2(240, 500); dlg_box.size = Vector2(800, 150); dlg_box.visible = false; root.add_child(dlg_box)
	dlg_text = Label.new(); dlg_text.add_theme_font_size_override("font_size", 14); dlg_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART; dlg_text.custom_minimum_size = Vector2(760, 0); dlg_box.add_child(dlg_text)
	dlg_choices = Label.new(); dlg_choices.position = Vector2(260, 610); dlg_choices.add_theme_font_size_override("font_size", 13); dlg_choices.add_theme_color_override("font_color", Color("#fbbf24")); dlg_choices.visible = false; root.add_child(dlg_choices)
	dlg_portrait = TextureRect.new(); dlg_portrait.position = Vector2(180, 470); dlg_portrait.expand_mode = TextureRect.EXPAND_IGNORE_SIZE; dlg_portrait.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED; dlg_portrait.custom_minimum_size = Vector2(48, 48); root.add_child(dlg_portrait)

	GameState.toast.connect(_on_toast)
	GameState.prompt_changed.connect(_on_prompt)
	GameState.cinema.connect(_on_cinema)
	GameState.cinema_end.connect(_end_cinema)
	GameState.boss_hp_updated.connect(_on_boss_hp)
	var raw := FileAccess.get_file_as_string("res://data/dialogue.json")
	var parsed = JSON.parse_string(raw)
	if parsed:
		dialogue = parsed

func _process(delta: float) -> void:
	hp_fill.size.x = 216.0 * float(GameState.health) / float(GameState.max_health)
	var icons := "Habilidades: "
	if GameState.abilities.has("dash"):
		icons += "[DASH] "
	if GameState.abilities.has("relic"):
		icons += "[RELÍQUIA] "
	ability_icons.text = icons
	if in_dialogue:
		if type_idx < typing.length():
			type_idx += 1
			dlg_text.text = typing.substr(0, type_idx)
		if Input.is_action_just_pressed("interact") or Input.is_action_just_pressed("jump"):
			_advance()

func _advance() -> void:
	if type_idx < typing.length():
		type_idx = typing.length()
		dlg_text.text = typing
		return
	if active_node.has("choices"):
		var next_id: String = active_node["choices"][choice_idx]["next"]
		_open_node(next_id)
	else:
		_close_dialogue()

func open_tree(id: String) -> void:
	active_tree = dialogue.get(id, {}) as Dictionary
	if active_tree.is_empty():
		_close_dialogue()
		return
	in_dialogue = true
	dlg_box.visible = true
	var portrait: Texture2D = GameState.tex("res://assets/portraits/npc.png")
	if portrait == null:
		portrait = GameState.tex("res://assets/sprites/npc_0.png")
	dlg_portrait.texture = portrait
	_open_node(String(active_tree.get("start", "")))
	get_tree().paused = true

func _open_node(node_id: String) -> void:
	active_node = active_tree.get("nodes", {}).get(node_id, {}) as Dictionary
	if active_node.is_empty():
		_close_dialogue()
		return
	typing = String(active_node.get("text", ""))
	type_idx = 0
	dlg_text.text = ""
	if active_node.has("choices"):
		var names: Array = (active_node["choices"] as Array).map(func(c): return c["label"])
		dlg_choices.text = "\\n".join(names)
		dlg_choices.visible = true
		choice_idx = 0
	else:
		dlg_choices.visible = false

func _unhandled_input(event: InputEvent) -> void:
	if in_dialogue and active_node.has("choices"):
		var n: int = (active_node["choices"] as Array).size()
		if event.is_action_pressed("move_up") or event.is_action_pressed("move_left"):
			choice_idx = wrapi(choice_idx - 1, 0, n)
			_rebuild_choices()
		elif event.is_action_pressed("move_down") or event.is_action_pressed("move_right"):
			choice_idx = wrapi(choice_idx + 1, 0, n)
			_rebuild_choices()

func _rebuild_choices() -> void:
	var lines: Array[String] = []
	var i := 0
	for c in active_node["choices"]:
		lines.append(("▶ " if i == choice_idx else "  ") + String(c["label"]))
		i += 1
	dlg_choices.text = "\\n".join(lines)

func _close_dialogue() -> void:
	in_dialogue = false
	dlg_box.visible = false
	dlg_choices.visible = false
	get_tree().paused = false

func _on_toast(text: String) -> void:
	toast_label.text = text
	var t := get_tree().create_timer(2.6)
	t.timeout.connect(func(): toast_label.text = "")

func _on_prompt(text: String) -> void:
	prompt_label.text = text

func _on_cinema(title: String) -> void:
	letter_top.color = Color(0, 0, 0, 0.92)
	letter_bottom.color = Color(0, 0, 0, 0.92)
	cinema_label.text = title
	boss_bar.visible = true
	boss_fill.visible = true
	boss_label.visible = true
	boss_label.text = title

func _end_cinema() -> void:
	letter_top.color = Color(0, 0, 0, 0)
	letter_bottom.color = Color(0, 0, 0, 0)
	cinema_label.text = ""

func _on_boss_hp(value: int) -> void:
	var max_hp: int = 120
	var cfg := FileAccess.get_file_as_string("res://data/bosses.json")
	var parsed = JSON.parse_string(cfg)
	if parsed and parsed.size() > 0:
		max_hp = int(parsed.values()[0].get("hp", 120))
	boss_fill.size.x = max(0.0, 596.0 * float(value) / float(max_hp))
`;
}

export function mvMenuScript(spec: GameSpec): string {
  return `extends CanvasLayer
# GameMenu — title/pause + RESPAWN on death (checkpoint) + quit.

var root: Control
var rows: VBoxContainer
var title_label: Label
var is_open := false
var started := false

func _ready() -> void:
	layer = 100
	process_mode = Node.PROCESS_MODE_ALWAYS
	_build()
	GameState.died.connect(_on_death)
	_open_title()

func _build() -> void:
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	add_child(root)
	var dim := ColorRect.new()
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.color = Color(0.02, 0.03, 0.05, 0.9)
	root.add_child(dim)
	var center := CenterContainer.new()
	center.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.add_child(center)
	var box := VBoxContainer.new()
	box.add_theme_constant_override("separation", 18)
	center.add_child(box)
	title_label = Label.new()
	title_label.text = "${spec.title.replace(/"/g, "'").toUpperCase()}"
	title_label.add_theme_font_size_override("font_size", 44)
	title_label.add_theme_color_override("font_color", Color("#a78bfa"))
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	box.add_child(title_label)
	rows = VBoxContainer.new()
	rows.add_theme_constant_override("separation", 10)
	box.add_child(rows)

func _refresh() -> void:
	for c in rows.get_children():
		c.queue_free()
	if not started:
		_mk("DESPERTAR")
	else:
		_mk("CONTINUAR")
	_mk("RESPAWN NO CHECKPOINT") if GameState.checkpoint_room != "" else null
	_mk("SAIR")
	var hint := Label.new()
	hint.text = "WASD/setas mover · ESPAÇO saltar · J atacar · K parry · L dash · E interagir · TAB mapa\\nSuporte a controle nativo (gamepad)."
	hint.add_theme_font_size_override("font_size", 11)
	hint.add_theme_color_override("font_color", Color("#565c74"))
	hint.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	rows.add_child(hint)

func _mk(text: String) -> void:
	var b := Button.new()
	b.text = text
	b.custom_minimum_size = Vector2(280, 44)
	b.add_theme_font_size_override("font_size", 17)
	b.pressed.connect(func(): _action(text))
	rows.add_child(b)

func _open_title() -> void:
	started = false
	_refresh()
	_show(true)

func _show(open: bool) -> void:
	is_open = open
	root.visible = open
	get_tree().paused = open
	if not open and started:
		pass

func _action(text: String) -> void:
	GameState.play_sfx("click")
	if text == "DESPERTAR" or text == "CONTINUAR":
		started = true
		_show(false)
	elif text == "RESPAWN NO CHECKPOINT":
		_respawn()
	elif text == "SAIR":
		get_tree().quit()

func _on_death() -> void:
	_refresh()
	title_label.text = "VOCÊ CAIU"
	_show(true)
	_respawn()

func _respawn() -> void:
	started = true
	GameState.health = GameState.max_health
	GameState.room_changed.emit(GameState.checkpoint_room)
	_show(false)

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("ui_cancel") and started and not is_open:
		_refresh()
		_show(true)
	elif event.is_action_pressed("ui_cancel") and is_open:
		_show(false)
`;
}

export function mvMapScript(): string {
  return `extends CanvasLayer
# Map screen — discovered rooms drawn as an interconnected grid (TAB).

var root: Control
var visible_open := false

func _ready() -> void:
	layer = 80
	process_mode = Node.PROCESS_MODE_ALWAYS
	root = Control.new()
	root.set_anchors_preset(Control.PRESET_FULL_RECT)
	root.visible = false
	var dim := ColorRect.new()
	dim.set_anchors_preset(Control.PRESET_FULL_RECT)
	dim.color = Color(0.02, 0.03, 0.05, 0.88)
	root.add_child(dim)
	var title := Label.new()
	title.text = "MAPA DO REINO"
	title.position = Vector2(500, 60)
	title.add_theme_font_size_override("font_size", 26)
	title.add_theme_color_override("font_color", Color("#22d3ee"))
	root.add_child(title)
	add_child(root)

func _unhandled_input(event: InputEvent) -> void:
	if event.is_action_pressed("map"):
		visible_open = not visible_open
		_refresh()
		root.visible = visible_open
		if visible_open:
			get_tree().paused = true
		elif not get_tree().get_first_node_in_group("hud"):
			get_tree().paused = false
		else:
			get_tree().paused = false

func _refresh() -> void:
	for c in root.get_children():
		if c is ColorRect and c.name == "Cell":
			c.queue_free()
	var layout := {"hub": Vector2(520, 200), "west": Vector2(240, 200), "crossroads": Vector2(800, 200), "arena": Vector2(960, 320), "gate": Vector2(960, 140), "secret": Vector2(240, 340)}
	var names := {"hub": "Cloister", "west": "Gallery", "crossroads": "Crossroads", "arena": "Chapel", "gate": "Sovereign", "secret": "Reliquary"}
	for room_id in layout:
		var pos: Vector2 = layout[room_id]
		var cell := ColorRect.new()
		cell.name = "Cell"
		cell.position = pos
		cell.size = Vector2(120, 60)
		if GameState.discovered.has(room_id):
			cell.color = Color("#a78bfa") if room_id == "gate" else Color("#4f7cff")
			if room_id == GameState.current_room:
				cell.color = Color("#22d3ee")
		else:
			cell.color = Color(0.1, 0.12, 0.16, 0.8)
		root.add_child(cell)
		var lbl := Label.new()
		lbl.text = names.get(room_id, room_id) if GameState.discovered.has(room_id) else "???"
		lbl.position = pos + Vector2(8, 8)
		lbl.add_theme_font_size_override("font_size", 11)
		lbl.add_theme_color_override("font_color", Color("#0a0b10"))
		root.add_child(lbl)
		lbl.name = "Cell"
`;
}
