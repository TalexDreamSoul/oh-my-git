"use client";

import { Buffer } from 'buffer';
import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommitCanvas } from '../components/CommitCanvas';
import { DarkVeil } from '../components/DarkVeil';
import { LazyFileEditorModal } from '../components/FileEditorModal.lazy';
import { XTermPanel } from '../components/XTermPanel';
import { BrowserGit, CommitSummary, FileStatus, RefSummary } from '../git/browserGit';
import { checkWin, Level, levels, runAction } from '../game/levels';

if (typeof globalThis !== 'undefined') {
  (globalThis as typeof globalThis & { Buffer: typeof Buffer }).Buffer = Buffer;
}

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function statusClass(label?: string): string {
  if (!label) return 'clean';
  if (label.includes('未追踪')) return 'untracked';
  if (label.startsWith('已暂存')) return 'staged';
  if (label.startsWith('未暂存')) return 'unstaged';
  if (label.includes('修改')) return 'modified';
  return 'clean';
}

function avatarText(account: string): string {
  return account.trim().slice(0, 1).toUpperCase() || 'U';
}

type CloudUser = { id: string; name: string; avatar_url?: string | null };

type SavePayload = {
  version: 1;
  currentLevelId: string;
  solvedLevelIds: string[];
  settings: {
    theme: 'dark' | 'light';
    soundEnabled: boolean;
    terminalHeight: number;
  };
};

type LeaderboardEntry = {
  user_id: string;
  name: string;
  avatar_url?: string | null;
  score: number;
  time_seconds: number | null;
  pure_cli: boolean;
};

type AchievementToast = {
  id: string;
  unlocked_at: string;
  achievement?: { title: string; description: string; icon: string };
};

type SeasonLeaderboardEntry = {
  user_id: string;
  name: string;
  total_score: number;
  solved_count: number;
  pure_cli_count: number;
};

type CompletionSummary = {
  levelId: string;
  title: string;
  score: number;
  timeSeconds: number;
  pureCli: boolean;
};

type SoundEvent = 'ui.click' | 'level.start' | 'level.complete' | 'achievement.unlock' | 'git.command';

function difficultyLabel(value: 1 | 2 | 3): string {
  return value === 1 ? '简单' : value === 2 ? '普通' : '困难';
}

function formatSeconds(seconds: number | null | undefined) {
  if (seconds == null) return '--';
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function renderRichText(text: string) {
  const parts = text.split(/(README\.md|feature|main|commit|checkout|detached HEAD|暂存区|工作区|分支|Git|git [a-z-]+(?: [^。；，、]*)?)/g);
  return parts.map((part, index) => {
    if (!part) return null;
    if (/^(README\.md|feature|main|commit|checkout|detached HEAD|暂存区|工作区|分支|Git|git )/.test(part)) {
      return <strong key={`${part}-${index}`}>{part}</strong>;
    }
    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

function LevelDescription({ text }: { text: string }) {
  const matches = [...text.matchAll(/(背景|目标)：([\s\S]*?)(?=(背景|目标)：|$)/g)];
  if (matches.length === 0) return <p>{renderRichText(text)}</p>;
  return <div className="level-description-blocks">{matches.map((match) => <section className="level-description-block" key={match[1]}><span>{match[1]}</span><p>{renderRichText(match[2].trim())}</p></section>)}</div>;
}

const levelGroups = levels.reduce<Array<{ chapter: string; items: Array<{ level: Level; index: number }> }>>((groups, level, index) => {
  const last = groups[groups.length - 1];
  if (last?.chapter === level.chapter) last.items.push({ level, index });
  else groups.push({ chapter: level.chapter, items: [{ level, index }] });
  return groups;
}, []);

export function GameApp() {
  const [accountInput, setAccountInput] = useState('');
  const [account, setAccount] = useState('');
  const [ready, setReady] = useState(false);
  const storageKey = account ? `omg-web-progress:${account}` : 'omg-web-progress:guest';
  const git = useMemo(() => new BrowserGit(account ? `oh-my-git-web:${account}` : 'oh-my-git-web'), [account]);
  const [levelIndex, setLevelIndex] = useState(0);
  const level = levels[levelIndex];
  const [log, setLog] = useState<CommitSummary[]>([]);
  const [status, setStatus] = useState<FileStatus[]>([]);
  const [branch, setBranch] = useState<string | undefined>();
  const [refs, setRefs] = useState<RefSummary[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [message, setMessage] = useState('');
  const [activity, setActivity] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState('');
  const [won, setWon] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [showExamples, setShowExamples] = useState(false);
  const [levelStartedAt, setLevelStartedAt] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pureCli, setPureCli] = useState(true);
  const [solvedLevels, setSolvedLevels] = useState<string[]>([]);
  const [attemptedLevels, setAttemptedLevels] = useState<string[]>([]);
  const [injectedCommand, setInjectedCommand] = useState('');
  const [terminalHeight, setTerminalHeight] = useState(320);
  const [advanceKey, setAdvanceKey] = useState<{ key: 'Enter' | ' '; count: number; at: number } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null);
  const [syncStatus, setSyncStatus] = useState('本地进度');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [myRank, setMyRank] = useState<number | null>(null);
  const [onlineCount, setOnlineCount] = useState<number | null>(null);
  const [seasonName, setSeasonName] = useState('赛季');
  const [seasonLeaderboard, setSeasonLeaderboard] = useState<SeasonLeaderboardEntry[]>([]);
  const [seasonRank, setSeasonRank] = useState<number | null>(null);
  const [achievements, setAchievements] = useState<AchievementToast[]>([]);
  const [completionOpen, setCompletionOpen] = useState(false);
  const [completionSummary, setCompletionSummary] = useState<CompletionSummary | null>(null);
  const completedRef = useRef(new Set<string>());
  const attemptedLevelsRef = useRef(new Set<string>());
  const totalScore = seasonLeaderboard.find((entry) => entry.user_id === cloudUser?.id)?.total_score ?? 0;
  const pureCliCount = seasonLeaderboard.find((entry) => entry.user_id === cloudUser?.id)?.pure_cli_count ?? 0;

  const addActivity = useCallback((item: string) => {
    setActivity((items) => [`${new Date().toLocaleTimeString()} ${item}`, ...items].slice(0, 30));
  }, []);

  const playSound = useCallback((event: SoundEvent) => {
    if (!soundEnabled) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const gain = ctx.createGain();
    gain.gain.value = event === 'level.complete' || event === 'achievement.unlock' ? 0.055 : 0.035;
    gain.connect(ctx.destination);
    const notes = event === 'level.complete' ? [523, 659, 784] : event === 'achievement.unlock' ? [784, 988] : event === 'level.start' ? [330, 440] : event === 'git.command' ? [460] : [420];
    notes.forEach((frequency, index) => {
      const oscillator = ctx.createOscillator();
      oscillator.type = event === 'git.command' ? 'square' : 'sine';
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      const start = ctx.currentTime + index * 0.075;
      oscillator.start(start);
      oscillator.stop(start + 0.08);
    });
  }, [soundEnabled]);

  const saveCloud = useCallback(async (next?: Partial<SavePayload>) => {
    if (!cloudUser) return;
    const payload: SavePayload = {
      version: 1,
      currentLevelId: levels[levelIndex]?.id ?? levels[0].id,
      solvedLevelIds: solvedLevels,
      settings: { theme, soundEnabled, terminalHeight },
      ...next
    };
    try {
      const response = await fetch('/api/save', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload }) });
      setSyncStatus(response.ok ? '云端已保存' : '云端保存失败');
    } catch {
      setSyncStatus('云端保存失败');
    }
  }, [cloudUser, levelIndex, solvedLevels, soundEnabled, terminalHeight, theme]);

  const loadLeaderboard = useCallback(async (levelId: string) => {
    try {
      const response = await fetch(`/api/leaderboard?levelId=${encodeURIComponent(levelId)}&limit=10`);
      if (!response.ok) return;
      const data = await response.json();
      setLeaderboard(data.entries ?? []);
      setMyRank(data.me?.rank ?? null);
    } catch {
      setLeaderboard([]);
      setMyRank(null);
    }
  }, []);

  const loadSeasonLeaderboard = useCallback(async () => {
    try {
      const response = await fetch('/api/season/leaderboard?limit=8');
      if (!response.ok) return;
      const data = await response.json();
      setSeasonLeaderboard(data.entries ?? []);
      setSeasonRank(data.me?.rank ?? null);
    } catch {
      setSeasonLeaderboard([]);
      setSeasonRank(null);
    }
  }, []);

  const refresh = useCallback(
    async (targetLevel: Level = level) => {
      setLog(await git.log());
      setStatus(await git.status());
      setBranch(await git.currentBranch());
      setRefs(await git.refs());
      setFiles(await git.listWorkingFiles());
      const solved = await checkWin(git, targetLevel.win);
      setWon(solved);
      if (solved && !completedRef.current.has(targetLevel.id)) {
        completedRef.current.add(targetLevel.id);
        const currentScore = Math.max(60, 100 - Math.floor(elapsedSeconds / 12) * 5 - (pureCli ? 0 : 10));
        const currentIndex = levels.indexOf(targetLevel);
        localStorage.setItem(storageKey, String(Math.max(levelIndex, currentIndex)));
        playSound('level.complete');
        setCompletionSummary({ levelId: targetLevel.id, title: targetLevel.title, score: currentScore, timeSeconds: elapsedSeconds, pureCli });
        setCompletionOpen(true);
        setMessage(`关卡完成！评分 ${currentScore}`);
        setSolvedLevels((items) => {
          const next = items.includes(targetLevel.id) ? items : [...items, targetLevel.id];
          localStorage.setItem(`${storageKey}:solved`, JSON.stringify(next));
          void saveCloud({ currentLevelId: targetLevel.id, solvedLevelIds: next });
          return next;
        });
        fetch('/api/progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ levelId: targetLevel.id, solved: true, score: currentScore, timeSeconds: elapsedSeconds, pureCli })
        })
          .then(async (response) => (response.ok ? response.json() : null))
          .then((data) => {
            const unlocked = data?.unlockedAchievements ?? [];
            if (unlocked.length > 0) {
              setAchievements(unlocked);
              playSound('achievement.unlock');
            }
            void loadLeaderboard(targetLevel.id);
            void loadSeasonLeaderboard();
          })
          .catch(() => undefined);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [git, level, levelIndex, storageKey, elapsedSeconds, pureCli, loadLeaderboard, loadSeasonLeaderboard, playSound, saveCloud]
  );

  async function loadLevel(index = levelIndex, options?: { solvedLevelIds?: string[]; persist?: boolean }) {
    const nextLevel = levels[index];
    setWon(false);
    setCompletionOpen(false);
    setShowHint(false);
    setShowExamples(false);
    setLevelStartedAt(Date.now());
    setElapsedSeconds(0);
    setPureCli(true);
    setOnlineCount(null);
    completedRef.current.delete(nextLevel.id);
    playSound('level.start');
    if (!attemptedLevelsRef.current.has(nextLevel.id)) {
      attemptedLevelsRef.current.add(nextLevel.id);
      const nextAttempted = [...attemptedLevelsRef.current];
      setAttemptedLevels(nextAttempted);
      localStorage.setItem(`${storageKey}:attempted`, JSON.stringify(nextAttempted));
    }
    setActivity([`${new Date().toLocaleTimeString()} 进入关卡：${nextLevel.title}`]);
    setMessage('关卡已初始化');
    if (options?.persist !== false) await saveCloud({ currentLevelId: nextLevel.id, solvedLevelIds: options?.solvedLevelIds ?? solvedLevels });
    void loadLeaderboard(nextLevel.id);
    await git.resetStorage();
    for (const action of nextLevel.setup) await runAction(git, action);
    await refresh(nextLevel);
  }

  function playTone(type: 'click' | 'success' = 'click') {
    playSound(type === 'success' ? 'level.complete' : 'ui.click');
  }

  async function openPreview(file: string) {
    setPreviewFile(file);
    setPreviewContent(await git.readFile(file));
    addActivity(`打开文件：${file}`);
    playTone('click');
  }

  async function logoutCloud() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setCloudUser(null);
    setSyncStatus('本地进度');
    setOnlineCount(null);
    setMyRank(null);
    setSeasonRank(null);
    setProfileOpen(false);
  }

  function exitLocalAccount() {
    localStorage.removeItem('omg-web-account');
    setAccount('');
    setAccountInput('');
    setProfileOpen(false);
  }

  const score = won ? Math.max(60, 100 - Math.floor(elapsedSeconds / 12) * 5 - (pureCli ? 0 : 10)) : 0;
  const levelWasSolvedBefore = solvedLevels.includes(level.id);

  const handleAfterCommand = useCallback(async () => {
    playSound('git.command');
    await refresh();
  }, [playSound, refresh]);

  useEffect(() => {
    const savedAccount = localStorage.getItem('omg-web-account') ?? '';
    setAccount(savedAccount);
    setAccountInput(savedAccount);
    setSettingsName(savedAccount);
    setTheme(localStorage.getItem('omg-web-theme') === 'light' ? 'light' : 'dark');
    setSoundEnabled(localStorage.getItem('omg-web-sound') !== 'off');
    setTerminalHeight(Number(localStorage.getItem('omg-web-terminal-height') ?? 320));
    void fetch('/api/auth/me')
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.user) {
          setCloudUser(data.user);
          setAccount(data.user.name || savedAccount);
          setAccountInput(data.user.name || savedAccount);
          setSettingsName(data.user.name || savedAccount);
          setSyncStatus('云端已登录');
        }
      })
      .catch(() => undefined);
    void fetch('/api/season')
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data) => setSeasonName(data?.activeSeason?.name ?? '当前赛季'))
      .catch(() => undefined);
    void loadSeasonLeaderboard();
    setReady(true);
  }, [loadSeasonLeaderboard]);

  useEffect(() => {
    if (!ready) return;
    const localSolved = JSON.parse(localStorage.getItem(`${storageKey}:solved`) ?? '[]') as string[];
    const localAttempted = JSON.parse(localStorage.getItem(`${storageKey}:attempted`) ?? '[]') as string[];
    attemptedLevelsRef.current = new Set(localAttempted);
    setAttemptedLevels(localAttempted);
    const savedIndex = Number(localStorage.getItem(storageKey) ?? 0);
    const safeIndex = Number.isFinite(savedIndex) ? Math.min(savedIndex, levels.length - 1) : 0;

    async function boot() {
      let nextSolved = localSolved;
      let nextIndex = safeIndex;
      if (cloudUser) {
        try {
          const [saveResponse, progressResponse] = await Promise.all([fetch('/api/save'), fetch('/api/progress')]);
          const saveData = saveResponse.ok ? await saveResponse.json() : null;
          const progressData = progressResponse.ok ? await progressResponse.json() : null;
          const cloudSolved = (progressData?.progress ?? []).filter((item: any) => item.solved).map((item: any) => item.level_id) as string[];
          const save = saveData?.save as SavePayload | null;
          nextSolved = Array.from(new Set([...(save?.solvedLevelIds ?? []), ...cloudSolved, ...localSolved]));
          if (save?.settings) {
            setTheme(save.settings.theme);
            setSoundEnabled(save.settings.soundEnabled);
            setTerminalHeight(save.settings.terminalHeight);
          }
          const cloudLevelIndex = save?.currentLevelId ? levels.findIndex((item) => item.id === save.currentLevelId) : -1;
          if (cloudLevelIndex >= 0) nextIndex = cloudLevelIndex;
          setSyncStatus('云端已同步');
        } catch {
          setSyncStatus('云端同步失败');
        }
      }
      localStorage.setItem(`${storageKey}:solved`, JSON.stringify(nextSolved));
      localStorage.setItem(storageKey, String(nextIndex));
      if (cloudUser && nextSolved.length > 0) {
        void fetch('/api/progress/sync', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ solvedLevelIds: nextSolved }) })
          .then(async (response) => (response.ok ? response.json() : null))
          .then((data) => {
            const unlocked = data?.unlockedAchievements ?? [];
            if (unlocked.length > 0) setAchievements(unlocked);
            void loadSeasonLeaderboard();
          })
          .catch(() => undefined);
      }
      setSolvedLevels(nextSolved);
      setLevelIndex(nextIndex);
      void loadLevel(nextIndex, { solvedLevelIds: nextSolved, persist: Boolean(cloudUser) });
    }

    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, ready, cloudUser?.id]);

  useEffect(() => {
    if (!won) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const now = Date.now();
      setAdvanceKey((previous) => {
        const nextCount = previous && previous.key === event.key && now - previous.at < 1200 ? previous.count + 1 : 1;
        if (nextCount >= 2) {
          const nextIndex = Math.min(levelIndex + 1, levels.length - 1);
          if (nextIndex !== levelIndex) {
            setLevelIndex(nextIndex);
            void loadLevel(nextIndex);
          }
          return null;
        }
        return { key: event.key as 'Enter' | ' ', count: nextCount, at: now };
      });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [won, levelIndex]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (!won) setElapsedSeconds(Math.floor((Date.now() - levelStartedAt) / 1000));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [levelStartedAt, won]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('omg-web-theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('omg-web-sound', soundEnabled ? 'on' : 'off');
  }, [soundEnabled]);

  useEffect(() => {
    localStorage.setItem('omg-web-terminal-height', String(terminalHeight));
  }, [terminalHeight]);

  useEffect(() => {
    if (!cloudUser || !ready) return;
    const timer = window.setTimeout(() => void saveCloud(), 800);
    return () => window.clearTimeout(timer);
  }, [cloudUser, ready, saveCloud]);

  useEffect(() => {
    if (!cloudUser || !ready || !level?.id) return;
    let stopped = false;
    const heartbeat = async () => {
      try {
        const response = await fetch('/api/presence', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ levelId: level.id }) });
        if (!stopped && response.ok) {
          const data = await response.json();
          setOnlineCount(data.online ?? null);
        }
      } catch {
        if (!stopped) setOnlineCount(null);
      }
    };
    void heartbeat();
    const timer = window.setInterval(heartbeat, 20000);
    return () => { stopped = true; window.clearInterval(timer); };
  }, [cloudUser, level?.id, ready]);

  if (!ready) return null;

  if (!account) {
    return (
      <main className="login-screen" data-theme={theme}>
        <div className="darkveil-layer"><DarkVeil hueShift={0} noiseIntensity={0} scanlineIntensity={0} speed={0.5} scanlineFrequency={0} warpAmount={0} resolutionScale={1} /></div>
        <header className="hero-nav">
          <a href="/" className="hero-logo"><span>&gt;_</span><b>ohmygit</b></a>
          <nav><a href="/#features">Features</a><a href="/#roadmap">Roadmap</a><a href="/#docs">Docs</a><a href="/#about">About</a><a className="hero-signin" href="/login">Sign in</a></nav>
        </header>
        <section className="hero-layout play-login-layout">
          <div className="hero-copy hero-intro-panel">
            <div className="hero-kicker">&gt;_ Learn Git. Level Up.</div>
            <h1>Master Git.<br /><span>One Command</span> at a Time.</h1>
            <p>Oh My Git 把 Git 命令变成一组可交互的剧情关卡：你会在真实终端里创建文件、暂存、提交、切分支，并通过提交图理解每一步发生了什么。</p>
            <div className="hero-course-grid">
              <article><b>01</b><span>基础工作流</span><small>init / add / commit / status</small></article>
              <article><b>02</b><span>时光修补</span><small>restore / reset / detached HEAD</small></article>
              <article><b>03</b><span>分支汇合</span><small>branch / checkout / merge</small></article>
            </div>
            <div className="hero-cta-row"><a href="/login" className="hero-secondary-button primary">开始学习</a><a href="/#features" className="hero-secondary-button">了解玩法</a></div>
            <div className="hero-note">这里专注介绍玩法、路线和学习体验；登录与同步在单独页面完成。</div>
          </div>
          <div className="hero-terminal-card" aria-hidden="true">
            <div className="hero-window-dots"><i /><i /><i /></div>
            <pre>{`$ ohmygit start
Loading your journey...

├─● Introduction
├─○ Repository
│ ├─● Init Your Repo
│ ├─● Clone a Repo
│ └─◉ .gitignore
├─○ Basic Workflow
├─○ Branching
├─○ Remote
└─○ Advanced

        /\\_/\\
       ( o.o )
        > ^ <`}</pre>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell" data-theme={theme} style={{ '--terminal-height': `${terminalHeight}px` } as React.CSSProperties}>
      <aside className="level-sidebar">
        <div className="sidebar-header"><p className="eyebrow">Oh My Git! Web</p><h1>教程</h1></div>
        <nav className="level-list" aria-label="关卡列表">
          {levelGroups.map((group) => (
            <section className="level-group" key={group.chapter}>
              <h2>{group.chapter}</h2>
              {group.items.map(({ level: item, index }) => (
                <button className={`level-item ${index === levelIndex ? 'active' : ''}`} key={item.id} onClick={async () => { playTone('click'); addActivity(`切换关卡：${item.title}`); setLevelIndex(index); await loadLevel(index); }}>
                  <span className="level-number">{String(index + 1).padStart(2, '0')}{solvedLevels.includes(item.id) ? <em className="level-number-status done" title="已通过">✓</em> : attemptedLevels.includes(item.id) ? <em className="level-number-status seen" title="尝试过">!</em> : null}</span>
                  <span><strong>{item.title}<small className={`level-difficulty difficulty-${item.difficulty}`}>{difficultyLabel(item.difficulty)}</small></strong><small>{item.summary}</small></span>
                </button>
              ))}
            </section>
          ))}
        </nav>
        <div className="account-bar profile-account-bar"><div className="avatar">{avatarText(account)}</div><div className="account-meta"><strong>{account}</strong><small>{cloudUser ? syncStatus : '本地学习进度'}</small></div><button onClick={() => setProfileOpen(true)}>档案</button><button onClick={() => { setSettingsName(account); setSettingsOpen(true); }}>设置</button></div>
      </aside>

      <section className="workbench">
        <header className="workbench-header">
          <div><p className="eyebrow">操作台</p><div className="title-row"><h2>{level.title}</h2><span className={`difficulty difficulty-${level.difficulty}`}><i /><i /><i /><b>{difficultyLabel(level.difficulty)}</b></span>{won ? <span className="level-status level-status-done" title="本次已通过"><b>✓</b></span> : levelWasSolvedBefore ? <span className="level-status level-status-seen" title="曾经通过"><b>!</b></span> : null}</div></div>
          <div className="header-score-card">
            <span>{seasonName}</span>
            <span>在线 {onlineCount ?? (cloudUser ? '--' : '登录可见')}</span>
            <span>用时 {formatSeconds(elapsedSeconds)}</span>
            <span>评分 {won ? score : '--'}</span>
          </div>
          <div className="header-actions">
            <span className={`cli-badge ${pureCli ? 'active' : ''}`} title="全程只使用命令行操作时点亮">CLI</span>
            <button onClick={() => loadLevel()}>重置关卡</button>{cloudUser ? <button onClick={() => void logoutCloud()}>退出登录</button> : <button onClick={exitLocalAccount}>退出本地</button>}</div>
        </header>
        <section className="graph-stage"><div className="section-title-row"><h3>提交图</h3><span>当前分支：{branch ?? '无'}</span></div><div className="canvas-wrap"><CommitCanvas commits={log} refs={refs} branch={branch} onCheckoutCommit={async (oid) => { setPureCli(false); await git.checkout(oid); playTone('click'); await refresh(); }} onCreateBranch={async (oid) => { setPureCli(false); const name = window.prompt('新分支名称', `branch-${oid.slice(0, 4)}`)?.trim(); if (!name) return; await git.branch(name, oid); playTone('success'); await refresh(); }} /></div></section>
        <div className="terminal-resizer" onPointerDown={(event) => { const startY = event.clientY; const startHeight = terminalHeight; const onMove = (moveEvent: PointerEvent) => setTerminalHeight(Math.max(180, Math.min(560, startHeight - (moveEvent.clientY - startY)))); const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); }; window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); }} />
        <section className="terminal-stage"><XTermPanel git={git} branch={branch} username={account} injectedCommand={injectedCommand} onAfterCommand={handleAfterCommand} /></section>
      </section>

      <aside className="info-sidebar">
        <section className="info-section description-panel"><p className="eyebrow">关卡描述</p><h2>{level.title}</h2><LevelDescription text={level.description} /><div className="message-line">{message}</div></section>
        <section className="info-section task-section"><h3>任务</h3><ol className="task-list">{level.win.map((condition, index) => {
          const done = won || (condition.type === 'fileExists' && files.includes(condition.path)) || (condition.type === 'fileMissing' && !files.includes(condition.path)) || (condition.type === 'fileStatus' && status.some((item) => item.filepath === condition.path && item.label === condition.label)) || (condition.type === 'commitCountAtLeast' && log.length >= condition.count) || (condition.type === 'branchExists' && refs.some((item) => item.name === condition.name)) || (condition.type === 'branchMissing' && !refs.some((item) => item.name === condition.name)) || (condition.type === 'currentBranch' && (branch ?? '') === condition.name);
          const active = !done && index === 0;
          const label = condition.type === 'fileExists' ? `创建文件 ${condition.path}` : condition.type === 'fileMissing' ? `移除文件 ${condition.path}` : condition.type === 'fileStatus' ? `${condition.path} 状态为 ${condition.label}` : condition.type === 'commitCountAtLeast' ? `至少 ${condition.count} 次提交` : condition.type === 'branchExists' ? `创建分支 ${condition.name}` : condition.type === 'branchMissing' ? `删除分支 ${condition.name}` : condition.type === 'currentBranch' ? `当前分支为 ${condition.name || 'detached HEAD'}` : condition.type === 'branchCommitCountAtLeast' ? `${condition.branch} 至少 ${condition.count} 次提交` : '完成条件';
          return <li className={done ? 'done' : active ? 'active' : ''} key={`${condition.type}-${index}`}><i />{label}</li>;
        })}</ol></section>
        <section className="info-section hint-section"><div className="hint-header"><h3>提示</h3><button onClick={() => setShowHint((value) => !value)}>{showHint ? '收起提示' : '查看提示'}</button></div>{showHint ? <ol className="plain-list ordered">{level.tutorial.map((item) => <li key={item}>{item}</li>)}</ol> : <p className="muted">先自己试试看。需要帮助时再展开提示。</p>}</section>
        <section className="info-section hint-section"><div className="hint-header"><h3>示例命令</h3><button onClick={() => setShowExamples((value) => !value)}>{showExamples ? '收起命令' : '查看命令'}</button></div>{showExamples ? <div className="command-list">{level.commands.map((item) => <button key={item} onClick={() => { setPureCli(false); setInjectedCommand(`${item} `); }}>{item}</button>)}</div> : <p className="muted">如果卡住了，可以展开参考命令。</p>}</section>
        <section className="info-section leaderboard-section"><div className="hint-header"><h3>关卡排行榜</h3>{myRank && <span className="rank-chip">我的排名 #{myRank}</span>}</div>{!cloudUser ? <p className="muted">登录后可提交成绩并查看赛季榜。</p> : leaderboard.length === 0 ? <p className="muted">暂无成绩，成为第一个通关的人吧。</p> : <ol className="leaderboard-list">{leaderboard.map((entry, index) => <li key={entry.user_id}><span className="rank-number">#{index + 1}</span><strong>{entry.name}</strong><small>{entry.score} 分 · {formatSeconds(entry.time_seconds)} · {entry.pure_cli ? 'CLI' : '辅助'}</small></li>)}</ol>}</section>
        <section className="info-section leaderboard-section"><div className="hint-header"><h3>赛季总榜</h3>{seasonRank && <span className="rank-chip">我的排名 #{seasonRank}</span>}</div>{seasonLeaderboard.length === 0 ? <p className="muted">本赛季暂无总榜数据。</p> : <ol className="leaderboard-list season-list">{seasonLeaderboard.map((entry, index) => <li key={entry.user_id}><span className="rank-number">#{index + 1}</span><strong>{entry.name}</strong><small>{entry.total_score} 分 · {entry.solved_count} 关 · CLI {entry.pure_cli_count}</small></li>)}</ol>}</section>
        <section className="info-section"><h3>文件</h3>{files.length === 0 ? <p className="muted">暂无文件。</p> : <ul className="status-list">{files.map((file) => { const fileStatus = status.find((item) => item.filepath === file); return <li key={file}><code className={`status-badge ${statusClass(fileStatus?.label)}`}>{fileStatus?.label ?? '工作区'}</code><button className="file-link" onClick={() => { setPureCli(false); void openPreview(file); }}>{file}</button></li>; })}</ul>}</section>
        <section className="info-section"><h3>操作记录</h3>{activity.length === 0 ? <p className="muted">暂无记录。</p> : <ol className="activity-list">{activity.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol>}</section>
      </aside>

      {previewFile && <Suspense fallback={<div className="modal-backdrop"><section className="modal">加载编辑器...</section></div>}><LazyFileEditorModal file={previewFile} content={previewContent} theme={theme} onChange={setPreviewContent} onClose={() => setPreviewFile(null)} onSave={async () => { setPureCli(false); await git.writeFile(previewFile, previewContent); playTone('success'); await refresh(); setMessage(`已保存 ${previewFile}`); }} /></Suspense>}
      {won && levelIndex < levels.length - 1 && <div className="advance-toast"><strong>关卡完成</strong><span>连续按两次 Enter 或两次 Space 进入下一关</span></div>}
      {completionOpen && completionSummary && <div className="modal-backdrop"><section className="modal completion-modal"><header><div><p className="eyebrow">Level Complete</p><h2>{completionSummary.title}</h2></div><button type="button" onClick={() => setCompletionOpen(false)}>关闭</button></header><div className="completion-score"><strong>{completionSummary.score}</strong><span>评分</span></div><dl className="completion-stats"><div><dt>用时</dt><dd>{formatSeconds(completionSummary.timeSeconds)}</dd></div><div><dt>模式</dt><dd>{completionSummary.pureCli ? '纯 CLI' : '辅助操作'}</dd></div><div><dt>本关排名</dt><dd>{myRank ? `#${myRank}` : cloudUser ? '统计中' : '登录可见'}</dd></div><div><dt>赛季排名</dt><dd>{seasonRank ? `#${seasonRank}` : cloudUser ? '统计中' : '登录可见'}</dd></div></dl>{achievements.length > 0 && <div className="completion-achievements"><h3>新成就</h3>{achievements.map((item) => <span key={item.id}>{item.achievement?.icon ?? '🏆'} {item.achievement?.title ?? item.id}</span>)}</div>}<div className="completion-actions"><button onClick={() => { setCompletionOpen(false); void loadLevel(levelIndex); }}>重玩本关</button>{levelIndex < levels.length - 1 && <button className="primary" onClick={() => { const nextIndex = levelIndex + 1; setLevelIndex(nextIndex); void loadLevel(nextIndex); }}>下一关</button>}</div></section></div>}
      {profileOpen && <div className="modal-backdrop" onClick={() => setProfileOpen(false)}><section className="modal profile-modal" onClick={(event) => event.stopPropagation()}><header><div><p className="eyebrow">Player Profile</p><h2>{account}</h2></div><button type="button" onClick={() => setProfileOpen(false)}>关闭</button></header><div className="profile-hero"><div className="avatar large-avatar">{avatarText(account)}</div><div><strong>{cloudUser ? '云端账号' : '本地账号'}</strong><span>{cloudUser ? syncStatus : '登录后可同步排行榜、成就和赛季数据'}</span></div></div><dl className="profile-stats"><div><dt>已完成</dt><dd>{solvedLevels.length}/{levels.length}</dd></div><div><dt>赛季总分</dt><dd>{cloudUser ? totalScore : '--'}</dd></div><div><dt>纯 CLI</dt><dd>{cloudUser ? pureCliCount : '--'}</dd></div><div><dt>赛季排名</dt><dd>{seasonRank ? `#${seasonRank}` : cloudUser ? '暂无' : '--'}</dd></div></dl><section className="profile-section"><div className="hint-header"><h3>已完成关卡</h3><span className="rank-chip">{solvedLevels.length}</span></div>{solvedLevels.length === 0 ? <p className="muted">还没有完成关卡。</p> : <div className="profile-level-grid">{levels.filter((item) => solvedLevels.includes(item.id)).map((item) => <span key={item.id}>{item.title}</span>)}</div>}</section><section className="profile-section"><div className="hint-header"><h3>账户操作</h3></div><div className="profile-actions">{cloudUser ? <><button onClick={() => void saveCloud({ currentLevelId: level.id })}>立即同步</button><button className="danger" onClick={() => void logoutCloud()}>退出云端登录</button></> : <><a className="profile-link" href="/api/auth/linuxdo">登录 Linux.do</a><button className="danger" onClick={exitLocalAccount}>退出本地账号</button></>}</div></section></section></div>}
      {achievements.length > 0 && <div className="achievement-stack">{achievements.map((item) => <section className="achievement-toast" key={`${item.id}-${item.unlocked_at}`}><span>{item.achievement?.icon ?? '🏆'}</span><div><strong>{item.achievement?.title ?? '解锁成就'}</strong><small>{item.achievement?.description ?? item.id}</small></div><button onClick={() => setAchievements((values) => values.filter((value) => value.id !== item.id))}>×</button></section>)}</div>}
      {settingsOpen && <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}><form className="modal settings-modal" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); const nextName = settingsName.trim(); if (nextName) { localStorage.setItem('omg-web-account', nextName); setAccountInput(nextName); setAccount(nextName); } void saveCloud({ currentLevelId: level.id }); setSettingsOpen(false); }}><header><h2>设置</h2><button type="button" onClick={() => setSettingsOpen(false)}>关闭</button></header><label><span>账号名称</span><input value={settingsName} onChange={(event) => setSettingsName(event.target.value)} /></label><label><span>风格</span><select value={theme} onChange={(event) => setTheme(event.target.value as 'dark' | 'light')}><option value="dark">黑色</option><option value="light">白色</option></select></label><label className="inline-setting"><input type="checkbox" checked={soundEnabled} onChange={(event) => setSoundEnabled(event.target.checked)} /><span>启用页面音效</span></label><button type="submit">保存设置</button></form></div>}
    </main>
  );
}
