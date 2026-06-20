
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
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc,
  writeBatch,
  getDocs
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { ArrowLeft, RefreshCw, Settings2, UserPlus, AlertCircle, X, ChevronLast, ChevronFirst } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function ReceptionistPage() {
  const { clinicSlug } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const [activeDoctorId, setActiveDoctorId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [showSkipAlert, setShowSkipAlert] = useState(false);
  const [showRecallAlert, setShowRecallAlert] = useState<any>(null);

  const doctorsQuery = useMemo(() => {
    if (!db || !clinicSlug) return null;
    return collection(db, 'clinics', clinicSlug as string, 'doctors');
  }, [db, clinicSlug]);

  const { data: doctors, loading: doctorsLoading } = useCollection(doctorsQuery);

  const activeDoctor = useMemo(() => doctors?.find(d => d.id === activeDoctorId), [doctors, activeDoctorId]);

  useEffect(() => {
    if (doctors?.length && !activeDoctorId) {
      setActiveDoctorId(doctors[0].id);
    }
  }, [doctors, activeDoctorId]);

  const today = new Date().toISOString().split('T')[0];
  
  // Removed orderBy to avoid composite index requirement
  const tokensQuery = useMemo(() => {
    if (!db || !activeDoctorId) return null;
    return query(
      collection(db, 'tokens'),
      where('doctorId', '==', activeDoctorId),
      where('date', '==', today)
    );
  }, [db, activeDoctorId, today]);

  const { data: rawTokens } = useCollection(tokensQuery);

  // Sort tokens locally in the UI
  const tokens = useMemo(() => {
    if (!rawTokens) return [];
    return [...rawTokens].sort((a, b) => (a.tokenNumber || 0) - (b.tokenNumber || 0));
  }, [rawTokens]);

  const servingToken = tokens?.find(t => t.status === 'serving');
  const waitingTokens = tokens?.filter(t => t.status === 'waiting') || [];
  const skippedTokens = tokens?.filter(t => t.status === 'skipped') || [];

  const handleAddPatient = async () => {
    if (!db || !patientName || !activeDoctorId || isProcessing) return;
    setIsProcessing(true);
    
    try {
      const q = query(
        collection(db, 'tokens'),
        where('doctorId', '==', activeDoctorId),
        where('date', '==', today)
      );
      
      const snapshot = await getDocs(q);
      const lastToken = snapshot.docs.reduce((max, d) => Math.max(max, d.data().tokenNumber || 0), 0);
      const nextTokenNumber = lastToken + 1;

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
        .catch(async (error) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: tokensRef.path,
            operation: 'create',
            requestResourceData: data,
          }));
        });

      setPatientName("");
      setPhone("");
      toast({ title: "TOKEN GENERATED", description: `NUMBER: ${nextTokenNumber}` });
    } catch (e: any) {
      console.error("Add patient error:", e);
      toast({ 
        variant: "destructive", 
        title: "GENERATION FAILED", 
        description: "DATABASE SYNC ERROR. TRY REFRESHING." 
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCallNext = () => {
    if (!db || !activeDoctorId || isProcessing) return;
    setIsProcessing(true);

    try {
      const batch = writeBatch(db);

      if (servingToken) {
        const currentRef = doc(db, 'tokens', servingToken.id);
        batch.update(currentRef, { status: 'done', completedAt: serverTimestamp() });
      }

      if (waitingTokens.length > 0) {
        const nextRef = doc(db, 'tokens', waitingTokens[0].id);
        batch.update(nextRef, { status: 'serving', calledAt: serverTimestamp() });
        
        batch.commit().catch(async (err) => {
          errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'tokens',
            operation: 'write',
          }));
        });
        toast({ title: "NEXT CALLED", description: `NOW SERVING: ${waitingTokens[0].tokenNumber}` });
      } else {
        if (servingToken) {
          batch.commit();
          toast({ title: "QUEUE ENDED", description: "NO MORE PATIENTS." });
        } else {
          toast({ title: "QUEUE EMPTY", description: "NO WAITING PATIENTS." });
        }
      }
    } catch (e) {
      toast({ variant: "destructive", title: "ERROR", description: "FAILED TO ADVANCE QUEUE." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSkipConfirm = () => {
    if (!db || !servingToken || isProcessing) return;
    setIsProcessing(true);
    setShowSkipAlert(false);
    
    try {
      const batch = writeBatch(db);
      const currentRef = doc(db, 'tokens', servingToken.id);
      batch.update(currentRef, { status: 'skipped' });

      if (waitingTokens.length > 0) {
        const nextRef = doc(db, 'tokens', waitingTokens[0].id);
        batch.update(nextRef, { status: 'serving', calledAt: serverTimestamp() });
      }

      batch.commit().catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'tokens',
          operation: 'write',
        }));
      });
      toast({ variant: "destructive", title: "SKIPPED", description: `TOKEN ${servingToken.tokenNumber} MOVED TO SKIPPED.` });
    } catch (e) {
      toast({ variant: "destructive", title: "ERROR", description: "FAILED TO SKIP PATIENT." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecall = async (token: any, position: 'front' | 'back') => {
    if (!db || isProcessing) return;
    setIsProcessing(true);
    setShowRecallAlert(null);
    
    try {
      const ref = doc(db, 'tokens', token.id);
      let updateData: any = { status: 'waiting', calledAt: null };

      if (position === 'back') {
        const q = query(
          collection(db, 'tokens'),
          where('doctorId', '==', activeDoctorId),
          where('date', '==', today)
        );
        const snapshot = await getDocs(q);
        const lastToken = snapshot.docs.reduce((max, d) => Math.max(max, d.data().tokenNumber || 0), 0);
        updateData.tokenNumber = lastToken + 1;
      }
      
      updateDoc(ref, updateData).catch(async (err) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: ref.path,
          operation: 'update',
          requestResourceData: updateData,
        }));
      });
      toast({ title: "RECALLED", description: `TOKEN ${token.tokenNumber} RETURNED TO QUEUE (${position}).` });
    } catch (e) {
      toast({ variant: "destructive", title: "ERROR", description: "FAILED TO RECALL PATIENT." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleUpdateAvgTime = (minutes: number) => {
    if (!db || !activeDoctorId || !activeDoctor) return;
    const ref = doc(db, 'clinics', clinicSlug as string, 'doctors', activeDoctorId);
    updateDoc(ref, { avgConsultMinutes: minutes })
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: ref.path,
          operation: 'update',
          requestResourceData: { avgConsultMinutes: minutes },
        }));
      });
    toast({ title: "UPDATED", description: `AVG CONSULT TIME SET TO ${minutes} MIN.` });
  };

  if (!doctorsLoading && doctors?.length === 0) {
    return (
      <div className="min-h-screen bg-qc-cream flex flex-col items-center justify-center p-8 space-y-6 text-center">
        <AlertCircle className="w-16 h-16 text-qc-red" />
        <div className="space-y-2">
          <h1 className="text-2xl font-bold uppercase">No Doctors Registered</h1>
          <p className="font-mono text-sm text-qc-gray uppercase max-w-md">
            The clinic "{clinicSlug}" does not have any doctors assigned. 
            Please setup doctors in the Admin Console to start managing the queue.
          </p>
        </div>
        <div className="flex gap-4">
          <BrutalistButton variant="outline" onClick={() => router.push('/')}>Back to Home</BrutalistButton>
          <BrutalistButton variant="yellow" onClick={() => router.push('/admin')}>Go to Admin Console</BrutalistButton>
        </div>
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

          <div className="grid grid-cols-1 gap-3 pt-6 pb-12">
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
              onClick={() => setShowSkipAlert(true)}
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pb-12">
              {skippedTokens.map(t => (
                <div key={t.id} className="border-2 border-qc-black p-3 font-mono text-xs bg-red-50 flex justify-between items-center">
                  <span className="font-bold">#{t.tokenNumber.toString().padStart(3, '0')} - {t.patientName}</span>
                  <BrutalistButton size="sm" variant="outline" onClick={() => setShowRecallAlert(t)}>RECALL</BrutalistButton>
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

      <AlertDialog open={showSkipAlert} onOpenChange={setShowSkipAlert}>
        <AlertDialogContent className="border-3 border-qc-black rounded-none shadow-brutal">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono font-bold uppercase">Confirm Skip?</AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs uppercase">
              THIS WILL MARK PATIENT {servingToken?.tokenNumber} AS SKIPPED AND CALL THE NEXT PERSON AUTOMATICALLY.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono border-2 border-qc-black rounded-none">CANCEL</AlertDialogCancel>
            <AlertDialogAction onClick={handleSkipConfirm} className="bg-qc-red text-white font-mono rounded-none border-2 border-qc-black hover:bg-qc-red/90">YES, SKIP</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!showRecallAlert} onOpenChange={() => setShowRecallAlert(null)}>
        <AlertDialogContent className="border-3 border-qc-black rounded-none shadow-brutal">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono font-bold uppercase">Recall Position?</AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-xs uppercase">
              WHERE SHOULD PATIENT {showRecallAlert?.tokenNumber} BE PLACED IN THE QUEUE?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
             <BrutalistButton variant="outline" className="flex flex-col gap-2 p-6 h-auto" onClick={() => handleRecall(showRecallAlert, 'front')}>
                <ChevronFirst className="w-6 h-6" />
                <span>FRONT (Original Pos)</span>
             </BrutalistButton>
             <BrutalistButton variant="yellow" className="flex flex-col gap-2 p-6 h-auto" onClick={() => handleRecall(showRecallAlert, 'back')}>
                <ChevronLast className="w-6 h-6" />
                <span>BACK (End of Line)</span>
             </BrutalistButton>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono border-2 border-qc-black rounded-none w-full">CANCEL</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
