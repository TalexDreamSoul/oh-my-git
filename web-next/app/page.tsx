import Link from 'next/link';
import { DarkVeil } from './components/DarkVeil';

export default function HomePage() {
  return (
    <main className="login-screen landing-screen">
      <div className="darkveil-layer"><DarkVeil hueShift={0} noiseIntensity={0} scanlineIntensity={0} speed={0.5} scanlineFrequency={0} warpAmount={0} resolutionScale={1} /></div>
      <header className="hero-nav">
        <Link href="/" className="hero-logo"><span>&gt;_</span><b>ohmygit</b></Link>
        <nav><a href="#features">Features</a><a href="#roadmap">Roadmap</a><a href="#docs">Docs</a><a href="#about">About</a><a className="hero-signin" href="/api/auth/linuxdo">Sign in</a></nav>
      </header>
      <section className="hero-layout">
        <div className="hero-copy">
          <div className="hero-kicker">&gt;_ Learn Git. Level Up.</div>
          <h1>Master Git.<br /><span>One Command</span> at a Time.</h1>
          <p>Oh My Git 是一个互动式 Git 学习平台，通过故事关卡、真实终端和即时反馈，帮你掌握版本控制。</p>
          <div className="hero-auth-label">Sign in to start learning</div>
          <div className="hero-auth-row">
            <Link href="/play" className="hero-auth-button">本地开始</Link>
            <a href="/api/auth/linuxdo" className="hero-auth-button">Linux.do 登录</a>
          </div>
          <div className="hero-note">⌘ 本地游玩无需密码；登录后可同步云端进度。</div>
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

        /\_/\\
       ( o.o )
        > ^ <`}</pre>
        </div>
      </section>
      <section className="hero-features" id="features">
        <article><b>&gt;_</b><div><h3>Interactive Lessons</h3><p>一步一步完成真实 Git 命令练习。</p></div></article>
        <article><b>⌘</b><div><h3>Real-world Scenarios</h3><p>用项目情景理解分支、提交与修复。</p></div></article>
        <article><b>⚡</b><div><h3>Instant Feedback</h3><p>即时检查任务状态和提交图变化。</p></div></article>
        <article><b>♜</b><div><h3>Track Progress</h3><p>本地或云端保存你的学习进度。</p></div></article>
      </section>
    </main>
  );
}
