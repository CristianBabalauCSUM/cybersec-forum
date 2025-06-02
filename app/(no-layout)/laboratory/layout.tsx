// app/layout.tsx
import "@/styles/globals.css"
import { KeystrokeProvider } from '@/app/components/KeystrokeTrackerProvider';

import type React from "react"

export const metadata = {
  title: 'Laboratory',
  description: 'Laboratory section'
};

export default function NoLayoutForLaboratory({ children }: { children: React.ReactNode }) {
  return (
    <>
      <KeystrokeProvider>
        {children}
      </KeystrokeProvider>
    </>
  );
}