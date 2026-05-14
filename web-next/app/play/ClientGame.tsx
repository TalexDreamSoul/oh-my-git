"use client";

import dynamic from 'next/dynamic';

const GameApp = dynamic(() => import('./GameApp').then((mod) => mod.GameApp), {
  ssr: false,
  loading: () => <main className="login-screen"><section className="login-box">加载游戏中...</section></main>
});

export function ClientGame() {
  return <GameApp />;
}
