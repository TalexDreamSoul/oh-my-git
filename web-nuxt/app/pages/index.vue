<script setup lang="ts">
type MeResponse = {
  user: null | {
    id: string;
    name: string;
    email?: string;
    avatar_url?: string;
  };
};

const { data, refresh } = await useFetch<MeResponse>('/api/auth/me');
const progress = ref<any[]>([]);

async function loadProgress() {
  if (!data.value?.user) return;
  const result = await $fetch<{ progress: any[] }>('/api/progress');
  progress.value = result.progress;
}

async function logout() {
  await $fetch('/api/auth/logout', { method: 'POST' });
  await refresh();
  progress.value = [];
}

watchEffect(() => {
  if (data.value?.user) void loadProgress();
});
</script>

<template>
  <main class="page">
    <section class="hero">
      <p class="eyebrow">Oh My Git! Web Cloudflare</p>
      <h1>云端学习进度与 OAuth 骨架</h1>
      <p>这里是 Nuxt + Cloudflare Pages/Workers + D1/KV 的全栈版本入口。游戏主体会逐步从 Vite 原型迁入。</p>
    </section>

    <section v-if="!data?.user" class="panel">
      <h2>登录</h2>
      <p>请选择 OAuth 登录方式。需要先配置对应 Client ID / Secret。</p>
      <div class="actions">
        <a href="/api/auth/github">GitHub 登录</a>
        <a href="/api/auth/google">Google 登录</a>
      </div>
    </section>

    <section v-else class="panel profile">
      <img v-if="data.user.avatar_url" :src="data.user.avatar_url" alt="" />
      <div>
        <h2>{{ data.user.name }}</h2>
        <p>{{ data.user.email || '未公开邮箱' }}</p>
      </div>
      <button @click="logout">退出</button>
    </section>

    <section v-if="data?.user" class="panel">
      <h2>云端进度</h2>
      <p v-if="progress.length === 0">暂无同步进度。</p>
      <ul v-else>
        <li v-for="item in progress" :key="item.level_id">
          <strong>{{ item.level_id }}</strong>
          <span>分数 {{ item.best_score ?? '-' }} / 用时 {{ item.best_time_seconds ?? '-' }}s / 纯 CLI {{ item.pure_cli ? '是' : '否' }}</span>
        </li>
      </ul>
    </section>
  </main>
</template>

<style scoped>
.page { max-width: 920px; margin: 0 auto; padding: 48px 20px; }
.hero { margin-bottom: 24px; }
.eyebrow { color: #a1a1aa; font-size: 12px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
h1 { font-size: clamp(32px, 5vw, 56px); line-height: 1; margin: 0 0 16px; }
p { color: #a1a1aa; line-height: 1.8; }
.panel { border: 1px solid #27272a; margin-top: 16px; padding: 20px; }
.actions { display: flex; gap: 12px; flex-wrap: wrap; }
.actions a, button { border: 1px solid #3f3f46; background: transparent; color: #fafafa; cursor: pointer; padding: 10px 14px; text-decoration: none; }
.profile { align-items: center; display: flex; gap: 16px; }
.profile img { border-radius: 999px; height: 56px; width: 56px; }
.profile button { margin-left: auto; }
ul { display: grid; gap: 10px; padding: 0; list-style: none; }
li { border-bottom: 1px solid #27272a; display: flex; justify-content: space-between; gap: 12px; padding-bottom: 10px; }
li span { color: #a1a1aa; }
</style>
