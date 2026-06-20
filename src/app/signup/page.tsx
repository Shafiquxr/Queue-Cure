
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BrutalistButton } from '@/components/brutalist/Button';
import { BrutalistInput } from '@/components/brutalist/Input';
import { Card, CardContent } from '@/components/ui/card';
import { useFirestore, useAuth } from '@/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { toast } from '@/hooks/use-toast';
import { Building2, Mail, Lock, Globe, ArrowRight, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { firebaseConfig } from '@/firebase/config';

export default function SignupPage() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  
  const [clinicName, setClinicName] = useState('');
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigMissing, setIsConfigMissing] = useState(false);

  useEffect(() => {
    // Check if we are still using mock/placeholder keys
    if (firebaseConfig.apiKey === "mock-api-key" || !firebaseConfig.apiKey) {
      setIsConfigMissing(true);
    } else {
      setIsConfigMissing(false);
    }
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !auth) {
      toast({ variant: "destructive", title: "ERROR", description: "FIREBASE NOT INITIALIZED. CHECK CONFIG." });
      return;
    }

    setIsLoading(true);
    const clinicSlug = slug.toLowerCase().trim().replace(/\s+/g, '-');
    
    try {
      // 1. Check if slug is taken
      const clinicRef = doc(db, 'clinics', clinicSlug);
      const clinicSnap = await getDoc(clinicRef);
      
      if (clinicSnap.exists()) {
        toast({ variant: "destructive", title: "SLUG TAKEN", description: "PLEASE CHOOSE A DIFFERENT URL SLUG." });
        setIsLoading(false);
        return;
      }

      // 2. Create Auth User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 3. Create Clinic Metadata
      const clinicData = {
        name: clinicName,
        slug: clinicSlug,
        ownerEmail: email,
        ownerUid: uid,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        createdAt: serverTimestamp()
      };

      await setDoc(clinicRef, clinicData);

      toast({ title: "SUCCESS", description: "CLINIC REGISTERED. REDIRECTING..." });
      
      // Navigate to admin dashboard
      router.push(`/admin/${clinicSlug}`);
    } catch (error: any) {
      console.error(error);
      let message = "COULD NOT CREATE ACCOUNT.";
      if (error.code === 'auth/email-already-in-use') message = "EMAIL ALREADY REGISTERED.";
      if (error.code === 'auth/weak-password') message = "PASSWORD IS TOO WEAK.";
      
      toast({ 
        variant: "destructive", 
        title: "SIGNUP FAILED", 
        description: message 
      });
      setIsLoading(false);
    }
  };

  if (isConfigMissing) {
    return (
      <div className="min-h-screen bg-qc-yellow flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md bg-white border-thick border-qc-black p-8 shadow-brutal space-y-6">
          <AlertTriangle className="w-16 h-16 text-qc-red mx-auto" />
          <h1 className="text-2xl font-bold uppercase">Configuration Required</h1>
          <p className="font-mono text-sm uppercase text-qc-gray">
            It looks like your Firebase API keys haven't been applied yet.
          </p>
          <div className="text-left space-y-4 font-mono text-[11px] uppercase bg-qc-cream p-4 border-2 border-qc-black">
            <p>1. Ensure you have clicked the "Connect" button in the Studio UI.</p>
            <p>2. Verify that src/firebase/config.ts contains your actual project keys.</p>
            <p>3. Refresh this page to try again.</p>
          </div>
          <BrutalistButton variant="primary" className="w-full" onClick={() => window.location.reload()}>
            REFRESH PAGE
          </BrutalistButton>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-qc-yellow flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-8">
        <header className="text-center space-y-2">
          <Link href="/" className="inline-block text-4xl font-bold uppercase tracking-tighter mb-4">
            Queue Cure <span className="text-qc-white bg-qc-black px-2">'26</span>
          </Link>
          <h1 className="text-2xl font-bold uppercase">Clinic Self-Signup</h1>
          <p className="font-mono text-xs uppercase tracking-widest text-qc-black/60">
            Establish your digital front desk in seconds
          </p>
        </header>

        <Card className="border-thick border-qc-black shadow-brutal rounded-none bg-qc-cream">
          <CardContent className="p-8">
            <form onSubmit={handleSignup} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase font-bold flex items-center gap-2">
                    <Building2 className="w-3 h-3" /> Clinic Name
                  </label>
                  <BrutalistInput 
                    placeholder="e.g. City Life Clinic" 
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase font-bold flex items-center gap-2">
                    <Globe className="w-3 h-3" /> URL Slug
                  </label>
                  <BrutalistInput 
                    placeholder="e.g. city-life" 
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase font-bold flex items-center gap-2">
                    <Mail className="w-3 h-3" /> Admin Email
                  </label>
                  <BrutalistInput 
                    type="email"
                    placeholder="doctor@clinic.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase font-bold flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Admin Password
                  </label>
                  <BrutalistInput 
                    type="password"
                    placeholder="••••••••" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <BrutalistButton 
                variant="primary" 
                className="w-full py-6 text-xl flex items-center justify-center gap-3"
                disabled={isLoading}
              >
                {isLoading ? "CREATING CLINIC..." : (
                  <>START MY CLINIC <ArrowRight className="w-6 h-6" /></>
                )}
              </BrutalistButton>
            </form>
          </CardContent>
        </Card>

        <p className="text-center font-mono text-[10px] uppercase text-qc-black/50">
          Already have a clinic? <Link href="/r/login" className="font-bold underline">Login as Receptionist</Link>
        </p>
      </div>
    </div>
  );
}
