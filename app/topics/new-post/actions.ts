'use server'

import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

type CreatePostData = {
  title: string
  topic: string
  content: string
  userId: string | undefined
}

export async function createPost(data: CreatePostData) {
  // Verify authentication in the server action as well
  const session = await auth()
  
  if (!session) {
    return { error: "You must be logged in to create a post" }
  }
  
  try {
    // First check if the topic exists
    let topicRecord = await prisma.topic.findFirst({
      where: {
        name: {
          contains: data.topic,
          mode: "insensitive"
        }
      }
    })
    
    // If topic doesn't exist, create it
    if (!topicRecord) {
      topicRecord = await prisma.topic.create({
        data: {
          name: data.topic,
          description: `Discussion about ${data.topic}`,
          slug: data.topic.toLowerCase().replace(/\s+/g, '-'),
        }
      })
    } 
    
    console.log("Topic Form :", {
        title: data.title,
        content: data.content,
        authorId: data.userId,
    })
    // Create the post
    const post = await prisma.post.create({
      data: {
        title: data.title,
        content: data.content,
        author: {
            connect : {id : data.userId}
        },
        topic: {
            connect : {id : topicRecord.id}
        }
      }
    })
    
    // Revalidate the posts page to show the new post
    revalidatePath('/topics')
    revalidatePath(`/topics/${topicRecord.id}`)
    
    return { success: true, postId: post.id }
  } catch (error) {
    console.error("Error creating post:", error)
    return { error: "Failed to create post. Please try again." }
  }
}