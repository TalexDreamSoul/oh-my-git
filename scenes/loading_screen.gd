extends Control

onready var title = $Center/VBoxContainer/Title
onready var progress = $Center/VBoxContainer/ProgressBar
onready var status = $Center/VBoxContainer/Status

var _started = false

func _ready():
	progress.value = 0
	status.text = "正在准备关卡..."
	var level = levels.chapters[game.current_chapter].levels[game.current_level]
	title.text = "正在进入：" + level.title
	set_process(true)

func _process(_delta):
	if _started:
		return
	_started = true
	_show_progress_then_load()

func _show_progress_then_load():
	progress.value = 15
	status.text = "正在切换场景..."
	yield(get_tree(), "idle_frame")
	progress.value = 45
	yield(get_tree(), "idle_frame")
	progress.value = 75
	yield(get_tree(), "idle_frame")
	progress.value = 100
	status.text = "马上完成..."
	yield(get_tree(), "idle_frame")
	var err = get_tree().change_scene("res://scenes/main.tscn")
	if err != OK:
		status.text = "进入关卡失败"
		helpers.crash("无法切换到主场景")
