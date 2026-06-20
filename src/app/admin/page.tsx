
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

export default function AdminPage() {
  const db = useFirestore();
  const [clinicName, setClinicName] = useState('');
  const [clinicSlug, setClinicSlug] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorSlug, setDoctorSlug] = useState('');
  const [specialization, setSpecialization] = useState('');
  
  const [selectedClinicId, setSelectedClinicId] = useState<string | null>(null);

  // Fetch existing clinics to allow adding doctors to them
  const clinicsQuery = useMemo(() => {
    if (!db) return null;
    return collection(db, 'clinics');
  }, [db]);

  const { data: clinics } = useCollection(clinicsQuery);

  const handleCreateClinic = () => {
    if (!db || !clinicName || !clinicSlug) {
      toast({ variant: "destructive", title: "VALIDATION ERROR", description: "NAME AND SLUG REQUIRED." });
      return;
    }

    const clinicRef = doc(db, 'clinics', clinicSlug);
    const data = {
      name: clinicName,
      slug: clinicSlug,
      createdAt: serverTimestamp()
    };

    setDoc(clinicRef, data)
      .then(() => {
        setSelectedClinicId(clinicSlug);
        setClinicName('');
        setClinicSlug('');
        toast({ title: "SUCCESS", description: `CLINIC ${clinicSlug} INITIALIZED.` });
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: clinicRef.path,
          operation: 'write',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  const handleAddDoctor = () => {
    if (!db || !selectedClinicId || !doctorName || !doctorSlug) {
      toast({ variant: "destructive", title: "VALIDATION ERROR", description: "DOCTOR NAME AND SLUG REQUIRED." });
      return;
    };

    const docId = `${selectedClinicId}_${doctorSlug}`;
    const doctorRef = doc(db, 'clinics', selectedClinicId, 'doctors', docId);
    const data = {
      name: doctorName,
      slug: doctorSlug,
      clinicId: selectedClinicId,
      specialization: specialization || 'General Physician',
      avgConsultMinutes: 15,
      createdAt: serverTimestamp()
    };

    setDoc(doctorRef, data)
      .then(() => {
        toast({ title: "SUCCESS", description: `DR. ${doctorName} ADDED.` });
        setDoctorName('');
        setDoctorSlug('');
        setSpecialization('');
      })
      .catch(async (error) => {
        const permissionError = new FirestorePermissionError({
          path: doctorRef.path,
          operation: 'write',
          requestResourceData: data,
        });
        errorEmitter.emit('permission-error', permissionError);
      });
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-12">
      <header className="border-b-thick border-qc-black pb-4">
        <h1 className="text-4xl font-bold uppercase tracking-tighter">Admin Console</h1>
        <p className="font-mono text-sm uppercase text-qc-gray">Master System Controller</p>
      </header>

      <div className="space-y-8">
        <Card className="border-3 border-qc-black shadow-brutal rounded-none bg-qc-cream">
          <CardHeader className="border-b-3 border-qc-black">
            <CardTitle className="font-mono text-sm uppercase">01. Setup New Clinic</CardTitle>
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
            <BrutalistButton variant="yellow" className="w-full" onClick={handleCreateClinic}>
              Create Clinic
            </BrutalistButton>
          </CardContent>
        </Card>

        <section className="space-y-4">
          <label className="font-mono text-[10px] font-bold uppercase tracking-widest block">Select Clinic to Manage</label>
          <div className="flex flex-wrap gap-2">
            {clinics?.map(c => (
              <button 
                key={c.id}
                onClick={() => setSelectedClinicId(c.id)}
                className={`px-4 py-2 border-3 font-mono text-xs uppercase font-bold transition-all ${selectedClinicId === c.id ? 'bg-qc-black text-qc-yellow border-qc-black' : 'bg-white border-qc-gray hover:border-qc-black'}`}
              >
                {c.name || c.id}
              </button>
            ))}
            {clinics?.length === 0 && <p className="font-mono text-[10px] text-qc-gray uppercase">No clinics found. Create one above.</p>}
          </div>
        </section>

        <Card className={`border-3 border-qc-black shadow-brutal rounded-none bg-qc-cream transition-opacity ${!selectedClinicId ? 'opacity-50 pointer-events-none' : ''}`}>
          <CardHeader className="border-b-3 border-qc-black">
            <CardTitle className="font-mono text-sm uppercase">02. Add Doctors to {selectedClinicId || '...'}</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
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
            <BrutalistButton variant="yellow" className="w-full" onClick={handleAddDoctor}>
              Add Doctor
            </BrutalistButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
