'use client';

import { useState } from 'react';

export function LoginForm() {
  const [accountInput, setAccountInput] = useState('');

  return (
    <form
      className="auth-card"
      onSubmit={(event) => {
        event.preventDefault();
        const nextAccount = accountInput.trim();
        if (!nextAccount) return;
        localStorage.setItem('omg-web-account', nextAccount);
        window.location.href = '/play';
      }}
    >
      <div className="login-topline"><span>Oh My Git! Web</span><em>Browser Git Lab</em></div>
      <label className="login-field"><span>本地学习身份</span><input autoFocus placeholder="talex-touch" value={accountInput} onChange={(event) => setAccountInput(event.target.value)} /></label>
      <div className="hero-auth-row"><button type="submit" className="hero-auth-button">进入教程</button><a className="hero-auth-button" href="/api/auth/linuxdo">Linux.do 登录</a></div>
      <div className="hero-note">本地游玩不需要密码；云端同步需要登录。</div>
    </form>
  );
}
