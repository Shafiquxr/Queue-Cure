"use client";

import { BrutalistButton } from "@/components/brutalist/Button";
import { useParams } from "next/navigation";

export default function PersonalTokenView() {
  const { clinicSlug, doctorSlug, tokenNumber } = useParams();

  return (
    <div className="min-h-screen bg-qc-cream flex flex-col">
      <nav className="bg-qc-black text-qc-yellow p-4 border-b-thick border-qc-black flex items-center justify-between">
        <span className="font-mono text-[10px] font-bold uppercase tracking-widest">
          Apollo Clinic
        </span>
        <span className="font-mono text-[10px] font-bold uppercase">
          Dr. Mehta
        </span>
      </nav>

      <main className="flex-1 p-6 space-y-6">
        <div className="border-3 border-qc-black bg-qc-white p-8 text-center space-y-4 shadow-brutal">
          <h2 className="font-mono text-xs uppercase font-bold tracking-widest text-qc-gray">
            Your Token
          </h2>
          <div className="text-8xl font-mono font-bold">
            {tokenNumber?.toString().padStart(3, '0')}
          </div>
        </div>

        <div className="grid grid-cols-3 border-3 border-qc-black divide-x-3 divide-qc-black text-center shadow-brutal">
          <div className="p-4 space-y-1">
            <span className="block font-mono text-[9px] uppercase text-qc-gray">Ahead</span>
            <span className="block font-mono text-lg font-bold">4</span>
          </div>
          <div className="p-4 space-y-1 bg-qc-yellow">
            <span className="block font-mono text-[9px] uppercase text-qc-black">Wait</span>
            <span className="block font-mono text-lg font-bold">~39m</span>
          </div>
          <div className="p-4 space-y-1">
            <span className="block font-mono text-[9px] uppercase text-qc-gray">Avg</span>
            <span className="block font-mono text-lg font-bold">12m</span>
          </div>
        </div>

        <div className="border-3 border-qc-black p-6 bg-qc-blue/5 space-y-4">
          <div className="flex gap-4">
            <span className="text-2xl">ⓘ</span>
            <p className="font-headline text-sm font-medium leading-relaxed">
              You can step out of the clinic. Please ensure you are back in the waiting area before token <span className="font-mono font-bold text-qc-blue">009</span> is called.
            </p>
          </div>
        </div>

        <BrutalistButton variant="outline" className="w-full">
          Refresh Status
        </BrutalistButton>
      </main>

      <footer className="p-8 text-center border-t-3 border-qc-black mt-auto">
        <p className="font-mono text-[9px] uppercase tracking-widest text-qc-gray">
          Queue Cure '26 • System Reference 2024-X-99
        </p>
      </footer>
    </div>
  );
}
