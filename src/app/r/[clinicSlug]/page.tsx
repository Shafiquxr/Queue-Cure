
"use client";

import { BrutalistButton } from "@/components/brutalist/Button";
import { BrutalistInput } from "@/components/brutalist/Input";
import { ServingBanner } from "@/components/receptionist/ServingBanner";
import { useParams, useRouter } from "next/navigation";
import { useState, useMemo, useEffect } from "react";
import { useFirestore, useCollection, useDoc, useUser } from "@/firebase";
import { 
  collection, 
  query, 
  where, 
  addDoc, 
  serverTimestamp, 
  doc, 
  setDoc,
  updateDoc,
  writeBatch,
  getDocs,
  getDoc,
  runTransaction
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { 
  ArrowLeft, 
  RefreshCw, 
  UserPlus, 
  AlertCircle, 
  ChevronLast, 
  ChevronFirst, 
  Settings,
  PlusCircle,
  Stethoscope,
  Copy,
  ExternalLink,
  Monitor
} from "lucide-react";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { getTodayDateString, generateDailyCode } from "@/lib/daily-code";
import Link from 'next/link';

export default function ReceptionistPage() {
  const { clinicSlug } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user } = useUser();
  
  const [activeDoctorId, setActiveDoctorId] = useState<string | null>(null);
  const [patientName, setPatientName] = useState("");
  const [phone, setPhone] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  const [newDoctorName, setNewDoctorName] = useState("");
  const [newDoctorSlug, setNewDoctorSlug] = useState("");
  const [newSpecialization, setNewSpecialization] = useState("");

  const [showSkipAlert, setShowSkipAlert] = useState(false);
  const [showRecallAlert, setShowRecallAlert] = useState<any>(null);

  const clinicRef = useMemo(() => {
    if (!db || !clinicSlug) return null;
    return doc(db, 'clinics', clinicSlug as string);
  }, [db, clinicSlug]);
  const { data: clinic } = useDoc(clinicRef);

  const todayDate = useMemo(() => clinic ? getTodayDateString(clinic.timezone) : null, [clinic]);
  const codeId = useMemo(() => clinic && todayDate ? `${clinicSlug}_${todayDate}` : null, [clinic, todayDate, clinicSlug]);
  const codeRef = useMemo(() => (db && codeId) ? doc(db, 'dailyCodes', codeId) : null, [db, codeId]);
  const { data: dailyCodeData } = useDoc(codeRef);

  const cleanDocName = (name: string) => {
    return name.replace(/^dr\.?\s*/gi, '').toUpperCase();
  };

  useEffect(() => {
    async function initDailyCode() {
      if (!db || !clinicSlug || !clinic || !codeRef || dailyCodeData) return;
      const snap = await getDoc(codeRef);
      if (!snap.exists()) {
        const newCode = generateDailyCode();
        await setDoc(codeRef, {
          clinicId: clinicSlug,
          date: todayDate,
          code: newCode,
          createdAt: serverTimestamp()
        });
      }
    }
    if (clinic) initDailyCode();
  }, [db, clinicSlug, clinic, codeRef, dailyCodeData, todayDate]);

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

  const [today, setToday] = useState(() => new Date().toISOString().split('T')[0]);

  useEffect(() => {
    const tz = clinic?.timezone || 'Asia/Kolkata';
    setToday(getTodayDateString(tz));
    
    const interval = setInterval(() => {
      const current = getTodayDateString(tz);
      setToday((prev) => {
        if (prev !== current) {
          return current;
        }
        return prev;
      });
    }, 15000); // Check every 15s

    return () => clearInterval(interval);
  }, [clinic?.timezone]);
  
  const tokensQuery = useMemo(() => {
    if (!db || !activeDoctorId) return null;
    return query(
      collection(db, 'tokens'),
      where('doctorId', '==', activeDoctorId),
      where('date', '==', today)
    );
  }, [db, activeDoctorId, today]);

  const { data: rawTokens } = useCollection(tokensQuery);

  const tokens = useMemo(() => {
    if (!rawTokens) return [];
    return [...rawTokens].sort((a, b) => (a.tokenNumber || 0) - (b.tokenNumber || 0));
  }, [rawTokens]);

  const servingToken = tokens?.find(t => t.status === 'serving');
  const waitingTokens = tokens?.filter(t => t.status === 'waiting') || [];
  const skippedTokens = tokens?.filter(t => t.status === 'skipped') || [];

  const handleAddPatient = async () => {
    if (!db || !patientName.trim() || !activeDoctorId || isProcessing) return;
    setIsProcessing(true);
    
    try {
      const counterId = `${clinicSlug}_${activeDoctorId}_${today}`;
      const counterRef = doc(db, 'counters', counterId);

      const nextTokenNumber = await runTransaction(db, async (transaction) => {
        const counterSnap = await transaction.get(counterRef);
        const current = counterSnap.exists() ? (counterSnap.data().lastToken || 0) : 0;
        const next = current + 1;

        // Update/create the counter
        transaction.set(counterRef, { lastToken: next }, { merge: true });

        // Add the token document
        const tokenRef = doc(collection(db, 'tokens'));
        transaction.set(tokenRef, {
          clinicId: clinicSlug,
          doctorId: activeDoctorId,
          tokenNumber: next,
          patientName: patientName.trim(),
          phone: phone.trim() || null,
          status: 'waiting',
          date: today,
          createdAt: serverTimestamp()
        });

        return next;
      });

      setPatientName("");
      setPhone("");
      toast({ title: "TOKEN GENERATED", description: `NUMBER: ${nextTokenNumber}` });
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'tokens',
          operation: 'create',
        }));
      }
      console.error(e);
      toast({ variant: "destructive", title: "GENERATION FAILED", description: "DATABASE SYNC ERROR." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCallNext = async () => {
    if (!db || !activeDoctorId || isProcessing) return;
    setIsProcessing(true);

    try {
      const q = query(
        collection(db, 'tokens'),
        where('doctorId', '==', activeDoctorId),
        where('date', '==', today)
      );
      const snapshot = await getDocs(q);
      const freshTokens = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .sort((a, b) => (a.tokenNumber || 0) - (b.tokenNumber || 0));

      const freshServing = freshTokens.find(t => t.status === 'serving');
      const freshWaiting = freshTokens.filter(t => t.status === 'waiting');

      const batch = writeBatch(db);

      if (freshServing) {
        const currentRef = doc(db, 'tokens', freshServing.id);
        batch.update(currentRef, { status: 'done', completedAt: serverTimestamp() });
      }

      if (freshWaiting.length > 0) {
        const nextRef = doc(db, 'tokens', freshWaiting[0].id);
        batch.update(nextRef, { status: 'serving', calledAt: serverTimestamp() });
        
        await batch.commit();
        toast({ title: "NEXT CALLED", description: `NOW SERVING: ${freshWaiting[0].tokenNumber}` });
      } else {
        if (freshServing) {
          await batch.commit();
          toast({ title: "QUEUE ENDED", description: "NO MORE PATIENTS." });
        } else {
          toast({ title: "QUEUE EMPTY", description: "NO WAITING PATIENTS." });
        }
      }
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'tokens',
          operation: 'write',
        }));
      }
      console.error(e);
      toast({ variant: "destructive", title: "ERROR", description: "FAILED TO ADVANCE QUEUE." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateDoctor = async () => {
    if (!db || !clinicSlug || !newDoctorName || !newDoctorSlug || !newSpecialization) return;
    setIsAddingDoctor(true);
    
    const docSlugLower = newDoctorSlug.toLowerCase().trim().replace(/\s+/g, '-');
    const docId = `${clinicSlug}_${docSlugLower}`;
    const doctorRef = doc(db, 'clinics', clinicSlug as string, 'doctors', docId);
    
    const data = {
      name: newDoctorName,
      slug: docSlugLower,
      clinicId: clinicSlug,
      specialization: newSpecialization || 'General Physician',
      avgConsultMinutes: 12,
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doctorRef, data);
      toast({ title: "DOCTOR ADDED", description: `DR. ${newDoctorName} IS NOW ACTIVE.` });
      setNewDoctorName('');
      setNewDoctorSlug('');
      setNewSpecialization('');
      setIsAddDoctorOpen(false);
    } catch (e) {
      toast({ variant: "destructive", title: "ERROR", description: "FAILED TO ADD DOCTOR." });
    } finally {
      setIsAddingDoctor(false);
    }
  };

  const handleSkipConfirm = async () => {
    if (!db || isProcessing || !activeDoctorId) return;
    setIsProcessing(true);
    setShowSkipAlert(false);
    
    try {
      const q = query(
        collection(db, 'tokens'),
        where('doctorId', '==', activeDoctorId),
        where('date', '==', today)
      );
      const snapshot = await getDocs(q);
      const freshTokens = snapshot.docs
        .map(d => ({ id: d.id, ...d.data() } as any))
        .sort((a, b) => (a.tokenNumber || 0) - (b.tokenNumber || 0));

      const freshServing = freshTokens.find(t => t.status === 'serving');
      const freshWaiting = freshTokens.filter(t => t.status === 'waiting');

      if (!freshServing) {
        toast({ variant: "destructive", title: "ERROR", description: "NO PATIENT CURRENTLY SERVING." });
        return;
      }

      const batch = writeBatch(db);
      const currentRef = doc(db, 'tokens', freshServing.id);
      batch.update(currentRef, { status: 'skipped' });

      if (freshWaiting.length > 0) {
        const nextRef = doc(db, 'tokens', freshWaiting[0].id);
        batch.update(nextRef, { status: 'serving', calledAt: serverTimestamp() });
      }

      await batch.commit();
      toast({ variant: "destructive", title: "SKIPPED", description: `TOKEN ${freshServing.tokenNumber} MOVED TO SKIPPED.` });
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'tokens',
          operation: 'write',
        }));
      }
      console.error(e);
      toast({ variant: "destructive", title: "ERROR", description: "FAILED TO SKIP PATIENT." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecall = async (token: any, position: 'front' | 'back') => {
    if (!db || isProcessing || !activeDoctorId) return;
    setIsProcessing(true);
    setShowRecallAlert(null);
    
    const ref = doc(db, 'tokens', token.id);
    let updateData: any = { status: 'waiting', calledAt: null };
    
    try {
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
      
      await updateDoc(ref, updateData);
      toast({ title: "RECALLED", description: `TOKEN ${token.tokenNumber} RETURNED TO QUEUE (${position}).` });
    } catch (e: any) {
      if (e?.code === 'permission-denied') {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: ref.path,
          operation: 'update',
          requestResourceData: updateData,
        }));
      }
      console.error(e);
      toast({ variant: "destructive", title: "ERROR", description: "FAILED TO RECALL PATIENT." });
    } finally {
      setIsProcessing(false);
    }
  };

  const clinicTvUrl = useMemo(() => {
    if (typeof window === 'undefined' || !clinicSlug || !dailyCodeData?.code) return '';
    return `${window.location.origin}/q/${clinicSlug}?code=${dailyCodeData.code}`;
  }, [clinicSlug, dailyCodeData]);

  const qrUrl = useMemo(() => {
    if (!clinicTvUrl) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(clinicTvUrl)}`;
  }, [clinicTvUrl]);

  const isOwner = user && clinic && user.uid === clinic.ownerUid;

  if (doctorsLoading) {
    return <div className="h-screen flex items-center justify-center font-mono">LOADING ROSTER...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <nav className="sticky top-0 z-50 h-12 sm:h-14 bg-qc-yellow border-b-thick border-qc-black flex items-center justify-between px-2 sm:px-4">
        <div className="flex-1 flex items-center gap-1.5 sm:gap-2 min-w-0">
          <Link href="/" className="hover:bg-qc-black/10 p-1 sm:p-1.5 border-2 border-transparent hover:border-qc-black transition-all shrink-0">
            <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </Link>
          <div className="font-mono text-[9px] sm:text-[10px] font-bold uppercase tracking-tight flex items-center gap-1.5 sm:gap-2 min-w-0">
            <span className="truncate max-w-[80px] sm:max-w-[120px]">{clinic?.name?.toUpperCase() || clinicSlug}</span>
            <span className="opacity-40 hidden sm:inline">|</span>
            <span className="hidden md:inline">RECEPTIONIST DASHBOARD</span>
          </div>
        </div>
        
        <div className="flex justify-center flex-1">
          <h2 className="text-base sm:text-lg md:text-xl font-bold uppercase tracking-tighter whitespace-nowrap">
            Queue Cure <span className="text-qc-red">'26</span>
          </h2>
        </div>

        <div className="flex-1 flex items-center justify-end gap-2 sm:gap-4">
          {isOwner && (
            <Link 
              href={`/admin/${clinicSlug}`} 
              className="flex items-center gap-1.5 sm:gap-2 font-mono text-[8px] sm:text-[9px] font-bold uppercase bg-qc-black text-qc-yellow px-2 sm:px-3 py-1 sm:py-1.5 border-2 border-qc-black hover:bg-qc-yellow hover:text-qc-black transition-all shadow-brutal"
            >
              <Settings className="w-3 h-3" /> <span className="hidden sm:inline">Manage Clinic</span>
            </Link>
          )}
        </div>
      </nav>

      <div className="flex bg-qc-cream border-b-3 border-qc-black overflow-x-auto scrollbar-hide">
        {doctors?.map((doc) => (
          <button
            key={doc.id}
            onClick={() => setActiveDoctorId(doc.id)}
            className={`px-3 sm:px-6 md:px-8 py-3 sm:py-5 font-mono text-[9px] sm:text-[10px] md:text-[11px] font-bold uppercase tracking-wider sm:tracking-widest border-r-3 border-qc-black transition-all shrink-0 ${
              activeDoctorId === doc.id ? "bg-qc-black text-qc-yellow" : "bg-white hover:bg-qc-yellow/30"
            }`}
          >
            DR. {cleanDocName(doc.name)}
          </button>
        ))}
        <Dialog open={isAddDoctorOpen} onOpenChange={setIsAddDoctorOpen}>
          <DialogTrigger asChild>
            <button className="px-3 sm:px-6 py-3 sm:py-5 font-mono text-[9px] sm:text-[10px] md:text-[11px] font-bold uppercase tracking-wider sm:tracking-widest bg-qc-yellow/20 hover:bg-qc-yellow transition-all flex items-center gap-1.5 sm:gap-2 border-r-3 border-qc-black">
              <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> <span className="hidden sm:inline">Add Doctor</span><span className="sm:hidden">Add</span>
            </button>
          </DialogTrigger>
          <DialogContent className="border-thick border-qc-black rounded-none shadow-brutal">
            <DialogHeader>
              <DialogTitle className="uppercase font-bold text-xl">New Doctor Registration</DialogTitle>
              <DialogDescription className="font-mono text-xs uppercase">Instantly add a new professional to today's queue.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase font-bold">Full Name</label>
                  <BrutalistInput placeholder="e.g. Dr. Gupta" value={newDoctorName} onChange={e => setNewDoctorName(e.target.value)} />
                </div>
                <div className="space-y-1">
                  <label className="font-mono text-[10px] uppercase font-bold">URL Slug</label>
                  <BrutalistInput placeholder="e.g. dr-gupta" value={newDoctorSlug} onChange={e => setNewDoctorSlug(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <label className="font-mono text-[10px] uppercase font-bold">Specialization</label>
                <BrutalistInput placeholder="e.g. Orthopedics" value={newSpecialization} onChange={e => setNewSpecialization(e.target.value)} />
              </div>
              <BrutalistButton variant="yellow" className="w-full h-12" onClick={handleCreateDoctor} disabled={isAddingDoctor || !newDoctorName.trim() || !newDoctorSlug.trim() || !newSpecialization.trim()}>
                {isAddingDoctor ? "REGISTERING..." : "ADD TO QUEUE"}
              </BrutalistButton>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <main className="flex-1 flex flex-col lg:flex-row bg-white overflow-hidden">
        <aside className="w-full lg:w-[340px] xl:w-[380px] bg-qc-cream border-b-3 lg:border-b-0 lg:border-r-3 border-qc-black p-4 sm:p-6 lg:p-8 space-y-4 sm:space-y-6 lg:space-y-8 overflow-y-auto max-h-[50vh] lg:max-h-none">
          <ServingBanner token={servingToken as any} />

          <section className="space-y-4 border-3 border-qc-black p-5 bg-white shadow-brutal">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <Monitor className="w-3 h-3" /> Waiting Room Status
            </h3>
            <div className="space-y-4">
              {qrUrl && (
                <div className="flex justify-center mb-2">
                  <div className="bg-white p-2 border-2 border-qc-black">
                    <img src={qrUrl} alt="TV QR" className="w-32 h-32" />
                  </div>
                </div>
              )}
              <div className="flex flex-col items-center gap-2 bg-qc-cream p-4 border-2 border-qc-black">
                <p className="font-mono text-[9px] uppercase font-bold">Today's Support Code</p>
                <span className="text-3xl font-mono font-bold tracking-[0.2em]">{dailyCodeData?.code || "------"}</span>
              </div>
              <div className="flex flex-col gap-3">
                <BrutalistButton 
                  size="sm" 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(clinicTvUrl);
                    toast({ title: "LINK COPIED", description: "SEND IT TO PATIENTS." });
                  }}
                >
                  <Copy className="w-3 h-3" /> Copy TV Link
                </BrutalistButton>
                <Link 
                  href={clinicTvUrl} 
                  target="_blank"
                  className="w-full bg-qc-black text-qc-yellow p-3 font-mono text-[10px] font-bold uppercase text-center border-2 border-qc-black hover:bg-qc-yellow hover:text-qc-black transition-all flex items-center justify-center gap-2"
                >
                  Open Wall Display <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-3 border-qc-black p-5 bg-white shadow-brutal">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <UserPlus className="w-3 h-3" /> New Patient
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="font-mono text-[8px] font-bold uppercase text-qc-gray">Full Name</label>
                <BrutalistInput 
                  placeholder="PATIENT NAME" 
                  value={patientName}
                  onChange={(e) => setPatientName(e.target.value)}
                />
              </div>
              <BrutalistButton 
                variant="yellow" 
                className="w-full h-12" 
                onClick={handleAddPatient}
                disabled={!patientName || isProcessing || !activeDoctorId}
              >
                {isProcessing ? "GENERATING..." : "+ Generate Token"}
              </BrutalistButton>
            </div>
          </section>

          <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 sm:gap-4 pt-4 pb-6 lg:pb-12">
            <BrutalistButton 
              variant="yellow" 
              className="w-full text-sm sm:text-lg py-4 sm:py-6 lg:py-8 border-thick shadow-brutal-hover" 
              onClick={handleCallNext}
              disabled={isProcessing || (waitingTokens.length === 0 && !servingToken)}
            >
              {isProcessing ? "SYNCING..." : "✓ CALL NEXT"}
            </BrutalistButton>
            <BrutalistButton 
              variant="destructive" 
              className="w-full h-10 sm:h-12 lg:h-14 text-xs sm:text-sm" 
              onClick={() => setShowSkipAlert(true)}
              disabled={isProcessing || !servingToken}
            >
              ✕ NO-SHOW
            </BrutalistButton>
          </div>
        </aside>

        <section className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8 lg:space-y-10 bg-[#faf9f6] overflow-y-auto">
          <div className="space-y-4 sm:space-y-6">
            <header className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-2 border-b-thick border-qc-black pb-3 sm:pb-4">
              <div>
                <h3 className="font-headline text-lg sm:text-xl lg:text-2xl font-bold uppercase tracking-tight">
                  DR. {activeDoctor ? cleanDocName(activeDoctor.name) : '...'}
                </h3>
                <p className="font-mono text-[9px] sm:text-[10px] uppercase text-qc-gray">Currently waiting: {waitingTokens.length} patients</p>
              </div>
              <div className="text-left sm:text-right">
                <span className="font-mono text-[10px] sm:text-xs font-bold uppercase bg-qc-black text-qc-yellow px-2 py-1">TODAY: {today}</span>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-3 sm:gap-4">
              {waitingTokens.length > 0 ? waitingTokens.map((token) => (
                <div key={token.id} className="border-2 sm:border-3 border-qc-black bg-white p-3 sm:p-4 lg:p-6 flex justify-between items-center shadow-brutal hover:-translate-x-1 hover:-translate-y-1 transition-all">
                  <div className="flex items-center gap-3 sm:gap-4 lg:gap-6 min-w-0">
                    <span className="font-mono text-2xl sm:text-3xl lg:text-4xl font-bold bg-qc-yellow px-2 sm:px-3 lg:px-4 py-1 sm:py-2 border-2 sm:border-3 border-qc-black tabular-nums shrink-0">
                      {token.tokenNumber.toString().padStart(3, '0')}
                    </span>
                    <span className="font-headline text-sm sm:text-base lg:text-xl font-bold uppercase block truncate">{token.patientName}</span>
                  </div>
                  <span className="font-mono text-[8px] sm:text-[10px] font-bold text-qc-gray uppercase bg-qc-cream px-2 sm:px-3 py-1 border border-qc-black shrink-0 ml-2">WAITING</span>
                </div>
              )) : (
                <div className="border-thick border-dashed border-qc-gray p-8 sm:p-12 lg:p-20 text-center bg-qc-cream/20">
                  <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 lg:w-12 lg:h-12 mx-auto text-qc-gray mb-3 sm:mb-4" />
                  <p className="font-mono text-sm sm:text-base lg:text-lg text-qc-gray uppercase tracking-wider sm:tracking-widest font-bold">No Patients in Line</p>
                  <p className="font-mono text-[10px] sm:text-xs text-qc-gray uppercase mt-1 sm:mt-2">Generate a token to start the queue.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-qc-gray flex items-center gap-3">
              <RefreshCw className="w-4 h-4" /> Skipped / Recall
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 pb-8 sm:pb-12 lg:pb-20">
              {skippedTokens.map(t => (
                <div key={t.id} className="border-2 border-qc-black p-3 sm:p-4 font-mono text-xs sm:text-sm bg-red-50 flex justify-between items-center shadow-brutal-active">
                  <div className="min-w-0">
                    <span className="font-bold block">TOKEN #{t.tokenNumber.toString().padStart(3, '0')}</span>
                    <span className="text-[10px] sm:text-xs uppercase truncate block">{t.patientName}</span>
                  </div>
                  <BrutalistButton size="sm" variant="outline" className="shrink-0 ml-2" onClick={() => setShowRecallAlert(t)}>RECALL</BrutalistButton>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <AlertDialog open={showSkipAlert} onOpenChange={setShowSkipAlert}>
        <AlertDialogContent className="border-thick border-qc-black rounded-none shadow-brutal bg-qc-cream">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono font-bold uppercase text-2xl">Confirm Skip?</AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-sm uppercase text-qc-black/70">
              Patient {servingToken?.tokenNumber} will be moved to the skipped list.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6">
            <AlertDialogCancel className="font-mono border-thick border-qc-black rounded-none h-14 uppercase font-bold">CANCEL</AlertDialogCancel>
            <AlertDialogAction onClick={handleSkipConfirm} className="bg-qc-red text-white font-mono rounded-none border-thick border-qc-black h-14 uppercase font-bold hover:bg-qc-red/90">YES, MARK AS NO-SHOW</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!showRecallAlert} onOpenChange={() => setShowRecallAlert(null)}>
        <AlertDialogContent className="border-thick border-qc-black rounded-none shadow-brutal bg-qc-cream">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono font-bold uppercase text-2xl">Recall Position?</AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-sm uppercase text-qc-black/70">
              Where should Patient {showRecallAlert?.tokenNumber} be re-inserted?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-8">
             <BrutalistButton variant="outline" className="flex flex-col gap-3 p-8 h-auto border-thick" onClick={() => handleRecall(showRecallAlert, 'front')}>
                <ChevronFirst className="w-8 h-8" />
                <span className="text-sm">FRONT OF LINE</span>
             </BrutalistButton>
             <BrutalistButton variant="yellow" className="flex flex-col gap-3 p-8 h-auto border-thick" onClick={() => handleRecall(showRecallAlert, 'back')}>
                <ChevronLast className="w-8 h-8" />
                <span className="text-sm">BACK OF LINE</span>
             </BrutalistButton>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel className="font-mono border-thick border-qc-black rounded-none w-full h-12 uppercase font-bold">CANCEL ACTION</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
