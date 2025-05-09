// /app/topics/[slug]/[postId]/page.tsx
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { formatDistance } from "date-fns"
import CommentSection from "@/app/components/CommentSection"
//import CommentSection from "@/components/CommentSection"

interface PostPageProps {
  params: {
    slug: string
    postId: string
  }
}

export default async function PostPage({ params }: PostPageProps) {
  const { slug, postId } = params
  
  console.log("Post ID:", postId)
  console.log("Slug:", slug)
  // Find the post by ID with associated data
  try {
    const post = await prisma.post.findUnique({
      where: {
        id: postId
      },
      include: {
        author: {
          select: {
            id: true,
            username: true, 
            avatar: true,
            bio: true
          }
        },
        topic: true,
        comments: {

         
          include: {
            author: {
              select: {
                username: true,
                avatar: true
              }
            },
            replies: {
              include: {
                author: {
                  select: {
                    username: true,
                    avatar: true
                  }
                }
              },
              orderBy: {
                createdAt: "asc"
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    })
    
    console.log("Post data:", post)
    if (!post) {
      notFound()
    }
    
    // Increment view count (you could move this to a separate API route)
    await prisma.post.update({
      where: { id: postId },
      data: { views: { increment: 1 } }
    })
    
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Breadcrumb navigation */}
        <div className="text-sm mb-6 text-gray-500">
          <Link href="/topics" className="hover:text-blue-600">Topics</Link>
          <span className="mx-2">/</span>
          <Link href={`/topics/${slug}`} className="hover:text-blue-600">{post.topic.name}</Link>
        </div>
        
        {/* Post header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden mr-3">
                {post.author.avatar ? (
                  <img src={post.author.avatar} alt={post.author.username} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-blue-600 text-white">
                    {post.author.username.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <p className="font-medium">{post.author.username}</p>
                <p className="text-sm text-gray-500">
                  Posted {formatDistance(new Date(post.createdAt), new Date(), { addSuffix: true })}
                </p>
              </div>
            </div>
            <div className="text-sm text-gray-500">
              <span>{post.views} views</span>
            </div>
          </div>
        </div>
        
        {/* Post content */}
        <div className="prose max-w-none mb-12">
          {/* For a more complex app, you might want to use a markdown renderer here */}
          <div dangerouslySetInnerHTML={{ __html: post.content.replace(/\n/g, '<br />') }} />
        </div>
        
        {/* Post metadata */}
        <div className="flex items-center space-x-6 mb-8 text-sm">
          <div className="flex items-center space-x-2">
            <button className="flex items-center space-x-1 text-gray-500 hover:text-blue-600" >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
              <span>{post.upvotes}</span>
            </button>
            <button className="flex items-center space-x-1 text-gray-500 hover:text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              <span>{post.downvotes}</span>
            </button>
          </div>
          
        </div>
        
        <div className="border-t pt-8">
          <h2 className="text-xl font-semibold mb-6">Comments ({post.comments.length})</h2>
          
          {/* Use our new CommentSection component */}
          <CommentSection postId={post.id} comments={post.comments} />
        </div>
      </div>
    )
  } catch (error) {
    console.error("Error fetching post:", error)
    notFound()
  }
}