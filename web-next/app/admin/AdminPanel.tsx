'use client';

import { useEffect, useState } from 'react';

type AdminConfig = {
  providers: Array<{ id: string; label: string; enabled: boolean; missing: string[] }>;
  env: Array<{ name: string; configured: boolean; value: string }>;
};

type Summary = {
  totals: Record<string, number>;
  providerCounts: Record<string, number>;
  signupsByDay: Array<{ date: string; count: number }>;
  topLevels: Array<{ levelId: string; count: number }>;
  seasonTop: Array<{ user_id: string; name: string; total_score: number; solved_count: number; pure_cli_count: number }>;
  recentUsers: Array<{ id: string; provider: string; name: string; email?: string | null; created_at: string }>;
};

type UserRow = {
  id: string;
  provider: string;
  name: string;
  email?: string | null;
  solved_count: number;
  total_score: number;
  pure_cli_count: number;
  created_at: string;
};

export function AdminPanel({ secretConfigured }: { secretConfigured: boolean }) {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [error, setError] = useState('');
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);

  async function loadAdminData() {
    const [configResponse, summaryResponse, usersResponse] = await Promise.all([
      fetch('/api/admin/config'),
      fetch('/api/admin/summary'),
      fetch('/api/admin/users?limit=200')
    ]);
    if (configResponse.status === 401 || summaryResponse.status === 401 || usersResponse.status === 401) {
      setAuthed(false);
      return;
    }
    if (configResponse.ok) setConfig(await configResponse.json());
    if (summaryResponse.ok) setSummary(await summaryResponse.json());
    if (usersResponse.ok) setUsers((await usersResponse.json()).users ?? []);
  }

  useEffect(() => {
    if (!secretConfigured) return;
    void loadAdminData().then(() => setAuthed(Boolean(summary || config))).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secretConfigured]);

  async function login() {
    setError('');
    const response = await fetch('/api/admin/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret }) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data?.error || '管理员登录失败。');
      return;
    }
    setAuthed(true);
    setSecret('');
    await loadAdminData();
  }

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false);
    setConfig(null);
    setSummary(null);
    setUsers([]);
  }

  if (!secretConfigured) {
    return <section className="admin-login-card"><h1>管理后台未启用</h1><p>请配置至少 32 位的 <code>ADMIN_SECRET</code> 环境变量，否则管理后台不会加载。</p></section>;
  }

  if (!authed) {
    return (
      <section className="admin-login-card">
        <p className="eyebrow">Admin Gate</p>
        <h1>管理员登录</h1>
        <p>请输入环境变量 <code>ADMIN_SECRET</code> 配置的 Secret。长度必须至少 32 位。</p>
        <label><span>Admin Secret</span><input type="password" value={secret} onChange={(event) => setSecret(event.target.value)} placeholder="至少 32 位" /></label>
        {error && <div className="auth-error">{error}</div>}
        <button className="hero-secondary-button primary" onClick={() => void login()}>进入管理后台</button>
      </section>
    );
  }

  return (
    <section className="admin-dashboard">
      <header className="admin-dashboard-header"><div><p className="eyebrow">Admin Console</p><h1>管理后台</h1></div><div><button onClick={() => void loadAdminData()}>刷新</button><button onClick={() => void logout()}>退出</button></div></header>
      {summary && <div className="admin-stat-grid">{Object.entries(summary.totals).map(([key, value]) => <article key={key}><span>{key}</span><strong>{value}</strong></article>)}</div>}
      <div className="admin-grid">
        <section className="admin-card"><h2>OAuth 配置</h2>{config?.providers.map((item) => <div className="admin-provider" key={item.id}><strong>{item.label}</strong><span className={item.enabled ? 'ok' : 'bad'}>{item.enabled ? '已启用' : '未启用'}</span>{item.missing.length > 0 && <small>缺少：{item.missing.join(', ')}</small>}</div>)}<h3>环境变量</h3>{config?.env.map((item) => <div className="admin-env" key={item.name}><code>{item.name}</code><span className={item.configured ? 'ok' : 'bad'}>{item.configured ? item.value || '已配置' : '未配置'}</span></div>)}</section>
        <section className="admin-card"><h2>访问趋势</h2>{summary?.signupsByDay.length ? <ol className="admin-list">{summary.signupsByDay.map((item) => <li key={item.date}><span>{item.date}</span><strong>{item.count}</strong></li>)}</ol> : <p className="muted">暂无注册趋势。</p>}<h3>Provider 分布</h3><ol className="admin-list">{Object.entries(summary?.providerCounts ?? {}).map(([name, count]) => <li key={name}><span>{name}</span><strong>{count}</strong></li>)}</ol></section>
        <section className="admin-card"><h2>热门关卡</h2><ol className="admin-list">{summary?.topLevels.map((item) => <li key={item.levelId}><span>{item.levelId}</span><strong>{item.count}</strong></li>)}</ol></section>
        <section className="admin-card"><h2>赛季排行</h2><ol className="admin-list">{summary?.seasonTop.map((item) => <li key={item.user_id}><span>{item.name}</span><strong>{item.total_score} 分 · {item.solved_count} 关</strong></li>)}</ol></section>
      </div>
      <section className="admin-card"><h2>用户数据</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>用户</th><th>Provider</th><th>Email</th><th>完成</th><th>分数</th><th>CLI</th><th>创建时间</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td>{user.name}<small>{user.id}</small></td><td>{user.provider}</td><td>{user.email || '-'}</td><td>{user.solved_count}</td><td>{user.total_score}</td><td>{user.pure_cli_count}</td><td>{new Date(user.created_at).toLocaleString()}</td></tr>)}</tbody></table></div></section>
    </section>
  );
}
