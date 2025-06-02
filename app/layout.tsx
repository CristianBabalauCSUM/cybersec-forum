// app/layout.tsx
import "./globals.css"
import { Inter } from "next/font/google"
import { SessionProvider } from "next-auth/react"
import { auth } from "@/auth"
import Navbar from "./components/Navbar"
import type React from "react"
import { ClientSessionProvider } from "@/components/ClientSessionProvider"
import {
  FpjsProvider,
  FingerprintJSPro
} from '@fingerprintjs/fingerprintjs-pro-react'
import Providers from './providers'
import TrackingScore from "./components/TrackingScore"
import {MouseTrackerProvider, MouseTrackerDebug} from "./components/MouseTrackerProvider"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "CyberSecure Forum",
  description: "A forum dedicated to cybersecurity discussions",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {

  return (

    <html lang="en">
      <body className={inter.className}>
          <Navbar />
          <MouseTrackerProvider>
            <Providers> 
              <main className="container mx-auto px-4 py-8">{children}</main>
              <MouseTrackerDebug />
            </Providers> 
          </MouseTrackerProvider>

          <TrackingScore />
      </body>
    </html>
  )
}