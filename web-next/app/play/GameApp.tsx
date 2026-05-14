"use client";

import { Buffer } from 'buffer';
import { Fragment, Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { CommitCanvas } from '../components/CommitCanvas';
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

function difficultyLabel(value: 1 | 2 | 3): string {
  return value === 1 ? '简单' : value === 2 ? '普通' : '困难';
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
  const [injectedCommand, setInjectedCommand] = useState('');
  const [terminalHeight, setTerminalHeight] = useState(320);
  const [advanceKey, setAdvanceKey] = useState<{ key: 'Enter' | ' '; count: number; at: number } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [soundEnabled, setSoundEnabled] = useState(true);

  const addActivity = useCallback((item: string) => {
    setActivity((items) => [`${new Date().toLocaleTimeString()} ${item}`, ...items].slice(0, 30));
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
      if (solved) {
        localStorage.setItem(storageKey, String(Math.max(levelIndex, levels.indexOf(targetLevel))));
        setSolvedLevels((items) => {
          if (items.includes(targetLevel.id)) return items;
          const next = [...items, targetLevel.id];
          localStorage.setItem(`${storageKey}:solved`, JSON.stringify(next));
          void fetch('/api/progress', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ levelId: targetLevel.id, solved: true, score, timeSeconds: elapsedSeconds, pureCli })
          }).catch(() => undefined);
          return next;
        });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [git, level, levelIndex, storageKey, elapsedSeconds, pureCli]
  );

  async function loadLevel(index = levelIndex) {
    const nextLevel = levels[index];
    setWon(false);
    setShowHint(false);
    setShowExamples(false);
    setLevelStartedAt(Date.now());
    setElapsedSeconds(0);
    setPureCli(true);
    setActivity([`${new Date().toLocaleTimeString()} 进入关卡：${nextLevel.title}`]);
    setMessage('关卡已初始化');
    await git.resetStorage();
    for (const action of nextLevel.setup) await runAction(git, action);
    await refresh(nextLevel);
  }

  function playTone(type: 'click' | 'success' = 'click') {
    if (!soundEnabled) return;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.frequency.value = type === 'success' ? 720 : 420;
    gain.gain.value = 0.035;
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + 0.08);
  }

  async function openPreview(file: string) {
    setPreviewFile(file);
    setPreviewContent(await git.readFile(file));
    addActivity(`打开文件：${file}`);
    playTone('click');
  }

  const score = won ? Math.max(60, 100 - Math.floor(elapsedSeconds / 12) * 5 - (pureCli ? 0 : 10)) : 0;

  useEffect(() => {
    const savedAccount = localStorage.getItem('omg-web-account') ?? '';
    setAccount(savedAccount);
    setAccountInput(savedAccount);
    setSettingsName(savedAccount);
    setTheme(localStorage.getItem('omg-web-theme') === 'light' ? 'light' : 'dark');
    setSoundEnabled(localStorage.getItem('omg-web-sound') !== 'off');
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const savedIndex = Number(localStorage.getItem(storageKey) ?? 0);
    const safeIndex = Number.isFinite(savedIndex) ? Math.min(savedIndex, levels.length - 1) : 0;
    setSolvedLevels(JSON.parse(localStorage.getItem(`${storageKey}:solved`) ?? '[]') as string[]);
    setLevelIndex(safeIndex);
    void loadLevel(safeIndex);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account, ready]);

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

  if (!ready) return null;

  if (!account) {
    return (
      <main className="login-screen" data-theme={theme}>
        <form
          className="login-box"
          onSubmit={(event) => {
            event.preventDefault();
            const nextAccount = accountInput.trim();
            if (!nextAccount) return;
            localStorage.setItem('omg-web-account', nextAccount);
            setAccount(nextAccount);
          }}
        >
          <p className="eyebrow">Oh My Git! Web</p>
          <h1>输入账号开始学习</h1>
          <p>可直接本地游玩；登录 OAuth 后可同步云端进度。</p>
          <input autoFocus placeholder="例如：talex" value={accountInput} onChange={(event) => setAccountInput(event.target.value)} />
          <button type="submit">进入教程</button>
          <a className="primary-link" href="/api/auth/linuxdo">使用 Linux.do 登录</a>
        </form>
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
                  <span className="level-number">{String(index + 1).padStart(2, '0')}</span>
                  <span><strong>{item.title}</strong><small>{item.summary}</small>{solvedLevels.includes(item.id) && <em>已通过</em>}</span>
                </button>
              ))}
            </section>
          ))}
        </nav>
        <div className="account-bar"><div className="avatar">{avatarText(account)}</div><div className="account-meta"><strong>{account}</strong><small>本地学习进度</small></div><button onClick={() => { setSettingsName(account); setSettingsOpen(true); }}>设置</button></div>
      </aside>

      <section className="workbench">
        <header className="workbench-header">
          <div><p className="eyebrow">操作台</p><div className="title-row"><h2>{level.title}</h2><span className={`difficulty difficulty-${level.difficulty}`}><i /><i /><i /><b>{difficultyLabel(level.difficulty)}</b></span></div></div>
          <div className="header-score-card">
            <span>用时 {Math.floor(elapsedSeconds / 60)}:{String(elapsedSeconds % 60).padStart(2, '0')}</span>
            <span>评分 {won ? score : '--'}</span>
          </div>
          <div className="header-actions">
            <span className={`cli-badge ${pureCli ? 'active' : ''}`} title="全程只使用命令行操作时点亮">CLI</span>
            {won && <span className="win-badge">完成</span>}
            <button onClick={() => loadLevel()}>重置关卡</button><button onClick={() => { localStorage.removeItem('omg-web-account'); setAccount(''); }}>退出</button></div>
        </header>
        <section className="graph-stage"><div className="section-title-row"><h3>提交图</h3><span>当前分支：{branch ?? '无'}</span></div><div className="canvas-wrap"><CommitCanvas commits={log} refs={refs} branch={branch} onCheckoutCommit={async (oid) => { setPureCli(false); await git.checkout(oid); playTone('click'); await refresh(); }} onCreateBranch={async (oid) => { setPureCli(false); const name = window.prompt('新分支名称', `branch-${oid.slice(0, 4)}`)?.trim(); if (!name) return; await git.branch(name, oid); playTone('success'); await refresh(); }} /></div></section>
        <div className="terminal-resizer" onPointerDown={(event) => { const startY = event.clientY; const startHeight = terminalHeight; const onMove = (moveEvent: PointerEvent) => setTerminalHeight(Math.max(180, Math.min(560, startHeight - (moveEvent.clientY - startY)))); const onUp = () => { window.removeEventListener('pointermove', onMove); window.removeEventListener('pointerup', onUp); }; window.addEventListener('pointermove', onMove); window.addEventListener('pointerup', onUp); }} />
        <section className="terminal-stage"><XTermPanel git={git} branch={branch} username={account} injectedCommand={injectedCommand} onAfterCommand={refresh} /></section>
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
        <section className="info-section"><h3>文件</h3>{files.length === 0 ? <p className="muted">暂无文件。</p> : <ul className="status-list">{files.map((file) => { const fileStatus = status.find((item) => item.filepath === file); return <li key={file}><code className={`status-badge ${statusClass(fileStatus?.label)}`}>{fileStatus?.label ?? '工作区'}</code><button className="file-link" onClick={() => { setPureCli(false); void openPreview(file); }}>{file}</button></li>; })}</ul>}</section>
        <section className="info-section"><h3>操作记录</h3>{activity.length === 0 ? <p className="muted">暂无记录。</p> : <ol className="activity-list">{activity.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ol>}</section>
      </aside>

      {previewFile && <Suspense fallback={<div className="modal-backdrop"><section className="modal">加载编辑器...</section></div>}><LazyFileEditorModal file={previewFile} content={previewContent} theme={theme} onChange={setPreviewContent} onClose={() => setPreviewFile(null)} onSave={async () => { setPureCli(false); await git.writeFile(previewFile, previewContent); playTone('success'); await refresh(); setMessage(`已保存 ${previewFile}`); }} /></Suspense>}
      {won && levelIndex < levels.length - 1 && <div className="advance-toast"><strong>关卡完成</strong><span>连续按两次 Enter 或两次 Space 进入下一关</span></div>}
      {settingsOpen && <div className="modal-backdrop" onClick={() => setSettingsOpen(false)}><form className="modal settings-modal" onClick={(event) => event.stopPropagation()} onSubmit={(event) => { event.preventDefault(); const nextName = settingsName.trim(); if (nextName) { localStorage.setItem('omg-web-account', nextName); setAccountInput(nextName); setAccount(nextName); } setSettingsOpen(false); }}><header><h2>设置</h2><button type="button" onClick={() => setSettingsOpen(false)}>关闭</button></header><label><span>账号名称</span><input value={settingsName} onChange={(event) => setSettingsName(event.target.value)} /></label><label><span>风格</span><select value={theme} onChange={(event) => setTheme(event.target.value as 'dark' | 'light')}><option value="dark">黑色</option><option value="light">白色</option></select></label><label className="inline-setting"><input type="checkbox" checked={soundEnabled} onChange={(event) => setSoundEnabled(event.target.checked)} /><span>启用页面音效</span></label><button type="submit">保存设置</button></form></div>}
    </main>
  );
}
