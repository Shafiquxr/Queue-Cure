
"use client";

import { TokenRecord } from "@/lib/db/schema";
import { useEffect, useState } from "react";

interface ServingBannerProps {
  token: TokenRecord | null;
}

export function ServingBanner({ token }: ServingBannerProps) {
  const [elapsed, setElapsed] = useState<string>("0 min");
  const [sessionStartedAt, setSessionStartedAt] = useState<number | null>(null);

  // When the token changes, reset the local session timer to handle clock skew
  useEffect(() => {
    if (token?.id) {
      setSessionStartedAt(Date.now());
    } else {
      setSessionStartedAt(null);
    }
  }, [token?.id]);

  useEffect(() => {
    const calculate = () => {
      if (!token?.calledAt) {
        setElapsed("0 min");
        return;
      }

      try {
        const calledAtDate = typeof token.calledAt.toDate === 'function' 
          ? token.calledAt.toDate() 
          : new Date(token.calledAt);
          
        const now = Date.now();
        const serverDiff = Math.floor((now - calledAtDate.getTime()) / 60000);
        
        // If we have a local session start time, we use it to cap the initial jump
        // This handles cases where client clock is ahead of server clock
        if (sessionStartedAt) {
          const localDiff = Math.floor((now - sessionStartedAt) / 60000);
          // Trust the smaller value in the first few minutes to prevent jumps
          const finalDiff = serverDiff > 5 ? serverDiff : Math.min(serverDiff, localDiff);
          setElapsed(`${Math.max(0, finalDiff)} min`);
        } else {
          setElapsed(`${Math.max(0, serverDiff)} min`);
        }
      } catch (e) {
        setElapsed("0 min");
      }
    };

    calculate();
    const timer = setInterval(calculate, 10000); // Update every 10s for responsiveness
    return () => clearInterval(timer);
  }, [token?.id, token?.calledAt, sessionStartedAt]);

  return (
    <div className="border-3 border-qc-black p-6 bg-qc-cream space-y-4 shadow-brutal">
      <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-qc-gray">Now Serving</h2>
      <div className="flex flex-col items-center justify-center py-4 bg-qc-yellow border-3 border-qc-black shadow-brutal">
        <span className="font-mono text-7xl font-bold leading-none">
          {token ? token.tokenNumber.toString().padStart(3, '0') : "---"}
        </span>
        <span className="font-headline text-lg font-bold mt-2 uppercase text-center px-2">
          {token ? token.patientName : "Queue Empty"}
        </span>
      </div>
      {token && (
        <div className="flex justify-between items-center px-2">
          <span className="font-mono text-[9px] uppercase text-qc-gray font-bold">Elapsed Time</span>
          <span className="font-mono text-[11px] font-bold bg-white px-2 border border-qc-black">{elapsed}</span>
        </div>
      )}
    </div>
  );
}
