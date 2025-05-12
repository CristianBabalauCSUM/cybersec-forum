// app/labs/page.tsx
'use client'

import React from 'react'
import Link from 'next/link'

export default function LabsPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      {/* Main Content */}
      <div className="max-w-md w-full text-center space-y-8">
        <h1 className="text-3xl font-bold text-gray-900">Laboratory</h1>
        
        <div className="space-y-4 pt-4">
          {/* Lab 1 Button */}
          <Link 
            href="/laboratory/fingerprint-data" 
            className="w-full block py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition duration-200"
          >
            Fingerprint Data
          </Link>
          
          {/* Lab 2 Button */}
          <Link 
            href="/laboratory/typing-checker" 
            className="w-full block py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition duration-200"
          >
            Keyboard Typing Analysis
          </Link>
          
          {/* Lab 3 Button */}
          <Link 
            href="/laboratory/mouse-checker" 
            className="w-full block py-3 px-4 bg-cyan-600 hover:bg-cyan-700 text-white font-medium rounded-lg transition duration-200"
          >
            Mouse Stroke Checker
          </Link>
        </div>
      </div>
    </div>
  )
}