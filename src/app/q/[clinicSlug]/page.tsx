
"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, doc, getDoc } from "firebase/firestore";
import { Clock, Users, Stethoscope } from "lucide-react";
import { PatientGate } from "@/components/patient/Gate";
import { getTodayDateString } from "@/lib/daily-code";

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

  const clinicRef = useMemo(() => {
    if (!db || !clinicSlug) return null;
    return doc(db, 'clinics', clinicSlug as string);
  }, [db, clinicSlug]);
  const { data: clinic } = useDoc(clinicRef);

  const doctorsQuery = useMemo(() => {
    if (!db || !clinicSlug) return null;
    return collection(db, 'clinics', clinicSlug as string, 'doctors');
  }, [db, clinicSlug]);
  const { data: doctors } = useCollection(doctorsQuery);

  const tokensQuery = useMemo(() => {
    if (!db || !clinicSlug) return null;
    return query(
      collection(db, 'tokens'),
      where('clinicId', '==', clinicSlug),
      where('date', '==', today)
    );
  }, [db, clinicSlug, today]);
  const { data: allTokens } = useCollection(tokensQuery);

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
    <div className="min-h-screen bg-qc-black text-qc-yellow flex flex-col p-6 md:p-12 font-mono overflow-hidden">
      {/* Header with centered branding */}
      <header className="relative flex items-center justify-between w-full mb-12 border-b-2 border-qc-yellow/20 pb-8">
        <div className="z-10 w-1/4">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Clinic</p>
          <h1 className="text-lg font-bold uppercase truncate">{clinic?.name || clinicSlug}</h1>
        </div>

        <div className="absolute left-1/2 -translate-x-1/2 text-center z-10 w-1/2">
          <h2 className="text-2xl md:text-4xl font-bold uppercase tracking-tighter whitespace-nowrap">
            Queue Cure <span className="text-qc-red">'26</span>
          </h2>
        </div>

        <div className="text-right z-10 w-1/4">
          <div className="text-3xl md:text-5xl font-bold tabular-nums">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </header>

      {/* Main Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12 overflow-y-auto pr-2 scrollbar-hide">
        {doctors?.map(doc => {
          const docTokens = allTokens?.filter(t => t.doctorId === doc.id) || [];
          const serving = docTokens.find(t => t.status === 'serving');
          const waitingCount = docTokens.filter(t => t.status === 'waiting').length;
          const avg = doc.avgConsultMinutes || 12;
          let wait = waitingCount * avg;
          
          if (serving && serving.calledAt) {
            const calledAt = serving.calledAt.toDate ? serving.calledAt.toDate() : new Date(serving.calledAt);
            const elapsed = Math.floor((now.getTime() - calledAt.getTime()) / 60000);
            wait += Math.max(0, avg - elapsed);
          }

          return (
            <div key={doc.id} className="border-3 border-qc-yellow p-8 space-y-6 flex flex-col bg-qc-yellow/5">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-qc-cream/60 mb-1">
                  <Stethoscope className="w-4 h-4" />
                  <span className="text-[10px] uppercase tracking-widest">{doc.specialization}</span>
                </div>
                <h2 className="text-3xl font-bold uppercase leading-tight">DR. {doc.name.replace('Dr. ', '')}</h2>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center space-y-2 bg-qc-yellow text-qc-black py-8 border-thick border-qc-yellow shadow-brutal">
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Now Serving</span>
                <span className="text-8xl font-bold tabular-nums">
                  {serving ? serving.tokenNumber.toString().padStart(3, '0') : "---"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 border-t-2 border-qc-yellow/30 pt-6">
                <div className="space-y-1">
                  <span className="text-[9px] uppercase tracking-widest opacity-40 block">In Line</span>
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 opacity-60" />
                    <span className="text-2xl font-bold">{waitingCount}</span>
                  </div>
                </div>
                <div className="space-y-1 text-right">
                  <span className="text-[9px] uppercase tracking-widest opacity-40 block">Wait Time</span>
                  <div className="flex items-center justify-end gap-2">
                    <Clock className="w-4 h-4 opacity-60" />
                    <span className="text-2xl font-bold">~{wait}M</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Grid - 4 Columns Layout */}
      <footer className="mt-auto grid grid-cols-1 md:grid-cols-4 gap-8 items-end border-t-2 border-qc-yellow/20 pt-8">
        <div className="flex gap-4 items-center">
          <div className="bg-white p-1 border-2 border-qc-yellow shrink-0">
            {qrUrl ? <img src={qrUrl} alt="TV QR" className="w-24 h-24" /> : <div className="w-24 h-24 bg-qc-yellow/10 animate-pulse" />}
          </div>
          <p className="text-[9px] uppercase font-bold tracking-widest leading-tight opacity-60">Scan to follow<br/>this screen</p>
        </div>

        <div className="space-y-1 border-l-2 border-qc-yellow/20 pl-6">
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Security</p>
          <p className="text-[10px] uppercase font-bold text-qc-cream/80">LIVE AES-256</p>
          <p className="text-[9px] uppercase opacity-40">UTC {now.getTimezoneOffset() / -60}:00</p>
        </div>

        <div className="flex flex-col items-center space-y-1 border-l-2 border-qc-yellow/20 px-6">
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">Entry Code</p>
          <p className="text-5xl font-bold tracking-widest text-qc-yellow">{dailyCode || "------"}</p>
        </div>

        <div className="text-right space-y-1">
          <p className="text-[10px] uppercase tracking-widest font-bold opacity-40">System Status</p>
          <p className="text-[10px] uppercase font-bold text-qc-green-400">OPERATIONAL</p>
          <p className="text-[9px] uppercase opacity-30">© 2026 QUEUE CURE</p>
        </div>
      </footer>
    </div>
  );
}
