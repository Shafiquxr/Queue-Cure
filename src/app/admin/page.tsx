
"use client";

import { useState, useMemo } from 'react';
import { BrutalistButton } from '@/components/brutalist/Button';
import { BrutalistInput } from '@/components/brutalist/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useFirestore, useCollection } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { ArrowLeft, Loader2, Plus, Building2, UserPlus, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export default function AdminPage() {
  const db = useFirestore();
  const [clinicName, setClinicName] = useState('');
  const [clinicSlug, setClinicSlug] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorSlug, setDoctorSlug] = useState('');
  const [specialization, setSpecialization] = useState('');
  
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);
  const [isCreatingClinic, setIsCreatingClinic] = useState(false);
  const [isAddingDoctor, setIsAddingDoctor] = useState(false);

  // Fetch existing clinics
  const clinicsQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, 'clinics');
  }, [db]);

  const { data: clinics, loading: clinicsLoading } = useCollection(clinicsQuery);

  const handleCreateClinic = () => {
    if (!db || !clinicName || !clinicSlug) {
      toast({ variant: "destructive", title: "VALIDATION ERROR", description: "NAME AND SLUG REQUIRED." });
      return;
    }

    setIsCreatingClinic(true);
    const slug = clinicSlug.toLowerCase().trim().replace(/\s+/g, '-');
    const clinicRef = doc(db, 'clinics', slug);
    const data = {
      name: clinicName,
      slug: slug,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
      createdAt: serverTimestamp()
    };

    // Non-blocking write
    setDoc(clinicRef, data)
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: clinicRef.path,
          operation: 'write',
          requestResourceData: data,
        }));
      });

    // Reset UI immediately
    setSelectedClinicId(slug);
    setClinicName('');
    setClinicSlug('');
    setIsCreatingClinic(false);
    toast({ title: "SUCCESS", description: `CLINIC ${slug} INITIALIZED.` });
  };

  const handleAddDoctor = () => {
    if (!db || !selectedClinicId) {
      toast({ variant: "destructive", title: "ACTION REQUIRED", description: "SELECT A CLINIC FROM THE LIST BELOW FIRST." });
      return;
    }

    if (!doctorName || !doctorSlug) {
      toast({ variant: "destructive", title: "VALIDATION ERROR", description: "DOCTOR NAME AND SLUG REQUIRED." });
      return;
    };

    setIsAddingDoctor(true);
    const docSlugLower = doctorSlug.toLowerCase().trim().replace(/\s+/g, '-');
    const docId = `${selectedClinicId}_${docSlugLower}`;
    const doctorRef = doc(db, 'clinics', selectedClinicId, 'doctors', docId);
    const data = {
      name: doctorName,
      slug: docSlugLower,
      clinicId: selectedClinicId,
      specialization: specialization || 'General Physician',
      avgConsultMinutes: 15,
      createdAt: serverTimestamp()
    };

    // Non-blocking write
    setDoc(doctorRef, data)
      .catch(async (error) => {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: doctorRef.path,
          operation: 'write',
          requestResourceData: data,
        }));
      });

    // Reset UI immediately
    toast({ title: "SUCCESS", description: `DR. ${doctorName} ADDED.` });
    setDoctorName('');
    setDoctorSlug('');
    setSpecialization('');
    setIsAddingDoctor(false);
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-12">
      <header className="border-b-thick border-qc-black pb-4 flex justify-between items-end">
        <div>
          <Link href="/" className="inline-flex items-center gap-2 font-mono text-[10px] uppercase font-bold mb-4 hover:bg-qc-yellow px-2 py-1 transition-colors border-2 border-transparent hover:border-qc-black">
            <ArrowLeft className="w-3 h-3" /> Back to Terminal
          </Link>
          <h1 className="text-4xl font-bold uppercase tracking-tighter">Admin Console</h1>
          <p className="font-mono text-sm uppercase text-qc-gray">Master System Controller</p>
        </div>
        <div className="text-right hidden md:block">
          <p className="font-mono text-[10px] uppercase font-bold">Status: Online</p>
          <p className="font-mono text-[10px] uppercase text-qc-gray">v2.0.26-ALPHA</p>
        </div>
      </header>

      <div className="space-y-8">
        <Card className="border-3 border-qc-black shadow-brutal rounded-none bg-qc-cream">
          <CardHeader className="border-b-3 border-qc-black bg-white">
            <CardTitle className="font-mono text-sm uppercase flex items-center gap-2">
              <Building2 className="w-4 h-4" /> 01. Setup New Clinic
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase font-bold">Clinic Name</label>
                <BrutalistInput 
                  placeholder="e.g. Apollo Jubilee Hills" 
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase font-bold">Clinic Slug (URL)</label>
                <BrutalistInput 
                  placeholder="e.g. apollo-jh" 
                  value={clinicSlug}
                  onChange={(e) => setClinicSlug(e.target.value)}
                />
              </div>
            </div>
            <BrutalistButton 
              variant="yellow" 
              className="w-full h-12" 
              onClick={handleCreateClinic}
              disabled={isCreatingClinic}
            >
              {isCreatingClinic ? "CREATING..." : "CREATE CLINIC"}
            </BrutalistButton>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <label className="font-mono text-[10px] font-bold uppercase tracking-widest block">Select Clinic to Manage</label>
          <div className="flex flex-wrap gap-2">
            {clinicsLoading ? (
              <div className="font-mono text-[10px] uppercase animate-pulse">Scanning database...</div>
            ) : (
              clinics?.map(c => (
                <button 
                  key={c.id}
                  onClick={() => setSelectedClinicId(c.id)}
                  className={`px-4 py-2 border-3 font-mono text-xs uppercase font-bold transition-all shadow-brutal active:shadow-none active:translate-x-[2px] active:translate-y-[2px] ${selectedClinicId === c.id ? 'bg-qc-black text-qc-yellow border-qc-black' : 'bg-white border-qc-black hover:bg-qc-yellow'}`}
                >
                  {c.name || c.id}
                </button>
              ))
            )}
            {!clinicsLoading && clinics?.length === 0 && <p className="font-mono text-[10px] text-qc-gray uppercase">No clinics found. Create one above.</p>}
          </div>
        </section>

        <Card className={`border-3 border-qc-black shadow-brutal rounded-none bg-qc-cream transition-opacity ${!selectedClinicId ? 'opacity-50 pointer-events-none' : ''}`}>
          <CardHeader className="border-b-3 border-qc-black bg-white">
            <CardTitle className="font-mono text-sm uppercase flex items-center gap-2">
              <UserPlus className="w-4 h-4" /> 02. Add Doctors to {selectedClinicId || '...'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {!selectedClinicId && (
              <div className="bg-qc-red/10 border-2 border-dashed border-qc-red p-4 text-center">
                <p className="font-mono text-xs font-bold text-qc-red uppercase">Please select a clinic from the list above first.</p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase font-bold">Doctor Name</label>
                <BrutalistInput 
                  placeholder="Dr. Anand Mehta" 
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase font-bold">URL Slug</label>
                <BrutalistInput 
                  placeholder="dr-mehta" 
                  value={doctorSlug}
                  onChange={(e) => setDoctorSlug(e.target.value)}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="font-mono text-[10px] uppercase font-bold">Specialization</label>
                <BrutalistInput 
                  placeholder="e.g. Cardiology" 
                  value={specialization}
                  onChange={(e) => setSpecialization(e.target.value)}
                />
              </div>
            </div>
            <BrutalistButton 
              variant="yellow" 
              className="w-full h-12" 
              onClick={handleAddDoctor}
              disabled={isAddingDoctor || !selectedClinicId}
            >
              {isAddingDoctor ? "ADDING..." : "ADD DOCTOR"}
            </BrutalistButton>
          </CardContent>
        </Card>
      </div>

      {selectedClinicId && (
        <div className="bg-qc-black text-qc-yellow p-6 border-3 border-qc-black shadow-brutal-hover transition-all">
          <h3 className="font-mono text-xs uppercase font-bold mb-4">Operational Links for {selectedClinicId}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link 
              href={`/r/${selectedClinicId}/login`} 
              className="bg-qc-yellow text-qc-black p-3 font-mono text-[10px] font-bold uppercase text-center border-2 border-qc-black hover:-translate-y-1 transition-transform flex items-center justify-center gap-2"
            >
              Receptionist Dashboard <ExternalLink className="w-3 h-3" />
            </Link>
            <p className="font-mono text-[9px] uppercase text-qc-gray italic self-center">
              * Setup doctors above before accessing the dashboard.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
