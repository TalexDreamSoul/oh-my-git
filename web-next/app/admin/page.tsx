import Link from 'next/link';
import { DarkVeil } from '../components/DarkVeil';
import { adminSecretStatus } from '../lib/admin';
import { AdminPanel } from './AdminPanel';

export default function AdminPage() {
  const status = adminSecretStatus();
  return (
    <main className="login-screen auth-screen admin-screen">
      <div className="darkveil-layer"><DarkVeil hueShift={0} noiseIntensity={0} scanlineIntensity={0} speed={0.5} scanlineFrequency={0} warpAmount={0} resolutionScale={1} /></div>
      <header className="hero-nav">
        <Link href="/" className="hero-logo"><span>&gt;_</span><b>ohmygit</b></Link>
        <nav><Link href="/">Home</Link><Link href="/play">Play</Link><Link href="/login">Login</Link></nav>
      </header>
      <AdminPanel secretConfigured={status.configured} />
    </main>
  );
}
