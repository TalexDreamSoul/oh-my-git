extends Control

onready var level_list = $ScrollContainer/MarginContainer/Levels

func _ready():
	reload()

func load(chapter_id, level_id):
	game.current_chapter = chapter_id
	game.current_level = level_id
	var err = get_tree().change_scene("res://scenes/loading_screen.tscn")
	if err != OK:
		helpers.crash("无法切换到加载场景")

func back():
	get_tree().change_scene("res://scenes/title.tscn")


func reload():
	for child in level_list.get_children():
		child.queue_free()
	
	var chapter_id = 0
	
	levels.reload()
	
	for chapter in levels.chapters:
		var level_id = 0
		
		var l = Label.new()
		l.text = chapter.slug
		l.set("custom_fonts/font", preload("res://fonts/big.tres"))
		l.align = HALIGN_CENTER
		level_list.add_child(l)
		
		for level in chapter.levels:
			var hb = HBoxContainer.new()
			
			var b = Button.new()
			b.text = level.title
			b.align = HALIGN_LEFT
			b.size_flags_horizontal = SIZE_EXPAND_FILL
			
			b.connect("pressed", self, "load", [chapter_id, level_id])
			var slug = chapter.slug + "/" + level.slug
			if slug in game.state["solved_levels"]:
				b.set("custom_colors/font_color", Color(0.1, 0.8, 0.1, 1))
				b.set("custom_colors/font_color_hover", Color(0.1, 0.8, 0.1, 1))
				b.set("custom_colors/font_color_pressed", Color(0.1, 0.8, 0.1, 1))
				
			hb.add_child(b)
#				
			var badge = preload("res://scenes/cli_badge.tscn").instance()
			hb.add_child(badge)
			badge.active = slug in game.state["cli_badge"]
			badge.sparkling = false
				
			level_list.add_child(hb)
			
			if badge.active:
				game.notify("每个不使用卡牌、只用命令行完成的关卡都会获得金色徽章！你能全部用命令行解决吗？", badge, "cli-badge")
			level_id += 1
			
		chapter_id += 1






		
