
"use client";

import { BrutalistButton } from "@/components/brutalist/Button";
import { BrutalistInput } from "@/components/brutalist/Input";
import { ServingBanner } from "@/components/receptionist/ServingBanner";
import { useParams } from "next/navigation";
import { useState, useMemo } from "react";
import { useFirestore, useCollection } from "@/firebase";
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc,
  getDocs,
  limit
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { TokenRecord } from "@/lib/db/schema";

export default function ReceptionistPage() {
  const { clinicSlug } = useParams();
  const db = useFirestore();
  const [activeDoctorId, setActiveDoctorId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");

  // Fetch doctors for this clinic
  const doctorsQuery = useMemo(() => {
    if (!db || !clinicSlug) return null;
    return collection(db, 'clinics', clinicSlug as string, 'doctors');
  }, [db, clinicSlug]);

  const { data: doctors } = useCollection(doctorsQuery);

  // Auto-select first doctor
  useMemo(() => {
    if (doctors?.length && !activeDoctorId) {
      setActiveDoctorId(doctors[0].id);
    }
  }, [doctors, activeDoctorId]);

  // Fetch tokens for active doctor
  const today = new Date().toISOString().split('T')[0];
  const tokensQuery = useMemo(() => {
    if (!db || !activeDoctorId) return null;
    return query(
      collection(db, 'tokens'),
      where('doctorId', '==', activeDoctorId),
      where('date', '==', today),
      orderBy('tokenNumber', 'asc')
    );
  }, [db, activeDoctorId, today]);

  const { data: tokens } = useCollection(tokensQuery);

  const servingToken = tokens?.find(t => t.status === 'serving');
  const waitingTokens = tokens?.filter(t => t.status === 'waiting') || [];
  const skippedTokens = tokens?.filter(t => t.status === 'skipped') || [];

  const handleAddPatient = async () => {
    if (!patientName || !activeDoctorId) return;
    
    const nextTokenNumber = (tokens?.length || 0) + 1;
    
    try {
      await addDoc(collection(db!, 'tokens'), {
        clinicId: clinicSlug,
        doctorId: activeDoctorId,
        tokenNumber: nextTokenNumber,
        patientName,
        phone: phone || null,
        status: 'waiting',
        date: today,
        createdAt: serverTimestamp()
      });
      setPatientName("");
      setPhone("");
      toast({ title: "TOKEN GENERATED", description: `NUMBER: ${nextTokenNumber}` });
    } catch (e) {
      toast({ variant: "destructive", title: "ERROR", description: "QUEUE FULL OR OFFLINE." });
    }
  };

  const handleCallNext = async () => {
    if (!db || !activeDoctorId) return;

    // 1. Mark current serving as done
    if (servingToken) {
      const currentRef = doc(db, 'tokens', servingToken.id);
      updateDoc(currentRef, { status: 'done', completedAt: serverTimestamp() });
    }

    // 2. Mark first waiting as serving
    if (waitingTokens.length > 0) {
      const nextRef = doc(db, 'tokens', waitingTokens[0].id);
      updateDoc(nextRef, { status: 'serving', calledAt: serverTimestamp() });
      toast({ title: "NEXT CALLED", description: `NOW SERVING: ${waitingTokens[0].tokenNumber}` });
    } else {
      toast({ title: "QUEUE EMPTY", description: "NO WAITING PATIENTS." });
    }
  };

  const handleSkip = async () => {
    if (!servingToken) return;
    const ref = doc(db!, 'tokens', servingToken.id);
    updateDoc(ref, { status: 'skipped' });
    toast({ variant: "destructive", title: "SKIPPED", description: `TOKEN ${servingToken.tokenNumber} MOVED TO SKIPPED.` });
  };

  return (
    <div className="flex flex-col min-h-screen">
      <nav className="sticky top-0 z-50 h-10 bg-qc-yellow border-b-thick border-qc-black flex items-center justify-between px-4">
        <div className="font-mono text-[10px] font-bold uppercase tracking-widest">
          Queue Cure '26 <span className="mx-2">|</span> {clinicSlug?.toString().toUpperCase()}
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-qc-black animate-pulse" />
          <span className="font-mono text-[9px] font-bold uppercase">Live Connection</span>
        </div>
      </nav>

      <div className="flex bg-qc-cream border-b-3 border-qc-black overflow-x-auto">
        {doctors?.map((doc) => (
          <button
            key={doc.id}
            onClick={() => setActiveDoctorId(doc.id)}
            className={`px-6 py-3 font-mono text-[11px] font-bold uppercase tracking-widest border-r-3 border-qc-black transition-colors ${
              activeDoctorId === doc.id ? "bg-qc-black text-qc-yellow" : "hover:bg-qc-yellow/30"
            }`}
          >
            {doc.name}
          </button>
        ))}
      </div>

      <main className="flex-1 flex flex-col lg:flex-row">
        <aside className="w-full lg:w-[320px] bg-qc-cream border-r-3 border-qc-black p-6 space-y-8">
          <ServingBanner token={servingToken as any} />

          <section className="space-y-4">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-qc-gray">Add Patient</h3>
            <div className="space-y-3">
              <BrutalistInput 
                placeholder="PATIENT NAME" 
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
              />
              <BrutalistInput 
                placeholder="PHONE (OPTIONAL)" 
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
              <BrutalistButton variant="yellow" className="w-full" onClick={handleAddPatient}>
                + Add to Queue
              </BrutalistButton>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 pt-6 border-t-3 border-qc-black">
            <BrutalistButton variant="yellow" className="w-full text-base py-4" onClick={handleCallNext}>
              ✓ Call Next
            </BrutalistButton>
            <BrutalistButton variant="destructive" className="w-full" onClick={handleSkip}>
              ✕ Skip / No-show
            </BrutalistButton>
          </div>
        </aside>

        <section className="flex-1 p-6 space-y-8 bg-[#fdfaf6]">
          <div className="space-y-4">
            <header className="flex justify-between items-center">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest">Waiting List ({waitingTokens.length})</h3>
              <span className="font-mono text-[9px] text-qc-gray">Date: {today}</span>
            </header>

            <div className="space-y-2">
              {waitingTokens.length > 0 ? waitingTokens.map((token) => (
                <div key={token.id} className="border-3 border-qc-black bg-white p-4 flex justify-between items-center shadow-brutal">
                  <div>
                    <span className="font-mono text-xl font-bold mr-4">{token.tokenNumber.toString().padStart(3, '0')}</span>
                    <span className="font-headline font-bold uppercase">{token.patientName}</span>
                  </div>
                  <span className="font-mono text-[10px] text-qc-gray">WAITING</span>
                </div>
              )) : (
                <div className="border-thick border-qc-black p-8 text-center bg-qc-cream/50">
                  <p className="font-mono text-sm text-qc-gray uppercase">No patients waiting in queue</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-qc-gray">Recently Skipped</h3>
            <div className="flex flex-wrap gap-2">
              {skippedTokens.map(t => (
                <div key={t.id} className="border-2 border-qc-black p-2 font-mono text-xs bg-red-50">
                  {t.tokenNumber.toString().padStart(3, '0')} - {t.patientName}
                </div>
              ))}
              {skippedTokens.length === 0 && (
                <div className="border-3 border-qc-black border-dashed p-4 text-center w-full">
                  <p className="font-mono text-[10px] text-qc-gray uppercase">No skipped tokens</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
