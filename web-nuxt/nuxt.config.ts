export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxthub/core'],
  nitro: {
    preset: 'cloudflare-pages'
  },
  hub: {
    database: true,
    kv: true
  },
  runtimeConfig: {
    oauth: {
      githubClientSecret: process.env.GITHUB_CLIENT_SECRET || '',
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET || ''
    },
    public: {
      appName: 'Oh My Git! Web',
      githubClientId: process.env.NUXT_PUBLIC_GITHUB_CLIENT_ID || '',
      googleClientId: process.env.NUXT_PUBLIC_GOOGLE_CLIENT_ID || '',
      oauthRedirectBase: process.env.NUXT_PUBLIC_OAUTH_REDIRECT_BASE || 'http://localhost:3000'
    }
  }
});
