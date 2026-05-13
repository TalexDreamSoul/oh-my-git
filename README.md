<p align="center">
  <img src="https://github.com/git-learning-game/oh-my-git/blob/main/images/oh-my-git.png" alt="Oh My Git!" width="420">
</p>

<p align="center">
  <img src="https://ld.xh.do/ld-badge.svg" alt="认可linux.do" width="200" height="28">
</p>

# Oh My Git! 简体中文版

**Oh My Git!** 是一款通过可视化互动关卡学习 Git 的开源游戏。本仓库维护的是面向中文玩家的简体中文版本，适合 Git 初学者用游戏化的方式理解提交、分支、合并、远程仓库等核心概念。

## 版本说明

- 已将主流程关卡、卡牌说明和主要 UI 本地化为简体中文。
- Git 命令、文件名、分支名和示例命令保留英文，方便和真实 Git 使用场景对应。
- 内置 Noto Sans CJK SC 字体用于中文显示，字体许可证见 [`fonts/LICENSE-NotoSansCJK.txt`](fonts/LICENSE-NotoSansCJK.txt)。
- 项目基于 Godot 3，暂不支持 Godot 4。

## 下载游玩

可在本仓库的 [GitHub Releases](https://github.com/TalexDreamSoul/oh-my-git/releases) 下载新版安装包：

- Windows：`oh-my-git-windows.zip`
- macOS：`oh-my-git-macos.zip`

原版项目也可在 [itch.io](https://blinry.itch.io/oh-my-git) 获取 Linux、macOS、Windows 版本。

## 从源码运行

1. 安装最新版 [Godot 3](https://godotengine.org/download/3.x)。
2. 克隆本仓库。
3. 在项目目录运行：

   ```bash
   godot scenes/main.tscn
   ```

   或者用 Godot 3 打开 [`project.godot`](project.godot) 后运行。

> 在 Debian/Ubuntu 上 Godot 3 的命令可能是 `godot3`。

## 构建发布包

构建需要 Godot 3 的 [export templates](https://docs.godotengine.org/en/stable/getting_started/workflow/export/exporting_projects.html)，以及 `zip`、`wget`、`7z` 等工具。

```bash
make macos
make windows
```

输出文件位于 `build/` 目录：

```text
build/oh-my-git-macos.zip
build/oh-my-git-windows.zip
```

本仓库已配置 GitHub Actions：推送 tag 时会自动构建 Windows / macOS 两个包，并发布到 GitHub Release。

## 自定义关卡

你可以创建自己的 Git 练习关卡：

1. 安装 Godot 3。
2. 克隆仓库并运行游戏。
3. 查看 [`levels`](levels) 目录中的现有关卡。
4. 复制一个现有关卡，或按下面的格式编写新关卡。
5. 在游戏中测试，确认无误后可以提交 PR。

### 关卡格式

```text
title = This is the level's title

[description]

This text will be shown when the level starts.

[cli]

(optional) This text will be shown below the level description in a darker color.
It can provide command line hints.

[congrats]

This text will be shown after the player has solved the level.

[setup]

# Bash commands that set up the initial state of the level.
# An initial `git init` is always done automatically.
# The default branch is called `main`.

echo You > people_who_are_awesome
git add .
git commit -m "Initial commit"

[win]

# Bash commands that check whether the level is solved.
# Return 0 if solved, non-zero otherwise.

test "$(git show HEAD:people_who_are_awesome | wc -l)" -ge 2
```

一个关卡可以包含多个仓库。需要多个仓库时，可使用 `[setup <name>]` 和 `[win <name>]` 这样的 section，其中 `<name>` 是远程仓库名；默认仓库名为 `yours`。所有仓库会互相添加为 remote。可以参考 [`levels/remotes`](levels/remotes) 中的示例。

## 反馈与贡献

如果发现翻译、关卡、UI 或打包问题，欢迎提交 Issue 或 Pull Request。

开发者可以用 Godot 3 打开项目：

```bash
godot project.godot
```

然后按 `F5` 运行。由于 Godot 的场景文件 `*.tscn` 合并冲突较难处理，修改既有场景文件前建议先开 Issue 讨论。

## 特别感谢

- 101-010-000
- TomHolland
- linux.do 社区支持

## 原项目与维护状态

Oh My Git! 最初由 bleeptrack 和 blinry 在 2020/2021 年开发，并获得 Prototype Fund 六个月资助。原项目目前处于低维护状态，简单修复仍可能被审阅合并，但较大改动可能需要较长时间。

## Funding

原项目在 2020/2021 年获得 [Prototype Fund](https://www.prototypefund.de) 六个月资助。

<a href="https://www.bmbf.de/en/"><img src="https://www.dipf.de/en/images/BMBF_4C_M_e.jpg/@@download/image/BMBF_4C_M_e.jpg" alt="Logo of the German Ministry for Education and Research" height="100px"></a>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; <a href="https://prototypefund.de/en/"><img src="https://raw.githubusercontent.com/prototypefund/ptf-ci/main/logos/PrototypeFund-Icon.svg" alt="Logo of the Prototype Fund" height="100px"></a>&nbsp; &nbsp; &nbsp; &nbsp; &nbsp; &nbsp; <a href="https://okfn.de/en/"><img src="https://upload.wikimedia.org/wikipedia/commons/4/4d/Open_Knowledge_Foundation_Deutschland_Logo.svg" alt="Logo of the Open Knowledge Foundation Germany" height="100px"></a>

## Thanks

- "success" sound by [Leszek_Szarzy, CC0](https://freesound.org/people/Leszek_Szary/sounds/171670/)
- "swish" sound by [jawbutch, CC0](https://freesound.org/people/jawbutch/sounds/344408/)
- "swoosh" sound by [WizardOZ, CC0](https://freesound.org/people/WizardOZ/sounds/419341/)
- "poof" sound by [Saviraz, CC0](https://freesound.org/people/Saviraz/sounds/512217/)
- "buzzer" sound by [Loyalty_Freak_Music, CC0](https://freesound.org/people/Loyalty_Freak_Music/sounds/407466/)
- "typewriter_ding" sound by [_stubb, CC0](https://freesound.org/people/_stubb/sounds/406243/)

## License

[Blue Oak Model License 1.0.0](LICENSE.md) – a [modern alternative](https://writing.kemitchell.com/2019/03/09/Deprecation-Notice.html) to the MIT license.
