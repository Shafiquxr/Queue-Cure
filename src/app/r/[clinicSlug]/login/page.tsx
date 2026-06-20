
"use client";

import { useState } from 'react';
import { useParams, useRouter } from "next/navigation";
import { BrutalistButton } from "@/components/brutalist/Button";
import { BrutalistInput } from "@/components/brutalist/Input";
import { useFirestore, useAuth } from "@/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { signInWithEmailAndPassword } from "firebase/auth";
import { toast } from "@/hooks/use-toast";
import { LayoutDashboard, Lock, Mail, ArrowLeft, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function ReceptionistLogin() {
  const { clinicSlug } = useParams();
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db || !auth || !clinicSlug) return;

    setIsLoading(true);
    const emailKey = email.toLowerCase().trim();
    
    try {
      // 1. Verify Allowlist
      const approvedRef = doc(db, 'clinics', clinicSlug as string, 'approved_receptionists', emailKey);
      const approvedSnap = await getDoc(approvedRef);
      
      if (!approvedSnap.exists()) {
        toast({ 
          variant: "destructive", 
          title: "NOT AUTHORIZED", 
          description: "YOUR EMAIL IS NOT ON THE CLINIC'S APPROVED LIST. CONTACT YOUR ADMIN." 
        });
        setIsLoading(false);
        return;
      }

      // 2. Try Login
      try {
        await signInWithEmailAndPassword(auth, emailKey, password);
        router.push(`/r/${clinicSlug}`);
      } catch (authError: any) {
        if (authError.code === 'auth/user-not-found') {
          setNeedsSetup(true);
          toast({ title: "FIRST TIME LOGIN", description: "PLEASE ENTER A NEW PASSWORD TO SECURE YOUR ACCOUNT." });
        } else {
          toast({ variant: "destructive", title: "LOGIN FAILED", description: "INVALID CREDENTIALS." });
        }
      }
    } catch (e: any) {
      toast({ variant: "destructive", title: "ERROR", description: "DATABASE SYNC FAILED." });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-qc-yellow">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 font-mono text-xs uppercase font-bold hover:underline">
        <ArrowLeft className="w-3 h-3" /> Back to Terminal
      </Link>
      
      <div className="w-full max-w-md bg-qc-cream border-thick border-qc-black p-8 shadow-brutal space-y-8">
        <header className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-qc-black text-qc-yellow rounded-full border-thick border-qc-black mb-2">
            <LayoutDashboard className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-bold uppercase tracking-tight">Staff Login</h1>
          <p className="font-mono text-xs uppercase text-qc-gray tracking-widest">
            {clinicSlug} · Receptionist Access
          </p>
        </header>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="font-mono text-[10px] font-bold uppercase flex items-center gap-2">
                <Mail className="w-3 h-3" /> Email Address
              </label>
              <BrutalistInput 
                type="email"
                placeholder="receptionist@clinic.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
              />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[10px] font-bold uppercase flex items-center gap-2">
                <Lock className="w-3 h-3" /> {needsSetup ? "Set New Password" : "Password"}
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
            type="submit" 
            variant="primary" 
            className="w-full text-lg h-14" 
            disabled={isLoading}
          >
            {isLoading ? "AUTHENTICATING..." : (needsSetup ? "CREATE ACCOUNT" : "LOG IN")}
          </BrutalistButton>
        </form>

        <div className="pt-6 border-t-2 border-dashed border-qc-gray">
          <div className="flex gap-3 items-start">
            <ShieldCheck className="w-5 h-5 shrink-0 text-qc-gray" />
            <p className="font-mono text-[8px] uppercase tracking-tighter text-qc-gray leading-tight">
              Access is restricted to pre-approved staff only. Unauthorized attempts are logged. 
              Contact your clinic administrator to be added to the allowlist.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
