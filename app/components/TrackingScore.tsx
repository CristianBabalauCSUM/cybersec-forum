import React from 'react'
import { Button } from "@/components/ui/button"


export default function TrackingScore() {
  return (
    <div className='max-w-md mx-auto px-4 py-2  font-sans bg-white shadow-md rounded-lg fixed bottom-2 right-2'>
        <h2 className="text-l font-bold mb-4">Tracking Score</h2>
        <p className="text-gray-700 font-normal text-xs ">
            Your tracking score is a measure of how well you are protected against online tracking. 
            A lower score indicates better protection.
        </p>
        <div className="mt-4">
            <p className="text-l font-semibold">Current Score: <span className="text-green-600" id = "humanScoreLabel">85</span></p>
            <p className="text-sm font-normal text-gray-500">Behavioural Score (Cursor/Keyboard): <span className="text-sm text-black-600" id = "coursorScoreLabel">0.12984123</span> /  <span className="text-black-600 text-ellipsis" id = "coursorScoreLabel">0.1249156</span></p>
        </div>
        <Button variant="destructive" className = "justify-center align-middle my-2" size="sm">
            <span> Reset </span>
        </Button>

    </div>
  )
}
