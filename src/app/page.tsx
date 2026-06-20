import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-12">
      <div className="space-y-4">
        <h1 className="text-6xl md:text-8xl font-bold uppercase tracking-tight">
          Queue Cure <span className="text-qc-yellow">'26</span>
        </h1>
        <p className="text-xl md:text-2xl font-mono uppercase tracking-widest text-qc-gray">
          Real-time patient management for clinics
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
        <Link 
          href="/admin" 
          className="border-thick bg-qc-black text-qc-yellow p-6 font-mono font-bold text-xl hover:shadow-brutal hover:-translate-x-1 hover:-translate-y-1 transition-all"
        >
          ADMIN SETUP
        </Link>
        <Link 
          href="/r/apollo-jubilee-hills/login" 
          className="border-thick bg-qc-yellow text-qc-black p-6 font-mono font-bold text-xl hover:shadow-brutal hover:-translate-x-1 hover:-translate-y-1 transition-all"
        >
          RECEPTIONIST LOGIN
        </Link>
      </div>

      <div className="pt-12 border-t-3 border-qc-black w-full max-w-lg">
        <p className="font-mono text-xs uppercase tracking-widest text-qc-gray">
          Built for speed • Zero latency • Neo-brutalist
        </p>
      </div>
    </div>
  );
}
