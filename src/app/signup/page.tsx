
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BrutalistButton } from '@/components/brutalist/Button';
import { BrutalistInput } from '@/components/brutalist/Input';
import { Card, CardContent } from '@/components/ui/card';
import { useFirestore, useAuth } from '@/firebase';
import { doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { firebaseConfig } from '@/firebase/config';
import { toast } from '@/hooks/use-toast';
import { Building2, Mail, Lock, Globe, ArrowRight, AlertTriangle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function SignupPage() {
  const db = useFirestore();
  const auth = useAuth();
  const router = useRouter();
  
  const [clinicName, setClinicName] = useState('');
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    // Check if the config is still using mock keys or has real project data
    const isMock = !firebaseConfig.apiKey || firebaseConfig.apiKey === 'mock-api-key' || firebaseConfig.projectId === 'mock-project-id';
    setIsConfigured(!isMock);
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConfigured) {
      toast({ 
        variant: "destructive", 
        title: "CONFIGURATION REQUIRED", 
        description: "Please ensure the Firebase Project is connected in the Studio sidebar." 
      });
      return;
    }

    if (!db || !auth) {
      toast({ 
        variant: "destructive", 
        title: "SYSTEM ERROR", 
        description: "Firebase services are not initialized. Refresh the page." 
      });
      return;
    }

    setIsLoading(true);
    const clinicSlug = slug.toLowerCase().trim().replace(/\s+/g, '-');
    
    try {
      // 1. Check if slug exists
      const clinicRef = doc(db, 'clinics', clinicSlug);
      const clinicSnap = await getDoc(clinicRef);
      
      if (clinicSnap.exists()) {
        toast({ variant: "destructive", title: "SLUG TAKEN", description: "CHOOSE A DIFFERENT URL SLUG." });
        setIsLoading(false);
        return;
      }

      // 2. Create User
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = userCredential.user.uid;

      // 3. Save Clinic Data
      const clinicData = {
        name: clinicName,
        slug: clinicSlug,
        ownerEmail: email.toLowerCase().trim(),
        ownerUid: uid,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        createdAt: serverTimestamp()
      };

      await setDoc(clinicRef, clinicData);

      // 4. Auto-approve owner as a receptionist
      const approvedRef = doc(db, 'clinics', clinicSlug, 'approved_receptionists', email.toLowerCase().trim());
      await setDoc(approvedRef, {
        email: email.toLowerCase().trim(),
        clinicId: clinicSlug,
        addedAt: serverTimestamp()
      });

      toast({ title: "SUCCESS", description: "CLINIC INITIALIZED." });
      router.push(`/admin/${clinicSlug}`);
    } catch (error: any) {
      console.error("Signup error:", error);
      let message = "UNEXPECTED ERROR.";
      
      if (error.code === 'auth/operation-not-allowed') {
        message = "Email/Password auth is disabled in Firebase Console.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "This email is already registered.";
      } else if (error.code === 'permission-denied') {
        message = "Database permissions denied. Check Firestore rules.";
      } else {
        message = error.message || message;
      }
      
      toast({ variant: "destructive", title: "SIGNUP FAILED", description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-qc-yellow flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-8">
        <header className="text-center space-y-2">
          <Link href="/" className="inline-block text-4xl font-bold uppercase tracking-tighter mb-4">
            Queue Cure <span className="text-qc-white bg-qc-black px-2">'26</span>
          </Link>
          <h1 className="text-2xl font-bold uppercase">Clinic Registration</h1>
          
          <div className="flex justify-center mt-2">
            {!isConfigured ? (
              <div className="flex items-center gap-2 bg-qc-red text-white px-3 py-1 font-mono text-[10px] uppercase font-bold animate-pulse">
                <AlertTriangle className="w-3 h-3" /> System Not Connected
              </div>
            ) : (
              <div className="flex items-center gap-2 bg-qc-black text-qc-yellow px-3 py-1 font-mono text-[10px] uppercase font-bold">
                <CheckCircle2 className="w-3 h-3" /> System Linked: {firebaseConfig.projectId}
              </div>
            )}
          </div>
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
                    disabled={isLoading}
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
                    disabled={isLoading}
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
                    disabled={isLoading}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase font-bold flex items-center gap-2">
                    <Lock className="w-3 h-3" /> Admin Password
                  </label>
                  <BrutalistInput 
                    type="password"
                    placeholder="MIN 6 CHARACTERS" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <BrutalistButton 
                variant="primary" 
                className="w-full py-6 text-xl flex items-center justify-center gap-3"
                disabled={isLoading}
              >
                {isLoading ? "INITIALIZING..." : (
                  <>REGISTER CLINIC <ArrowRight className="w-6 h-6" /></>
                )}
              </BrutalistButton>
            </form>
          </CardContent>
        </Card>

        <p className="text-center font-mono text-[10px] uppercase text-qc-black/50">
          Already registered? <Link href="/r/login" className="font-bold underline">Staff Login</Link>
        </p>
      </div>
    </div>
  );
}
