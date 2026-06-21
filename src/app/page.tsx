
import Link from 'next/link';
import { Building2, LayoutDashboard } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-16 bg-qc-cream">
      <header className="space-y-6 max-w-5xl">
        <h1 className="text-5xl md:text-7xl lg:text-8xl font-bold uppercase tracking-tighter leading-none whitespace-nowrap">
          Queue Cure <span className="text-qc-red">'26</span>
        </h1>
        <p className="text-xl md:text-2xl font-mono uppercase tracking-widest text-qc-gray max-w-2xl mx-auto">
          Replacing paper tokens with zero-latency real-time queues.
        </p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        <Link 
          href="/signup" 
          className="group border-thick bg-qc-black text-qc-yellow p-10 font-mono font-bold text-2xl shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex flex-col items-center gap-6"
        >
          <Building2 className="w-16 h-16 group-hover:scale-110 transition-transform" />
          <span>START CLINIC</span>
          <span className="text-[10px] font-normal tracking-wider opacity-60">ADMIN ONBOARDING</span>
        </Link>
        
        <Link 
          href="/r/login" 
          className="group border-thick bg-qc-yellow text-qc-black p-10 font-mono font-bold text-2xl shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex flex-col items-center gap-6"
        >
          <LayoutDashboard className="w-16 h-16 group-hover:scale-110 transition-transform" />
          <span>RECEPTIONIST</span>
          <span className="text-[10px] font-normal tracking-wider opacity-60">STAFF DASHBOARD</span>
        </Link>
      </div>

      <div className="pt-12 border-t-3 border-qc-black w-full max-w-4xl grid grid-cols-2 md:grid-cols-4 gap-8">
        <div className="space-y-1">
          <p className="text-3xl font-bold">100%</p>
          <p className="font-mono text-[10px] uppercase text-qc-gray font-bold">LIVE SYNC</p>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-bold">ZERO</p>
          <p className="font-mono text-[10px] uppercase text-qc-gray font-bold">LATENCY</p>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-bold">ANY</p>
          <p className="font-mono text-[10px] uppercase text-qc-gray font-bold">DEVICE</p>
        </div>
        <div className="space-y-1">
          <p className="text-3xl font-bold">DAILY</p>
          <p className="font-mono text-[10px] uppercase text-qc-gray font-bold">SECURITY</p>
        </div>
      </div>

      <footer className="font-mono text-[10px] uppercase tracking-widest text-qc-gray flex gap-4">
        <span>© 2026 QUEUE CURE</span>
        <span>•</span>
        <span>VERSION 2.0-STABLE</span>
      </footer>
    </div>
  );
}
