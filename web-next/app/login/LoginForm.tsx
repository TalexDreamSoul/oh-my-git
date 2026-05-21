'use client';

import { useState } from 'react';

type AuthMode = 'login' | 'register';

export function LoginForm() {
  const [mode, setMode] = useState<AuthMode>('login');
  const [accountInput, setAccountInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  function requireAgreement(event?: { preventDefault(): void }) {
    if (agreementAccepted) return true;
    event?.preventDefault();
    setError('请先阅读并同意 Oh My Git 公益使用协议。');
    setAgreementOpen(true);
    return false;
  }

  async function submitPasswordAuth() {
    setError('');
    if (!requireAgreement()) return;
    setPending(true);
    try {
      const response = await fetch(mode === 'login' ? '/api/auth/password' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account: accountInput.trim(), password: passwordInput })
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
      <label className="login-field"><span>密码</span><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" placeholder={mode === 'login' ? '输入密码' : '至少 8 位'} value={passwordInput} onChange={(event) => setPasswordInput(event.target.value)} /></label>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <label className="agreement-check"><input type="checkbox" checked={agreementAccepted} onChange={(event) => setAgreementAccepted(event.target.checked)} /><span>我已阅读并同意 <button type="button" onClick={() => setAgreementOpen(true)}>Oh My Git 公益使用协议</button></span></label>
      <div className="hero-auth-row"><button type="submit" className="hero-auth-button" disabled={pending}>{pending ? '处理中...' : mode === 'login' ? '登录并进入' : '注册并进入'}</button><a className="hero-auth-button" href="/api/auth/linuxdo" onClick={(event) => { requireAgreement(event); }}>Linux.do 登录</a></div>
      <div className="oauth-grid"><a href="/api/auth/github" onClick={(event) => { requireAgreement(event); }}>GitHub</a><a href="/api/auth/google" onClick={(event) => { requireAgreement(event); }}>Google</a></div>
      {agreementOpen && <div className="agreement-modal-backdrop" onClick={() => setAgreementOpen(false)}><section className="agreement-modal" onClick={(event) => event.stopPropagation()}><header><h2>Oh My Git 公益使用协议</h2><button type="button" onClick={() => setAgreementOpen(false)}>×</button></header><div className="agreement-content"><p>Oh My Git Web 是公益性质的 Git 学习项目，面向学习与交流免费开放。项目不会向普通学习用户收取费用，也不会以登录、同步、排行榜等基础功能向用户收费。</p><p>你的账号信息、学习进度、成就、排行榜记录等会用于提供云端同步与学习体验。密码以加盐哈希方式存储，服务端不会保存明文密码；会话 Cookie 使用 HttpOnly 存储。</p><p>请勿倒卖账号、邀请码、课程权益或部署服务；请勿批量注册、刷榜、攻击、爬取、滥用接口或干扰其他用户学习。</p><p>未经作者明确授权，不得将本项目、课程内容、关卡设计、UI、素材、部署版本用于商业转售、付费培训包装、闭源二次分发或其他盈利用途。二次开发、公开部署、商业合作请先取得授权并保留原项目署名。</p><p>本项目按现状提供，可能根据运营、安全、合规或社区反馈调整功能与规则。继续登录或注册即表示你理解并同意以上条款。</p></div><footer><button type="button" onClick={() => { setAgreementAccepted(true); setAgreementOpen(false); setError(''); }}>同意并继续</button></footer></section></div>}
    </form>
  );
}
