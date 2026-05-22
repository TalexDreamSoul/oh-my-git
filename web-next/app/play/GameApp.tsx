"use client";

import { Buffer } from 'buffer';
import { Fragment, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CommitCanvas } from '../components/CommitCanvas';
import { DarkVeil } from '../components/DarkVeil';
import { LazyFileEditorModal } from '../components/FileEditorModal.lazy';
import { XTermPanel } from '../components/XTermPanel';
import { BrowserGit, CommitSummary, FileStatus, RefSummary } from '../git/browserGit';
import { getChapterRecap } from '../game/chapterRecaps';
import { getLevelHintPack } from '../game/levelHints';
import { checkCondition, checkWin, Level, levels, runAction } from '../game/levels';

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

type CloudUser = { id: string; name: string; avatar_url?: string | null; leaderboard_anonymous?: boolean };

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

function renderInlineCode(text: string) {
  return text.split(/(`[^`]+`)/g).map((part, index) => {
    if (!part) return null;
    if (part.startsWith('`') && part.endsWith('`')) return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
    return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
  });
}

function conditionLabel(condition: Level['win'][number]): string {
  if (condition.type === 'fileExists') return `创建文件 ${condition.path}`;
  if (condition.type === 'fileMissing') return `移除文件 ${condition.path}`;
  if (condition.type === 'fileContentContains') return `${condition.path} 包含 ${condition.content}`;
  if (condition.type === 'fileContentContainsAny') return `${condition.path} 包含任一目标内容`;
  if (condition.type === 'fileInHeadEquals') return `提交中的 ${condition.path} 精确匹配目标内容`;
  if (condition.type === 'headFileContains') return `提交中的 ${condition.path} 包含 ${condition.content}`;
  if (condition.type === 'fileStatus') return `${condition.path} 状态为 ${condition.label}`;
  if (condition.type === 'commitCountAtLeast') return `至少 ${condition.count} 次提交`;
  if (condition.type === 'branchExists') return `创建分支 ${condition.name}`;
  if (condition.type === 'branchMissing') return `删除分支 ${condition.name}`;
  if (condition.type === 'currentBranch') return `当前分支为 ${condition.name || 'detached HEAD'}`;
  if (condition.type === 'branchCommitCountAtLeast') return `${condition.branch} 至少 ${condition.count} 次提交`;
  if (condition.type === 'tagExists') return `创建标签 ${condition.name}`;
  if (condition.type === 'tagMissing') return `删除标签 ${condition.name}`;
  if (condition.type === 'stashCountAtLeast') return `stash 至少 ${condition.count} 条`;
  if (condition.type === 'hasConflictMarkers') return `${condition.path} 出现冲突标记`;
  if (condition.type === 'noConflictMarkers') return `${condition.path} 无冲突标记`;
  if (condition.type === 'ignored') return `${condition.path} 已被忽略`;
  if (condition.type === 'reflogContains') return `reflog 包含 ${condition.content}`;
  if (condition.type === 'bisectFound') return 'bisect 找到坏提交';
  if (condition.type === 'objectType') return `${condition.ref ?? 'HEAD'} 是 ${condition.objectType} 对象`;
  if (condition.type === 'objectContains') return `${condition.ref ?? 'HEAD'} 对象包含 ${condition.content}`;
  return '完成条件';
}

function isLevelUnlocked(index: number, solvedIds: string[]): boolean {
  if (index <= 0) return true;
  return solvedIds.includes(levels[index - 1].id);
}

function firstLockedIndex(solvedIds: string[]): number {
  return levels.findIndex((_level, index) => !isLevelUnlocked(index, solvedIds));
}

function highestUnlockedIndex(solvedIds: string[]): number {
  const locked = firstLockedIndex(solvedIds);
  return locked === -1 ? levels.length - 1 : Math.max(0, locked - 1);
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
  const [account, setAccount] = useState('');
  const [ready, setReady] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [syncGateOpen, setSyncGateOpen] = useState(false);
  const [cloudUser, setCloudUser] = useState<CloudUser | null>(null);
  const storageKey = cloudUser ? `omg-web-progress:${cloudUser.id}` : 'omg-web-progress:auth';
  const git = useMemo(() => new BrowserGit(cloudUser ? `oh-my-git-web:${cloudUser.id}` : 'oh-my-git-web:auth'), [cloudUser?.id]);
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
  const [revealedHintCount, setRevealedHintCount] = useState(0);
  const [showExamples, setShowExamples] = useState(false);
  const [levelStartedAt, setLevelStartedAt] = useState(() => Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [pureCli, setPureCli] = useState(true);
  const [solvedLevels, setSolvedLevels] = useState<string[]>([]);
  const [attemptedLevels, setAttemptedLevels] = useState<string[]>([]);
  const [conditionStates, setConditionStates] = useState<boolean[]>([]);
  const [injectedCommand, setInjectedCommand] = useState('');
  const [terminalHeight, setTerminalHeight] = useState(320);
  const [advanceKey, setAdvanceKey] = useState<{ key: 'Enter' | ' '; count: number; at: number } | null>(null);
  const [accountModalOpen, setAccountModalOpen] = useState(false);
  const [accountModalTab, setAccountModalTab] = useState<'profile' | 'settings' | 'account'>('profile');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [profileName, setProfileName] = useState('');
  const [leaderboardAnonymous, setLeaderboardAnonymous] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState('等待登录');
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
  const hintPack = useMemo(() => getLevelHintPack(level), [level]);
  const chapterRecap = useMemo(() => getChapterRecap(level.chapter), [level.chapter]);
  const chapterItems = useMemo(() => levelGroups.find((group) => group.chapter === level.chapter)?.items ?? [], [level.chapter]);
  const chapterCompleted = chapterItems.length > 0 && chapterItems.every(({ level: item }) => solvedLevels.includes(item.id));
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
      const checks = await Promise.all(targetLevel.win.map((condition) => checkCondition(git, condition)));
      setConditionStates(checks);
      const targetIndex = levels.indexOf(targetLevel);
      const targetUnlocked = isLevelUnlocked(targetIndex, solvedLevels);
      const solved = targetUnlocked && checks.every(Boolean);
      setWon(solved);
      if (checks.every(Boolean) && !targetUnlocked) setMessage('该关卡尚未解锁，仅可预览，完成状态不会记录。');
      if (solved && !completedRef.current.has(targetLevel.id)) {
        completedRef.current.add(targetLevel.id);
        const currentScore = Math.max(60, 100 - Math.floor(elapsedSeconds / 12) * 5 - (pureCli ? 0 : 10));
        const currentIndex = levels.indexOf(targetLevel);
        const nextProgressIndex = Math.min(levels.length - 1, currentIndex + 1);
        localStorage.setItem(storageKey, String(Math.max(levelIndex, nextProgressIndex)));
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
    [git, level, levelIndex, storageKey, elapsedSeconds, pureCli, solvedLevels, loadLeaderboard, loadSeasonLeaderboard, playSound, saveCloud]
  );

  async function loadLevel(index = levelIndex, options?: { solvedLevelIds?: string[]; persist?: boolean; preview?: boolean }) {
    const nextLevel = levels[index];
    const nextSolvedIds = options?.solvedLevelIds ?? solvedLevels;
    const unlocked = isLevelUnlocked(index, nextSolvedIds);
    setWon(false);
    setConditionStates([]);
    setCompletionOpen(false);
    setRevealedHintCount(0);
    setShowExamples(false);
    setLevelStartedAt(Date.now());
    setElapsedSeconds(0);
    setPureCli(true);
    setOnlineCount(null);
    completedRef.current.delete(nextLevel.id);
    playSound('level.start');
    if (unlocked && !attemptedLevelsRef.current.has(nextLevel.id)) {
      attemptedLevelsRef.current.add(nextLevel.id);
      const nextAttempted = [...attemptedLevelsRef.current];
      setAttemptedLevels(nextAttempted);
      localStorage.setItem(`${storageKey}:attempted`, JSON.stringify(nextAttempted));
    }
    setActivity([`${new Date().toLocaleTimeString()} ${unlocked ? '进入关卡' : '预览锁定关卡'}：${nextLevel.title}`]);
    setMessage(unlocked ? '关卡已初始化' : '该关卡尚未解锁：只能查看内容，终端和编辑操作已锁定。');
    if (unlocked && options?.persist !== false) await saveCloud({ currentLevelId: nextLevel.id, solvedLevelIds: nextSolvedIds });
    void loadLeaderboard(nextLevel.id);
    await git.resetStorage();
    for (const action of nextLevel.setup) await runAction(git, action);
    await refresh(nextLevel);
  }

  function playTone(type: 'click' | 'success' = 'click') {
    playSound(type === 'success' ? 'level.complete' : 'ui.click');
  }

  async function openPreview(file: string) {
    if (!levelUnlocked) {
      setMessage('该关卡尚未解锁：只能查看说明，不能打开或编辑文件。');
      return;
    }
    setPreviewFile(file);
    setPreviewContent(await git.readFile(file));
    addActivity(`打开文件：${file}`);
    playTone('click');
  }

  async function logoutCloud() {
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setCloudUser(null);
    setAccount('');
    setProfileName('');
    setLeaderboardAnonymous(false);
    setSyncStatus('等待登录');
    setOnlineCount(null);
    setMyRank(null);
    setSeasonRank(null);
    setAccountModalOpen(false);
    window.location.href = '/login';
  }

  async function savePreferenceSettings() {
    await saveCloud({ currentLevelId: level.id });
    setAccountModalTab('profile');
  }

  async function saveProfileSettings() {
    const nextName = profileName.trim();
    if (!nextName) {
      setMessage('显示名不能为空。');
      return;
    }
    setProfileSaving(true);
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nextName, leaderboardAnonymous })
      });
      if (!response.ok) throw new Error('profile update failed');
      const data = await response.json();
      setCloudUser(data.user);
      setAccount(data.user.name || nextName);
      setProfileName(data.user.name || nextName);
      setLeaderboardAnonymous(Boolean(data.user.leaderboard_anonymous));
      setSyncStatus('资料已保存');
      void loadLeaderboard(level.id);
      void loadSeasonLeaderboard();
    } catch {
      setMessage('资料保存失败，请稍后重试。');
    } finally {
      setProfileSaving(false);
    }
  }

  const score = won ? Math.max(60, 100 - Math.floor(elapsedSeconds / 12) * 5 - (pureCli ? 0 : 10)) : 0;
  const levelWasSolvedBefore = solvedLevels.includes(level.id);
  const levelUnlocked = isLevelUnlocked(levelIndex, solvedLevels);
  const highestAvailableLevelIndex = highestUnlockedIndex(solvedLevels);

  const handleAfterCommand = useCallback(async () => {
    if (!levelUnlocked) {
      setMessage('该关卡尚未解锁：终端已锁定，请先完成前置关卡。');
      return;
    }
    playSound('git.command');
    await refresh();
  }, [levelUnlocked, playSound, refresh]);

  useEffect(() => {
    localStorage.removeItem('omg-web-account');
    setTheme(localStorage.getItem('omg-web-theme') === 'light' ? 'light' : 'dark');
    setSoundEnabled(localStorage.getItem('omg-web-sound') !== 'off');
    setTerminalHeight(Number(localStorage.getItem('omg-web-terminal-height') ?? 320));
    void fetch('/api/auth/me')
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data) => {
        if (data?.user) {
          setCloudUser(data.user);
          setAccount(data.user.name || 'Git Player');
          setProfileName(data.user.name || 'Git Player');
          setLeaderboardAnonymous(Boolean(data.user.leaderboard_anonymous));
          setSyncStatus('云端已登录');
        } else {
          setCloudUser(null);
          setAccount('');
          setProfileName('');
          setLeaderboardAnonymous(false);
          setSyncStatus('等待登录');
        }
      })
      .catch(() => {
        setCloudUser(null);
        setAccount('');
        setProfileName('');
        setLeaderboardAnonymous(false);
        setSyncStatus('登录状态检查失败');
      })
      .finally(() => setAuthChecked(true));
    void fetch('/api/season')
      .then(async (response) => (response.ok ? response.json() : null))
      .then((data) => setSeasonName(data?.activeSeason?.name ?? '当前赛季'))
      .catch(() => undefined);
    void loadSeasonLeaderboard();
  }, [loadSeasonLeaderboard]);

  useEffect(() => {
    if (!authChecked || !cloudUser) return;
    setReady(false);
    setSyncGateOpen(true);
    const localSolved = JSON.parse(localStorage.getItem(`${storageKey}:solved`) ?? '[]') as string[];
    const localAttempted = JSON.parse(localStorage.getItem(`${storageKey}:attempted`) ?? '[]') as string[];
    attemptedLevelsRef.current = new Set(localAttempted);
    setAttemptedLevels(localAttempted);
    const savedIndex = Number(localStorage.getItem(storageKey) ?? 0);
    const safeIndex = Number.isFinite(savedIndex) ? Math.min(savedIndex, levels.length - 1) : 0;

    async function boot() {
      let nextSolved = localSolved;
      let nextIndex = safeIndex;
      try {
        setSyncStatus('正在同步云端存档...');
        const [saveResponse, progressResponse] = await Promise.all([fetch('/api/save'), fetch('/api/progress')]);
        const saveData = saveResponse.ok ? await saveResponse.json() : null;
        const progressData = progressResponse.ok ? await progressResponse.json() : null;
        const validLevelIds = new Set(levels.map((item) => item.id));
        const cloudSolved = (progressData?.progress ?? []).filter((item: any) => item.solved && validLevelIds.has(item.level_id)).map((item: any) => item.level_id) as string[];
        const save = saveData?.save as SavePayload | null;
        nextSolved = Array.from(new Set([...(save?.solvedLevelIds ?? []), ...cloudSolved, ...localSolved])).filter((id) => validLevelIds.has(id));
        if (save?.settings) {
          setTheme(save.settings.theme);
          setSoundEnabled(save.settings.soundEnabled);
          setTerminalHeight(save.settings.terminalHeight);
        }
        const cloudLevelIndex = save?.currentLevelId ? levels.findIndex((item) => item.id === save.currentLevelId) : -1;
        if (cloudLevelIndex >= 0) nextIndex = Math.min(cloudLevelIndex, highestUnlockedIndex(nextSolved));
        else nextIndex = Math.min(nextIndex, highestUnlockedIndex(nextSolved));
        setSyncStatus('云端已同步');
      } catch {
        setSyncStatus('云端同步失败，已加载浏览器缓存');
      }
      nextIndex = Math.min(nextIndex, highestUnlockedIndex(nextSolved));
      localStorage.setItem(`${storageKey}:solved`, JSON.stringify(nextSolved));
      localStorage.setItem(storageKey, String(nextIndex));
      if (nextSolved.length > 0) {
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
      await loadLevel(nextIndex, { solvedLevelIds: nextSolved, persist: true });
      setReady(true);
      window.setTimeout(() => setSyncGateOpen(false), 450);
    }

    void boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, cloudUser?.id]);

  useEffect(() => {
    if (!won) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      const now = Date.now();
      setAdvanceKey((previous) => {
        const nextCount = previous && previous.key === event.key && now - previous.at < 1200 ? previous.count + 1 : 1;
        if (nextCount >= 2) {
          const nextIndex = Math.min(levelIndex + 1, levels.length - 1);
          if (nextIndex !== levelIndex && isLevelUnlocked(nextIndex, solvedLevels)) {
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

  if (!authChecked) return null;

  if (!cloudUser) {
    if (typeof window !== 'undefined') window.location.href = '/login';
    return (
      <main className="login-screen" data-theme={theme}>
        <div className="darkveil-layer"><DarkVeil hueShift={0} noiseIntensity={0} scanlineIntensity={0} speed={0.5} scanlineFrequency={0} warpAmount={0} resolutionScale={1} /></div>
        <section className="auth-required-panel"><div className="sync-spinner" /><h1>需要登录</h1><p>正在跳转到登录页...</p><a className="hero-secondary-button primary" href="/login">立即登录</a></section>
      </main>
    );
  }

  if (!ready) {
    return (
      <main className="login-screen" data-theme={theme}>
        <div className="darkveil-layer"><DarkVeil hueShift={0} noiseIntensity={0} scanlineIntensity={0} speed={0.5} scanlineFrequency={0} warpAmount={0} resolutionScale={1} /></div>
        <section className="auth-required-panel"><div className="sync-spinner" /><h1>正在同步存档</h1><p>{syncStatus}</p></section>
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
              {group.items.map(({ level: item, index }) => {
                const unlocked = isLevelUnlocked(index, solvedLevels);
                return (
                  <button className={`level-item ${index === levelIndex ? 'active' : ''} ${unlocked ? '' : 'locked'}`} key={item.id} onClick={async () => { playTone('click'); addActivity(`${unlocked ? '切换关卡' : '预览锁定关卡'}：${item.title}`); setLevelIndex(index); await loadLevel(index); }} aria-disabled={!unlocked} title={unlocked ? item.title : `完成第 ${highestAvailableLevelIndex + 1} 关后解锁`}>
                    <span className="level-number">{String(index + 1).padStart(2, '0')}{solvedLevels.includes(item.id) ? <em className="level-number-status done" title="已通过">✓</em> : unlocked && attemptedLevels.includes(item.id) ? <em className="level-number-status seen" title="尝试过">!</em> : !unlocked ? <em className="level-number-status locked" title="未解锁">🔒</em> : null}</span>
                    <span><strong>{item.title}<small className={`level-difficulty difficulty-${item.difficulty}`}>{difficultyLabel(item.difficulty)}</small></strong><small>{unlocked ? item.summary : '未解锁 · 只能预览'}</small></span>
                  </button>
                );
              })}
            </section>
          ))}
        </nav>
        <div className="account-bar profile-account-bar"><div className="avatar">{avatarText(account)}</div><div className="account-meta"><strong>{account}</strong><small>{syncStatus}</small></div><button onClick={() => { setAccountModalTab('profile'); setAccountModalOpen(true); }}>账户</button></div>
      </aside>

      <section className="workbench" key={level.id}>
        <header className="workbench-header">
          <div><p className="eyebrow">操作台</p><div className="title-row"><h2>{level.title}</h2><span className={`difficulty difficulty-${level.difficulty}`}><i /><i /><i /><b>{difficultyLabel(level.difficulty)}</b></span>{won ? <span className="level-status level-status-done" title="本次已通过"><b>✓</b></span> : levelWasSolvedBefore ? <span className="level-status level-status-seen" title="曾经通过"><b>!</b></span> : null}</div></div>
          <div className="header-score-card">
            <span>{seasonName}</span>
            <span>在线 {onlineCount ?? '--'}</span>
            <span>用时 {formatSeconds(elapsedSeconds)}</span>
            <span>评分 {won ? score : '--'}</span>
          </div>
          <div className="header-actions">
            <span className={`cli-badge ${pureCli ? 'active' : ''}`} title="全程只使用命令行操作时点亮">CLI</span>
            <button onClick={() => loadLevel()}>重置关卡</button><button onClick={() => { setAccountModalTab('account'); setAccountModalOpen(true); }}>账户</button></div>
        </header>
        <section className={`graph-stage ${levelUnlocked ? '' : 'stage-locked'}`}><div className="section-title-row"><h3>提交图</h3><span>{levelUnlocked ? `当前分支：${branch ?? '无'}` : '未解锁 · 仅预览'}</span></div><div className="canvas-wrap"><CommitCanvas commits={log} refs={refs} branch={branch} onCheckoutCommit={async (oid) => { if (!levelUnlocked) { setMessage('该关卡尚未解锁：提交图操作已锁定。'); return; } setPureCli(false); await git.checkout(oid); playTone('click'); await refresh(); }} onCreateBranch={async (oid) => { if (!levelUnlocked) { setMessage('该关卡尚未解锁：提交图操作已锁定。'); return; } setPureCli(false); const name = window.prompt('新分支名称', `branch-${oid.slice(0, 4)}`)?.trim(); if (!name) return; await git.branch(name, oid); playTone('success'); await refresh(); }} />{!levelUnlocked && <div className="locked-stage-overlay"><strong>未解锁</strong><span>请先完成前置关卡。当前只能查看提交图，不能操作。</span></div>}</div></section>
        <div className="terminal-resizer" onPointerDown={(event) => { const startY = event.clientY; const startHeight = terminalHeight; const onMove = (moveEvent: PointerEvent) => setTerminalHeight(Math.max(180, Math.min(560, startHeight - (moveEvent.clientY - startY)))); const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); }; window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); }} />
        <section className={`terminal-stage ${levelUnlocked ? '' : 'stage-locked'}`}><XTermPanel git={git} branch={branch} username={account} injectedCommand={injectedCommand} onAfterCommand={handleAfterCommand} locked={!levelUnlocked} lockedMessage="该关卡尚未解锁：终端已锁定，请先完成前置关卡。" />{!levelUnlocked && <div className="locked-stage-overlay terminal-lock"><strong>终端已锁定</strong><span>第 {levelIndex + 1} 关尚未解锁。请先完成第 {highestAvailableLevelIndex + 1} 关。</span></div>}</section>
      </section>

      <aside className="info-sidebar">
        <section className="info-section description-panel"><p className="eyebrow">关卡描述</p><h2>{level.title}</h2>{!levelUnlocked && <div className="locked-level-banner"><strong>未解锁</strong><span>当前仅可查看教程内容。终端、文件编辑、提交图操作和完成记录都已锁定。</span></div>}<LevelDescription text={level.description} /><div className="message-line">{message}</div></section>
        <section className="info-section task-section"><h3>任务</h3><ol className="task-list">{level.win.map((condition, index) => {
          const done = levelUnlocked && (won || Boolean(conditionStates[index]));
          const active = !done && index === 0;
          return <li className={done ? 'done' : active ? 'active' : ''} key={`${condition.type}-${index}`}><i />{conditionLabel(condition)}</li>;
        })}</ol></section>
        <section className="info-section hint-section"><div className="hint-header"><h3>分层提示</h3><button onClick={() => setRevealedHintCount((value) => Math.min(3, value + 1))} disabled={revealedHintCount >= 3}>{revealedHintCount >= 3 ? '已全部展开' : `展开第 ${revealedHintCount + 1} 层`}</button></div>{revealedHintCount === 0 ? <p className="muted">先自己试试看。提示会按“思路 → 方向 → 完整命令”逐层展开。</p> : <ol className="hint-layers"><li className="revealed"><strong>思路</strong><span>{renderInlineCode(hintPack.concept)}</span></li>{revealedHintCount >= 2 && <li className="revealed"><strong>命令方向</strong><span>{renderInlineCode(hintPack.direction)}</span></li>}{revealedHintCount >= 3 && <li className="revealed danger"><strong>完整参考</strong><span>{renderInlineCode(hintPack.command)}</span></li>}</ol>}{revealedHintCount > 0 && <button className="subtle-inline-button" onClick={() => setRevealedHintCount(0)}>收起提示</button>}</section>
        <section className="info-section hint-section"><div className="hint-header"><h3>教程要点</h3></div><ol className="plain-list ordered">{level.tutorial.map((item) => <li key={item}>{item}</li>)}</ol></section>
        <section className="info-section hint-section"><div className="hint-header"><h3>示例命令</h3><button onClick={() => setShowExamples((value) => !value)}>{showExamples ? '收起命令' : '查看命令'}</button></div>{showExamples ? <div className="command-list">{level.commands.map((item) => <button key={item} disabled={!levelUnlocked} onClick={() => { if (!levelUnlocked) { setMessage('该关卡尚未解锁：示例命令不能注入终端。'); return; } setPureCli(false); setInjectedCommand(`${item} `); }}>{item}</button>)}</div> : <p className="muted">如果卡住了，可以展开参考命令。</p>}</section>
        {chapterRecap && <section className={`info-section chapter-recap-section ${chapterCompleted ? 'completed' : ''}`}><div className="hint-header"><h3>章节复盘</h3><span className="rank-chip">{chapterCompleted ? '已完成' : `${chapterItems.filter(({ level: item }) => solvedLevels.includes(item.id)).length}/${chapterItems.length}`}</span></div><p className="eyebrow">{chapterRecap.theme}</p><p>{chapterRecap.summary}</p><ul className="recap-list">{chapterRecap.lessons.map((item) => <li key={item}>{item}</li>)}</ul><p className="recap-practice"><strong>实战提醒：</strong>{chapterRecap.practice}</p>{chapterCompleted && <p className="recap-next"><strong>下一步：</strong>{chapterRecap.next}</p>}</section>}
        <section className="info-section leaderboard-section"><div className="hint-header"><h3>关卡排行榜</h3>{myRank && <span className="rank-chip">我的排名 #{myRank}</span>}</div>{leaderboard.length === 0 ? <p className="muted">暂无成绩，成为第一个通关的人吧。</p> : <ol className="leaderboard-list">{leaderboard.map((entry, index) => <li key={entry.user_id}><span className="rank-number">#{index + 1}</span><strong>{entry.name}</strong><small>{entry.score} 分 · {formatSeconds(entry.time_seconds)} · {entry.pure_cli ? 'CLI' : '辅助'}</small></li>)}</ol>}</section>
        <section className="info-section leaderboard-section"><div className="hint-header"><h3>赛季总榜</h3>{seasonRank && <span className="rank-chip">我的排名 #{seasonRank}</span>}</div>{seasonLeaderboard.length === 0 ? <p className="muted">本赛季暂无总榜数据。</p> : <ol className="leaderboard-list season-list">{seasonLeaderboard.map((entry, index) => <li key={entry.user_id}><span className="rank-number">#{index + 1}</span><strong>{entry.name}</strong><small>{entry.total_score} 分 · {entry.solved_count} 关 · CLI {entry.pure_cli_count}</small></li>)}</ol>}</section>
        <section className="info-section"><h3>文件</h3>{files.length === 0 ? <p className="muted">暂无文件。</p> : <ul className="status-list">{files.map((file) => { const fileStatus = status.find((item) => item.filepath === file); return <li key={file}><code className={`status-badge ${statusClass(fileStatus?.label)}`}>{fileStatus?.label ?? '工作区'}</code><button className="file-link" disabled={!levelUnlocked} onClick={() => { if (!levelUnlocked) { setMessage('该关卡尚未解锁：文件编辑已锁定。'); return; } setPureCli(false); void openPreview(file); }}>{file}</button></li>; })}</ul>}</section>
        <section className="info-section"><h3>操作记录</h3>{activity.length === 0 ? <p className="muted">暂无记录。</p> : <ol className="activity-list">{activity.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol>}</section>
      </aside>

      {syncGateOpen && <div className="modal-backdrop sync-gate"><section className="modal sync-gate-modal"><div className="sync-spinner" /><p className="eyebrow">Cloud Save</p><h2>正在同步你的云端存档</h2><p className="muted">{syncStatus}。同步完成前暂时锁定游戏界面，避免覆盖存档。</p></section></div>}
      {previewFile && <Suspense fallback={<div className="modal-backdrop"><section className="modal">加载编辑器...</section></div>}><LazyFileEditorModal file={previewFile} content={previewContent} theme={theme} onChange={setPreviewContent} onClose={() => setPreviewFile(null)} onSave={async () => { if (!levelUnlocked) { setMessage('该关卡尚未解锁：文件编辑已锁定。'); setPreviewFile(null); return; } setPureCli(false); await git.writeFile(previewFile, previewContent); playTone('success'); await refresh(); setMessage(`已保存 ${previewFile}`); }} /></Suspense>}
      {won && levelIndex < levels.length - 1 && <div className="advance-toast"><strong>关卡完成</strong><span>连续按两次 Enter 或两次 Space 进入下一关</span></div>}
      {completionOpen && completionSummary && <div className="modal-backdrop"><section className="modal completion-modal"><header><div><p className="eyebrow">Level Complete</p><h2>{completionSummary.title}</h2></div><button type="button" onClick={() => setCompletionOpen(false)}>关闭</button></header><div className="completion-score"><strong>{completionSummary.score}</strong><span>评分</span></div><dl className="completion-stats"><div><dt>用时</dt><dd>{formatSeconds(completionSummary.timeSeconds)}</dd></div><div><dt>模式</dt><dd>{completionSummary.pureCli ? '纯 CLI' : '辅助操作'}</dd></div><div><dt>本关排名</dt><dd>{myRank ? `#${myRank}` : '统计中'}</dd></div><div><dt>赛季排名</dt><dd>{seasonRank ? `#${seasonRank}` : '统计中'}</dd></div></dl>{achievements.length > 0 && <div className="completion-achievements"><h3>新成就</h3>{achievements.map((item) => <span key={item.id}>{item.achievement?.icon ?? '🏆'} {item.achievement?.title ?? item.id}</span>)}</div>}<div className="completion-actions"><button onClick={() => { setCompletionOpen(false); void loadLevel(levelIndex); }}>重玩本关</button>{levelIndex < levels.length - 1 && isLevelUnlocked(levelIndex + 1, solvedLevels) && <button className="primary" onClick={() => { const nextIndex = levelIndex + 1; setLevelIndex(nextIndex); void loadLevel(nextIndex); }}>下一关</button>}</div></section></div>}
      {accountModalOpen && <div className="modal-backdrop" onClick={() => setAccountModalOpen(false)}><section className="modal account-center-modal" onClick={(event) => event.stopPropagation()}><aside className="account-center-nav"><div className="profile-hero compact"><div className="avatar large-avatar">{avatarText(account)}</div><div><strong title={account}>{account}</strong><span>{syncStatus}</span></div></div><button className={accountModalTab === 'profile' ? 'active' : ''} onClick={() => setAccountModalTab('profile')}>档案</button><button className={accountModalTab === 'settings' ? 'active' : ''} onClick={() => setAccountModalTab('settings')}>设置</button><button className={accountModalTab === 'account' ? 'active' : ''} onClick={() => setAccountModalTab('account')}>账户</button></aside><div className="account-center-content"><header><div><p className="eyebrow">Account Center</p><h2>{accountModalTab === 'profile' ? '玩家档案' : accountModalTab === 'settings' ? '偏好设置' : '账户操作'}</h2></div><button type="button" onClick={() => setAccountModalOpen(false)}>关闭</button></header>{accountModalTab === 'profile' && <><dl className="profile-stats"><div><dt>已完成</dt><dd>{solvedLevels.length}/{levels.length}</dd></div><div><dt>赛季总分</dt><dd>{totalScore}</dd></div><div><dt>纯 CLI</dt><dd>{pureCliCount}</dd></div><div><dt>赛季排名</dt><dd>{seasonRank ? `#${seasonRank}` : '暂无'}</dd></div></dl><section className="profile-section"><div className="hint-header"><h3>已完成关卡</h3><span className="rank-chip">{solvedLevels.length}</span></div>{solvedLevels.length === 0 ? <p className="muted">还没有完成关卡。</p> : <div className="profile-level-grid">{levels.filter((item) => solvedLevels.includes(item.id)).map((item) => <span key={item.id}>{item.title}</span>)}</div>}</section></>}{accountModalTab === 'settings' && <form className="settings-form" onSubmit={(event) => { event.preventDefault(); void savePreferenceSettings(); }}><label><span>显示名</span><input value={profileName} maxLength={32} onChange={(event) => setProfileName(event.target.value)} placeholder="输入显示名" /></label><label className="inline-setting"><input type="checkbox" checked={leaderboardAnonymous} onChange={(event) => setLeaderboardAnonymous(event.target.checked)} /><span>排行榜匿名展示（显示为“匿名玩家”，隐藏头像）</span></label><button type="button" onClick={() => void saveProfileSettings()} disabled={profileSaving}>{profileSaving ? '保存中...' : '保存资料'}</button><label><span>风格</span><select value={theme} onChange={(event) => setTheme(event.target.value as 'dark' | 'light')}><option value="dark">黑色</option><option value="light">白色</option></select></label><label className="inline-setting"><input type="checkbox" checked={soundEnabled} onChange={(event) => setSoundEnabled(event.target.checked)} /><span>启用页面音效</span></label><button type="submit">保存设置</button></form>}{accountModalTab === 'account' && <section className="profile-section"><div className="hint-header"><h3>同步与退出</h3></div><p className="muted">当前已连接云端账号，可手动同步或退出登录。排行榜可在“设置”中选择匿名展示。</p><div className="profile-actions"><button onClick={() => void saveCloud({ currentLevelId: level.id })}>立即同步</button><button className="danger" onClick={() => void logoutCloud()}>退出登录</button></div></section>}</div></section></div>}
      {achievements.length > 0 && <div className="achievement-stack">{achievements.map((item) => <section className="achievement-toast" key={`${item.id}-${item.unlocked_at}`}><span>{item.achievement?.icon ?? '🏆'}</span><div><strong>{item.achievement?.title ?? '解锁成就'}</strong><small>{item.achievement?.description ?? item.id}</small></div><button onClick={() => setAchievements((values) => values.filter((value) => value.id !== item.id))}>×</button></section>)}</div>}
    </main>
  );
}
