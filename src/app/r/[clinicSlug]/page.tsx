
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
  getDoc
} from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { errorEmitter } from "@/firebase/error-emitter";
import { FirestorePermissionError } from "@/firebase/errors";
import { 
  ArrowLeft, 
  RefreshCw, 
  Settings2, 
  UserPlus, 
  AlertCircle, 
  X, 
  ChevronLast, 
  ChevronFirst, 
  Settings,
  PlusCircle,
  Stethoscope,
  QrCode,
  Copy,
  ExternalLink
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

  // Fetch Clinic Data
  const clinicRef = useMemo(() => {
    if (!db || !clinicSlug) return null;
    return doc(db, 'clinics', clinicSlug as string);
  }, [db, clinicSlug]);
  const { data: clinic } = useDoc(clinicRef);

  // Daily Code Management
  const todayDate = useMemo(() => clinic ? getTodayDateString(clinic.timezone) : null, [clinic]);
  const codeId = useMemo(() => clinic && todayDate ? `${clinicSlug}_${todayDate}` : null, [clinic, todayDate, clinicSlug]);
  const codeRef = useMemo(() => (db && codeId) ? doc(db, 'dailyCodes', codeId) : null, [db, codeId]);
  const { data: dailyCodeData } = useDoc(codeRef);

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

  const today = new Date().toISOString().split('T')[0];
  
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
      toast({ 
        variant: "destructive", 
        title: "GENERATION FAILED", 
        description: "DATABASE SYNC ERROR." 
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

  const handleCreateDoctor = async () => {
    if (!db || !clinicSlug || !newDoctorName || !newDoctorSlug) return;
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

  const patientUrl = useMemo(() => {
    if (typeof window === 'undefined' || !activeDoctorId || !dailyCodeData?.code) return '';
    const origin = window.location.origin;
    const docSlug = activeDoctor?.slug || '';
    return `${origin}/q/${clinicSlug}/${docSlug}?code=${dailyCodeData.code}`;
  }, [clinicSlug, activeDoctor, dailyCodeData]);

  const qrUrl = useMemo(() => {
    if (!patientUrl) return '';
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(patientUrl)}`;
  }, [patientUrl]);

  const isOwner = user && clinic && user.uid === clinic.ownerUid;

  if (doctorsLoading) {
    return <div className="h-screen flex items-center justify-center font-mono">LOADING ROSTER...</div>;
  }

  return (
    <div className="flex flex-col min-h-screen">
      <nav className="sticky top-0 z-50 h-14 bg-qc-yellow border-b-thick border-qc-black flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/')} className="hover:bg-qc-black/10 p-2 border-2 border-transparent hover:border-qc-black transition-all">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="font-mono text-[11px] font-bold uppercase tracking-widest">
            {clinic?.name?.toUpperCase() || clinicSlug?.toString().toUpperCase()} <span className="mx-2 opacity-30">|</span> RECEPTIONIST DASHBOARD
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isOwner && (
            <Link 
              href={`/admin/${clinicSlug}`} 
              className="flex items-center gap-2 font-mono text-[10px] font-bold uppercase bg-qc-black text-qc-yellow px-3 py-1.5 border-2 border-qc-black hover:bg-qc-yellow hover:text-qc-black transition-all"
            >
              <Settings className="w-3 h-3" /> Manage Clinic
            </Link>
          )}
          <div className="hidden md:flex items-center gap-2">
            <div className="w-2 h-2 bg-qc-black animate-pulse" />
            <span className="font-mono text-[9px] font-bold uppercase">Live Connection</span>
          </div>
        </div>
      </nav>

      <div className="flex bg-qc-cream border-b-3 border-qc-black overflow-x-auto scrollbar-hide">
        {doctors?.map((doc) => (
          <button
            key={doc.id}
            onClick={() => setActiveDoctorId(doc.id)}
            className={`px-8 py-5 font-mono text-[11px] font-bold uppercase tracking-widest border-r-3 border-qc-black transition-all shrink-0 ${
              activeDoctorId === doc.id ? "bg-qc-black text-qc-yellow" : "bg-white hover:bg-qc-yellow/30"
            }`}
          >
            {doc.name}
          </button>
        ))}
        <Dialog open={isAddDoctorOpen} onOpenChange={setIsAddDoctorOpen}>
          <DialogTrigger asChild>
            <button className="px-6 py-5 font-mono text-[11px] font-bold uppercase tracking-widest bg-qc-yellow/20 hover:bg-qc-yellow transition-all flex items-center gap-2 border-r-3 border-qc-black">
              <PlusCircle className="w-4 h-4" /> Add Doctor
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
              <BrutalistButton variant="yellow" className="w-full h-12" onClick={handleCreateDoctor} disabled={isAddingDoctor}>
                {isAddingDoctor ? "REGISTERING..." : "ADD TO QUEUE"}
              </BrutalistButton>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <main className="flex-1 flex flex-col lg:flex-row bg-white">
        <aside className="w-full lg:w-[380px] bg-qc-cream border-r-3 border-qc-black p-8 space-y-8 overflow-y-auto">
          <ServingBanner token={servingToken as any} />

          <section className="space-y-4 border-3 border-qc-black p-5 bg-white shadow-brutal">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <QrCode className="w-3 h-3" /> Patient Access
            </h3>
            <div className="space-y-4">
              <div className="flex flex-col items-center gap-2 bg-qc-cream p-4 border-2 border-qc-black">
                <p className="font-mono text-[9px] uppercase font-bold">Today's Entry Code</p>
                <span className="text-3xl font-mono font-bold tracking-[0.2em]">{dailyCodeData?.code || "------"}</span>
              </div>
              
              <div className="flex flex-col items-center gap-3">
                {qrUrl ? (
                  <div className="bg-white p-2 border-2 border-qc-black">
                    <img src={qrUrl} alt="Patient QR Code" className="w-32 h-32" />
                  </div>
                ) : (
                  <div className="w-32 h-32 bg-qc-gray animate-pulse border-2 border-qc-black" />
                )}
                <BrutalistButton 
                  size="sm" 
                  variant="outline" 
                  className="w-full flex items-center justify-center gap-2"
                  onClick={() => {
                    navigator.clipboard.writeText(patientUrl);
                    toast({ title: "LINK COPIED", description: "SEND IT TO PATIENTS." });
                  }}
                >
                  <Copy className="w-3 h-3" /> Copy Link
                </BrutalistButton>
                <Link 
                  href={`/q/${clinicSlug}/${activeDoctor?.slug}`} 
                  target="_blank"
                  className="font-mono text-[9px] uppercase font-bold underline flex items-center gap-1 hover:text-qc-blue"
                >
                  Open TV View <ExternalLink className="w-2 h-2" />
                </Link>
              </div>
            </div>
          </section>

          <section className="space-y-4 border-3 border-qc-black p-5 bg-white shadow-brutal">
            <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <UserPlus className="w-3 h-3" /> Add Patient to Line
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
              <div className="space-y-1">
                <label className="font-mono text-[8px] font-bold uppercase text-qc-gray">Phone (Sms Updates)</label>
                <BrutalistInput 
                  placeholder="PHONE NUMBER" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
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

          <div className="grid grid-cols-1 gap-4 pt-4 pb-12">
            <BrutalistButton 
              variant="yellow" 
              className="w-full text-lg py-8 border-thick shadow-brutal-hover" 
              onClick={handleCallNext}
              disabled={isProcessing || (waitingTokens.length === 0 && !servingToken)}
            >
              {isProcessing ? "SYNCING..." : "✓ CALL NEXT PATIENT"}
            </BrutalistButton>
            <BrutalistButton 
              variant="destructive" 
              className="w-full h-14" 
              onClick={() => setShowSkipAlert(true)}
              disabled={isProcessing || !servingToken}
            >
              ✕ MARK AS NO-SHOW
            </BrutalistButton>
          </div>
        </aside>

        <section className="flex-1 p-8 space-y-10 bg-[#faf9f6] overflow-y-auto">
          <div className="space-y-6">
            <header className="flex justify-between items-end border-b-thick border-qc-black pb-4">
              <div>
                <h3 className="font-headline text-2xl font-bold uppercase tracking-tight">
                  Waiting Queue
                </h3>
                <p className="font-mono text-[10px] uppercase text-qc-gray">Currently in line: {waitingTokens.length} patients</p>
              </div>
              <div className="text-right">
                <span className="font-mono text-xs font-bold uppercase bg-qc-black text-qc-yellow px-2 py-1">TODAY: {today}</span>
              </div>
            </header>

            <div className="grid grid-cols-1 gap-4">
              {waitingTokens.length > 0 ? waitingTokens.map((token) => (
                <div key={token.id} className="border-3 border-qc-black bg-white p-6 flex justify-between items-center shadow-brutal hover:-translate-x-1 hover:-translate-y-1 transition-all">
                  <div className="flex items-center gap-6">
                    <span className="font-mono text-4xl font-bold bg-qc-yellow px-4 py-2 border-3 border-qc-black tabular-nums">
                      {token.tokenNumber.toString().padStart(3, '0')}
                    </span>
                    <div>
                      <span className="font-headline text-xl font-bold uppercase block">{token.patientName}</span>
                      <span className="font-mono text-[10px] text-qc-gray uppercase tracking-widest">{token.phone || "No phone listed"}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                     <span className="font-mono text-[10px] font-bold text-qc-gray uppercase bg-qc-cream px-3 py-1 border border-qc-black">WAITING</span>
                  </div>
                </div>
              )) : (
                <div className="border-thick border-dashed border-qc-gray p-20 text-center bg-qc-cream/20">
                  <AlertCircle className="w-12 h-12 mx-auto text-qc-gray mb-4" />
                  <p className="font-mono text-lg text-qc-gray uppercase tracking-widest font-bold">No Patients in Line</p>
                  <p className="font-mono text-xs text-qc-gray uppercase mt-2">Generate a token to start the queue.</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <h3 className="font-mono text-xs font-bold uppercase tracking-widest text-qc-gray flex items-center gap-3">
              <RefreshCw className="w-4 h-4" /> Recently Skipped / Recalls
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pb-20">
              {skippedTokens.map(t => (
                <div key={t.id} className="border-2 border-qc-black p-4 font-mono text-sm bg-red-50 flex justify-between items-center shadow-brutal-active">
                  <div>
                    <span className="font-bold block">TOKEN #{t.tokenNumber.toString().padStart(3, '0')}</span>
                    <span className="text-xs uppercase">{t.patientName}</span>
                  </div>
                  <BrutalistButton size="sm" variant="outline" onClick={() => setShowRecallAlert(t)}>RECALL</BrutalistButton>
                </div>
              ))}
              {skippedTokens.length === 0 && (
                <div className="border-2 border-qc-gray border-dashed p-6 text-center w-full col-span-2">
                  <p className="font-mono text-[10px] text-qc-gray uppercase">Zero skipped entries for this doctor today.</p>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <AlertDialog open={showSkipAlert} onOpenChange={setShowSkipAlert}>
        <AlertDialogContent className="border-thick border-qc-black rounded-none shadow-brutal bg-qc-cream">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono font-bold uppercase text-2xl">Confirm Skip?</AlertDialogTitle>
            <AlertDialogDescription className="font-mono text-sm uppercase text-qc-black/70">
              Patient {servingToken?.tokenNumber} ({servingToken?.patientName}) will be moved to the skipped list. This action is tracked.
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
              Where should Patient {showRecallAlert?.tokenNumber} be re-inserted into the current line?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-8">
             <BrutalistButton variant="outline" className="flex flex-col gap-3 p-8 h-auto border-thick" onClick={() => handleRecall(showRecallAlert, 'front')}>
                <ChevronFirst className="w-8 h-8" />
                <span className="text-sm">FRONT OF LINE</span>
                <span className="text-[8px] opacity-60">UP NEXT FOR DOCTOR</span>
             </BrutalistButton>
             <BrutalistButton variant="yellow" className="flex flex-col gap-3 p-8 h-auto border-thick" onClick={() => handleRecall(showRecallAlert, 'back')}>
                <ChevronLast className="w-8 h-8" />
                <span className="text-sm">BACK OF LINE</span>
                <span className="text-[8px] opacity-60">END OF CURRENT LIST</span>
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

function Link({ href, children, className, target }: any) {
  const router = useRouter();
  if (target === "_blank") return <a href={href} target={target} className={className}>{children}</a>;
  return (
    <a href={href} onClick={(e) => { e.preventDefault(); router.push(href); }} className={className}>
      {children}
    </a>
  );
}
