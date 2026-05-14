import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="login-screen">
      <section className="login-box">
        <p className="eyebrow">Oh My Git! Web</p>
        <h1>浏览器里的 Git 教程</h1>
        <p>Next.js 前后端一体版本。游戏运行在浏览器里，登录后可同步学习进度。</p>
        <div className="actions">
          <Link href="/play" className="primary-link">本地开始</Link>
          <a href="/api/auth/linuxdo" className="primary-link">Linux.do 登录</a>
        </div>
      </section>
    </main>
  );
}
