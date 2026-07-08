extends Control

signal command_done

var history_position = 0
var git_commands = ["add", "am", "archive", "bisect", "branch", "bundle", "checkout", "cherry-pick", "citool", "clean", "clone", "commit", "describe", "diff", "fetch", "format-patch", "gc", "gitk", "grep", "gui", "init", "log", "merge", "mv", "notes", "pull", "push", "range-diff", "rebase", "reset", "restore", "revert", "rm", "shortlog", "show", "sparse-checkout", "stash", "status", "submodule", "switch", "tag", "worktree", "config", "fast-export", "fast-import", "filter-branch", "mergetool", "pack-refs", "prune", "reflog", "remote", "repack", "replace", "annotate", "blame", "bugreport", "count-objects", "difftool", "fsck", "gitweb", "help", "instaweb", "merge-tree", "rerere", "show-branch", "verify-commit", "verify-tag", "whatchanged", "archimport", "cvsexportcommit", "cvsimport", "cvsserver", "imap-send", "p", "quiltimport", "request-pull", "send-email", "svn", "apply", "checkout-index", "commit-graph", "commit-tree", "hash-object", "index-pack", "merge-file", "merge-index", "mktag", "mktree", "multi-pack-index", "pack-objects", "prune-packed", "read-tree", "symbolic-ref", "unpack-objects", "update-index", "update-ref", "write-tree", "cat-file", "cherry", "diff-files", "diff-index", "diff-tree", "for-each-ref", "get-tar-commit-id", "ls-files", "ls-remote", "ls-tree", "merge-base", "name-rev", "pack-redundant", "rev-list", "rev-parse", "show-index", "show-ref", "unpack-file", "var", "verify-pack", "daemon", "fetch-pack", "http-backend", "send-pack", "update-server-info", "check-attr", "check-ignore", "check-mailmap", "check-ref-format", "column", "credential", "credential-cache", "credential-store", "fmt-merge-msg", "interpret-trailers", "mailinfo", "mailsplit", "merge-one-file", "patch-id", "sh-i", "sh-setup"]

var git_commands_help = []
var _completion_timer
var _pending_completion_text = ""
var _draft_command = ""
var level_command_count = 0
var command_color = Color.darkgoldenrod
var _current_ansi_color = Color.white

onready var input = $Rows/InputLine/Input
onready var output = $Rows/TopHalf/Output
onready var completions = $Rows/TopHalf/Completions
var repository
onready var main = get_tree().get_root().get_node("Main")

var shell = Shell.new()

var COLORS = [
	Color.webgray, # black
	Color.crimson, # red
	Color.chartreuse, # green
	Color.gold, # yellow
	Color.royalblue, # blue
	Color.magenta, # magenta
	Color.cyan, # cyan
	Color.white # white
]

var BRIGHT_COLORS = [
	Color(0.55, 0.55, 0.55, 1),
	Color(1.0, 0.2, 0.2, 1),
	Color(0.35, 1.0, 0.35, 1),
	Color(1.0, 1.0, 0.25, 1),
	Color(0.2, 0.55, 1.0, 1),
	Color(1.0, 0.45, 1.0, 1),
	Color(0.35, 1.0, 1.0, 1),
	Color.white
]

var premade_commands = [
	'git commit --allow-empty -m "empty"',
	'echo $RANDOM | git hash-object -w --stdin',
	'git switch -c $RANDOM',
]

func _ready():
	var error = $TextEditor.connect("hide", self, "editor_closed")
	if error != OK:
		helpers.crash("无法连接 TextEditor 的 hide 信号")
	input.grab_focus()
	var output_style = output.get("custom_styles/normal")
	if output_style:
		output.set("custom_styles/normal", output_style.duplicate())
	apply_theme(game.state.get("active_terminal_theme", "default"))

	for subcommand in git_commands:
		git_commands_help.push_back("")
	
	completions.hide()
	history_position = game.state["history"].size()

	_completion_timer = Timer.new()
	_completion_timer.one_shot = true
	_completion_timer.wait_time = 0.12
	add_child(_completion_timer)
	_completion_timer.connect("timeout", self, "_regenerate_pending_completions")

func _input(event):
	if not input.has_focus() or not event.is_pressed():
		return

	if _handle_arrow_key(event):
		get_tree().set_input_as_handled()
		return

	if _handle_shortcut_key(event):
		get_tree().set_input_as_handled()
		return

	if event.is_action("tab_complete"):
		if completions.visible:
			completions.get_root().get_children().select(0)
		get_tree().set_input_as_handled()
	elif event.is_action("delete_word"):
		var first_half = input.text.substr(0,input.caret_position)
		var second_half = input.text.substr(input.caret_position)
		
		var idx = first_half.strip_edges(false, true).find_last(" ")
		if idx > 0:
			input.text = first_half.substr(0,idx+1) + second_half
			input.caret_position = idx+1
		else:
			input.text = "" + second_half
	elif event.is_action("clear"):
		clear()
	elif event.is_action("ui_page_up"):
		var scroll = output.get_v_scroll()
		scroll.set_value(scroll.value - output.get_rect().size.y / 2)
	elif event.is_action("ui_page_down"):
		var scroll = output.get_v_scroll()
		scroll.set_value(scroll.value + output.get_rect().size.y / 2)

func _handle_arrow_key(event):
	if !(event is InputEventKey):
		return false
	if event.alt or event.shift or event.control or event.meta or event.command:
		return false

	match event.scancode:
		KEY_LEFT:
			if input.caret_position > 0:
				input.caret_position -= 1
			return true
		KEY_RIGHT:
			if input.caret_position < input.text.length():
				input.caret_position += 1
			return true
		KEY_UP:
			_show_previous_history()
			return true
		KEY_DOWN:
			_show_next_history()
			return true
	return false

func _show_previous_history():
	if game.state["history"].size() == 0:
		return
	if history_position == game.state["history"].size():
		_draft_command = input.text
	if history_position > 0:
		history_position -= 1
		input.text = game.state["history"][history_position]
		input.caret_position = input.text.length()

func _show_next_history():
	if game.state["history"].size() == 0:
		return
	if history_position < game.state["history"].size():
		history_position += 1
	if history_position == game.state["history"].size():
		input.text = _draft_command
	else:
		input.text = game.state["history"][history_position]
	input.caret_position = input.text.length()

func _handle_shortcut_key(event):
	if !(event is InputEventKey):
		return false

	if _has_command_modifier(event):
		match event.scancode:
			KEY_A:
				input.caret_position = 0
				return true
			KEY_E:
				input.caret_position = input.text.length()
				return true
			KEY_U:
				input.text = input.text.substr(input.caret_position)
				input.caret_position = 0
				input.emit_signal("text_changed", input.text)
				return true
			KEY_K:
				input.text = input.text.substr(0, input.caret_position)
				input.emit_signal("text_changed", input.text)
				return true
			KEY_R:
				_search_history(input.text)
				return true

	if event.alt:
		match event.scancode:
			KEY_B:
				_move_word_left()
				return true
			KEY_F:
				_move_word_right()
				return true

	return false

func _has_command_modifier(event):
	return event.control or event.meta or event.command

func _move_word_left():
	var pos = input.caret_position
	while pos > 0 and input.text[pos - 1] == " ":
		pos -= 1
	while pos > 0 and input.text[pos - 1] != " ":
		pos -= 1
	input.caret_position = pos

func _move_word_right():
	var pos = input.caret_position
	while pos < input.text.length() and input.text[pos] != " ":
		pos += 1
	while pos < input.text.length() and input.text[pos] == " ":
		pos += 1
	input.caret_position = pos

func _search_history(query):
	if game.state["history"].size() == 0:
		return
	for i in range(game.state["history"].size() - 1, -1, -1):
		var command = game.state["history"][i]
		if query == "" or command.find(query) >= 0:
			history_position = i
			input.text = command
			input.caret_position = input.text.length()
			input.emit_signal("text_changed", input.text)
			return

func load_command(id):
	input.text = premade_commands[id]
	input.caret_position = input.text.length()

func send_command(command):
	command = command.strip_edges()
	if command == "":
		input.text = ""
		return

	close_all_editors()
	game.state["history"].push_back(command)
	game.save_state()
	history_position = game.state["history"].size()
	_draft_command = ""
	
	input.editable = false
	completions.hide()

	var pretty_command = command
	if _run_builtin_command(command, pretty_command):
		return
	level_command_count += 1

	# If someone tries to run an editor, use fake-editor instead.
	var editor_regex = RegEx.new()
	editor_regex.compile("^(vim?|gedit|emacs|kate|nano|code) ")
	command = editor_regex.sub(command, "fake-editor ")
	# If someone tries to run git and don't pipe it, add color
	var commands = command.rsplit("|", 1)
	var git_regex = RegEx.new()
	git_regex.compile("^git ([^>|]*)$")
	commands[-1] = git_regex.sub(commands[-1], "git -c color.ui=always $1")
	var gnu_color_regex = RegEx.new()
	gnu_color_regex.compile("^(\\s*([a-z]?grep|ls|diff))\\b([^>]*)$")
	commands[-1] = gnu_color_regex.sub(commands[-1], "$1 --color=always$3")
	command = PoolStringArray(commands).join("|")

	shell.cd(repository.path)
	var cmd = shell.run_async(command, pretty_command, false)
	yield(cmd, "done")
	call_deferred("command_done", cmd)

func reset_level_stats():
	level_command_count = 0

func _run_builtin_command(command, pretty_command):
	var parts = Array(command.split(" "))
	var name = parts[0]
	match name:
		"clear":
			clear()
			input.text = ""
			input.editable = true
			$OkSound.play()
			emit_signal("command_done")
			return true
		"help", "帮助":
			_finish_builtin_command(pretty_command, _terminal_help_text(), 0)
			return true
		"history", "历史":
			_finish_builtin_command(pretty_command, _terminal_history_text(), 0)
			return true
		"score", "积分", "分数":
			if main and main.has_method("terminal_score_text"):
				_finish_builtin_command(pretty_command, main.terminal_score_text(), 0)
			else:
				_finish_builtin_command(pretty_command, "当前积分：%s\n" % int(game.state.get("points", 0)), 0)
			return true
		"shop", "商城":
			if main and main.has_method("open_shop"):
				main.open_shop()
			if main and main.has_method("terminal_shop_text"):
				_finish_builtin_command(pretty_command, main.terminal_shop_text(), 0)
			else:
				_finish_builtin_command(pretty_command, "商城暂不可用。\n", 1)
			return true
		"buy", "购买":
			if parts.size() < 2:
				_finish_builtin_command(pretty_command, "用法：buy <商品ID>\n", 1)
			elif main and main.has_method("terminal_buy_shop_item"):
				_finish_builtin_command(pretty_command, main.terminal_buy_shop_item(parts[1]), 0)
			else:
				_finish_builtin_command(pretty_command, "商城暂不可用。\n", 1)
			return true
	return false

func _finish_builtin_command(pretty_command, output_text, exit_code):
	var cmd = ShellCommand.new()
	cmd.pretty_command = pretty_command
	cmd.output = output_text
	cmd.exit_code = exit_code
	command_done(cmd)

func _terminal_help_text():
	return "内建命令：\n  help / 帮助        显示这份帮助\n  clear             清空终端\n  history / 历史     查看命令历史\n  score / 积分       查看当前积分和本关预估得分\n  shop / 商城        打开积分商城\n  buy <商品ID>       购买或使用商城商品\n\n快捷键：\n  ↑/↓ 历史，←/→ 移动光标，Ctrl/⌘+A/E 行首/行尾\n  Ctrl/⌘+U/K 删除光标前/后文本，Ctrl/⌘+R 搜索历史\n  Alt+B/F 按单词移动\n"

func _terminal_history_text():
	var lines = []
	for i in range(game.state["history"].size()):
		lines.push_back("%3d  %s" % [i + 1, game.state["history"][i]])
	return PoolStringArray(lines).join("\n") + "\n"

func add_ansi_command(pager, cmd):
	pager.push_color(command_color)
	pager.add_text("$ ")
	pager.push_color(pager.get_color("default_color"))
	pager.add_text(cmd.pretty_command + "\n")

func perform_ansi(pager, codes):
	var parts = Array(codes.split(";"))
	if codes == "":
		parts = ["0"]
	var i = 0
	while i < parts.size():
		var raw_code = str(parts[i])
		var code = 0
		if raw_code != "":
			code = int(raw_code)

		if code == 0 or code == 39:
			_push_ansi_color(pager, pager.get_color("default_color"))
		elif code == 1:
			_push_ansi_color(pager, _current_ansi_color.linear_interpolate(Color.white, 0.35))
		elif code == 2:
			_push_ansi_color(pager, _current_ansi_color.darkened(0.45))
		elif code >= 30 and code <= 37:
			_push_ansi_color(pager, COLORS[code - 30])
		elif code >= 90 and code <= 97:
			_push_ansi_color(pager, BRIGHT_COLORS[code - 90])
		elif code == 38 and i + 2 < parts.size() and int(parts[i + 1]) == 5:
			_push_ansi_color(pager, _ansi_256_color(int(parts[i + 2])))
			i += 2
		elif code == 38 and i + 4 < parts.size() and int(parts[i + 1]) == 2:
			_push_ansi_color(pager, Color(float(int(parts[i + 2])) / 255.0, float(int(parts[i + 3])) / 255.0, float(int(parts[i + 4])) / 255.0))
			i += 4
		i += 1

func _push_ansi_color(pager, color):
	_current_ansi_color = color
	pager.push_color(color)

func _ansi_256_color(index):
	if index < 0:
		return _current_ansi_color
	if index < 8:
		return COLORS[index]
	if index < 16:
		return BRIGHT_COLORS[index - 8]
	if index <= 231:
		var values = [0, 95, 135, 175, 215, 255]
		var n = index - 16
		var r = int(n / 36)
		var g = int((n % 36) / 6)
		var b = n % 6
		return Color(float(values[r]) / 255.0, float(values[g]) / 255.0, float(values[b]) / 255.0)
	if index <= 255:
		var gray = float(8 + (index - 232) * 10) / 255.0
		return Color(gray, gray, gray)
	return _current_ansi_color

func add_ansi_output(pager, cmd):
	_current_ansi_color = pager.get_color("default_color")
	var escape_start = char(27) + "["
	var data = cmd.output
	while escape_start in data:
		var parts = data.split(escape_start, true, 1)
		pager.add_text(parts[0].replace("\r", ""))
		if parts[1].begins_with("K"):
			data = parts[1].substr(1)
			continue
		if "m" in parts[1]:
			parts = parts[1].split("m", true, 1)
			data = parts[1]
			perform_ansi(pager, parts[0])
		else:
			data = parts[1]
	pager.add_text(data.replace("\r", ""))

func command_done(cmd):
	if cmd.exit_code == 0:
		$OkSound.pitch_scale = rand_range(0.8, 1.2)
		$OkSound.play()
	else:
		$ErrorSound.play()
	
	input.text = ""
	input.editable = true
	
	add_ansi_command(output, cmd)
	if cmd.output.length() <= 1000:
		add_ansi_output(output, cmd)
		game.notify("这是你的终端！所有命令都会在这里执行，你也能看到输出。你还可以在这里输入自己的命令。", self, "terminal")
	else:
		var pager = $Pager/Text
		pager.clear()
		add_ansi_output(pager, cmd)
		$Pager.popup()
	
	emit_signal("command_done")
	
func receive_output(text):
	output.text += text
	repository.update_everything()

func clear():
	output.clear()

func apply_theme(theme_id):
	var background = Color(0, 0, 0, 1)
	var border = Color(0.415686, 0.333333, 1, 1)
	var text = Color.white
	var accent = Color.darkgoldenrod

	match theme_id:
		"green":
			background = Color(0.015, 0.045, 0.025, 1)
			border = Color(0.1, 0.8, 0.35, 1)
			text = Color(0.76, 1.0, 0.78, 1)
			accent = Color(0.45, 1.0, 0.48, 1)
		"blue":
			background = Color(0.015, 0.028, 0.07, 1)
			border = Color(0.1, 0.42, 1.0, 1)
			text = Color(0.72, 0.86, 1.0, 1)
			accent = Color(0.35, 0.78, 1.0, 1)
		"gold":
			background = Color(0.08, 0.055, 0.015, 1)
			border = Color(1.0, 0.68, 0.1, 1)
			text = Color(1.0, 0.92, 0.7, 1)
			accent = Color(1.0, 0.78, 0.2, 1)

	var style = output.get("custom_styles/normal")
	if style:
		style.bg_color = background
		style.border_color = border
	output.set("custom_colors/default_color", text)
	input.set("custom_colors/font_color", text)
	input.set("custom_colors/cursor_color", accent)
	command_color = accent
	
func editor_closed():
	input.grab_focus()
		
func regenerate_completions_menu(new_text):
	var comp = generate_completions(new_text)
	
	completions.clear()
	
	
	var filtered_comp = []
	for c in comp:
		if c != new_text:
			filtered_comp.push_back(c)
	
	if filtered_comp.size() == 0:
		completions.hide()
	else:
		completions.show()
	
		var _root = completions.create_item()
		for c in filtered_comp:
			var child = completions.create_item()
			child.set_text(0, c)
			if c.split(" ").size() >= 2:
				var subcommand = c.split(" ")[1]
				var idx = git_commands.find(subcommand)
				if idx >= 0:
					child.set_text(1, git_commands_help[idx])
					
		completions.margin_top = -min(filtered_comp.size() * 35 + 10, 210) 

func relevant_subcommands():
	var result = {}
	for h in game.state["history"]:
		var parts = Array(h.split(" "))
		if parts.size() >= 2 and parts[0] == "git":
			var subcommand = parts[1]
			if git_commands.has(subcommand):
				if not result.has(subcommand):
					result[subcommand] = 0
				result[subcommand] += 1
	
	# Convert to format [["add", 3], ["pull", 5]].
	var result_array = []
	for r in result:
		result_array.push_back([r, result[r]])
	
	result_array.sort_custom(self, "sort_by_frequency_desc")
	
	var plain_result = []
	for r in result_array:
		plain_result.push_back(r[0])
	return plain_result

func sort_by_frequency_desc(a, b):
	return a[1] > b[1]
	
func generate_completions(command):
	var results = []
	
	# Collect git commands.
	if command.substr(0, 4) == "git ":
		var rest = command.substr(4)
		var subcommands = relevant_subcommands()
		
		for sc in subcommands:
			if sc.substr(0, rest.length()) == rest:
				results.push_back("git "+sc)
	
	# Part 1: Only autocomplete after git subcommand.
	# Part2: Prevent autocompletion to only show filename at the beginning of a command.
	if !(command.substr(0,4) == "git " and command.split(" ").size() <= 2) and command.split(" ").size() > 1:
		var last_word = Array(command.split(" ")).pop_back()
		if last_word.length() > 0:
			var file_string = repository.shell.run("find . -type f -not -path '*/\\.git/*'")
			var files = file_string.split("\n")
			files = Array(files)
			# The last entry is an empty string, remove it.
			files.pop_back()
			for file_path in files:
				file_path = file_path.substr(2)
				if file_path.substr(0,4) != ".git" and file_path.substr(0,last_word.length()) == last_word:
					results.push_back(command+file_path.substr(last_word.length()))
	
	return results

func _input_changed(new_text):
	_pending_completion_text = new_text
	if _completion_timer:
		_completion_timer.start()

func _regenerate_pending_completions():
	regenerate_completions_menu(_pending_completion_text)

func _completion_selected():
	var item = completions.get_selected()
	input.text = item.get_text(0)
	input.emit_signal("text_changed", input.text)
	#completions.hide()
	input.grab_focus()
	input.caret_position = input.text.length()

func editor_saved():
	emit_signal("command_done")

func close_all_editors():
	for editor in get_tree().get_nodes_in_group("editors"):
		editor.close()
