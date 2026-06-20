"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function WaitingRoomTV() {
  const { clinicSlug, doctorSlug } = useParams();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="h-screen w-screen bg-qc-black overflow-hidden flex flex-col items-center justify-center p-12 text-center text-qc-yellow">
      <div className="absolute top-8 left-12 right-12 flex justify-between items-center border-b-3 border-qc-yellow/30 pb-4">
        <div className="font-mono text-xl font-bold uppercase tracking-[0.2em]">
          Queue Cure '26
        </div>
        <div className="font-mono text-xl font-bold">
          {now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="font-mono text-[2vw] uppercase tracking-[0.25em] opacity-60">
          Now Serving
        </h2>
        
        <div className="text-[25vw] leading-none font-mono font-bold tracking-tighter tabular-nums">
          007
        </div>

        <div className="w-[10vw] h-1 bg-qc-yellow/30 mx-auto my-8" />

        <h1 className="text-[3vw] font-headline font-bold uppercase tracking-tight">
          Dr. Anand Mehta
        </h1>
        
        <p className="font-mono text-[1.5vw] uppercase tracking-widest opacity-50 mt-4">
          4 Patients Waiting • Next Up: 008
        </p>
      </div>

      <div className="absolute bottom-8 text-[0.8vw] font-mono uppercase opacity-30 tracking-[0.5em]">
        Stay alert • Your token will be called once
      </div>
    </div>
  );
}
