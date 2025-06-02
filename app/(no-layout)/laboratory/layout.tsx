// app/layout.tsx
import "@/styles/globals.css"
import { KeystrokeProvider, KeystrokeDebug } from '@/app/components/KeystrokeTrackerProvider';

import type React from "react"
import { DeviceFingerprintProvider } from "@/app/components/DeviceFingerprintProvider";

export const metadata = {
  title: 'Laboratory',
  description: 'Laboratory section'
};

export default function NoLayoutForLaboratory({ children }: { children: React.ReactNode }) {
  return (
    <>
      <DeviceFingerprintProvider>

          {children}


      </DeviceFingerprintProvider>

    </>
  );
}