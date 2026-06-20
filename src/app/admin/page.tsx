
"use client";

import { useState } from 'react';
import { BrutalistButton } from '@/components/brutalist/Button';
import { BrutalistInput } from '@/components/brutalist/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { useFirestore } from '@/firebase';
import { doc, setDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { toast } from '@/hooks/use-toast';

export default function AdminPage() {
  const db = useFirestore();
  const [apiKey, setApiKey] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [clinicSlug, setClinicSlug] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [doctorSlug, setDoctorSlug] = useState('');
  const [specialization, setSpecialization] = useState('');
  
  const [createdClinicId, setCreatedClinicId] = useState<string | null>(null);

  const handleCreateClinic = async () => {
    if (!clinicName || !clinicSlug) return;
    try {
      const clinicRef = doc(db!, 'clinics', clinicSlug);
      await setDoc(clinicRef, {
        name: clinicName,
        slug: clinicSlug,
        createdAt: serverTimestamp()
      });
      setCreatedClinicId(clinicSlug);
      toast({ title: "SUCCESS", description: `CLINIC ${clinicSlug} INITIALIZED.` });
    } catch (e) {
      toast({ variant: "destructive", title: "ERROR", description: "FAILED TO CREATE CLINIC." });
    }
  };

  const handleAddDoctor = async () => {
    if (!createdClinicId || !doctorName || !doctorSlug) return;
    try {
      const docId = `${createdClinicId}_${doctorSlug}`;
      const doctorRef = doc(db!, 'clinics', createdClinicId, 'doctors', docId);
      await setDoc(doctorRef, {
        name: doctorName,
        slug: doctorSlug,
        clinicId: createdClinicId,
        specialization: specialization || 'General Physician',
        avgConsultMinutes: 15,
        createdAt: serverTimestamp()
      });
      toast({ title: "SUCCESS", description: `DR. ${doctorName} ADDED.` });
      setDoctorName('');
      setDoctorSlug('');
    } catch (e) {
      toast({ variant: "destructive", title: "ERROR", description: "FAILED TO ADD DOCTOR." });
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-12">
      <header className="border-b-thick border-qc-black pb-4">
        <h1 className="text-4xl font-bold uppercase tracking-tighter">Admin Console</h1>
        <p className="font-mono text-sm uppercase text-qc-gray">Master System Controller</p>
      </header>

      <div className="space-y-8">
        <section className="space-y-4">
          <label className="font-mono text-[10px] font-bold uppercase tracking-widest block">Admin API Key</label>
          <BrutalistInput 
            type="password" 
            placeholder="ENTER API KEY" 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)}
          />
        </section>

        <Card className="border-3 border-qc-black shadow-brutal rounded-none bg-qc-cream">
          <CardHeader className="border-b-3 border-qc-black">
            <CardTitle className="font-mono text-sm uppercase">01. Setup Clinic</CardTitle>
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
                <label className="font-mono text-[10px] uppercase font-bold">Clinic Slug</label>
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

        <Card className={`border-3 border-qc-black shadow-brutal rounded-none bg-qc-cream transition-opacity ${!createdClinicId ? 'opacity-50 pointer-events-none' : ''}`}>
          <CardHeader className="border-b-3 border-qc-black">
            <CardTitle className="font-mono text-sm uppercase">02. Add Doctors</CardTitle>
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
