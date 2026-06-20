
"use client";

import { BrutalistButton } from "@/components/brutalist/Button";
import { useParams, useRouter } from "next/navigation";
import { useMemo, useState, useEffect } from "react";
import { useFirestore, useCollection, useDoc } from "@/firebase";
import { collection, query, where, doc } from "firebase/firestore";
import { ArrowLeft, Clock, Info, AlertTriangle } from "lucide-react";

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
    
    const avg = doctor.avgConsultMinutes || 15;
    let currentSessionRemaining = avg;
    
    if (servingToken) {
      const calledAt = servingToken.calledAt?.toDate() || new Date();
      const elapsed = Math.floor((now.getTime() - calledAt.getTime()) / 60000);
      currentSessionRemaining = Math.max(0, avg - elapsed);
    }
    
    return currentSessionRemaining + (tokensAhead > 0 ? (tokensAhead - 1) * avg : 0);
  }, [doctor, myToken, servingToken, tokensAhead, now]);

  const isNextUp = tokensAhead === 0 && myToken?.status === 'waiting';

  return (
    <div className="min-h-screen bg-qc-cream flex flex-col">
      <nav className="bg-qc-black text-qc-yellow p-4 border-b-thick border-qc-black flex items-center justify-between">
        <div className="flex items-center gap-3">
           <button onClick={() => router.push('/')} className="hover:bg-qc-yellow/20 p-1">
             <ArrowLeft className="w-5 h-5" />
           </button>
           <span className="font-mono text-[10px] font-bold uppercase tracking-widest">
            {clinicSlug?.toString().toUpperCase()}
          </span>
        </div>
        <span className="font-mono text-[10px] font-bold uppercase">
          DR. {doctorSlug?.toString().toUpperCase()}
        </span>
      </nav>

      <main className="flex-1 p-6 space-y-6 max-w-md mx-auto w-full">
        {isNextUp && (
          <div className="bg-qc-yellow border-3 border-qc-black p-4 animate-pulse flex items-center gap-4">
            <AlertTriangle className="w-6 h-6 shrink-0" />
            <p className="font-headline font-bold text-sm uppercase leading-tight">
              You are up next! Please return to the waiting area immediately.
            </p>
          </div>
        )}

        <div className={`border-3 border-qc-black p-8 text-center space-y-4 shadow-brutal transition-colors ${myToken?.status === 'serving' ? 'bg-qc-yellow' : 'bg-white'}`}>
          <h2 className="font-mono text-xs uppercase font-bold tracking-widest text-qc-gray">
            {myToken?.status === 'serving' ? "NOW SERVING" : "Your Token Number"}
          </h2>
          <div className="text-8xl font-mono font-bold tracking-tighter">
            {tokenNumber?.toString().padStart(3, '0')}
          </div>
          <div className="inline-block px-3 py-1 bg-qc-black text-white font-mono text-[10px] uppercase font-bold">
            Status: {myToken?.status?.toUpperCase() || "LOADING..."}
          </div>
        </div>

        <div className="grid grid-cols-2 border-3 border-qc-black divide-x-3 divide-qc-black text-center shadow-brutal bg-white">
          <div className="p-6 space-y-1">
            <span className="block font-mono text-[9px] uppercase text-qc-gray">Patients Ahead</span>
            <span className="block font-mono text-3xl font-bold">{tokensAhead}</span>
          </div>
          <div className="p-6 space-y-1 bg-qc-yellow/20">
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-3 h-3" />
              <span className="block font-mono text-[9px] uppercase text-qc-black">Est. Wait</span>
            </div>
            <span className="block font-mono text-3xl font-bold">~{estWait}m</span>
          </div>
        </div>

        <div className="border-3 border-qc-black p-6 bg-white space-y-4 shadow-brutal">
          <div className="flex gap-4">
            <Info className="w-6 h-6 shrink-0 text-qc-blue" />
            <div className="font-headline text-sm font-medium leading-relaxed">
              {myToken?.status === 'waiting' ? (
                <p>Track your position here in real-time. Feel free to step out for a few minutes, but keep an eye on this page.</p>
              ) : myToken?.status === 'serving' ? (
                <p className="font-bold text-qc-red">PLEASE PROCEED TO THE CONSULTATION ROOM NOW.</p>
              ) : (
                <p>This token session has been completed. Thank you.</p>
              )}
            </div>
          </div>
        </div>

        <BrutalistButton 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2" 
          onClick={() => window.location.reload()}
        >
          <RefreshCw className="w-4 h-4" /> Manual Refresh
        </BrutalistButton>
      </main>

      <footer className="p-8 text-center border-t-3 border-qc-black mt-auto bg-white/50">
        <p className="font-mono text-[9px] uppercase tracking-widest text-qc-gray">
          Queue Cure '26 • Precise Live Tracking
        </p>
      </footer>
    </div>
  );
}

function RefreshCw(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
