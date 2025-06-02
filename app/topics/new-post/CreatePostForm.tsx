'use client'

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Send, AlertCircle, Activity } from 'lucide-react'
import { createPost } from "./actions"
import { Session } from "next-auth"
import { useKeystroke } from '@/app/components/KeystrokeTrackerProvider';

import "@/utils/stringExtension"

type Topic = {
  id: string
  name: string
  category: string
}

interface SessionUser {
    _id?: string
    usernamename?: string | null
    email?: string | null
    role?: string | null
  }
  
  interface SessionType {
    user?: SessionUser | null
    expires: string
  }
  
  interface CreatePostFormProps {
    topics: Topic[]
    session: SessionType | null
  }

export default function CreatePostForm({ topics, session }: CreatePostFormProps) {
  const [title, setTitle] = useState("")
  const [topic, setTopic] = useState("")
  const [content, setContent] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  // Refs for input elements
  const titleInputRef = useRef<HTMLInputElement>(null)
  const topicInputRef = useRef<HTMLInputElement>(null)
  const contentTextareaRef = useRef<HTMLTextAreaElement>(null)

  // Get keystroke tracking from provider
  const { 
    attachToInput, 
    getKeystrokeData, 
    getMetrics,
    clearData, 
    serverProbability,
    localAnalysis,
    debugInfo 
  } = useKeystroke();

  // Attach keystroke tracking to all input fields
  useEffect(() => {
    const cleanupFunctions: (() => void)[] = [];

    // Attach to title input
    if (titleInputRef.current) {
      const cleanup = attachToInput(titleInputRef.current);
      cleanupFunctions.push(cleanup);
      console.log('Keystroke tracking attached to title input');
    }

    // Attach to topic input
    if (topicInputRef.current) {
      const cleanup = attachToInput(topicInputRef.current);
      cleanupFunctions.push(cleanup);
      console.log('Keystroke tracking attached to topic input');
    }

    // Attach to content textarea
    if (contentTextareaRef.current) {
      const cleanup = attachToInput(contentTextareaRef.current);
      cleanupFunctions.push(cleanup);
      console.log('Keystroke tracking attached to content textarea');
    }

    // Cleanup function
    return () => {
      cleanupFunctions.forEach(cleanup => cleanup());
      console.log('Keystroke tracking detached from all inputs');
    };
  }, [attachToInput]);

  // Log keystroke analysis data periodically for debugging
  useEffect(() => {
    const interval = setInterval(() => {
      if (debugInfo.totalKeys > 0) {
        console.log('=== FORM KEYSTROKE ANALYSIS ===');
        console.log('Total Keys:', debugInfo.totalKeys);
        console.log('Local Bot Score:', localAnalysis.botScore + '%');
        console.log('Server Bot Score:', Math.round(serverProbability * 100) + '%');
        console.log('Debug Info:', debugInfo);
        console.log('Metrics:', getMetrics());
        console.log('==============================');
      }
    }, 10000); // Log every 10 seconds

    return () => clearInterval(interval);
  }, [debugInfo, localAnalysis, serverProbability, getMetrics]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess(false)

    // Basic validation
    if (!title.trim()) {
      setError("Please enter a title for your post")
      return
    }

    if (!topic) {
      setError("Please select a topic for your post")
      return
    }

    if (!content.trim()) {
      setError("Please enter content for your post")
      return
    }


    // Submit form
    setIsSubmitting(true)

    try {
      const result = await createPost({
        title,
        topic,
        content,
        userId: session?.user?._id,

      })
      
      if (result.error) {
        setError(result.error)
      } else {
        setSuccess(true)
        // Reset form and clear keystroke data
        setTitle("")
        setTopic("")
        setContent("")
        clearData() // Clear keystroke tracking data
        console.log('Form submitted successfully, keystroke data cleared');
      }
    } catch (err) {
      setError("An error occurred while creating your post. Please try again.")
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get the current bot probability for display
  const getCurrentBotScore = () => {
    if (serverProbability > 0) return Math.round(serverProbability * 100);
    if (localAnalysis.botScore > 0) return localAnalysis.botScore;
    return 0;
  };

  const currentBotScore = getCurrentBotScore();

  return (
    <>
      {/* Keystroke Analysis Display */}

      {/* Error message */}
      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success message */}
      {success && (
        <Alert className="bg-green-50 text-green-800 border-green-200 mb-4">
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>Your post has been created successfully.</AlertDescription>
        </Alert>
      )}
      
      {/* Post creation form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Post Details</span>
            {debugInfo.totalKeys > 0 && (
              <div className="text-sm font-normal text-gray-500">
                {debugInfo.totalKeys} keystrokes tracked
              </div>
            )}
          </CardTitle>
          <CardDescription>
            Fill out the form below to create your post. Your typing patterns are being analyzed for security.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            {/* Title field */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Post Title
              </label>
              <Input
                id="title"
                ref={titleInputRef}
                placeholder="Enter a descriptive title for your post"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            {/* Topic selection */}
            <div className="space-y-2">
              <label htmlFor="topic" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Topic 
              </label>
              <Input
                id="topic"
                ref={topicInputRef}
                placeholder="Enter a topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
              />
            </div>

            {/* Content field */}
            <div className="space-y-2">
              <label htmlFor="content" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Post Content
              </label>
              <Textarea
                id="content"
                ref={contentTextareaRef}
                placeholder="Write your post content here..."
                className="min-h-[200px]"
                value={content}
                onChange={(e) => setContent(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Use clear and concise language. Include code snippets, links, and other relevant information.
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">

            <div className="flex space-x-2">

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Posting...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Post
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </form>
      </Card>
    </>
  )
}