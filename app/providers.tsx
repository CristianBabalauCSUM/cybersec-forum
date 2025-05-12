'use client'

import { FpjsProvider, FingerprintJSPro } from '@fingerprintjs/fingerprintjs-pro-react'
import React from 'react'

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <FpjsProvider
      loadOptions={{
        apiKey: process.env.NEXT_PUBLIC_FPJS_API_KEY || "3AvMsw8A6SThpaO8N8pj",
        endpoint: [
          FingerprintJSPro.defaultEndpoint
        ],
        scriptUrlPattern: [
          FingerprintJSPro.defaultScriptUrlPattern
        ],
        region: "eu" // Change this to your region
      }}
    >
      {children}
    </FpjsProvider>
  )
}