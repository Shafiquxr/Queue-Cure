"use client";

import { BrutalistButton } from "@/components/brutalist/Button";
import { BrutalistInput } from "@/components/brutalist/Input";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

export default function ReceptionistLogin() {
  const { clinicSlug } = useParams();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock successful login
    setTimeout(() => {
      router.push(`/r/${clinicSlug}`);
    }, 1000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-qc-yellow">
      <div className="w-full max-w-md bg-qc-cream border-thick border-qc-black p-8 shadow-brutal space-y-8">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-bold uppercase tracking-tight">Login</h1>
          <p className="font-mono text-xs uppercase text-qc-gray tracking-widest">
            {clinicSlug} · Receptionist Access
          </p>
        </header>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="font-mono text-[10px] font-bold uppercase">Username</label>
              <BrutalistInput placeholder="RECEPTIONIST@APOLLO-JH" required />
            </div>
            <div className="space-y-1">
              <label className="font-mono text-[10px] font-bold uppercase">Password</label>
              <BrutalistInput type="password" placeholder="••••••••" required />
            </div>
          </div>

          <BrutalistButton 
            type="submit" 
            variant="primary" 
            className="w-full text-lg" 
            disabled={loading}
          >
            {loading ? "AUTHENTICATING..." : "LOG IN"}
          </BrutalistButton>
        </form>

        <footer className="text-center">
          <p className="font-mono text-[9px] uppercase tracking-tighter text-qc-gray">
            Authorized Personnel Only • IP Logged
          </p>
        </footer>
      </div>
    </div>
  );
}
