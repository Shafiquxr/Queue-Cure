
"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import { useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, doc, getDoc } from "firebase/firestore";
import { Clock, Users, Stethoscope, ArrowLeft } from "lucide-react";
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

  const [today, setToday] = useState(() => new Date().toISOString().split('T')[0]);

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

  const codeRef = useMemo(() => {
    if (!db || !clinicSlug || !clinic) return null;
    const todayDate = getTodayDateString(clinic.timezone);
    return doc(db, 'dailyCodes', `${clinicSlug}_${todayDate}`);
  }, [db, clinicSlug, clinic]);
  const { data: dailyCodeDoc } = useDoc(codeRef);

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

  useEffect(() => {
    const tz = clinic?.timezone || 'Asia/Kolkata';
    setToday(getTodayDateString(tz));
    
    const interval = setInterval(() => {
      const current = getTodayDateString(tz);
      setToday((prev) => {
        if (prev !== current) {
          return current;
        }
        return prev;
      });
    }, 30000);
    return () => clearInterval(interval);
  }, [clinic]);

  useEffect(() => {
    if (dailyCodeDoc) {
      setDailyCode(dailyCodeDoc.code);
    }
  }, [dailyCodeDoc]);

  const sortedDoctors = useMemo(() => {
    if (!doctors) return [];
    return doctors
      .map(doc => {
        const docTokens = allTokens?.filter(t => t.doctorId === doc.id) || [];
        const serving = docTokens.find(t => t.status === 'serving');
        const waitingCount = docTokens.filter(t => t.status === 'waiting').length;

        const doneTokens = docTokens.filter(t => t.status === 'done' && t.calledAt && t.completedAt);
        let avg = doc.avgConsultMinutes || 12;
        if (doneTokens.length >= 3) {
          const totalMinutes = doneTokens.reduce((sum, t) => {
            const called = t.calledAt.toDate ? t.calledAt.toDate() : new Date(t.calledAt);
            const completed = t.completedAt.toDate ? t.completedAt.toDate() : new Date(t.completedAt);
            const diffMs = completed.getTime() - called.getTime();
            return sum + Math.max(0, diffMs / 60000);
          }, 0);
          const computedAvg = Math.round(totalMinutes / doneTokens.length);
          avg = computedAvg > 0 ? computedAvg : 1;
        }

        let remainingTime = 0;
        let calledAtMs = 0;

        if (serving && serving.calledAt) {
          const calledAt = serving.calledAt.toDate ? serving.calledAt.toDate() : new Date(serving.calledAt);
          calledAtMs = calledAt.getTime();
          const elapsed = Math.floor((now.getTime() - calledAtMs) / 60000);
          remainingTime = Math.max(0, avg - elapsed);
        }

        const wait = (serving ? remainingTime : 0) + (waitingCount * avg);

        return { doc, serving, waitingCount, wait, calledAtMs };
      })
      .sort((a, b) => b.calledAtMs - a.calledAtMs);
  }, [doctors, allTokens, now]);

  const patientUrl = useMemo(() => {
    if (typeof window === 'undefined' || !dailyCode) return '';
    return `${window.location.origin}/q/${clinicSlug}?code=${dailyCode}`;
  }, [clinicSlug, dailyCode]);

  const qrUrl = useMemo(() => {
    if (!patientUrl) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(patientUrl)}`;
  }, [patientUrl]);

  const cleanDocName = (name: string) => {
    return name.replace(/^dr\.?\s*/gi, '').toUpperCase();
  };

  if (!isVerified) {
    return <PatientGate clinicSlug={clinicSlug as string} onVerified={() => setIsVerified(true)} />;
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-qc-black text-qc-yellow flex flex-col p-3 sm:p-5 md:p-8 lg:p-10 font-mono overflow-x-hidden">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 w-full mb-4 sm:mb-6 md:mb-10 border-b-2 border-qc-yellow/20 pb-3 sm:pb-4 md:pb-6 shrink-0">
        <div className="flex flex-col items-start min-w-0">
          <p className="text-[8px] sm:text-[10px] font-bold uppercase tracking-widest opacity-60">Clinic</p>
          <h1 className="text-xs sm:text-sm md:text-base font-bold uppercase truncate max-w-[120px] sm:max-w-[180px] md:max-w-[250px]">
            {clinic?.name || clinicSlug}
          </h1>
        </div>

        <div className="flex justify-center text-center order-first sm:order-none w-full sm:w-auto">
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold uppercase tracking-tighter whitespace-nowrap">
            Queue Cure <span className="text-qc-red">'26</span>
          </h2>
        </div>

        <div className="flex justify-end">
          <div className="text-xl sm:text-2xl md:text-4xl lg:text-5xl font-bold tabular-nums">
            {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </header>

      {/* Main Grid: Doctors display */}
      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6 lg:gap-8 mb-4 sm:mb-6 md:mb-10 overflow-y-auto pr-1 sm:pr-2 scrollbar-hide">
        {sortedDoctors.map(({ doc, serving, waitingCount, wait }) => (
          <div key={doc.id} className="border-2 sm:border-3 border-qc-yellow p-3 sm:p-4 md:p-6 flex flex-col bg-qc-yellow/5">
            <div className="mb-3 sm:mb-4 md:mb-6 space-y-0.5 sm:space-y-1">
              <div className="flex items-center gap-1.5 sm:gap-2 text-qc-cream/60">
                <Stethoscope className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                <span className="text-[8px] sm:text-[9px] uppercase tracking-widest font-bold">{doc.specialization}</span>
              </div>
              <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold uppercase truncate">
                DR. {cleanDocName(doc.name)}
              </h2>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center space-y-1 sm:space-y-2 bg-qc-yellow text-qc-black py-6 sm:py-8 md:py-10 border-2 sm:border-3 border-qc-yellow shadow-brutal mb-3 sm:mb-4 md:mb-6">
              <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-widest opacity-60">Now Serving</span>
              <span className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tabular-nums">
                {serving ? serving.tokenNumber.toString().padStart(3, '0') : "---"}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 sm:gap-4 pt-2 sm:pt-4 border-t border-qc-yellow/20">
              <div className="space-y-0.5 sm:space-y-1">
                <span className="text-[7px] sm:text-[8px] uppercase tracking-widest opacity-40 block font-bold">In Line</span>
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <Users className="w-3 h-3 sm:w-4 sm:h-4 opacity-60" />
                  <span className="text-base sm:text-xl font-bold">{waitingCount}</span>
                </div>
              </div>
              <div className="space-y-0.5 sm:space-y-1 text-right">
                <span className="text-[7px] sm:text-[8px] uppercase tracking-widest opacity-40 block font-bold">Wait Time</span>
                <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                  <Clock className="w-3 h-3 sm:w-4 sm:h-4 opacity-60" />
                  <span className="text-base sm:text-xl font-bold">~{wait}M</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer className="shrink-0 flex flex-col sm:flex-row sm:flex-wrap items-center sm:items-end gap-4 sm:gap-6 border-t-2 border-qc-yellow/20 pt-4 sm:pt-6">
        <div className="flex gap-3 sm:gap-4 items-center">
          <div className="bg-white p-1 border-2 border-qc-yellow shrink-0">
            {qrUrl ? <img src={qrUrl} alt="TV QR" className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20" /> : <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 bg-qc-yellow/10 animate-pulse" />}
          </div>
          <p className="text-[8px] sm:text-[9px] uppercase font-bold tracking-widest leading-tight opacity-60">Scan to follow<br/>this screen</p>
        </div>

        <div className="hidden md:flex flex-col gap-1 sm:border-l-2 sm:border-qc-yellow/20 sm:pl-6">
          <p className="text-[9px] uppercase tracking-widest font-bold opacity-40">Privacy Policy</p>
          <p className="text-[9px] uppercase font-bold text-qc-cream/80">LIVE ENCRYPTION</p>
          <p className="text-[8px] uppercase opacity-30">© 2026 QUEUE CURE</p>
        </div>

        <div className="flex flex-col items-center sm:border-l-2 sm:border-qc-yellow/20 sm:px-6">
          <p className="text-[8px] sm:text-[9px] uppercase tracking-widest font-bold opacity-40">Access Code</p>
          <p className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold tracking-widest text-qc-yellow leading-none">{dailyCode || "------"}</p>
        </div>

        <div className="hidden sm:flex flex-col items-end sm:border-l-2 sm:border-qc-yellow/20 sm:pl-6 ml-auto">
          <p className="text-[9px] uppercase tracking-widest font-bold opacity-40">System Status</p>
          <p className="text-[10px] uppercase font-bold text-green-400">OPERATIONAL</p>
          <p className="text-[8px] uppercase opacity-30">V2.0.26-ALPHA</p>
        </div>
      </footer>
    </div>
  );
}
