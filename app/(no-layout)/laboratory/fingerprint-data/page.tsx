// app/page.tsx
'use client'

import { useVisitorData } from '@fingerprintjs/fingerprintjs-pro-react'

export default function FingerprintPage() {

  const {
    isLoading,
    error,
    data: visitorData,
    getData
  } = useVisitorData( {extendedResult: true}, { immediate: true } )

  return (
    <main className="p-4">
      <h1 className="text-2xl font-bold mb-4">Fingerprint.js</h1>
      
      {isLoading && <p>Loading visitor data...</p>}
      
      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded mb-4">
          Error: {error.message}
        </div>
      )}
      
      {visitorData && (
        <div className="p-4 bg-gray-100 rounded mb-4">
          <p>Visitor ID: {visitorData.visitorId}</p>
          <p>Confidence Score: {visitorData.confidence.score}</p>
          <pre className="mt-2 text-xs overflow-auto">
            {JSON.stringify(visitorData, null, 2)}
          </pre>
        </div>
      )}
      
      <button 
        onClick={() => getData({ignoreCache: true})}
        className="px-4 py-2 bg-blue-500 text-white rounded"
      >
        Refresh Visitor Data
      </button>
    </main>
  )
}