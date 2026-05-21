export type OAuthProviderId = 'linuxdo' | 'github' | 'tuff-nexus';

export type OAuthProviderConfig = {
  id: OAuthProviderId;
  label: string;
  loginPath: string;
  enabled: boolean;
  missing: string[];
};

function env(name: string) {
  return process.env[name]?.trim() || '';
}

function provider(id: OAuthProviderId, label: string, loginPath: string, required: string[]): OAuthProviderConfig {
  const missing = required.filter((name) => !env(name));
  return { id, label, loginPath, enabled: missing.length === 0, missing };
}

export function oauthProviders(): OAuthProviderConfig[] {
  return [
    provider('linuxdo', 'Linux.do 登录', '/api/auth/linuxdo', ['NEXT_PUBLIC_LINUXDO_CLIENT_ID', 'LINUXDO_CLIENT_SECRET']),
    provider('github', 'GitHub 登录', '/api/auth/github', ['NEXT_PUBLIC_GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET']),
    provider('tuff-nexus', 'Tuff Nexus 登录', '/api/auth/tuff-nexus', [
      'NEXT_PUBLIC_TUFF_NEXUS_CLIENT_ID',
      'TUFF_NEXUS_CLIENT_SECRET',
      'TUFF_NEXUS_AUTHORIZE_URL',
      'TUFF_NEXUS_TOKEN_URL',
      'TUFF_NEXUS_USERINFO_URL'
    ])
  ];
}

export function enabledOAuthProviders() {
  return oauthProviders().filter((item) => item.enabled);
}

export function oauthProviderById(id: OAuthProviderId) {
  return oauthProviders().find((item) => item.id === id) ?? null;
}
