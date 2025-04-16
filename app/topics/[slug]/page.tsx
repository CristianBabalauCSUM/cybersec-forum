// /app/topics/[slug]/page.tsx
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { formatDistance } from "date-fns"

interface TopicPageProps {
  params: {
    slug: string
  }
}

export default async function TopicPage({ params }: TopicPageProps) {
  const { slug } = params
  
  // Find topic by slug (which is the name in our current schema)
  const topic = await prisma.topic.findFirst({
    where: {
      slug: {
        equals: decodeURIComponent(slug),
      }
    }
  })
  
  if (!topic) {
    notFound()
  }
  
  // Get all posts for this topic
  const posts = await prisma.post.findMany({
    where: {
      topicId: topic.id
    },
    include: {
      author: {
        select: {
          username: true,
          avatar: true
        }
      }
    },
    orderBy: {
      createdAt: "desc"
    }
  })
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">{topic.name}</h1>
        <p className="text-gray-600">{topic.description}</p>
      </div>
      
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-xl font-semibold">Posts</h2>
        <Link 
          href="/topics/new-post" 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          New Post
        </Link>
      </div>
      
      {posts.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-gray-500">No posts yet in this topic.</p>
          <p className="mt-2">Be the first to start a discussion!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <div key={post.id} className="border rounded-lg p-4 hover:bg-gray-50">
              <Link href={`/topics/${slug}/${post.id}`} className="block">
                <h3 className="text-lg font-medium text-blue-600">{post.title}</h3>
                <div className="flex items-center mt-2 text-sm text-gray-500">
                  <span>By {post.author.username}</span>
                  <span className="mx-2">•</span>
                  <span>{formatDistance(new Date(post.createdAt), new Date(), { addSuffix: true })}</span>
                  <span className="mx-2">•</span>
                  
                </div>
                <p className="mt-2 text-gray-700 line-clamp-2">{post.content.substring(0, 150)}...</p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}