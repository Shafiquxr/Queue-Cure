
"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, Clock } from "lucide-react";
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

  useEffect(() => {
    const codeInUrl = searchParams.get('code');
    if (codeInUrl && clinicSlug) {
      setIsVerified(true);
    }
  }, [searchParams, clinicSlug]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const doctorId = `${clinicSlug}_${doctorSlug}`;

  const doctorRef = useMemo(() => {
    if (!db || !clinicSlug || !doctorId) return null;
    return doc(db, 'clinics', clinicSlug as string, 'doctors', doctorId);
  }, [db, clinicSlug, doctorId]);
  const { data: doctor } = useDoc(doctorRef);

  const clinicRef = useMemo(() => {
    if (!db || !clinicSlug) return null;
    return doc(db, 'clinics', clinicSlug as string);
  }, [db, clinicSlug]);
  const { data: clinic } = useDoc(clinicRef);

  useEffect(() => {
    async function initDailyCode() {
      if (!db || !clinicSlug || !clinic) return;
      
      const todayDate = getTodayDateString(clinic.timezone);
      const codeId = `${clinicSlug}_${todayDate}`;
      const codeRef = doc(db, 'dailyCodes', codeId);
      
      try {
        const snap = await getDoc(codeRef);
        if (snap.exists()) {
          setDailyCode(snap.data().code);
        } else if (isVerified) { 
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
      where('date', '==', today)
    );
  }, [db, doctorId, today]);

  const { data: rawTokens } = useCollection(tokensQuery);

  const tokens = useMemo(() => {
    if (!rawTokens) return [];
    return [...rawTokens].sort((a, b) => (a.tokenNumber || 0) - (b.tokenNumber || 0));
  }, [rawTokens]);

  const servingToken = tokens?.find(t => t.status === 'serving');
  const waitingTokens = tokens?.filter(t => t.status === 'waiting') || [];
  const waitingCount = waitingTokens.length;

  const estWait = useMemo(() => {
    if (!doctor || !servingToken) return waitingCount * (doctor?.avgConsultMinutes || 12);
    
    const avg = doctor.avgConsultMinutes || 12;
    const calledAt = servingToken.calledAt?.toDate() || new Date();
    const elapsed = Math.floor((now.getTime() - calledAt.getTime()) / 60000);
    const remainingForCurrent = Math.max(0, avg - elapsed);
    
    return remainingForCurrent + (waitingCount > 0 ? (waitingCount - 1) * avg : 0);
  }, [doctor, servingToken, waitingCount, now]);

  const patientUrl = useMemo(() => {
    if (typeof window === 'undefined' || !dailyCode) return '';
    return `${window.location.origin}/q/${clinicSlug}/${doctorSlug}?code=${dailyCode}`;
  }, [clinicSlug, doctorSlug, dailyCode]);

  const qrUrl = useMemo(() => {
    if (!patientUrl) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(patientUrl)}`;
  }, [patientUrl]);

  if (!isVerified) {
    return <PatientGate clinicSlug={clinicSlug as string} onVerified={() => setIsVerified(true)} />;
  }

  return (
    <div className="h-screen w-screen bg-qc-black overflow-hidden flex flex-col p-12 text-qc-yellow">
      {/* Header Bar */}
      <div className="flex justify-between items-start w-full mb-4">
        <button 
          onClick={() => router.push('/')}
          className="text-qc-yellow hover:bg-qc-yellow/10 p-2 border-2 border-qc-yellow/30"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>

        <div className="flex items-center gap-6">
          <div className="font-mono text-xl font-bold uppercase tracking-[0.2em] whitespace-nowrap">
            Queue Cure '26
          </div>
          <div className="font-mono text-4xl font-bold tabular-nums">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
        </div>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center space-y-12">
        {/* Token Section */}
        <div className="space-y-4 text-center">
          <h2 className="font-mono text-[1.5vw] uppercase tracking-[0.25em] text-qc-cream/60">
            Now Serving
          </h2>
          <div className="text-[18vw] leading-none font-mono font-bold tracking-tighter tabular-nums bg-qc-yellow text-qc-black px-12 border-thick border-qc-yellow min-w-[35vw]">
            {servingToken ? servingToken.tokenNumber.toString().padStart(3, '0') : "---"}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-12 w-full max-w-6xl">
          <div className="border-3 border-qc-yellow/30 p-8 space-y-2 flex flex-col justify-center text-center">
            <h3 className="font-mono text-[1.2vw] uppercase tracking-widest opacity-60">Consulting</h3>
            <p className="text-[3vw] font-headline font-bold uppercase leading-tight">
              DR. {doctorSlug?.toString().toUpperCase().replace('-', ' ')}
            </p>
            <p className="font-mono text-[1vw] uppercase text-qc-yellow/50">{doctor?.specialization}</p>
          </div>

          <div className="border-3 border-qc-yellow/30 p-8 space-y-4 text-center">
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

      {/* Bottom Info Bar */}
      <div className="w-full flex justify-between items-end pt-12 border-t-2 border-qc-yellow/20">
        <div className="flex gap-12 items-end">
          <div className="text-left space-y-2 border-l-4 border-qc-yellow pl-6">
            <p className="font-mono text-[0.8vw] uppercase tracking-[0.3em] opacity-40">Scan to Join</p>
            {qrUrl ? (
              <div className="bg-white p-2 border-2 border-qc-yellow">
                <img src={qrUrl} alt="Join Queue" className="w-40 h-40" />
              </div>
            ) : (
              <div className="w-40 h-40 bg-qc-gray animate-pulse" />
            )}
          </div>
          
          <div className="text-left space-y-2 border-l-4 border-qc-yellow pl-6">
            <p className="font-mono text-[0.8vw] uppercase tracking-[0.3em] opacity-40">Daily Access Code</p>
            <p className="font-mono text-[4vw] font-bold tracking-[0.2em] leading-none text-qc-yellow">
              {dailyCode || "------"}
            </p>
          </div>
        </div>

        <div className="text-right font-mono text-[1vw] uppercase opacity-30 tracking-[0.5em] flex flex-col items-end gap-2">
           <div className="flex gap-4">
            {waitingTokens.slice(0, 3).map(t => (
              <span key={t.id} className="border border-qc-yellow px-2">Next: {t.tokenNumber.toString().padStart(3, '0')}</span>
            ))}
          </div>
          <span>Stay Alert • Watch for your number</span>
        </div>
      </div>
    </div>
  );
}
