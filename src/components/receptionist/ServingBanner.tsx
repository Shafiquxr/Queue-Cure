import { TokenRecord } from "@/lib/db/schema";

interface ServingBannerProps {
  token: TokenRecord | null;
}

export function ServingBanner({ token }: ServingBannerProps) {
  return (
    <div className="border-3 border-qc-black p-6 bg-qc-cream space-y-4">
      <h2 className="font-mono text-[10px] font-bold uppercase tracking-widest text-qc-gray">Now Serving</h2>
      <div className="flex flex-col items-center justify-center py-4 bg-qc-yellow border-3 border-qc-black">
        <span className="font-mono text-7xl font-bold leading-none">
          {token ? token.tokenNumber.toString().padStart(3, '0') : "---"}
        </span>
        <span className="font-headline text-lg font-bold mt-2 uppercase">
          {token ? token.patientName : "Queue Empty"}
        </span>
      </div>
      {token && (
        <div className="flex justify-between items-center px-2">
          <span className="font-mono text-[9px] uppercase text-qc-gray">Elapsed Time</span>
          <span className="font-mono text-[11px] font-bold">8 min</span>
        </div>
      )}
    </div>
  );
}
