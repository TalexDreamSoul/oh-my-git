'use client';

import Link from 'next/link';
import { useState } from 'react';

const TERMS_VERSION = 1;

const providers = [
  { label: 'Linux.do 登录', href: '/api/auth/linuxdo' },
  { label: 'GitHub 登录', href: '/api/auth/github' },
  { label: 'Tuff Nexus 登录', href: '/api/auth/tuff-nexus' }
];

export function LoginForm() {
  const [agreementAccepted, setAgreementAccepted] = useState(false);
  const [agreementOpen, setAgreementOpen] = useState(false);
  const [error, setError] = useState('');

  function requireAgreement(event?: { preventDefault(): void }) {
    if (agreementAccepted) return true;
    event?.preventDefault();
    setError('请先阅读并同意 Oh My Git 公益使用协议。');
    setAgreementOpen(true);
    return false;
  }

  return (
    <section className="auth-card oauth-only-card">
      <div className="login-topline"><span>Oh My Git! Web</span><em>Cloud Git Lab</em></div>
      {error && <div className="auth-error" role="alert">{error}</div>}
      <label className="agreement-check"><input type="checkbox" checked={agreementAccepted} onChange={(event) => setAgreementAccepted(event.target.checked)} /><span>我已阅读并同意 <button type="button" onClick={() => setAgreementOpen(true)}>Oh My Git 公益使用协议</button><Link href="/terms" target="_blank">查看全文</Link></span></label>
      <div className="oauth-provider-list">
        {providers.map((provider) => <a key={provider.href} className="hero-auth-button" href={provider.href} onClick={(event) => { requireAgreement(event); }}>{provider.label}</a>)}
      </div>
      <p className="oauth-only-note">仅支持第三方账号登录；不再提供账号密码注册或登录。</p>
      {agreementOpen && <div className="agreement-modal-backdrop" onClick={() => setAgreementOpen(false)}><section className="agreement-modal" onClick={(event) => event.stopPropagation()}><header><h2>Oh My Git 公益使用协议 v{TERMS_VERSION}</h2><button type="button" onClick={() => setAgreementOpen(false)}>×</button></header><div className="agreement-content"><p>Oh My Git Web 是公益性质的 Git 学习项目，面向学习与交流免费开放。项目不会向普通学习用户收取费用，也不会以登录、同步、排行榜等基础功能向用户收费。</p><p>你的账号信息、学习进度、成就、排行榜记录等会用于提供云端同步与学习体验。密码以加盐哈希方式存储，服务端不会保存明文密码；会话 Cookie 使用 HttpOnly 存储。</p><p>请勿倒卖账号、邀请码、课程权益或部署服务；请勿批量注册、刷榜、攻击、爬取、滥用接口或干扰其他用户学习。</p><p>未经作者明确授权，不得将本项目、课程内容、关卡设计、UI、素材、部署版本用于商业转售、付费培训包装、闭源二次分发或其他盈利用途。二次开发、公开部署、商业合作请先取得授权并保留原项目署名。</p><p>本项目按现状提供，可能根据运营、安全、合规或社区反馈调整功能与规则。继续登录或注册即表示你理解并同意以上条款。</p><p><Link href="/terms" target="_blank">打开完整协议页面</Link></p></div><footer><button type="button" onClick={() => { setAgreementAccepted(true); setAgreementOpen(false); setError(''); }}>同意并继续</button></footer></section></div>}
    </section>
  );
}
