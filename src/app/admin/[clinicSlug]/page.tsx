
"use client";

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BrutalistButton } from '@/components/brutalist/Button';
import { BrutalistInput } from '@/components/brutalist/Input';
import { Card, CardContent } from '@/components/ui/card';
import { useFirestore, useCollection, useDoc, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, deleteDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, UserPlus, ShieldCheck, Mail, X, Settings, Building2, LayoutDashboard, Stethoscope } from 'lucide-react';
import Link from 'next/link';

export default function ClinicAdminDashboard() {
  const { clinicSlug } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const { user, loading: userLoading } = useUser();
  
  const [doctorName, setDoctorName] = useState('');
  const [doctorSlug, setDoctorSlug] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [receptionistEmail, setReceptionistEmail] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch Clinic Metadata
  const clinicRef = useMemo(() => {
    if (!db || !clinicSlug) return null;
    return doc(db, 'clinics', clinicSlug as string);
  }, [db, clinicSlug]);
  const { data: clinic, loading: clinicLoading } = useDoc(clinicRef);

  // Fetch Doctors
  const doctorsQuery = useMemo(() => {
    if (!db || !clinicSlug) return null;
    return collection(db, 'clinics', clinicSlug as string, 'doctors');
  }, [db, clinicSlug]);
  const { data: doctors } = useCollection(doctorsQuery);

  // Fetch Approved Receptionists
  const approvedQuery = useMemo(() => {
    if (!db || !clinicSlug) return null;
    return collection(db, 'clinics', clinicSlug as string, 'approved_receptionists');
  }, [db, clinicSlug]);
  const { data: approvedReceptionists } = useCollection(approvedQuery);

  const handleAddDoctor = async () => {
    if (!db || !clinicSlug || !doctorName || !doctorSlug) return;
    setIsProcessing(true);
    
    const docSlugLower = doctorSlug.toLowerCase().trim().replace(/\s+/g, '-');
    const docId = `${clinicSlug}_${docSlugLower}`;
    const doctorRef = doc(db, 'clinics', clinicSlug as string, 'doctors', docId);
    
    const data = {
      name: doctorName,
      slug: docSlugLower,
      clinicId: clinicSlug,
      specialization: specialization || 'General Physician',
      avgConsultMinutes: 12,
      createdAt: serverTimestamp()
    };

    try {
      await setDoc(doctorRef, data);
      toast({ title: "DOCTOR ADDED", description: `DR. ${doctorName} IS NOW ACTIVE.` });
      setDoctorName('');
      setDoctorSlug('');
      setSpecialization('');
    } catch (e) {
      toast({ variant: "destructive", title: "ERROR", description: "FAILED TO ADD DOCTOR." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleApproveReceptionist = async () => {
    if (!db || !clinicSlug || !receptionistEmail) return;
    setIsProcessing(true);

    const emailKey = receptionistEmail.toLowerCase().trim();
    const approvedRef = doc(db, 'clinics', clinicSlug as string, 'approved_receptionists', emailKey);
    
    try {
      await setDoc(approvedRef, {
        email: emailKey,
        clinicId: clinicSlug,
        addedAt: serverTimestamp()
      });
      toast({ title: "EMAIL APPROVED", description: `${emailKey} CAN NOW LOGIN.` });
      setReceptionistEmail('');
    } catch (e) {
      toast({ variant: "destructive", title: "ERROR", description: "FAILED TO APPROVE EMAIL." });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveApproval = async (emailId: string) => {
    if (!db || !clinicSlug) return;
    const approvedRef = doc(db, 'clinics', clinicSlug as string, 'approved_receptionists', emailId);
    try {
      await deleteDoc(approvedRef);
      toast({ title: "APPROVAL REMOVED", description: "ACCESS REVOKED." });
    } catch (e) {
      toast({ variant: "destructive", title: "ERROR", description: "FAILED TO REMOVE APPROVAL." });
    }
  };

  if (clinicLoading || userLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center font-mono uppercase bg-qc-cream">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-qc-black border-t-qc-yellow animate-spin rounded-full" />
          <p>Syncing with Central Command...</p>
        </div>
      </div>
    );
  }

  // Security Check
  if (clinic && user && clinic.ownerUid !== user.uid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4 bg-qc-cream">
        <ShieldCheck className="w-16 h-16 text-qc-red" />
        <h1 className="text-2xl font-bold uppercase">Access Denied</h1>
        <p className="font-mono text-sm uppercase text-qc-gray">You are not authorized to manage this clinic.</p>
        <BrutalistButton onClick={() => router.push('/')}>Back to Home</BrutalistButton>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-12 pb-24 min-h-screen bg-qc-cream">
      <header className="border-b-thick border-qc-black pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase font-bold mb-4 hover:bg-qc-yellow px-2 py-1 transition-colors border-2 border-qc-black">
            <ArrowLeft className="w-3 h-3" /> System Home
          </Link>
          <h1 className="text-5xl font-bold uppercase tracking-tighter">
            {clinic?.name || 'Clinic Profile'}
          </h1>
          <p className="font-mono text-sm uppercase text-qc-gray tracking-widest">Master Administration Console</p>
        </div>
        <div className="bg-white border-thick border-qc-black p-4 shadow-brutal flex items-center gap-4">
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase font-bold">Admin Status</p>
            <p className="font-mono text-[10px] uppercase text-qc-gray">{user?.email}</p>
          </div>
          <div className="w-12 h-12 bg-qc-yellow border-3 border-qc-black flex items-center justify-center font-bold text-xl">
            {clinic?.name?.[0]?.toUpperCase() || 'C'}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-12">
          <section className="space-y-6">
            <h2 className="font-headline text-2xl font-bold uppercase flex items-center gap-3">
              <span className="bg-qc-black text-qc-yellow px-3 py-1 text-sm">01</span> Manage Doctors
            </h2>
            <Card className="border-thick border-qc-black shadow-brutal rounded-none bg-white">
              <CardContent className="p-8 space-y-6">
                <p className="font-mono text-xs uppercase text-qc-gray">Add a new medical professional to your clinic's roster.</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase font-bold">Doctor's Name</label>
                    <BrutalistInput 
                      placeholder="e.g. Dr. Ramesh" 
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase font-bold">URL ID (Unique)</label>
                    <BrutalistInput 
                      placeholder="e.g. dr-ramesh" 
                      value={doctorSlug}
                      onChange={(e) => setDoctorSlug(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase font-bold">Primary Specialization</label>
                  <BrutalistInput 
                    placeholder="e.g. General Medicine / Cardiology" 
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                  />
                </div>
                <BrutalistButton 
                  variant="yellow" 
                  className="w-full h-14 text-lg" 
                  onClick={handleAddDoctor}
                  disabled={isProcessing}
                >
                  {isProcessing ? "PROCESSING..." : "REGISTER NEW DOCTOR"}
                </BrutalistButton>
              </CardContent>
            </Card>

            <div className="space-y-4">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-qc-gray px-2">Active Roster</h3>
              <div className="grid grid-cols-1 gap-4">
                {doctors?.map(doc => (
                  <div key={doc.id} className="bg-white border-thick border-qc-black p-6 flex justify-between items-center shadow-brutal-hover transition-all">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-qc-cream border-2 border-qc-black">
                        <Stethoscope className="w-6 h-6" />
                      </div>
                      <div>
                        <p className="font-headline font-bold text-lg uppercase leading-none">{doc.name}</p>
                        <p className="font-mono text-[10px] text-qc-gray uppercase mt-1">{doc.specialization} • ID: {doc.slug}</p>
                      </div>
                    </div>
                  </div>
                ))}
                {doctors?.length === 0 && <p className="font-mono text-[10px] text-qc-gray italic p-8 border-thick border-dashed border-qc-gray text-center uppercase tracking-widest">No doctors registered yet.</p>}
              </div>
            </div>
          </section>
        </div>

        <div className="space-y-12">
          <section className="space-y-6">
            <h2 className="font-headline text-2xl font-bold uppercase flex items-center gap-3">
              <span className="bg-qc-black text-qc-yellow px-3 py-1 text-sm">02</span> Staff Access
            </h2>
            <Card className="border-thick border-qc-black shadow-brutal rounded-none bg-white">
              <CardContent className="p-8 space-y-6">
                <p className="font-mono text-xs uppercase text-qc-gray leading-relaxed">
                  Whitelisting an email allows that user to log in to the Receptionist Dashboard and manage patient flows.
                </p>
                <div className="flex flex-col sm:flex-row gap-4">
                  <BrutalistInput 
                    placeholder="staff-email@clinic.com" 
                    value={receptionistEmail}
                    onChange={(e) => setReceptionistEmail(e.target.value)}
                    className="flex-1"
                  />
                  <BrutalistButton 
                    variant="primary" 
                    className="h-12 px-6"
                    onClick={handleApproveReceptionist}
                    disabled={isProcessing}
                  >
                    <UserPlus className="w-5 h-5" />
                  </BrutalistButton>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="font-mono text-[10px] font-bold uppercase tracking-widest text-qc-gray px-2">Authorized Emails</h3>
              <div className="grid grid-cols-1 gap-2">
                {approvedReceptionists?.map(ar => (
                  <div key={ar.id} className="bg-white border-2 border-qc-black px-4 py-3 flex justify-between items-center shadow-brutal-active">
                    <span className="font-mono text-xs font-bold">{ar.email}</span>
                    <button 
                      onClick={() => handleRemoveApproval(ar.id)}
                      className="text-qc-red hover:bg-qc-red/10 p-2 border-2 border-transparent hover:border-qc-red transition-all"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {approvedReceptionists?.length === 0 && <p className="font-mono text-[10px] text-qc-gray italic p-4 border-thick border-dashed border-qc-gray uppercase tracking-tighter">Allowlist is empty.</p>}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="font-headline text-2xl font-bold uppercase flex items-center gap-3">
              <span className="bg-qc-black text-qc-yellow px-3 py-1 text-sm">03</span> Entry Points
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <Link href={`/r/${clinicSlug}`} className="group block bg-qc-yellow border-thick border-qc-black p-8 font-mono font-bold text-xl uppercase text-center shadow-brutal hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all flex items-center justify-center gap-4">
                <LayoutDashboard className="w-8 h-8 group-hover:rotate-6 transition-transform" />
                Open Receptionist Desk
              </Link>
            </div>
          </section>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 w-full bg-qc-black text-qc-yellow py-4 px-8 border-t-thick border-qc-black flex justify-between items-center z-50">
        <span className="font-mono text-[10px] uppercase font-bold tracking-widest">Queue Cure '26 • Global Admin Panel • {clinicSlug}</span>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-qc-yellow animate-pulse" />
            <span className="font-mono text-[9px] uppercase font-bold">Secure Admin Session</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
