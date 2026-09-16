import { useState } from "react";
import type { BusinessTypeKey } from "../../types";
import { StepConnectSheets } from "./StepConnectSheets";
import { StepBusinessType } from "./StepBusinessType";
import { StepStoreProfile } from "./StepStoreProfile";
import { StepDone } from "./StepDone";

const STEP_LABELS = ["Sheets", "Jenis Usaha", "Profil", "Selesai"];

export function OnboardingPage() {
  const [step, setStep] = useState(0);
  const [businessType, setBusinessType] = useState<BusinessTypeKey>("warung");

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--bg)] px-5 py-10">
      <div className="shape-card w-full max-w-md border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="mb-6 flex items-center justify-center gap-1.5">
          {STEP_LABELS.map((label, i) => (
            <div key={label} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-[var(--brand-500)]" : "bg-[var(--border)]"}`} />
          ))}
        </div>
        {step === 0 && <StepConnectSheets onNext={() => setStep(1)} />}
        {step === 1 && <StepBusinessType value={businessType} onChange={setBusinessType} onNext={() => setStep(2)} />}
        {step === 2 && <StepStoreProfile businessType={businessType} onNext={() => setStep(3)} />}
        {step === 3 && <StepDone businessType={businessType} />}
      </div>
    </div>
  );
}
