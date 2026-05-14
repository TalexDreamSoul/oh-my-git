import Link from 'next/link';
import { DarkVeil } from './components/DarkVeil';

export default function HomePage() {
  return (
    <main className="login-screen">
      <div className="darkveil-layer"><DarkVeil hueShift={0} noiseIntensity={0} scanlineIntensity={0} speed={0.5} scanlineFrequency={0} warpAmount={0} resolutionScale={1} /></div>
      <section className="login-box landing-box">
        <div className="login-topline"><span>Oh My Git! Web</span><em>Full-stack Edition</em></div>
        <div className="login-brand">
          <div className="login-mark">git</div>
          <div>
            <h1>浏览器里的 Git 冒险课</h1>
            <p>从创建文件、暂存、提交，到分支、合并与修复历史。无需安装环境，打开网页就能练。</p>
          </div>
        </div>
        <div className="login-terminal"><span>$</span><code>git log --graph --oneline</code><b>online</b></div>
        <div className="login-features"><span>真实终端</span><span>Canvas 提交图</span><span>云端进度</span></div>
        <div className="login-actions">
          <Link href="/play" className="primary-link">本地开始</Link>
          <a href="/api/auth/linuxdo" className="primary-link linuxdo-link">Linux.do 登录</a>
        </div>
      </section>
    </main>
  );
}
