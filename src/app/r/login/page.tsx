"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { BrutalistButton } from '@/components/brutalist/Button';
import { BrutalistInput } from '@/components/brutalist/Input';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { LayoutDashboard, ArrowRight, ArrowLeft, AlertCircle, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export default function GlobalReceptionistLogin() {
  const [slug, setSlug] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const db = useFirestore();

  const handleGo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slug || !db) return;

    setIsVerifying(true);
    setError(null);
    const slugLower = slug.toLowerCase().trim();

    try {
      const clinicRef = doc(db, 'clinics', slugLower);
      const clinicSnap = await getDoc(clinicRef);

      if (clinicSnap.exists()) {
        router.push(`/r/${slugLower}/login`);
      } else {
        setError(`Clinic "${slugLower}" not found.`);
        toast({
          variant: "destructive",
          title: "NOT FOUND",
          description: "THAT CLINIC SLUG DOES NOT EXIST IN OUR SYSTEM."
        });
      }
    } catch (err) {
      toast({
        variant: "destructive",
        title: "ERROR",
        description: "COULD NOT VERIFY CLINIC. PLEASE TRY AGAIN."
      });
    } finally {
      setIsVerifying(false);
    }
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
              onChange={(e) => {
                setSlug(e.target.value);
                setError(null);
              }}
              required 
            />
          </div>

          {!error ? (
            <BrutalistButton 
              type="submit" 
              variant="primary" 
              className="w-full text-lg flex items-center justify-center gap-2 h-14"
              disabled={isVerifying}
            >
              {isVerifying ? "VERIFYING..." : "CONTINUE TO LOGIN"} <ArrowRight className="w-5 h-5" />
            </BrutalistButton>
          ) : (
            <div className="space-y-4">
              <div className="bg-qc-red/10 border-2 border-dashed border-qc-red p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-qc-red shrink-0" />
                <p className="font-mono text-[10px] font-bold uppercase text-qc-red leading-tight">
                  {error} NO RECORD FOUND. WOULD YOU LIKE TO CREATE IT?
                </p>
              </div>
              <Link href="/signup" className="block">
                <BrutalistButton 
                  variant="yellow" 
                  className="w-full text-lg flex items-center justify-center gap-2 h-14"
                >
                  CREATE CLINIC <PlusCircle className="w-5 h-5" />
                </BrutalistButton>
              </Link>
              <button 
                type="button"
                onClick={() => setError(null)}
                className="w-full font-mono text-[10px] uppercase font-bold text-qc-gray hover:text-qc-black transition-colors"
              >
                TRY DIFFERENT SLUG
              </button>
            </div>
          )}
        </form>

        <p className="text-center font-mono text-[9px] uppercase text-qc-gray">
          Don't know your slug? Ask your clinic administrator.
        </p>
      </div>
    </div>
  );
}
