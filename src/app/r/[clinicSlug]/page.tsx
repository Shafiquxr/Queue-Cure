
"use client";

import { BrutalistButton } from "@/components/brutalist/Button";
import { BrutalistInput } from "@/components/brutalist/Input";
import { ServingBanner } from "@/components/receptionist/ServingBanner";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
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
  writeBatch
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { ArrowLeft, RefreshCw, Settings2, UserPlus, AlertCircle } from "lucide-react";

export default function ReceptionistPage() {
  const { clinicSlug } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const [activeDoctorId, setActiveDoctorId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch doctors for this clinic
  const doctorsQuery = useMemo(() => {
    if (!db || !clinicSlug) return null;
    return collection(db, 'clinics', clinicSlug as string, 'doctors');
  }, [db, clinicSlug]);

  const { data: doctors, loading: doctorsLoading } = useCollection(doctorsQuery);

  const activeDoctor = useMemo(() => doctors?.find(d => d.id === activeDoctorId), [doctors, activeDoctorId]);

  // Auto-select first doctor
  useEffect(() => {
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
    if (!db || !patientName || !activeDoctorId || isProcessing) return;
    setIsProcessing(true);
    
    const nextTokenNumber = (tokens?.length || 0) + 1;
    const tokensRef = collection(db, 'tokens');
    const data = {
      clinicId: clinicSlug,
      doctorId: activeDoctorId,
      tokenNumber: nextTokenNumber,
      patientName,
      phone: phone || null,
      status: 'waiting',
      date: today,
      createdAt: serverTimestamp()
    };

    addDoc(tokensRef, data)
      .then(() => {
        setPatientName("");
        setPhone("");
        toast({ title: "TOKEN GENERATED", description: `NUMBER: ${nextTokenNumber}` });
      })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: tokensRef.path,
          operation: 'create',
          requestResourceData: data,
        }));
      })
      .finally(() => setIsProcessing(false));
  };

  const handleCallNext = async () => {
    if (!db || !activeDoctorId || isProcessing) return;
    setIsProcessing(true);

    const batch = writeBatch(db);

    if (servingToken) {
      const currentRef = doc(db, 'tokens', servingToken.id);
      batch.update(currentRef, { status: 'done', completedAt: serverTimestamp() });
    }

    if (waitingTokens.length > 0) {
      const nextRef = doc(db, 'tokens', waitingTokens[0].id);
      batch.update(nextRef, { status: 'serving', calledAt: serverTimestamp() });
      
      batch.commit()
        .then(() => {
          toast({ title: "NEXT CALLED", description: `NOW SERVING: ${waitingTokens[0].tokenNumber}` });
        })
        .catch(() => {
           toast({ variant: "destructive", title: "ERROR", description: "FAILED TO ADVANCE QUEUE." });
        })
        .finally(() => setIsProcessing(false));
    } else {
      if (servingToken) {
        batch.commit()
          .then(() => toast({ title: "QUEUE ENDED", description: "NO MORE PATIENTS." }))
          .finally(() => setIsProcessing(false));
      } else {
        setIsProcessing(false);
        toast({ title: "QUEUE EMPTY", description: "NO WAITING PATIENTS." });
      }
    }
  };

  const handleSkip = () => {
    if (!db || !servingToken || isProcessing) return;
    setIsProcessing(true);
    
    const ref = doc(db, 'tokens', servingToken.id);
    updateDoc(ref, { status: 'skipped' })
      .then(() => {
        toast({ variant: "destructive", title: "SKIPPED", description: `TOKEN ${servingToken.tokenNumber} MOVED TO SKIPPED.` });
        // Instead of calling handleCallNext which has its own isProcessing check,
        // we reset processing here so handleCallNext can run, or just wait for next click.
        setIsProcessing(false);
      })
      .catch(() => {
        setIsProcessing(false);
        toast({ variant: "destructive", title: "ERROR", description: "FAILED TO SKIP." });
      });
  };

  const handleRecall = (token: any) => {
    if (!db || isProcessing) return;
    setIsProcessing(true);
    const ref = doc(db, 'tokens', token.id);
    
    updateDoc(ref, { status: 'waiting', calledAt: null })
      .then(() => {
        toast({ title: "RECALLED", description: `TOKEN ${token.tokenNumber} RETURNED TO QUEUE.` });
      })
      .finally(() => setIsProcessing(false));
  };

  const handleUpdateAvgTime = (minutes: number) => {
    if (!db || !activeDoctorId || !activeDoctor) return;
    const ref = doc(db, 'clinics', clinicSlug as string, 'doctors', activeDoctorId);
    updateDoc(ref, { avgConsultMinutes: minutes })
      .then(() => toast({ title: "UPDATED", description: `AVG CONSULT TIME SET TO ${minutes} MIN.` }));
  };

  if (!doctorsLoading && doctors?.length === 0) {
    return (
      <div className="min-h-screen bg-qc-cream flex flex-col items-center justify-center p-8 space-y-6">
        <AlertCircle className="w-16 h-16 text-qc-red" />
        <div className="text-center space-y-2">
          <h1 className="text-2xl font-bold uppercase">No Doctors Found</h1>
          <p className="font-mono text-sm text-qc-gray uppercase">Clinic "{clinicSlug}" needs doctors setup in Admin Console first.</p>
        </div>
        <BrutalistButton onClick={() => router.push('/admin')}>Go to Admin Console</BrutalistButton>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <nav className="sticky top-0 z-50 h-12 bg-qc-yellow border-b-thick border-qc-black flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="hover:bg-qc-black/10 p-1">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="font-mono text-[10px] font-bold uppercase tracking-widest">
            Queue Cure '26 <span className="mx-2">|</span> {clinicSlug?.toString().toUpperCase()}
          </div>
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
            className={`px-6 py-4 font-mono text-[11px] font-bold uppercase tracking-widest border-r-3 border-qc-black transition-colors shrink-0 ${
              activeDoctorId === doc.id ? "bg-qc-black text-qc-yellow" : "hover:bg-qc-yellow/30"
            }`}
          >
            {doc.name}
          </button>
        ))}
      </div>

      <main className="flex-1 flex flex-col lg:flex-row">
        <aside className="w-full lg:w-[350px] bg-qc-cream border-r-3 border-qc-black p-6 space-y-8 overflow-y-auto">
          <ServingBanner token={servingToken as any} />

          <section className="space-y-4 border-3 border-qc-black p-4 bg-white shadow-brutal">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <UserPlus className="w-3 h-3" /> Add Patient
            </h3>
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
              <BrutalistButton 
                variant="yellow" 
                className="w-full" 
                onClick={handleAddPatient}
                disabled={!patientName || isProcessing || !activeDoctorId}
              >
                {isProcessing ? "PROCESSING..." : "+ Generate Token"}
              </BrutalistButton>
            </div>
          </section>

          <section className="space-y-4 border-3 border-qc-black p-4 bg-white shadow-brutal">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <Settings2 className="w-3 h-3" /> Doctor Settings
            </h3>
            <div className="flex items-center gap-2">
              <BrutalistInput 
                type="number" 
                placeholder="Avg Mins" 
                defaultValue={activeDoctor?.avgConsultMinutes || 15}
                onBlur={(e) => handleUpdateAvgTime(parseInt(e.target.value))}
              />
              <span className="font-mono text-[10px] uppercase font-bold text-qc-gray">Mins</span>
            </div>
          </section>

          <div className="grid grid-cols-1 gap-3 pt-6">
            <BrutalistButton 
              variant="yellow" 
              className="w-full text-base py-6 border-thick" 
              onClick={handleCallNext}
              disabled={isProcessing || (waitingTokens.length === 0 && !servingToken)}
            >
              {isProcessing ? "PROCESSING..." : "✓ CALL NEXT"}
            </BrutalistButton>
            <BrutalistButton 
              variant="destructive" 
              className="w-full" 
              onClick={handleSkip}
              disabled={isProcessing || !servingToken}
            >
              ✕ SKIP / NO-SHOW
            </BrutalistButton>
          </div>
        </aside>

        <section className="flex-1 p-6 space-y-8 bg-[#fdfaf6] overflow-y-auto">
          <div className="space-y-4">
            <header className="flex justify-between items-center border-b-2 border-qc-black pb-2">
              <h3 className="font-mono text-xs font-bold uppercase tracking-widest">
                Waiting List ({waitingTokens.length})
              </h3>
              <span className="font-mono text-[9px] text-qc-gray">DATE: {today}</span>
            </header>

            <div className="space-y-3">
              {waitingTokens.length > 0 ? waitingTokens.map((token) => (
                <div key={token.id} className="border-3 border-qc-black bg-white p-4 flex justify-between items-center shadow-brutal hover:-translate-y-1 transition-transform">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-2xl font-bold bg-qc-yellow px-2 border-2 border-qc-black">
                      {token.tokenNumber.toString().padStart(3, '0')}
                    </span>
                    <span className="font-headline font-bold uppercase">{token.patientName}</span>
                  </div>
                  <div className="flex gap-2">
                     <span className="font-mono text-[9px] text-qc-gray uppercase py-1 px-2 border border-qc-gray">WAITING</span>
                  </div>
                </div>
              )) : (
                <div className="border-thick border-dashed border-qc-black p-12 text-center bg-qc-cream/30">
                  <p className="font-mono text-sm text-qc-gray uppercase tracking-widest">No patients in queue</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-qc-gray flex items-center gap-2">
              <RefreshCw className="w-3 h-3" /> Recently Skipped
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {skippedTokens.map(t => (
                <div key={t.id} className="border-2 border-qc-black p-3 font-mono text-xs bg-red-50 flex justify-between items-center">
                  <span className="font-bold">#{t.tokenNumber.toString().padStart(3, '0')} - {t.patientName}</span>
                  <BrutalistButton size="sm" variant="outline" onClick={() => handleRecall(t)}>RECALL</BrutalistButton>
                </div>
              ))}
              {skippedTokens.length === 0 && (
                <div className="border-2 border-qc-black border-dashed p-4 text-center w-full col-span-2">
                  <p className="font-mono text-[10px] text-qc-gray uppercase">Zero skipped entries today</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
