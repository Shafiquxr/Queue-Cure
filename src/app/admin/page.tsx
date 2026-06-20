"use client";

import { useState } from 'react';
import { BrutalistButton } from '@/components/brutalist/Button';
import { BrutalistInput } from '@/components/brutalist/Input';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

export default function AdminPage() {
  const [apiKey, setApiKey] = useState('');
  const [step, setStep] = useState(1);

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-12">
      <header className="border-b-thick border-qc-black pb-4">
        <h1 className="text-4xl font-bold uppercase tracking-tighter">Admin Console</h1>
        <p className="font-mono text-sm uppercase text-qc-gray">Master System Controller</p>
      </header>

      <div className="space-y-8">
        {/* Step 0: Auth */}
        <section className="space-y-4">
          <label className="font-mono text-[10px] font-bold uppercase tracking-widest block">Admin API Key</label>
          <BrutalistInput 
            type="password" 
            placeholder="ENTER API KEY" 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)}
          />
        </section>

        {/* Step 1: Clinic */}
        <Card className="border-3 border-qc-black shadow-brutal rounded-none bg-qc-cream">
          <CardHeader className="border-b-3 border-qc-black">
            <CardTitle className="font-mono text-sm uppercase">01. Setup Clinic</CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase font-bold">Clinic Name</label>
                <BrutalistInput placeholder="e.g. Apollo Jubilee Hills" />
              </div>
              <div className="space-y-2">
                <label className="font-mono text-[10px] uppercase font-bold">Clinic Slug</label>
                <BrutalistInput placeholder="e.g. apollo-jh" />
              </div>
            </div>
            <BrutalistButton variant="yellow" className="w-full">Create Clinic</BrutalistButton>
          </CardContent>
        </Card>

        {/* Step 2: Doctors */}
        <Card className="border-3 border-qc-black shadow-brutal rounded-none bg-qc-cream opacity-50 pointer-events-none">
          <CardHeader className="border-b-3 border-qc-black">
            <CardTitle className="font-mono text-sm uppercase">02. Add Doctors</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="font-mono text-xs">Complete Step 1 to add doctors.</p>
          </CardContent>
        </Card>

        {/* Step 3: Receptionist */}
        <Card className="border-3 border-qc-black shadow-brutal rounded-none bg-qc-cream opacity-50 pointer-events-none">
          <CardHeader className="border-b-3 border-qc-black">
            <CardTitle className="font-mono text-sm uppercase">03. Receptionist Login</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <p className="font-mono text-xs">Complete Step 2 to create login.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
