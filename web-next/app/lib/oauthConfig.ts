import { getJson, putJson } from './kv';

export type OAuthProviderId = 'linuxdo' | 'github' | 'tuff-nexus';

export type OAuthProviderSettings = {
  id: OAuthProviderId;
  label: string;
  enabled: boolean;
  client_id: string;
  client_secret: string;
  authorize_url?: string;
  token_url?: string;
  userinfo_url?: string;
  scope?: string;
};

export type OAuthProviderConfig = OAuthProviderSettings & {
  loginPath: string;
  missing: string[];
};

export const OAUTH_CONFIG_KEY = 'config:oauth';

const defaults: Record<OAuthProviderId, Omit<OAuthProviderSettings, 'client_id' | 'client_secret' | 'enabled'>> = {
  linuxdo: {
    id: 'linuxdo',
    label: 'Linux.do 登录',
    authorize_url: 'https://connect.linux.do/oauth2/authorize',
    token_url: 'https://connect.linux.do/oauth2/token',
    userinfo_url: 'https://connect.linux.do/api/user',
    scope: 'read'
  },
  github: {
    id: 'github',
    label: 'GitHub 登录',
    authorize_url: 'https://github.com/login/oauth/authorize',
    token_url: 'https://github.com/login/oauth/access_token',
    userinfo_url: 'https://api.github.com/user',
    scope: 'read:user user:email'
  },
  'tuff-nexus': {
    id: 'tuff-nexus',
    label: 'Tuff Nexus 登录',
    scope: 'openid profile email'
  }
};

function loginPath(id: OAuthProviderId) {
  return `/api/auth/${id}`;
}

function requiredMissing(settings: OAuthProviderSettings) {
  const missing: string[] = [];
  if (!settings.client_id?.trim()) missing.push('client_id');
  if (!settings.client_secret?.trim()) missing.push('client_secret');
  if (!settings.authorize_url?.trim()) missing.push('authorize_url');
  if (!settings.token_url?.trim()) missing.push('token_url');
  if (!settings.userinfo_url?.trim()) missing.push('userinfo_url');
  return missing;
}

function normalize(raw: Partial<OAuthProviderSettings> & { id: OAuthProviderId }): OAuthProviderSettings {
  const base = defaults[raw.id];
  return {
    ...base,
    id: raw.id,
    label: raw.label?.trim() || base.label,
    enabled: Boolean(raw.enabled),
    client_id: raw.client_id?.trim() || '',
    client_secret: raw.client_secret?.trim() || '',
    authorize_url: raw.authorize_url?.trim() || base.authorize_url || '',
    token_url: raw.token_url?.trim() || base.token_url || '',
    userinfo_url: raw.userinfo_url?.trim() || base.userinfo_url || '',
    scope: raw.scope?.trim() || base.scope || ''
  };
}

export async function oauthProviderSettings(): Promise<OAuthProviderSettings[]> {
  const stored = await getJson<Partial<Record<OAuthProviderId, Partial<OAuthProviderSettings>>>>(OAUTH_CONFIG_KEY).catch(() => null);
  return (Object.keys(defaults) as OAuthProviderId[]).map((id) => normalize({ id, ...(stored?.[id] || {}) }));
}

export async function oauthProviders(): Promise<OAuthProviderConfig[]> {
  const settings = await oauthProviderSettings();
  return settings.map((item) => {
    const missing = requiredMissing(item);
    return { ...item, loginPath: loginPath(item.id), enabled: item.enabled && missing.length === 0, missing };
  });
}

export async function enabledOAuthProviders() {
  return (await oauthProviders()).filter((item) => item.enabled);
}

export async function oauthProviderById(id: OAuthProviderId) {
  return (await oauthProviders()).find((item) => item.id === id) ?? null;
}

export async function saveOAuthProvider(input: OAuthProviderSettings): Promise<OAuthProviderSettings> {
  const current = await getJson<Partial<Record<OAuthProviderId, Partial<OAuthProviderSettings>>>>(OAUTH_CONFIG_KEY).catch(() => null);
  const normalized = normalize(input);
  const next = { ...(current || {}), [input.id]: normalized };
  await putJson(OAUTH_CONFIG_KEY, next);
  return normalized;
}

export function safeOAuthProvider(provider: OAuthProviderConfig | OAuthProviderSettings) {
  const { client_secret: _secret, ...safe } = provider;
  return { ...safe, client_secret_set: Boolean(provider.client_secret) };
}
