"use client";

import { useState, useEffect } from 'react';
import { BrutalistButton } from '@/components/brutalist/Button';
import { BrutalistInput } from '@/components/brutalist/Input';
import { useFirestore } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getTodayDateString } from '@/lib/daily-code';
import { toast } from '@/hooks/use-toast';
import { Lock, ShieldAlert } from 'lucide-react';

interface GateProps {
  clinicSlug: string;
  onVerified: () => void;
}

export function PatientGate({ clinicSlug, onVerified }: GateProps) {
  const db = useFirestore();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    const sessionKey = `viewer_${clinicSlug}`;
    const session = localStorage.getItem(sessionKey);
    if (session) {
      const { timestamp } = JSON.parse(session);
      const now = Date.now();
      if (now - timestamp < 12 * 60 * 60 * 1000) {
        onVerified();
      }
    }
  }, [clinicSlug, onVerified]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !clinicSlug) return;

    setIsVerifying(true);
    try {
      const clinicRef = doc(db, 'clinics', clinicSlug);
      const clinicSnap = await getDoc(clinicRef);
      if (!clinicSnap.exists()) {
        toast({ variant: "destructive", title: "NOT FOUND", description: "CLINIC DOES NOT EXIST." });
        return;
      }
      const timezone = clinicSnap.data().timezone || 'Asia/Kolkata';
      const today = getTodayDateString(timezone);

      const codeId = `${clinicSlug}_${today}`;
      const codeRef = doc(db, 'dailyCodes', codeId);
      const codeSnap = await getDoc(codeRef);

      if (codeSnap.exists() && codeSnap.data().code === code.toUpperCase().trim()) {
        const sessionKey = `viewer_${clinicSlug}`;
        localStorage.setItem(sessionKey, JSON.stringify({ verified: true, timestamp: Date.now() }));
        onVerified();
      } else {
        toast({ variant: "destructive", title: "INVALID CODE", description: "CHECK THE MAIN DISPLAY FOR TODAY'S CODE." });
      }
    } catch (e) {
      toast({ variant: "destructive", title: "ERROR", description: "COULD NOT VERIFY ACCESS." });
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="min-h-screen bg-qc-cream flex flex-col items-center justify-center p-6 text-center">
      <div className="w-full max-w-sm space-y-8">
        <header className="space-y-4">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-qc-black text-qc-yellow rounded-full border-thick border-qc-black mb-4 mx-auto">
            <Lock className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold uppercase tracking-tighter">Queue Access</h1>
          <p className="font-mono text-xs uppercase tracking-widest text-qc-gray">
            Enter today's clinic code to track your status
          </p>
        </header>

        <form onSubmit={handleVerify} className="space-y-4">
          <BrutalistInput 
            placeholder="6-DIGIT CODE" 
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="text-center text-2xl tracking-[0.5em] font-bold h-16"
            maxLength={6}
            required
          />
          <BrutalistButton 
            type="submit" 
            variant="primary" 
            className="w-full py-4 text-lg"
            disabled={isVerifying}
          >
            {isVerifying ? "VERIFYING..." : "ENTER QUEUE"}
          </BrutalistButton>
        </form>

        <div className="pt-8 border-t-2 border-dashed border-qc-gray">
          <div className="flex gap-4 items-start text-left">
            <ShieldAlert className="w-6 h-6 shrink-0 text-qc-gray" />
            <p className="font-mono text-[9px] uppercase leading-relaxed text-qc-gray">
              Access codes rotate daily. Please ask the receptionist if you don't have the code.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}