
"use client";

import { useState, useEffect } from 'react';
import { BrutalistButton } from '@/components/brutalist/Button';
import { BrutalistInput } from '@/components/brutalist/Input';
import { useFirestore, useDoc } from '@/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getTodayDateString } from '@/lib/daily-code';
import { toast } from '@/hooks/use-toast';
import { Lock, ArrowRight, ShieldAlert } from 'lucide-react';

interface GateProps {
  clinicSlug: string;
  onVerified: () => void;
}

export function PatientGate({ clinicSlug, onVerified }: GateProps) {
  const db = useFirestore();
  const [code, setCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [isTrusted, setIsTrusted] = useState(false);

  // Check for local session (12h expiration)
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
      // 1. Get Clinic Timezone
      const clinicRef = doc(db, 'clinics', clinicSlug);
      const clinicSnap = await getDoc(clinicRef);
      if (!clinicSnap.exists()) {
        toast({ variant: "destructive", title: "NOT FOUND", description: "CLINIC DOES NOT EXIST." });
        return;
      }
      const timezone = clinicSnap.data().timezone || 'Asia/Kolkata';
      const today = getTodayDateString(timezone);

      // 2. Check Daily Code
      const codeId = `${clinicSlug}_${today}`;
      const codeRef = doc(db, 'dailyCodes', codeId);
      const codeSnap = await getDoc(codeRef);

      if (codeSnap.exists() && codeSnap.data().code === code.toUpperCase().trim()) {
        const sessionKey = `viewer_${clinicSlug}`;
        localStorage.setItem(sessionKey, JSON.stringify({ verified: true, timestamp: Date.now() }));
        toast({ title: "ACCESS GRANTED", description: "WELCOME TO THE CLINIC QUEUE." });
        onVerified();
      } else {
        toast({ variant: "destructive", title: "INVALID CODE", description: "PLEASE CHECK THE WAITING ROOM TV FOR TODAY'S CODE." });
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
          <div className="inline-flex items-center justify-center w-20 h-20 bg-qc-black text-qc-yellow rounded-full border-thick border-qc-black mb-4">
            <Lock className="w-10 h-10" />
          </div>
          <h1 className="text-4xl font-bold uppercase tracking-tighter">Queue Access</h1>
          <p className="font-mono text-xs uppercase tracking-widest text-qc-gray">
            Enter today's clinic access code to view the live queue
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
              This code rotates daily to ensure privacy. If you don't have the code, please ask the receptionist or check the main clinic display.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
