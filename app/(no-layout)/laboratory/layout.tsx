// app/layout.tsx
import { TrustScoreDebug, TrustScoringProvider } from "@/app/components/TrustScoreProvider";
import "@/styles/globals.css"

import type React from "react"

export const metadata = {
  title: 'Laboratory',
  description: 'Laboratory section'
};

export default function NoLayoutForLaboratory({ children }: { children: React.ReactNode }) {
  return (
    <>
    <TrustScoringProvider>
      <TrustScoreDebug/>
      {children}

    </TrustScoringProvider>
    </>
  );
}