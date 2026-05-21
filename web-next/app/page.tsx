import Link from 'next/link';
import { DarkVeil } from './components/DarkVeil';

export default function HomePage() {
  return (
    <main className="login-screen landing-screen">
      <div className="darkveil-layer"><DarkVeil hueShift={0} noiseIntensity={0} scanlineIntensity={0} speed={0.5} scanlineFrequency={0} warpAmount={0} resolutionScale={1} /></div>
      <header className="hero-nav">
        <Link href="/" className="hero-logo"><span>&gt;_</span><b>ohmygit</b></Link>
        <nav><a href="#features">Features</a><a href="#roadmap">Roadmap</a><a href="#docs">Docs</a><a href="#about">About</a><Link className="hero-signin" href="/login">Sign in</Link></nav>
      </header>
      <section className="hero-layout">
        <div className="hero-copy hero-intro-panel">
          <div className="hero-kicker">&gt;_ Learn Git. Level Up.</div>
          <h1>Master Git.<br /><span>One Command</span> at a Time.</h1>
          <p>Oh My Git 是一个互动式 Git 学习平台，通过故事关卡、真实终端、文件编辑器和提交图，让抽象的版本控制变成看得见的操作反馈。</p>
          <div className="hero-course-grid">
            <article><b>01</b><span>基础工作流</span><small>init / add / commit / status</small></article>
            <article><b>02</b><span>时光修补</span><small>restore / reset / detached HEAD</small></article>
            <article><b>03</b><span>分支汇合</span><small>branch / checkout / merge</small></article>
          </div>
          <div className="hero-cta-row"><Link href="/login" className="hero-secondary-button primary">开始学习</Link><a href="#features" className="hero-secondary-button">了解玩法</a></div>
          <div className="hero-note">进入游戏需要登录云端账号；支持账号密码或第三方登录，进度会自动同步。</div>
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
        <article><b>♜</b><div><h3>Track Progress</h3><p>云端保存你的学习进度、成就和排行。</p></div></article>
      </section>
    </main>
  );
}
