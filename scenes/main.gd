extends Control

var dragged = null

onready var terminal = $Rows/Controls/Terminal
onready var input = terminal.input
onready var output = terminal.output
onready var repositories_node = $Rows/Columns/Repositories
var repositories = {}
onready var next_level_button = $Menu/NextLevelButton
onready var level_name = $Rows/Columns/RightSide/LevelInfo/LevelPanel/LevelName
onready var level_description = $Rows/Columns/RightSide/LevelInfo/LevelPanel/Text/LevelDescription
onready var level_congrats = $Rows/Columns/RightSide/LevelInfo/LevelPanel/Text/LevelCongrats
onready var cards = $Rows/Controls/Cards
onready var file_browser = $Rows/Columns/RightSide/FileBrowser
onready var goals = $Rows/Columns/RightSide/LevelInfo/LevelPanel/Goals
onready var menu = $Menu

const LEVEL_BASE_POINTS = 100
const CLI_BONUS_POINTS = 25
const MAX_COMMAND_BONUS_POINTS = 50
const COMMAND_BONUS_STEP = 5
const HINT_PENALTY_POINTS = 10
const SHOP_WINDOW_SIZE = Vector2(680, 430)

var points_label = null
var shop_button = null
var _shop_dialog = null

var _hint_server
const WIN_REVEAL_DELAY_MSEC = 2000

var _level_started_at_msec = 0
var _win_reveal_timer = null
var _hint_client_connection

func _ready():
	_hint_server = TCP_Server.new()
	_hint_server.listen(1235, "127.0.0.1")
	
	var args = helpers.parse_args()
	
	if args.has("sandbox"):
		var err = get_tree().change_scene("res://scenes/sandbox.tscn")
		if err != OK:
			helpers.crash("无法切换到沙盒场景")
		return
	
	# Initialize level select.
#	level_select.connect("item_selected", self, "load_level")
#	repopulate_levels()
#	level_select.select(game.current_level)
	
#	# Initialize chapter select.
#	chapter_select.connect("item_selected", self, "load_chapter")
#	repopulate_chapters()
#	chapter_select.select(game.current_chapter)
	
	_setup_points_ui()
	# Load current level.
	load_level(game.current_level)
	input.grab_focus()
	
func _process(delta):
	if _hint_server.is_connection_available():
		_hint_client_connection = _hint_server.take_connection()
		var length = _hint_client_connection.get_u32()
		var message = _hint_client_connection.get_string(length)
		game.notify(message)
#	if game.used_cards:
#		$Menu/CLIBadge.impossible = true
		
	# Magic height number to fix a weird rescaling bug that affected
	# the Rows height. 
	$Rows.rect_size.y = 1064

func load_chapter(id):
	game.current_chapter = id
	load_level(0)

func load_level(level_id):
	next_level_button.hide()
	level_congrats.hide()
	level_description.show()
	game.current_level = level_id
	game.used_cards = false
	_level_started_at_msec = OS.get_ticks_msec()
	_cancel_win_reveal_timer()
	AudioServer.set_bus_mute(AudioServer.get_bus_index("SFX"), true)
	
	levels.chapters[game.current_chapter].levels[game.current_level].construct()

	var level = levels.chapters[game.current_chapter].levels[game.current_level]
	level_description.bbcode_text = level.description[0]
	level_congrats.bbcode_text = level.congrats
	level_name.text = level.title
	
	var slug = levels.chapters[game.current_chapter].slug + "/" + level.slug
	$Menu/CLIBadge.active = slug in game.state["cli_badge"]
	$Menu/CLIBadge.sparkling = false
	
	#if levels.chapters[game.current_chapter].levels[game.current_level].cards.size() == 0:
	#	cards.redraw_all_cards()
	#else:
	cards.draw(levels.chapters[game.current_chapter].levels[game.current_level].cards)
	
	for r in repositories_node.get_children():
		r.queue_free()
	repositories = {}
	file_browser.repository = null
	file_browser.clear()
	file_browser.close()
	
	var repo_names = level.repos.keys()
	repo_names.invert()
	
	for r in repo_names:
		var repo = level.repos[r]
		var new_repo = preload("res://scenes/repository.tscn").instance()
		new_repo.path = repo.path
		new_repo.label = repo.slug
		new_repo.size_flags_horizontal = SIZE_EXPAND_FILL
		new_repo.size_flags_vertical = SIZE_EXPAND_FILL
		if new_repo.label == "yours":
			file_browser.repository = new_repo
		repositories_node.add_child(new_repo)		
		repositories[r] = new_repo
	
	terminal.repository = repositories[repo_names[repo_names.size()-1]]
	terminal.reset_level_stats()
	terminal.apply_theme(game.state.get("active_terminal_theme", "default"))
	terminal.clear()
	terminal.find_node("TextEditor").close()
	update_points_label()
	
	update_repos()
	
	# Unmute the audio after a while, so that player can hear pop sounds for
	# nodes they create.
	var t = Timer.new()
	t.wait_time = 1
	add_child(t)
	t.start()
	yield(t, "timeout")
	AudioServer.set_bus_mute(AudioServer.get_bus_index("SFX"), false)
	# FIXME: Need to clean these up when switching levels somehow.
	
#	chapter_select.select(game.current_chapter)
#	level_select.select(game.current_level)
	#game.notify("These are your cards!", cards)

func reload_level():
	cards.load_card_store()
	levels.reload()
	load_level(game.current_level)

func load_next_level():
	game.current_level += 1
	if game.current_level >= levels.chapters[game.current_chapter].levels.size():
		
		back()
	else:
		load_level(game.current_level)
	
	
func show_win_status(win_states):
	var all_won = true
	var win_text = "\n\n"
	for child in goals.get_children():
		child.queue_free()
	for state in win_states:
		var b = Label.new()
		b.text = state
		b.align = HALIGN_LEFT
		var bg = StyleBoxFlat.new()
		if win_states[state]:
			bg.bg_color = Color(0.1, 0.5, 0.1)
		else:
			bg.bg_color = Color(0.5, 0.1, 0.1)
		bg.corner_radius_bottom_left = 8
		bg.corner_radius_bottom_right = 8
		bg.corner_radius_top_left = 8
		bg.corner_radius_top_right = 8
		bg.content_margin_bottom = 8
		bg.content_margin_top = 8
		bg.content_margin_left = 8
		bg.content_margin_right = 8
		b.set("custom_styles/normal", bg)
		#b.connect("pressed", self, "load", [chapter_id, level_id])
		#var slug = chapter.slug + "/" + level.slug
		
		goals.add_child(b)
		b.autowrap = true
		if not win_states[state]:
			all_won = false
	var level = levels.chapters[game.current_chapter].levels[game.current_level]
	level_description.bbcode_text = level.description[0] + win_text
	for i in range(1,level.tipp_level+1):
		level_description.bbcode_text += level.description[i]
			
	if not level_congrats.visible and all_won and win_states.size() > 0:
		var elapsed_msec = OS.get_ticks_msec() - _level_started_at_msec
		if elapsed_msec < WIN_REVEAL_DELAY_MSEC:
			_schedule_win_reveal(WIN_REVEAL_DELAY_MSEC - elapsed_msec)
			return
		_show_level_win(level)

func _schedule_win_reveal(remaining_msec):
	if _win_reveal_timer:
		return
	_win_reveal_timer = Timer.new()
	_win_reveal_timer.one_shot = true
	_win_reveal_timer.wait_time = max(float(remaining_msec) / 1000.0, 0.01)
	add_child(_win_reveal_timer)
	_win_reveal_timer.connect("timeout", self, "_on_win_reveal_timer_timeout")
	_win_reveal_timer.start()

func _cancel_win_reveal_timer():
	if not _win_reveal_timer:
		return
	_win_reveal_timer.stop()
	_win_reveal_timer.queue_free()
	_win_reveal_timer = null

func _on_win_reveal_timer_timeout():
	_win_reveal_timer.queue_free()
	_win_reveal_timer = null
	update_repos()

func _show_level_win(level):
	_cancel_win_reveal_timer()
	var slug = levels.chapters[game.current_chapter].slug + "/" + level.slug
	var score = _award_level_points(slug, level)
	level_congrats.bbcode_text = level.congrats + _score_summary_text(score)
	next_level_button.show()
	level_description.hide()
	level_congrats.show()
	$SuccessSound.play()
	if not slug in game.state["solved_levels"]:
		game.state["solved_levels"].push_back(slug)
		game.save_state()
	if not game.used_cards and not slug in game.state["cli_badge"]:
		game.state["cli_badge"].push_back(slug)
		game.save_state()
		$Menu/CLIBadge.active = true
		$Menu/CLIBadge.sparkling = true
	update_points_label()

func _score_level(level):
	var command_count = terminal.level_command_count
	var command_bonus = max(0, MAX_COMMAND_BONUS_POINTS - max(0, command_count - 1) * COMMAND_BONUS_STEP)
	var cli_bonus = 0
	if not game.used_cards:
		cli_bonus = CLI_BONUS_POINTS
	var hint_penalty = level.tipp_level * HINT_PENALTY_POINTS
	var base = int(level.points)
	if base <= 0:
		base = LEVEL_BASE_POINTS
	var total = max(0, base + command_bonus + cli_bonus - hint_penalty)
	return {"base": base, "command_count": command_count, "command_bonus": command_bonus, "cli_bonus": cli_bonus, "hint_penalty": hint_penalty, "total": total}

func _award_level_points(slug, level):
	if not game.state.has("level_scores"):
		game.state["level_scores"] = {}
	if not game.state.has("points"):
		game.state["points"] = 0
	var score = _score_level(level)
	var previous = int(game.state["level_scores"].get(slug, 0))
	var delta = max(0, int(score["total"]) - previous)
	if delta > 0:
		game.state["level_scores"][slug] = int(score["total"])
		game.state["points"] = int(game.state["points"]) + delta
		game.save_state()
	score["previous"] = previous
	score["delta"] = delta
	return score

func _score_summary_text(score):
	var title = "本关积分：+%s" % int(score["delta"])
	if int(score["delta"]) == 0:
		title = "本关积分：已领取，最佳 %s" % int(score["previous"])
	var lines = ["", "", "[color=#e1e160]%s[/color]" % title]
	lines.push_back("基础 %s，命令奖励 %s（%s 条命令），CLI 奖励 %s，提示扣分 -%s。" % [int(score["base"]), int(score["command_bonus"]), int(score["command_count"]), int(score["cli_bonus"]), int(score["hint_penalty"])])
	lines.push_back("当前可用积分：%s。输入 [code]shop[/code] 打开商城。" % int(game.state.get("points", 0)))
	return PoolStringArray(lines).join("\n")

func terminal_score_text():
	var level = levels.chapters[game.current_chapter].levels[game.current_level]
	var slug = levels.chapters[game.current_chapter].slug + "/" + level.slug
	var score = _score_level(level)
	var best = int(game.state.get("level_scores", {}).get(slug, 0))
	return "当前积分：%s\n本关预估：%s 分（历史最佳：%s）\n基础 %s，命令奖励 %s，CLI 奖励 %s，提示扣分 -%s。\n" % [int(game.state.get("points", 0)), int(score["total"]), best, int(score["base"]), int(score["command_bonus"]), int(score["cli_bonus"]), int(score["hint_penalty"])]

func _setup_points_ui():
	menu.margin_right = max(menu.margin_right, 850)
	points_label = Label.new()
	points_label.align = HALIGN_CENTER
	points_label.valign = VALIGN_CENTER
	points_label.rect_min_size = Vector2(110, 0)
	menu.add_child(points_label)

	shop_button = Button.new()
	shop_button.text = "商城"
	shop_button.focus_mode = Control.FOCUS_NONE
	shop_button.connect("pressed", self, "open_shop")
	menu.add_child(shop_button)
	update_points_label()

func update_points_label():
	if points_label:
		points_label.text = "积分：%s" % int(game.state.get("points", 0))

func _shop_items():
	return [
		{"id": "theme_default", "name": "默认终端", "price": 0, "theme": "default", "description": "恢复原始黑底紫框终端。"},
		{"id": "theme_green", "name": "复古绿屏", "price": 120, "theme": "green", "description": "老式 CRT 绿屏配色。"},
		{"id": "theme_blue", "name": "深海蓝屏", "price": 160, "theme": "blue", "description": "冷色蓝底和高亮命令提示符。"},
		{"id": "theme_gold", "name": "金色命令行", "price": 220, "theme": "gold", "description": "暖金色终端边框和文字。"}
	]

func _find_shop_item(item_id):
	for item in _shop_items():
		if item["id"] == item_id:
			return item
	return null

func _owns_shop_item(item):
	return int(item["price"]) == 0 or item["id"] in game.state.get("owned_shop_items", [])

func terminal_shop_text():
	var lines = ["积分商城（当前积分：%s）" % int(game.state.get("points", 0))]
	for item in _shop_items():
		var status = "未拥有"
		if game.state.get("active_terminal_theme", "default") == item["theme"]:
			status = "使用中"
		elif _owns_shop_item(item):
			status = "已拥有"
		lines.push_back("%s · %s · %s 分 · %s\n  %s\n  终端购买：buy %s" % [item["id"], item["name"], int(item["price"]), status, item["description"], item["id"]])
	return PoolStringArray(lines).join("\n") + "\n"

func open_shop():
	if not _shop_dialog:
		_shop_dialog = WindowDialog.new()
		_shop_dialog.window_title = "积分商城"
		_shop_dialog.rect_min_size = SHOP_WINDOW_SIZE
		add_child(_shop_dialog)
	_rebuild_shop_dialog()
	_shop_dialog.popup_centered(SHOP_WINDOW_SIZE)

func _rebuild_shop_dialog():
	for child in _shop_dialog.get_children():
		_shop_dialog.remove_child(child)
		child.queue_free()

	var rows = VBoxContainer.new()
	rows.anchor_right = 1.0
	rows.anchor_bottom = 1.0
	rows.margin_left = 16
	rows.margin_top = 16
	rows.margin_right = -16
	rows.margin_bottom = -16
	rows.add_constant_override("separation", 10)
	_shop_dialog.add_child(rows)

	var summary = Label.new()
	summary.text = "可用积分：%s" % int(game.state.get("points", 0))
	rows.add_child(summary)

	for item in _shop_items():
		var button = Button.new()
		button.align = HALIGN_LEFT
		button.size_flags_horizontal = SIZE_EXPAND_FILL
		var action = "购买"
		if game.state.get("active_terminal_theme", "default") == item["theme"]:
			action = "使用中"
		elif _owns_shop_item(item):
			action = "使用"
		button.text = "%s｜%s 分｜%s\n%s" % [item["name"], int(item["price"]), action, item["description"]]
		button.connect("pressed", self, "_on_shop_item_pressed", [item["id"]])
		rows.add_child(button)

func _on_shop_item_pressed(item_id):
	game.notify(terminal_buy_shop_item(item_id), _shop_dialog)

func terminal_buy_shop_item(item_id):
	var item = _find_shop_item(item_id)
	if not item:
		return "没有这个商品：%s。输入 shop 查看商品列表。\n" % item_id

	if not game.state.has("owned_shop_items"):
		game.state["owned_shop_items"] = []
	if not game.state.has("points"):
		game.state["points"] = 0

	var owned = _owns_shop_item(item)
	if not owned:
		var price = int(item["price"])
		if int(game.state["points"]) < price:
			return "积分不足：%s 需要 %s 分，你当前有 %s 分。\n" % [item["name"], price, int(game.state["points"])]
		game.state["points"] = int(game.state["points"]) - price
		game.state["owned_shop_items"].push_back(item["id"])

	game.state["active_terminal_theme"] = item["theme"]
	game.save_state()
	terminal.apply_theme(item["theme"])
	update_points_label()
	if _shop_dialog and _shop_dialog.visible:
		_rebuild_shop_dialog()
	if owned:
		return "已切换到：%s。\n" % item["name"]
	return "已购买并启用：%s。剩余积分：%s。\n" % [item["name"], int(game.state["points"])]

#func repopulate_levels():
#	levels.reload()
#	level_select.clear()
#	for level in levels.chapters[game.current_chapter].levels:
#		level_select.add_item(level.title)
#	level_select.select(game.current_level)

#func repopulate_chapters():
#	levels.reload()
#	chapter_select.clear()
#	for c in levels.chapters:
#		chapter_select.add_item(c.slug)
#	chapter_select.select(game.current_chapter)

func update_repos():
	var win_states = levels.chapters[game.current_chapter].levels[game.current_level].check_win()
	show_win_status(win_states)
	
	for r in repositories:
		var repo = repositories[r]
		repo.update_everything()
	
	# New repository nodes only become fully ready after they entered the scene tree.
	# Defer the file browser update so its file items can query the repository shell
	# reliably, and avoid showing an empty placeholder panel during level loading.
	file_browser.call_deferred("update")
	
	input.grab_focus()

func toggle_cards():
	cards.visible = not cards.visible
	
func new_tip():
	var level = levels.chapters[game.current_chapter].levels[game.current_level]
	if level.description.size() - 1 > level.tipp_level :
		level.tipp_level += 1
		level_description.bbcode_text += level.description[level.tipp_level]

func back():
	get_tree().change_scene("res://scenes/level_select.tscn")
