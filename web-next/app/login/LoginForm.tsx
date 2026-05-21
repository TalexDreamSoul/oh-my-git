'use client';

import { useState } from 'react';

type AuthMode = 'login' | 'register';

export function LoginForm() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [accountInput, setAccountInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function submitPasswordAuth() {
    setError('');
    setPending(true);
    try {
      const response = await fetch(mode === 'login' ? '/api/auth/password' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: accountInput.trim(), password: passwordInput, name: displayNameInput.trim() || undefined })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data?.error || (mode === 'login' ? '登录失败。' : '注册失败。'));
        return;
      }
      localStorage.removeItem('omg-web-account');
      window.location.href = '/play';
    } catch {
      setError('网络异常，请稍后再试。');
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      className="auth-card"
      onSubmit={(event) => {
        event.preventDefault();
        void submitPasswordAuth();
      }}
    >
      <div className="login-topline"><span>Oh My Git! Web</span><em>Cloud Git Lab</em></div>
      <div className="auth-mode-tabs" role="tablist" aria-label="账号登录方式">
        <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>账号登录</button>
        <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>注册账号</button>
      </div>
      <label className="login-field"><span>账号</span><input autoFocus autoComplete="username" placeholder="talex-touch" value={accountInput} onChange={(event) => setAccountInput(event.target.value)} /></label>
      {mode === 'register' && <label className="login-field"><span>显示名称（可选）</span><input autoComplete="nickname" placeholder="Git 学徒" value={displayNameInput} onChange={(event) => setDisplayNameInput(event.target.value)} /></label>}
      <label className="login-field"><span>密码</span><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" placeholder={mode === 'login' ? '输入密码' : '至少 8 位'} value={passwordInput} onChange={(event) => setPasswordInput(event.target.value)} /></label>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <div className="hero-auth-row"><button type="submit" className="hero-auth-button" disabled={pending}>{pending ? '处理中...' : mode === 'login' ? '登录并进入' : '注册并进入'}</button><a className="hero-auth-button" href="/api/auth/linuxdo">Linux.do 登录</a></div>
      <div className="oauth-grid"><a href="/api/auth/github">GitHub</a><a href="/api/auth/google">Google</a></div>
      <div className="hero-note">已移除本地身份：进入游戏必须先登录云端账号，支持账号密码或第三方登录。</div>
    </form>
  );
}
