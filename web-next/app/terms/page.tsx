import Link from 'next/link';
import { DarkVeil } from '../components/DarkVeil';

export const TERMS_VERSION = 1;

export default function TermsPage() {
  return (
    <main className="login-screen auth-screen terms-screen">
      <div className="darkveil-layer"><DarkVeil hueShift={0} noiseIntensity={0} scanlineIntensity={0} speed={0.5} scanlineFrequency={0} warpAmount={0} resolutionScale={1} /></div>
      <header className="hero-nav">
        <Link href="/" className="hero-logo"><span>&gt;_</span><b>ohmygit</b></Link>
        <nav><Link href="/">Home</Link><Link href="/login">Login</Link><Link href="/play">Play</Link></nav>
      </header>
      <section className="terms-card">
        <p className="hero-kicker">公益使用协议 v{TERMS_VERSION}</p>
        <h1>Oh My Git 公益使用协议</h1>
        <article>
          <h2>1. 公益与免费</h2>
          <p>Oh My Git Web 是公益性质的 Git 学习项目，面向学习与交流免费开放。项目不会向普通学习用户收取费用，也不会以登录、同步、排行榜等基础功能向用户收费。</p>
          <h2>2. 云端账号与数据安全</h2>
          <p>你的账号信息、学习进度、成就、排行榜记录等会用于提供云端同步与学习体验。密码以加盐哈希方式存储，服务端不会保存明文密码；会话 Cookie 使用 HttpOnly 存储。</p>
          <h2>3. 禁止滥用</h2>
          <p>请勿倒卖账号、邀请码、课程权益或部署服务；请勿批量注册、刷榜、攻击、爬取、滥用接口或干扰其他用户学习。</p>
          <h2>4. 二次开发与授权</h2>
          <p>未经作者明确授权，不得将本项目、课程内容、关卡设计、UI、素材、部署版本用于商业转售、付费培训包装、闭源二次分发或其他盈利用途。二次开发、公开部署、商业合作请先取得授权并保留原项目署名。</p>
          <h2>5. 调整与继续使用</h2>
          <p>本项目按现状提供，可能根据运营、安全、合规或社区反馈调整功能与规则。继续登录或注册即表示你理解并同意以上条款。</p>
        </article>
        <Link className="hero-secondary-button primary" href="/login">返回登录</Link>
      </section>
    </main>
  );
}
