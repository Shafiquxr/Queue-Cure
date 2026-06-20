
"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { ArrowLeft, Clock, Users, Stethoscope } from "lucide-react";
import { PatientGate } from "@/components/patient/Gate";
import { getTodayDateString, generateDailyCode } from "@/lib/daily-code";

export default function ClinicWaitingRoom() {
  const { clinicSlug } = useParams();
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

  // 1. Fetch Clinic Metadata
  const clinicRef = useMemo(() => {
    if (!db || !clinicSlug) return null;
    return doc(db, 'clinics', clinicSlug as string);
  }, [db, clinicSlug]);
  const { data: clinic } = useDoc(clinicRef);

  // 2. Fetch All Doctors for this clinic
  const doctorsQuery = useMemo(() => {
    if (!db || !clinicSlug) return null;
    return collection(db, 'clinics', clinicSlug as string, 'doctors');
  }, [db, clinicSlug]);
  const { data: doctors } = useCollection(doctorsQuery);

  // 3. Fetch All Tokens for this clinic today
  const tokensQuery = useMemo(() => {
    if (!db || !clinicSlug) return null;
    return query(
      collection(db, 'tokens'),
      where('clinicId', '==', clinicSlug),
      where('date', '==', today)
    );
  }, [db, clinicSlug, today]);
  const { data: allTokens } = useCollection(tokensQuery);

  // 4. Daily Code Logic
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
        }
      } catch (e) {
        console.error("Code initialization failed", e);
      }
    }
    initDailyCode();
  }, [db, clinicSlug, clinic]);

  const patientUrl = useMemo(() => {
    if (typeof window === 'undefined' || !dailyCode) return '';
    return `${window.location.origin}/q/${clinicSlug}?code=${dailyCode}`;
  }, [clinicSlug, dailyCode]);

  const qrUrl = useMemo(() => {
    if (!patientUrl) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(patientUrl)}`;
  }, [patientUrl]);

  if (!isVerified) {
    return <PatientGate clinicSlug={clinicSlug as string} onVerified={() => setIsVerified(true)} />;
  }

  return (
    <div className="min-h-screen bg-qc-black text-qc-yellow flex flex-col p-6 md:p-12 font-mono">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12 border-b-3 border-qc-yellow/20 pb-8">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="bg-qc-yellow text-qc-black px-3 py-1 font-bold text-sm">LIVE</div>
            <h1 className="text-4xl md:text-6xl font-bold uppercase tracking-tighter">{clinic?.name || clinicSlug}</h1>
          </div>
          <p className="text-qc-cream/60 tracking-[0.3em] uppercase text-xs md:text-sm">Centralized Queue System • Status Active</p>
        </div>
        <div className="flex flex-col items-end">
          <div className="text-5xl md:text-7xl font-bold tabular-nums">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </div>
          <p className="text-qc-cream/40 uppercase text-[10px] tracking-widest mt-2">UTC {now.getTimezoneOffset() / -60}:00</p>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
        {doctors?.map(doc => {
          const docTokens = allTokens?.filter(t => t.doctorId === doc.id) || [];
          const serving = docTokens.find(t => t.status === 'serving');
          const waitingCount = docTokens.filter(t => t.status === 'waiting').length;
          
          // Wait Time Calculation
          const avg = doc.avgConsultMinutes || 12;
          let wait = waitingCount * avg;
          if (serving && serving.calledAt) {
            const calledAt = serving.calledAt.toDate ? serving.calledAt.toDate() : new Date(serving.calledAt);
            const elapsed = Math.floor((now.getTime() - calledAt.getTime()) / 60000);
            wait += Math.max(0, avg - elapsed);
          }

          return (
            <div key={doc.id} className="border-3 border-qc-yellow p-8 space-y-8 flex flex-col bg-qc-yellow/5 hover:bg-qc-yellow/10 transition-colors">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-qc-cream/60 mb-2">
                  <Stethoscope className="w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-widest">{doc.specialization}</span>
                </div>
                <h2 className="text-3xl font-bold uppercase leading-tight">DR. {doc.name.replace('Dr. ', '')}</h2>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center space-y-2 bg-qc-yellow text-qc-black py-8 border-thick border-qc-yellow">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Serving Now</span>
                <span className="text-8xl font-bold tabular-nums">
                  {serving ? serving.tokenNumber.toString().padStart(3, '0') : "---"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t-2 border-qc-yellow/30 pt-6">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase tracking-widest opacity-40 block">In Queue</span>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 opacity-60" />
                    <span className="text-2xl font-bold">{waitingCount}</span>
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[9px] uppercase tracking-widest opacity-40 block">Est. Wait</span>
                  <div className="flex items-center justify-end gap-2">
                    <Clock className="w-4 h-4 opacity-60" />
                    <span className="text-2xl font-bold">~{wait}M</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {doctors?.length === 0 && (
          <div className="col-span-full h-64 flex flex-col items-center justify-center border-3 border-dashed border-qc-yellow/20 text-qc-yellow/40">
            <p className="text-xl uppercase font-bold">No active doctors today</p>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <footer className="mt-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 items-end border-t-3 border-qc-yellow/20 pt-12">
        <div className="flex gap-6 items-center">
          <div className="bg-white p-2 border-2 border-qc-yellow shrink-0">
            {qrUrl ? (
              <img src={qrUrl} alt="TV QR" className="w-32 h-32" />
            ) : (
              <div className="w-32 h-32 bg-qc-yellow/10 animate-pulse" />
            )}
          </div>
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] font-bold">Scan to take this view</p>
            <p className="text-[9px] uppercase leading-relaxed text-qc-cream/40">Keep track of all doctors directly from your mobile browser.</p>
          </div>
        </div>

        <div className="flex flex-col items-center space-y-2 py-4 border-l-2 border-r-2 border-qc-yellow/20">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60">Daily Entry Code</p>
          <p className="text-6xl font-bold tracking-[0.1em]">{dailyCode || "------"}</p>
        </div>

        <div className="text-right space-y-2">
          <p className="text-[10px] uppercase tracking-[0.2em] font-bold opacity-60">System Security</p>
          <p className="text-[10px] uppercase text-qc-cream/40">Clinic Slug: {clinicSlug}</p>
          <p className="text-[10px] uppercase text-qc-cream/40">Connection: SECURE-AES256</p>
        </div>
      </footer>
    </div>
  );
}
