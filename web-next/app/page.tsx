import Link from 'next/link';
import { DarkVeil } from './components/DarkVeil';

export default function HomePage() {
  return (
    <main className="login-screen landing-screen compact-landing">
      <div className="darkveil-layer"><DarkVeil hueShift={0} noiseIntensity={0} scanlineIntensity={0} speed={0.5} scanlineFrequency={0} warpAmount={0} resolutionScale={1} /></div>
      <header className="hero-nav">
        <Link href="/" className="hero-logo"><span>&gt;_</span><b>ohmygit</b></Link>
        <nav><a href="#features">Features</a><a href="#roadmap">Roadmap</a><a href="#docs">Docs</a><a href="#about">About</a><Link className="hero-signin" href="/login">Sign in</Link></nav>
      </header>
      <section className="hero-layout">
        <div className="hero-copy hero-intro-panel">
          <div className="hero-kicker">&gt;_ Learn Git. Level Up.</div>
          <h1>Master Git.<br /><span>One Command</span> at a Time.</h1>
          <p>互动式 Git 学习平台：故事关卡、真实终端、文件编辑器和提交图都在浏览器里完成。</p>
          <div className="hero-course-grid">
            <article><b>01</b><span>基础到协作</span><small>init / branch / merge / remote</small></article>
            <article><b>02</b><span>冲突与历史</span><small>conflict / stash / tag / cherry-pick</small></article>
            <article><b>03</b><span>发布与侦测</span><small>release / rebase / bisect / objects</small></article>
          </div>
          <div className="hero-cta-row"><Link href="/login" className="hero-secondary-button primary">开始学习</Link><a href="#features" className="hero-secondary-button">了解玩法</a></div>
          <div className="hero-note">登录后自动同步进度、成就和排行榜。</div>
        </div>
        <div className="hero-terminal-card" aria-hidden="true">
          <div className="hero-window-dots"><i /><i /><i /></div>
          <pre>{`$ ohmygit start
Loading your journey...

├─● Introduction
├─○ Basic Workflow
├─○ Conflict & Stash
├─○ Release Train
├─○ Rebase
├─○ Bisect & Reflog
├─○ Objects
└─○ Collaboration

        /\_/\\
       ( o.o )
        > ^ <`}</pre>
        </div>
      </section>
      <section className="hero-features" id="features">
        <article><b>&gt;_</b><div><h3>Interactive</h3><p>真实 Git 命令练习。</p></div></article>
        <article><b>⌘</b><div><h3>Scenarios</h3><p>项目情景理解分支与修复。</p></div></article>
        <article><b>⚡</b><div><h3>Feedback</h3><p>即时检查任务和提交图。</p></div></article>
        <article><b>♜</b><div><h3>Progress</h3><p>云端保存学习记录。</p></div></article>
      </section>
    </main>
  );
}
