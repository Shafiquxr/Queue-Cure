
"use client";

import { useState, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { BrutalistButton } from '@/components/brutalist/Button';
import { BrutalistInput } from '@/components/brutalist/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useFirestore, useCollection, useDoc, useUser } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, deleteDoc } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { ArrowLeft, UserPlus, ShieldCheck, Mail, X, ExternalLink, Settings } from 'lucide-react';
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

  const handleRemoveApproval = async (email: string) => {
    if (!db || !clinicSlug) return;
    const approvedRef = doc(db, 'clinics', clinicSlug as string, 'approved_receptionists', email);
    try {
      await deleteDoc(approvedRef);
      toast({ title: "APPROVAL REMOVED", description: `${email} ACCESS REVOKED.` });
    } catch (e) {
      toast({ variant: "destructive", title: "ERROR", description: "FAILED TO REMOVE APPROVAL." });
    }
  };

  if (clinicLoading || userLoading) {
    return <div className="min-h-screen flex items-center justify-center font-mono uppercase">Syncing with Central Command...</div>;
  }

  // Security Check: Only the owner can manage
  if (clinic && user && clinic.ownerUid !== user.uid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center space-y-4">
        <ShieldCheck className="w-16 h-16 text-qc-red" />
        <h1 className="text-2xl font-bold uppercase">Access Denied</h1>
        <p className="font-mono text-sm uppercase text-qc-gray">You are not authorized to manage this clinic.</p>
        <BrutalistButton onClick={() => router.push('/')}>Back to Home</BrutalistButton>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-8 space-y-12 pb-24">
      <header className="border-b-thick border-qc-black pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase font-bold mb-4 hover:bg-qc-yellow px-2 py-1 transition-colors border-2 border-transparent hover:border-qc-black">
            <ArrowLeft className="w-3 h-3" /> System Logout
          </Link>
          <h1 className="text-4xl font-bold uppercase tracking-tighter">
            {clinic?.name || 'Loading...'}
          </h1>
          <p className="font-mono text-sm uppercase text-qc-gray">Clinic Admin Dashboard</p>
        </div>
        <div className="bg-white border-3 border-qc-black p-4 shadow-brutal flex items-center gap-4">
          <div className="text-right">
            <p className="font-mono text-[10px] uppercase font-bold">Admin Session</p>
            <p className="font-mono text-[10px] uppercase text-qc-gray">{user?.email}</p>
          </div>
          <div className="w-10 h-10 bg-qc-yellow border-2 border-qc-black rounded-full flex items-center justify-center font-bold">
            {clinic?.name?.[0]}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Column 1: Infrastructure */}
        <div className="space-y-12">
          <section className="space-y-6">
            <h2 className="font-headline text-xl font-bold uppercase flex items-center gap-3">
              <span className="bg-qc-black text-qc-yellow px-2 py-1 text-sm">01</span> Add Doctors
            </h2>
            <Card className="border-3 border-qc-black shadow-brutal rounded-none bg-qc-cream">
              <CardContent className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase font-bold">Full Name</label>
                    <BrutalistInput 
                      placeholder="Dr. Anand" 
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="font-mono text-[10px] uppercase font-bold">URL Slug</label>
                    <BrutalistInput 
                      placeholder="dr-anand" 
                      value={doctorSlug}
                      onChange={(e) => setDoctorSlug(e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase font-bold">Specialization</label>
                  <BrutalistInput 
                    placeholder="e.g. Cardiology" 
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                  />
                </div>
                <BrutalistButton 
                  variant="yellow" 
                  className="w-full" 
                  onClick={handleAddDoctor}
                  disabled={isProcessing}
                >
                  {isProcessing ? "ADDING..." : "REGISTER DOCTOR"}
                </BrutalistButton>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="font-mono text-[10px] font-bold uppercase text-qc-gray px-2">Registered Doctors</h3>
              <div className="grid grid-cols-1 gap-3">
                {doctors?.map(doc => (
                  <div key={doc.id} className="bg-white border-2 border-qc-black p-4 flex justify-between items-center shadow-brutal-active">
                    <div>
                      <p className="font-headline font-bold text-sm uppercase">{doc.name}</p>
                      <p className="font-mono text-[9px] text-qc-gray uppercase">{doc.specialization} • slug: {doc.slug}</p>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/q/${clinicSlug}/${doc.slug}`} target="_blank" className="p-2 border-2 border-qc-black hover:bg-qc-yellow transition-colors">
                        <ExternalLink className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
                {doctors?.length === 0 && <p className="font-mono text-[10px] text-qc-gray italic p-4 border-2 border-dashed border-qc-gray">No doctors registered yet.</p>}
              </div>
            </div>
          </section>
        </div>

        {/* Column 2: Security & Access */}
        <div className="space-y-12">
          <section className="space-y-6">
            <h2 className="font-headline text-xl font-bold uppercase flex items-center gap-3">
              <span className="bg-qc-black text-qc-yellow px-2 py-1 text-sm">02</span> Receptionist Allowlist
            </h2>
            <Card className="border-3 border-qc-black shadow-brutal rounded-none bg-qc-cream">
              <CardContent className="p-6 space-y-4">
                <p className="font-mono text-[10px] uppercase text-qc-gray leading-relaxed">
                  ONLY EMAILS ON THIS LIST CAN LOGIN TO MANAGE THE QUEUES. 
                  STAFF WILL BE ASKED TO SET A PASSWORD ON THEIR FIRST LOGIN.
                </p>
                <div className="flex gap-2">
                  <BrutalistInput 
                    placeholder="staff-email@clinic.com" 
                    value={receptionistEmail}
                    onChange={(e) => setReceptionistEmail(e.target.value)}
                  />
                  <BrutalistButton 
                    variant="primary" 
                    onClick={handleApproveReceptionist}
                    disabled={isProcessing}
                  >
                    <UserPlus className="w-4 h-4" />
                  </BrutalistButton>
                </div>
              </CardContent>
            </Card>

            <div className="space-y-3">
              <h3 className="font-mono text-[10px] font-bold uppercase text-qc-gray px-2">Approved Emails</h3>
              <div className="space-y-2">
                {approvedReceptionists?.map(ar => (
                  <div key={ar.id} className="bg-white border-2 border-qc-black px-4 py-2 flex justify-between items-center">
                    <span className="font-mono text-xs">{ar.email}</span>
                    <button 
                      onClick={() => handleRemoveApproval(ar.id)}
                      className="text-qc-red hover:bg-qc-red/10 p-1"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {approvedReceptionists?.length === 0 && <p className="font-mono text-[10px] text-qc-gray italic p-4 border-2 border-dashed border-qc-gray">Allowlist is empty.</p>}
              </div>
            </div>
          </section>

          <section className="space-y-6">
            <h2 className="font-headline text-xl font-bold uppercase flex items-center gap-3">
              <span className="bg-qc-black text-qc-yellow px-2 py-1 text-sm">03</span> Quick Actions
            </h2>
            <div className="grid grid-cols-1 gap-4">
              <Link href={`/r/${clinicSlug}/login`} className="block bg-qc-yellow border-thick border-qc-black p-6 font-mono font-bold uppercase text-center shadow-brutal hover:-translate-x-1 hover:-translate-y-1 transition-all">
                Go to Receptionist Dashboard
              </Link>
            </div>
          </section>
        </div>
      </div>

      <footer className="fixed bottom-0 left-0 w-full bg-qc-black text-qc-yellow py-3 px-8 border-t-thick border-qc-black flex justify-between items-center">
        <span className="font-mono text-[10px] uppercase font-bold">Operations Center • {clinicSlug}</span>
        <div className="flex gap-6">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-qc-yellow animate-pulse rounded-full" />
            <span className="font-mono text-[9px] uppercase">Live Sync Active</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
