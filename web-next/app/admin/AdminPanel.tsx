'use client';

import { useEffect, useMemo, useState } from 'react';

type OAuthProviderRow = {
  id: 'linuxdo' | 'github' | 'tuff-nexus';
  label: string;
  enabled: boolean;
  client_id: string;
  client_secret?: string;
  client_secret_set?: boolean;
  authorize_url?: string;
  token_url?: string;
  userinfo_url?: string;
  scope?: string;
  missing: string[];
};

type AdminConfig = {
  providers: OAuthProviderRow[];
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

type Collection = 'users' | 'progress' | 'saves' | 'achievements' | 'sessions' | 'season-leaderboard';

type DataRow = {
  key: string;
  value: unknown;
};

const navItems: Array<{ id: string; label: string }> = [
  { id: 'overview', label: '概览' },
  { id: 'oauth', label: 'OAuth 配置' },
  { id: 'users', label: '用户' },
  { id: 'progress', label: '进度' },
  { id: 'saves', label: '存档' },
  { id: 'achievements', label: '成就' },
  { id: 'sessions', label: '会话' },
  { id: 'season-leaderboard', label: '赛季排行' }
];

function preview(value: unknown) {
  if (value == null) return '-';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `${value.length} items`;
  const record = value as Record<string, unknown>;
  return String(record.name || record.provider || record.level_id || record.updated_at || Object.keys(record).slice(0, 3).join(', '));
}

function pretty(value: unknown) {
  return JSON.stringify(value ?? {}, null, 2);
}

export function AdminPanel({ secretConfigured }: { secretConfigured: boolean }) {
  const [secret, setSecret] = useState('');
  const [authed, setAuthed] = useState(false);
  const [active, setActive] = useState('overview');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [config, setConfig] = useState<AdminConfig | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [rows, setRows] = useState<DataRow[]>([]);
  const [editing, setEditing] = useState<{ key: string; collection: Collection; text: string } | null>(null);
  const [creating, setCreating] = useState<{ collection: Collection; key: string; text: string } | null>(null);
  const [oauthEditing, setOauthEditing] = useState<OAuthProviderRow | null>(null);

  const collection = useMemo(() => (['progress', 'saves', 'achievements', 'sessions', 'season-leaderboard'].includes(active) ? active as Collection : active === 'users' ? 'users' : null), [active]);

  async function loadAdminData(targetCollection = collection) {
    setNotice('');
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
    if (targetCollection) await loadCollection(targetCollection);
  }

  async function loadCollection(target: Collection = collection || 'users') {
    const response = await fetch(`/api/admin/data?collection=${encodeURIComponent(target)}&limit=300`);
    if (response.status === 401) {
      setAuthed(false);
      return;
    }
    if (response.ok) setRows((await response.json()).rows ?? []);
  }

  useEffect(() => {
    if (!secretConfigured) return;
    void loadAdminData().then(() => setAuthed(Boolean(summary || config))).catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secretConfigured]);

  useEffect(() => {
    if (!authed || !collection) return;
    void loadCollection(collection);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, authed]);

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
    setRows([]);
  }

  async function saveEdit() {
    if (!editing) return;
    try {
      const value = JSON.parse(editing.text);
      const response = await fetch(`/api/admin/data?collection=${editing.collection}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: editing.key, value }) });
      if (!response.ok) throw new Error('保存失败');
      setEditing(null);
      setNotice('保存成功');
      await loadCollection(editing.collection);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'JSON 格式错误');
    }
  }

  async function createRow() {
    if (!creating) return;
    try {
      const value = JSON.parse(creating.text);
      const response = await fetch('/api/admin/data', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ collection: creating.collection, key: creating.key, value }) });
      if (!response.ok) throw new Error('创建失败');
      setCreating(null);
      setNotice('创建成功');
      await loadCollection(creating.collection);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'JSON 格式错误');
    }
  }

  async function deleteRow(target: DataRow) {
    if (!collection) return;
    if (!window.confirm(`确认删除 ${target.key}？`)) return;
    const response = await fetch(`/api/admin/data?collection=${collection}&key=${encodeURIComponent(target.key)}`, { method: 'DELETE' });
    if (!response.ok) {
      setError('删除失败');
      return;
    }
    setNotice('删除成功');
    await loadCollection(collection);
  }

  async function saveOAuthConfig() {
    if (!oauthEditing) return;
    const response = await fetch('/api/admin/config', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(oauthEditing) });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      setError(data?.error || 'OAuth 配置保存失败');
      return;
    }
    setConfig((current) => current ? { ...current, providers: data.providers ?? current.providers } : current);
    setOauthEditing(null);
    setNotice('OAuth 配置已保存');
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

  const renderDataTable = (title: string, target: Collection) => (
    <section className="admin-cms-card">
      <div className="admin-section-toolbar"><div><h2>{title}</h2><p>{target} 数据表 · 支持 JSON 新增、编辑、删除</p></div><button onClick={() => setCreating({ collection: target, key: '', text: '{\n  \n}' })}>新增</button></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Key</th><th>摘要</th><th>操作</th></tr></thead><tbody>{rows.map((row) => <tr key={row.key}><td><code>{row.key}</code></td><td>{preview(row.value)}</td><td><div className="admin-row-actions"><button onClick={() => setEditing({ key: row.key, collection: target, text: pretty(row.value) })}>编辑</button><button className="danger" onClick={() => void deleteRow(row)}>删除</button></div></td></tr>)}</tbody></table></div>
    </section>
  );

  return (
    <section className="admin-cms-shell">
      <aside className="admin-cms-nav"><div><p className="eyebrow">Admin CMS</p><h1>管理后台</h1></div><nav>{navItems.map((item) => <button key={item.id} className={active === item.id ? 'active' : ''} onClick={() => { setActive(item.id); setError(''); setNotice(''); }}>{item.label}</button>)}</nav><button className="admin-logout" onClick={() => void logout()}>退出登录</button></aside>
      <main className="admin-cms-main">
        <header className="admin-cms-header"><div><h2>{navItems.find((item) => item.id === active)?.label}</h2><p>标准 CMS 列表视图，右侧完成数据管理。</p></div><button onClick={() => void loadAdminData()}>刷新</button></header>
        {notice && <div className="admin-notice ok">{notice}</div>}{error && <div className="admin-notice bad">{error}</div>}
        {active === 'overview' && <section className="admin-cms-card"><h2>概览列表</h2><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>指标</th><th>数值</th></tr></thead><tbody>{Object.entries(summary?.totals ?? {}).map(([key, value]) => <tr key={key}><td>{key}</td><td>{value}</td></tr>)}</tbody></table></div><h3>访问趋势</h3><ol className="admin-list table-like">{summary?.signupsByDay.map((item) => <li key={item.date}><span>{item.date}</span><strong>{item.count}</strong></li>)}</ol></section>}
        {active === 'oauth' && <section className="admin-cms-card"><div className="admin-section-toolbar"><div><h2>OAuth 配置列表</h2><p>OAuth 不再依赖环境变量，在后台保存到 KV 后即可展示登录入口。</p></div></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Provider</th><th>状态</th><th>Client ID</th><th>Secret</th><th>缺失项</th><th>操作</th></tr></thead><tbody>{config?.providers.map((item) => <tr key={item.id}><td>{item.label}<small>{item.id}</small></td><td><span className={item.enabled ? 'ok' : 'bad'}>{item.enabled ? '已启用' : '未启用'}</span></td><td>{item.client_id || '-'}</td><td>{item.client_secret_set ? '已配置' : '未配置'}</td><td>{item.missing.join(', ') || '-'}</td><td><button onClick={() => setOauthEditing(item)}>编辑</button></td></tr>)}</tbody></table></div></section>}
        {active === 'users' && <section className="admin-cms-card"><div className="admin-section-toolbar"><div><h2>用户列表</h2><p>用户聚合数据，原始记录可编辑。</p></div><button onClick={() => setCreating({ collection: 'users', key: '', text: '{\n  "id": "usr_example",\n  "provider": "manual",\n  "provider_user_id": "manual",\n  "name": "User",\n  "created_at": "' + new Date().toISOString() + '",\n  "updated_at": "' + new Date().toISOString() + '"\n}' })}>新增用户</button></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>用户</th><th>Provider</th><th>Email</th><th>完成</th><th>分数</th><th>CLI</th><th>创建时间</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td>{user.name}<small>{user.id}</small></td><td>{user.provider}</td><td>{user.email || '-'}</td><td>{user.solved_count}</td><td>{user.total_score}</td><td>{user.pure_cli_count}</td><td>{new Date(user.created_at).toLocaleString()}</td></tr>)}</tbody></table></div><h3>原始用户记录 CRUD</h3>{renderDataTable('用户原始记录', 'users')}</section>}
        {collection && active !== 'users' && renderDataTable(navItems.find((item) => item.id === active)?.label ?? active, collection)}
      </main>
      {editing && <div className="modal-backdrop"><section className="modal admin-edit-modal"><header><h2>编辑 {editing.key}</h2><button onClick={() => setEditing(null)}>关闭</button></header><textarea value={editing.text} onChange={(event) => setEditing({ ...editing, text: event.target.value })} /><footer><button onClick={() => void saveEdit()}>保存</button></footer></section></div>}
      {creating && <div className="modal-backdrop"><section className="modal admin-edit-modal"><header><h2>新增 {creating.collection}</h2><button onClick={() => setCreating(null)}>关闭</button></header><label>Key<input value={creating.key} onChange={(event) => setCreating({ ...creating, key: event.target.value })} placeholder="不含前缀也可以" /></label><textarea value={creating.text} onChange={(event) => setCreating({ ...creating, text: event.target.value })} /><footer><button onClick={() => void createRow()}>创建</button></footer></section></div>}
      {oauthEditing && <div className="modal-backdrop"><section className="modal admin-edit-modal oauth-config-modal"><header><h2>编辑 {oauthEditing.label}</h2><button onClick={() => setOauthEditing(null)}>关闭</button></header><div className="oauth-config-form"><label>显示名称<input value={oauthEditing.label} onChange={(event) => setOauthEditing({ ...oauthEditing, label: event.target.value })} /></label><label className="inline-setting"><input type="checkbox" checked={oauthEditing.enabled} onChange={(event) => setOauthEditing({ ...oauthEditing, enabled: event.target.checked })} /><span>启用登录入口</span></label><label>Client ID<input value={oauthEditing.client_id} onChange={(event) => setOauthEditing({ ...oauthEditing, client_id: event.target.value })} /></label><label>Client Secret<input type="password" value={oauthEditing.client_secret || ''} placeholder={oauthEditing.client_secret_set ? '留空则保持原 Secret' : '请输入 Secret'} onChange={(event) => setOauthEditing({ ...oauthEditing, client_secret: event.target.value })} /></label><label>Authorize URL<input value={oauthEditing.authorize_url || ''} onChange={(event) => setOauthEditing({ ...oauthEditing, authorize_url: event.target.value })} /></label><label>Token URL<input value={oauthEditing.token_url || ''} onChange={(event) => setOauthEditing({ ...oauthEditing, token_url: event.target.value })} /></label><label>UserInfo URL<input value={oauthEditing.userinfo_url || ''} onChange={(event) => setOauthEditing({ ...oauthEditing, userinfo_url: event.target.value })} /></label><label>Scope<input value={oauthEditing.scope || ''} onChange={(event) => setOauthEditing({ ...oauthEditing, scope: event.target.value })} /></label></div><footer><button onClick={() => void saveOAuthConfig()}>保存 OAuth 配置</button></footer></section></div>}
    </section>
  );
}
