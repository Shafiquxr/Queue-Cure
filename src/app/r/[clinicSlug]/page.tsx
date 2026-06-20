"use client";

import { BrutalistButton } from "@/components/brutalist/Button";
import { BrutalistInput } from "@/components/brutalist/Input";
import { ServingBanner } from "@/components/receptionist/ServingBanner";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function ReceptionistPage() {
  const { clinicSlug } = useParams();
  const [activeDoctor, setActiveDoctor] = useState("dr-mehta");

  const doctors = [
    { slug: "dr-mehta", name: "Dr. Anand Mehta" },
    { slug: "dr-rao", name: "Dr. Sheila Rao" },
  ];

  return (
    <div className="flex flex-col min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 h-10 bg-qc-yellow border-b-thick border-qc-black flex items-center justify-between px-4">
        <div className="font-mono text-[10px] font-bold uppercase tracking-widest">
          Queue Cure '26 <span className="mx-2">|</span> Apollo Clinic
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-qc-black animate-pulse" />
          <span className="font-mono text-[9px] font-bold uppercase">Live Connection</span>
        </div>
      </nav>

      {/* Doctor Tabs */}
      <div className="flex bg-qc-cream border-b-3 border-qc-black overflow-x-auto">
        {doctors.map((doc) => (
          <button
            key={doc.slug}
            onClick={() => setActiveDoctor(doc.slug)}
            className={`px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-widest border-r-3 border-qc-black transition-colors ${
              activeDoctor === doc.slug ? "bg-qc-black text-qc-yellow" : "hover:bg-qc-yellow/30"
            }`}
          >
            {doc.name}
          </button>
        ))}
      </div>

      <main className="flex-1 flex flex-col lg:flex-row">
        {/* Left Panel: Controls */}
        <aside className="w-full lg:w-[320px] bg-qc-cream border-r-3 border-qc-black p-6 space-y-8">
          <ServingBanner token={null} />

          <section className="space-y-4">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-qc-gray">Add Patient</h3>
            <div className="space-y-3">
              <BrutalistInput placeholder="PATIENT NAME" />
              <BrutalistInput placeholder="PHONE (OPTIONAL)" />
              <BrutalistButton variant="yellow" className="w-full">
                + Add to Queue
              </BrutalistButton>
            </div>
          </section>

          <section className="space-y-4">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-qc-gray">Quick Stats</h3>
            <div className="border-3 border-qc-black p-4 space-y-2">
              <div className="flex justify-between items-center">
                <span className="font-mono text-[9px] uppercase text-qc-gray">Avg Consult</span>
                <span className="font-mono text-[11px] font-bold">12 min <button className="text-qc-blue ml-1 underline">Edit</button></span>
              </div>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 pt-6 border-t-3 border-qc-black">
            <BrutalistButton variant="yellow" className="w-full text-base py-4">
              ✓ Call Next
            </BrutalistButton>
            <BrutalistButton variant="destructive" className="w-full">
              ✕ Skip / No-show
            </BrutalistButton>
          </div>
        </aside>

        {/* Right Panel: Queue List */}
        <section className="flex-1 p-6 space-y-8 bg-[#fdfaf6]">
          <div className="space-y-4">
            <header className="flex justify-between items-center">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest">Waiting List (0)</h3>
              <span className="font-mono text-[9px] text-qc-gray">Current Date: 2024-05-24</span>
            </header>

            <div className="border-thick border-qc-black p-8 text-center bg-qc-cream/50">
              <p className="font-mono text-sm text-qc-gray uppercase">No patients waiting in queue</p>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-qc-gray">Recently Skipped</h3>
            <div className="border-3 border-qc-black border-dashed p-4 text-center">
              <p className="font-mono text-[10px] text-qc-gray uppercase">No skipped tokens</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
