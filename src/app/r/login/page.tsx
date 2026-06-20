
"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrutalistButton } from '@/components/brutalist/Button';
import { BrutalistInput } from '@/components/brutalist/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from '@/hooks/use-toast';
import { LayoutDashboard, ArrowRight, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function GlobalReceptionistLogin() {
  const [slug, setSlug] = useState('');
  const router = useRouter();

  const handleGo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug) return;
    router.push(`/r/${slug.toLowerCase().trim()}/login`);
  };

  return (
    <div className="min-h-screen bg-qc-yellow flex flex-col items-center justify-center p-6">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 font-mono text-xs uppercase font-bold hover:underline">
        <ArrowLeft className="w-3 h-3" /> Back to Home
      </Link>

      <div className="w-full max-w-md bg-qc-cream border-thick border-qc-black p-8 shadow-brutal space-y-8">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-qc-black text-qc-yellow rounded-full border-thick border-qc-black mb-2">
            <LayoutDashboard className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-tight">Staff Entry</h1>
          <p className="font-mono text-xs uppercase text-qc-gray tracking-widest">
            Enter your clinic slug to continue
          </p>
        </header>

        <form onSubmit={handleGo} className="space-y-6">
          <div className="space-y-2">
            <label className="font-mono text-[10px] font-bold uppercase">Clinic Slug</label>
            <BrutalistInput 
              placeholder="e.g. apollo-jh" 
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              required 
            />
          </div>

          <BrutalistButton 
            type="submit" 
            variant="primary" 
            className="w-full text-lg flex items-center justify-center gap-2"
          >
            CONTINUE TO LOGIN <ArrowRight className="w-5 h-5" />
          </BrutalistButton>
        </form>

        <p className="text-center font-mono text-[9px] uppercase text-qc-gray">
          Don't know your slug? Ask your clinic administrator.
        </p>
      </div>
    </div>
  );
}
