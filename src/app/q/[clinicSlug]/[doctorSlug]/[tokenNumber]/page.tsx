
"use client";

import { BrutalistButton } from "@/components/brutalist/Button";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { ArrowLeft, Clock, Info, AlertTriangle, RefreshCw } from "lucide-react";

export default function PersonalTokenView() {
  const { clinicSlug, doctorSlug, tokenNumber } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 5000);
    return () => clearInterval(timer);
  }, []);

  const today = new Date().toISOString().split('T')[0];
  const doctorId = `${clinicSlug}_${doctorSlug}`;

  const doctorRef = useMemo(() => {
    if (!db || !clinicSlug || !doctorId) return null;
    return doc(db, 'clinics', clinicSlug as string, 'doctors', doctorId);
  }, [db, clinicSlug, doctorId]);
  const { data: doctor } = useDoc(doctorRef);

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

  const myTokenNumber = parseInt(tokenNumber as string);
  const myToken = tokens?.find(t => t.tokenNumber === myTokenNumber);
  const servingToken = tokens?.find(t => t.status === 'serving');
  
  const tokensAhead = useMemo(() => {
    if (!tokens || !myToken || myToken.status !== 'waiting') return 0;
    return tokens.filter(t => t.status === 'waiting' && t.tokenNumber < myTokenNumber).length;
  }, [tokens, myToken, myTokenNumber]);

  const estWait = useMemo(() => {
    if (!doctor || !myToken || myToken.status !== 'waiting') return 0;
    
    const doneTokens = tokens.filter(t => t.status === 'done' && t.calledAt && t.completedAt);
    let avg = doctor.avgConsultMinutes || 12;
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

    let currentSessionRemaining = avg;
    
    if (servingToken) {
      const calledAt = servingToken.calledAt?.toDate ? servingToken.calledAt.toDate() : new Date(servingToken.calledAt);
      const elapsed = Math.floor((now.getTime() - calledAt.getTime()) / 60000);
      currentSessionRemaining = Math.max(0, avg - elapsed);
    }
    
    return currentSessionRemaining + (tokensAhead > 0 ? (tokensAhead - 1) * avg : 0);
  }, [doctor, myToken, servingToken, tokensAhead, now, tokens]);

  const isNextUp = tokensAhead === 0 && myToken?.status === 'waiting';

  return (
    <div className="min-h-screen bg-qc-cream flex flex-col font-mono">
      <nav className="bg-qc-black text-qc-yellow p-4 border-b-thick border-qc-black flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-3">
           <button onClick={() => router.push('/')} className="hover:bg-qc-yellow/20 p-2">
             <ArrowLeft className="w-5 h-5" />
           </button>
           <span className="text-[10px] font-bold uppercase tracking-widest hidden sm:inline">
            {clinicSlug?.toString().toUpperCase()}
          </span>
        </div>
        <span className="text-sm font-bold uppercase tracking-tighter">
          Queue Cure <span className="text-qc-red">'26</span>
        </span>
        <span className="text-[10px] font-bold uppercase hidden sm:inline text-qc-gray">
          DR. {doctorSlug?.toString().toUpperCase()}
        </span>
      </nav>

      <main className="flex-1 p-6 space-y-6 max-w-md mx-auto w-full">
        {isNextUp && (
          <div className="bg-qc-yellow border-3 border-qc-black p-4 animate-pulse flex items-center gap-4">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <p className="font-headline font-bold text-xs uppercase leading-tight">
              You are up next! Return to waiting area.
            </p>
          </div>
        )}

        <div className={`border-3 border-qc-black p-8 text-center space-y-4 shadow-brutal transition-colors ${myToken?.status === 'serving' ? 'bg-qc-yellow' : 'bg-white'}`}>
          <h2 className="text-[10px] uppercase font-bold tracking-widest text-qc-gray">
            {myToken?.status === 'serving' ? "NOW SERVING" : "Your Token Number"}
          </h2>
          <div className="text-8xl font-bold tracking-tighter tabular-nums">
            {tokenNumber?.toString().padStart(3, '0')}
          </div>
          <div className="inline-block px-3 py-1 bg-qc-black text-white text-[9px] uppercase font-bold">
            Status: {myToken?.status?.toUpperCase() || "LOADING..."}
          </div>
        </div>

        <div className="grid grid-cols-2 border-3 border-qc-black divide-x-3 divide-qc-black text-center shadow-brutal bg-white overflow-hidden">
          <div className="p-4 space-y-1">
            <span className="block text-[8px] uppercase text-qc-gray font-bold">Patients Ahead</span>
            <span className="block text-3xl font-bold tabular-nums">{tokensAhead}</span>
          </div>
          <div className="p-4 space-y-1 bg-qc-yellow/10">
            <div className="flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" />
              <span className="block text-[8px] uppercase text-qc-black font-bold">Est. Wait</span>
            </div>
            <span className="block text-3xl font-bold tabular-nums">~{estWait}m</span>
          </div>
        </div>

        <div className="border-3 border-qc-black p-5 bg-white space-y-4 shadow-brutal">
          <div className="flex gap-4 items-start">
            <Info className="w-5 h-5 shrink-0 text-qc-blue mt-1" />
            <div className="text-[11px] font-bold uppercase leading-relaxed text-qc-black/70">
              {myToken?.status === 'waiting' ? (
                <p>Track your position here in real-time. Feel free to step out, but watch your phone.</p>
              ) : myToken?.status === 'serving' ? (
                <p className="font-bold text-qc-red">PLEASE PROCEED TO CONSULTATION NOW.</p>
              ) : (
                <p>Session completed. Thank you for using Queue Cure '26.</p>
              )}
            </div>
          </div>
        </div>

        <BrutalistButton 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2 h-12" 
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="w-4 h-4" /> REFRESH STATUS
        </BrutalistButton>
      </main>

      <footer className="p-8 text-center border-t-3 border-qc-black mt-auto bg-white/50">
        <p className="text-[9px] uppercase tracking-widest text-qc-gray font-bold">
          Queue Cure '26 • Live Sync Active
        </p>
      </footer>
    </div>
  );
}
