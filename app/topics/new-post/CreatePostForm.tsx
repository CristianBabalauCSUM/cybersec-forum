'use client'

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Send, AlertCircle } from 'lucide-react'
import { createPost } from "./actions"
import { Session } from "next-auth"
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
        // Optionally reset form
        // setTitle("")
        // setTopic("")
        // setContent("")
      }
    } catch (err) {
      setError("An error occurred while creating your post. Please try again.")
      console.error(err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      {/* Error message */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Success message */}
      {success && (
        <Alert className="bg-green-50 text-green-800 border-green-200">
          <AlertTitle>Success!</AlertTitle>
          <AlertDescription>Your post has been created successfully.</AlertDescription>
        </Alert>
      )}
      
      {/* Post creation form */}
      <Card>
        <CardHeader>
          <CardTitle>Post Details</CardTitle>
          <CardDescription>
            Fill out the form below to create your post
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
          </CardFooter>
        </form>
      </Card>
    </>
  )
}