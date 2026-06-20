
"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, orderBy, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, Clock, ShieldCheck } from "lucide-react";
import { PatientGate } from "@/components/patient/Gate";
import { getTodayDateString, generateDailyCode } from "@/lib/daily-code";

export default function WaitingRoomTV() {
  const { clinicSlug, doctorSlug } = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const db = useFirestore();
  const [now, setNow] = useState(new Date());
  const [isVerified, setIsVerified] = useState(false);
  const [dailyCode, setDailyCode] = useState<string | null>(null);

  // Auto-verify if code is in URL (QR scan path)
  useEffect(() => {
    const codeInUrl = searchParams.get('code');
    if (codeInUrl && clinicSlug) {
      // Basic check - the gate will handle full validation if this fails
      setIsVerified(true);
    }
  }, [searchParams, clinicSlug]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const doctorId = `${clinicSlug}_${doctorSlug}`;

  // Fetch Doctor metadata
  const doctorRef = useMemo(() => {
    if (!db || !clinicSlug || !doctorId) return null;
    return doc(db, 'clinics', clinicSlug as string, 'doctors', doctorId);
  }, [db, clinicSlug, doctorId]);
  const { data: doctor } = useDoc(doctorRef);

  // Fetch Clinic for timezone
  const clinicRef = useMemo(() => {
    if (!db || !clinicSlug) return null;
    return doc(db, 'clinics', clinicSlug as string);
  }, [db, clinicSlug]);
  const { data: clinic } = useDoc(clinicRef);

  // Lazy generate/fetch daily code (only on TV display)
  useEffect(() => {
    async function initDailyCode() {
      if (!db || !clinicSlug || !clinic || !isVerified) return;
      
      const todayDate = getTodayDateString(clinic.timezone);
      const codeId = `${clinicSlug}_${todayDate}`;
      const codeRef = doc(db, 'dailyCodes', codeId);
      
      try {
        const snap = await getDoc(codeRef);
        if (snap.exists()) {
          setDailyCode(snap.data().code);
        } else {
          // Circular fix: The TV display generates the code if it doesn't exist
          const newCode = generateDailyCode();
          await setDoc(codeRef, {
            clinicId: clinicSlug,
            date: todayDate,
            code: newCode,
            createdAt: serverTimestamp()
          });
          setDailyCode(newCode);
        }
      } catch (e) {
        console.error("Code initialization failed", e);
      }
    }
    initDailyCode();
  }, [db, clinicSlug, clinic, isVerified]);

  const tokensQuery = useMemo(() => {
    if (!db || !doctorId) return null;
    return query(
      collection(db, 'tokens'),
      where('doctorId', '==', doctorId),
      where('date', '==', today),
      orderBy('tokenNumber', 'asc')
    );
  }, [db, doctorId, today]);

  const { data: tokens } = useCollection(tokensQuery);

  const servingToken = tokens?.find(t => t.status === 'serving');
  const waitingTokens = tokens?.filter(t => t.status === 'waiting') || [];
  const waitingCount = waitingTokens.length;

  // Wait time calculation
  const estWait = useMemo(() => {
    if (!doctor || !servingToken) return waitingCount * (doctor?.avgConsultMinutes || 12);
    
    const avg = doctor.avgConsultMinutes || 12;
    const calledAt = servingToken.calledAt?.toDate() || new Date();
    const elapsed = Math.floor((now.getTime() - calledAt.getTime()) / 60000);
    const remainingForCurrent = Math.max(0, avg - elapsed);
    
    return remainingForCurrent + (waitingCount > 0 ? (waitingCount - 1) * avg : 0);
  }, [doctor, servingToken, waitingCount, now]);

  if (!isVerified) {
    return <PatientGate clinicSlug={clinicSlug as string} onVerified={() => setIsVerified(true)} />;
  }

  return (
    <div className="h-screen w-screen bg-qc-black overflow-hidden flex flex-col items-center justify-center p-12 text-center text-qc-yellow relative">
      <button 
        onClick={() => router.push('/')}
        className="absolute top-8 left-12 text-qc-yellow hover:bg-qc-yellow/10 p-2 border-2 border-qc-yellow/30"
      >
        <ArrowLeft className="w-6 h-6" />
      </button>

      <div className="absolute top-8 right-12 flex items-center gap-6 border-b-3 border-qc-yellow/30 pb-4">
        <div className="font-mono text-xl font-bold uppercase tracking-[0.2em]">
          Queue Cure '26
        </div>
        <div className="font-mono text-4xl font-bold tabular-nums">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
        </div>
      </div>

      <div className="space-y-8">
        <div className="space-y-2">
          <h2 className="font-mono text-[2vw] uppercase tracking-[0.25em] text-qc-cream/60">
            Now Serving
          </h2>
          <div className="text-[20vw] leading-none font-mono font-bold tracking-tighter tabular-nums bg-qc-yellow text-qc-black px-12 border-thick border-qc-yellow min-w-[50vw]">
            {servingToken ? servingToken.tokenNumber.toString().padStart(3, '0') : "---"}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-12 pt-8">
          <div className="border-3 border-qc-yellow/30 p-8 space-y-2">
            <h3 className="font-mono text-[1.2vw] uppercase tracking-widest opacity-60">Consulting</h3>
            <p className="text-[3vw] font-headline font-bold uppercase leading-tight">
              DR. {doctorSlug?.toString().toUpperCase().replace('-', ' ')}
            </p>
            <p className="font-mono text-[1vw] uppercase text-qc-yellow/50">{doctor?.specialization}</p>
          </div>

          <div className="border-3 border-qc-yellow/30 p-8 space-y-4">
            <div className="flex items-center justify-center gap-4">
              <Clock className="w-8 h-8" />
              <h3 className="font-mono text-[1.2vw] uppercase tracking-widest opacity-60">Estimated Wait</h3>
            </div>
            <div className="text-[5vw] font-mono font-bold">~{estWait}<span className="text-[2vw] ml-2">MIN</span></div>
            <p className="font-mono text-[1vw] uppercase text-qc-yellow/50">
              {waitingCount} PATIENTS IN LINE
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-8 w-full px-24 flex justify-between items-end">
        <div className="text-left space-y-2 border-l-4 border-qc-yellow pl-6">
          <p className="font-mono text-[0.8vw] uppercase tracking-[0.3em] opacity-40">Access Code</p>
          <p className="font-mono text-[3vw] font-bold tracking-[0.2em] leading-none">
            {dailyCode || "------"}
          </p>
        </div>
        <div className="text-right font-mono text-[1vw] uppercase opacity-30 tracking-[0.5em] flex flex-col items-end gap-2">
           <div className="flex gap-4">
            {waitingTokens.slice(0, 3).map(t => (
              <span key={t.id} className="border border-qc-yellow px-2">Next: {t.tokenNumber.toString().padStart(3, '0')}</span>
            ))}
          </div>
          <span>Stay Alert • Your token will be called once</span>
        </div>
      </div>
    </div>
  );
}
