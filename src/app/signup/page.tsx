
"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { BrutalistButton } from '@/components/brutalist/Button';
import { BrutalistInput } from '@/components/brutalist/Input';
import { Card, CardContent } from '@/components/ui/card';
import { useFirestore, useAuth } from '@/firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { toast } from '@/hooks/use-toast';
import { Building2, Mail, Lock, Globe, ArrowRight, Info, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
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

  // Connection Check Logic
  const isMissingApiKey = !firebaseConfig.apiKey || firebaseConfig.apiKey === 'mock-api-key';
  const isMissingProjectId = !firebaseConfig.projectId || firebaseConfig.projectId.includes('mock');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isMissingApiKey) {
      toast({ 
        variant: "destructive", 
        title: "CONNECTION REQUIRED", 
        description: "Your API key is missing. Please click 'Connect' in the sidebar to link your Firebase project." 
      });
      return;
    }

    if (!db || !auth) {
      toast({ 
        variant: "destructive", 
        title: "INITIALIZING", 
        description: "Firebase services are warming up. Please wait 3 seconds and try again." 
      });
      return;
    }

    setIsLoading(true);
    const clinicSlug = slug.toLowerCase().trim().replace(/\s+/g, '-');
    
    try {
      // 1. Create User
      const userCredential = await createUserWithEmailAndPassword(auth, email.toLowerCase().trim(), password);
      const uid = userCredential.user.uid;

      // 2. Save Clinic Data
      const clinicRef = doc(db, 'clinics', clinicSlug);
      const clinicData = {
        name: clinicName,
        slug: clinicSlug,
        ownerEmail: email.toLowerCase().trim(),
        ownerUid: uid,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
        createdAt: serverTimestamp()
      };

      await setDoc(clinicRef, clinicData);

      // 3. Auto-approve owner as receptionist
      const approvedRef = doc(db, 'clinics', clinicSlug, 'approved_receptionists', email.toLowerCase().trim());
      await setDoc(approvedRef, {
        email: email.toLowerCase().trim(),
        clinicId: clinicSlug,
        addedAt: serverTimestamp()
      });

      toast({ title: "SUCCESS", description: "CLINIC INITIALIZED. REDIRECTING..." });
      router.push(`/admin/${clinicSlug}`);
    } catch (error: any) {
      console.error("Signup error:", error);
      let message = error.message || "UNEXPECTED ERROR.";
      
      if (error.code === 'auth/operation-not-allowed') {
        message = "Email/Password login is not enabled in your Firebase Console.";
      } else if (error.code === 'auth/email-already-in-use') {
        message = "This email is already registered.";
      } else if (error.code === 'auth/api-key-not-valid') {
        message = "The API key is invalid. Ensure your project is correctly connected in the sidebar.";
      }
      
      toast({ variant: "destructive", title: "REGISTRATION ISSUE", description: message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-qc-yellow flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-xl space-y-8">
        <header className="text-center space-y-2">
          <Link href="/" className="inline-block text-4xl font-bold uppercase tracking-tighter mb-4">
            Queue <span className="text-qc-white bg-qc-black px-2">Cure</span> <span className="text-qc-red">'26</span>
          </Link>
          <h1 className="text-2xl font-bold uppercase">Clinic Registration</h1>
          
          <div className="flex flex-col items-center gap-2">
            {isMissingApiKey ? (
              <div className="bg-qc-red text-white p-3 font-mono text-[10px] uppercase flex items-center gap-2 border-2 border-qc-black animate-pulse">
                <AlertCircle className="w-4 h-4" /> CRITICAL: Connect Firebase in Sidebar to enable registration
              </div>
            ) : (
              <div className="bg-qc-black text-qc-yellow p-2 font-mono text-[10px] uppercase flex items-center gap-2 border-2 border-qc-black">
                <CheckCircle2 className="w-4 h-4" /> SYSTEM LINKED: {firebaseConfig.projectId}
              </div>
            )}
            <p className="font-mono text-[9px] uppercase text-qc-black/60">
              Project ID: {firebaseConfig.projectId}
            </p>
          </div>
        </header>

        <Card className={`border-thick border-qc-black shadow-brutal rounded-none bg-qc-cream transition-opacity ${isMissingApiKey ? 'opacity-50' : ''}`}>
          <CardContent className="p-8">
            <form onSubmit={handleSignup} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase font-bold flex items-center gap-2">
                    <Building2 className="w-3 h-3" /> Clinic Name
                  </label>
                  <BrutalistInput 
                    placeholder="e.g. SR Clinic" 
                    value={clinicName}
                    onChange={(e) => setClinicName(e.target.value)}
                    required
                    disabled={isLoading || isMissingApiKey}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase font-bold flex items-center gap-2">
                    <Globe className="w-3 h-3" /> URL Slug
                  </label>
                  <BrutalistInput 
                    placeholder="e.g. sr-clinic" 
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    required
                    disabled={isLoading || isMissingApiKey}
                  />
                </div>
                <div className="space-y-2">
                  <label className="font-mono text-[10px] uppercase font-bold flex items-center gap-2">
                    <Mail className="w-3 h-3" /> Admin Email
                  </label>
                  <BrutalistInput 
                    type="email"
                    placeholder="admin@clinic.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading || isMissingApiKey}
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
                    disabled={isLoading || isMissingApiKey}
                  />
                </div>
              </div>

              <BrutalistButton 
                variant="primary" 
                className="w-full py-6 text-xl flex items-center justify-center gap-3"
                disabled={isLoading || isMissingApiKey}
              >
                {isLoading ? "SYNCING..." : (
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
