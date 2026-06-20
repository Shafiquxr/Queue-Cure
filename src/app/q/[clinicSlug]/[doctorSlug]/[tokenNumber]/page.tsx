
"use client";

import { BrutalistButton } from "@/components/brutalist/Button";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { useFirestore, useCollection } from "@/firebase";
import { collection, query, where, orderBy } from "firebase/firestore";

export default function PersonalTokenView() {
  const { clinicSlug, doctorSlug, tokenNumber } = useParams();
  const db = useFirestore();

  const today = new Date().toISOString().split('T')[0];
  const doctorId = `${clinicSlug}_${doctorSlug}`;

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

  const myTokenNumber = parseInt(tokenNumber as string);
  const myToken = tokens?.find(t => t.tokenNumber === myTokenNumber);
  const servingToken = tokens?.find(t => t.status === 'serving');
  
  const tokensAhead = useMemo(() => {
    if (!tokens || !myToken || myToken.status !== 'waiting') return 0;
    return tokens.filter(t => t.status === 'waiting' && t.tokenNumber < myTokenNumber).length;
  }, [tokens, myToken, myTokenNumber]);

  const estWait = tokensAhead * 12; // Assuming 12 min average

  return (
    <div className="min-h-screen bg-qc-cream flex flex-col">
      <nav className="bg-qc-black text-qc-yellow p-4 border-b-thick border-qc-black flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest">
          {clinicSlug?.toString().toUpperCase()}
        </span>
        <span className="font-mono text-[10px] font-bold uppercase">
          DR. {doctorSlug?.toString().toUpperCase()}
        </span>
      </nav>

      <main className="flex-1 p-6 space-y-6">
        <div className={`border-3 border-qc-black p-8 text-center space-y-4 shadow-brutal transition-colors ${myToken?.status === 'serving' ? 'bg-qc-yellow' : 'bg-qc-white'}`}>
          <h2 className="font-mono text-xs uppercase font-bold tracking-widest text-qc-gray">
            {myToken?.status === 'serving' ? "YOU ARE NEXT" : "Your Token"}
          </h2>
          <div className="text-8xl font-mono font-bold">
            {tokenNumber?.toString().padStart(3, '0')}
          </div>
          <p className="font-mono text-[10px] uppercase font-bold text-qc-black/40">
            Status: {myToken?.status?.toUpperCase() || "LOADING..."}
          </p>
        </div>

        <div className="grid grid-cols-3 border-3 border-qc-black divide-x-3 divide-qc-black text-center shadow-brutal">
          <div className="p-4 space-y-1">
            <span className="block font-mono text-[9px] uppercase text-qc-gray">Ahead</span>
            <span className="block font-mono text-lg font-bold">{tokensAhead}</span>
          </div>
          <div className="p-4 space-y-1 bg-qc-yellow">
            <span className="block font-mono text-[9px] uppercase text-qc-black">Est. Wait</span>
            <span className="block font-mono text-lg font-bold">~{estWait}m</span>
          </div>
          <div className="p-4 space-y-1">
            <span className="block font-mono text-[9px] uppercase text-qc-gray">Serving</span>
            <span className="block font-mono text-lg font-bold">
              {servingToken ? servingToken.tokenNumber.toString().padStart(3, '0') : "---"}
            </span>
          </div>
        </div>

        <div className="border-3 border-qc-black p-6 bg-qc-blue/5 space-y-4">
          <div className="flex gap-4">
            <span className="text-2xl">ⓘ</span>
            <div className="font-headline text-sm font-medium leading-relaxed">
              {myToken?.status === 'waiting' ? (
                <p>Please ensure you are back in the waiting area when token <span className="font-mono font-bold text-qc-blue">{(myTokenNumber - 2).toString().padStart(3, '0')}</span> is called.</p>
              ) : myToken?.status === 'serving' ? (
                <p className="animate-pulse font-bold text-qc-red">PLEASE PROCEED TO THE CONSULTATION ROOM NOW.</p>
              ) : (
                <p>This token has been processed or completed.</p>
              )}
            </div>
          </div>
        </div>

        <BrutalistButton variant="outline" className="w-full" onClick={() => window.location.reload()}>
          Refresh Status
        </BrutalistButton>
      </main>

      <footer className="p-8 text-center border-t-3 border-qc-black mt-auto">
        <p className="font-mono text-[9px] uppercase tracking-widest text-qc-gray">
          Queue Cure '26 • Real-time patient hub
        </p>
      </footer>
    </div>
  );
}
