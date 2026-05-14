import Link from 'next/link';
import { DarkVeil } from '../components/DarkVeil';
import { LoginForm } from './LoginForm';

export default function LoginPage() {
  return (
    <main className="login-screen auth-screen">
      <div className="darkveil-layer"><DarkVeil hueShift={0} noiseIntensity={0} scanlineIntensity={0} speed={0.5} scanlineFrequency={0} warpAmount={0} resolutionScale={1} /></div>
      <header className="hero-nav">
        <Link href="/" className="hero-logo"><span>&gt;_</span><b>ohmygit</b></Link>
        <nav><Link href="/">Home</Link><Link href="/play">Preview</Link><a className="hero-signin" href="/api/auth/linuxdo">Linux.do</a></nav>
      </header>
      <section className="auth-layout">
        <div className="auth-copy">
          <div className="hero-kicker">&gt;_ Sign in to continue.</div>
          <h1>Start your Git journey.</h1>
          <p>使用本地身份可以立即开始；登录 Linux.do 后可同步云端进度、排行榜和成就。</p>
        </div>
        <LoginForm />
      </section>
    </main>
  );
}
