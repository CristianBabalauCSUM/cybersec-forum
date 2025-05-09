import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MessageSquare, Eye, Clock } from "lucide-react"
import Link from "next/link"
import { formatDistance } from "date-fns"
import { prisma } from "@/lib/prisma"

interface RecentDiscussionsProps {
  filter?: "latest" | "hot" | "unanswered"
}

async function getDiscussions(filter: string = "latest") {
  // Define base query with explicit includes
  const baseQuery = {
    include: {
      author: {
        select: {
          id: true,
          username: true,
          avatar: true
        }
      },
      topic: true,
      _count: {
        select: {
          comments: true
        }
      }
    },
    take: 5 // Limit to 5 posts
  };

  // Add filters based on the selected option
  switch (filter) {
    case "hot":
      return await prisma.post.findMany({
        ...baseQuery,
        orderBy: [
          { upvotes: "desc" },
          { views: "desc" }
        ]
      });
    case "unanswered":
      return await prisma.post.findMany({
        ...baseQuery,
        
        orderBy: { createdAt: "desc" }
      });
    case "latest":
    default:
      return await prisma.post.findMany({
        ...baseQuery,
        orderBy: { createdAt: "desc" }
      });
  }
}

export default async function RecentDiscussions({ filter = "latest" }: RecentDiscussionsProps) {
  const discussions = await getDiscussions(filter);

  if (discussions.length === 0) {
    return (
      <p className="text-center text-gray-500 py-4">No discussions found.</p>
    );
  }

  return (
    <div className="space-y-4">
      {discussions.map((post) => (
        <div key={post.id} className="pb-4 border-b last:border-0 last:pb-0">
          <div className="flex items-start space-x-4">
            <Avatar className="h-10 w-10 hidden sm:block">
              {post.author?.avatar ? (
                <AvatarImage src={post.author.avatar} alt={post.author.username} />
              ) : (
                <AvatarFallback>{post.author?.username.charAt(0).toUpperCase()}</AvatarFallback>
              )}
            </Avatar>
            <div className="flex-grow">
              <Link href={`/topics/${post.topic.slug}/${post.id}`}>
                <h3 className="font-bold text-lg mb-1 hover:text-blue-600 transition">{post.title}</h3>
              </Link>
              <div className="flex items-center text-sm text-gray-500 mb-2 flex-wrap">
                <span className="font-medium">{post.author?.username}</span>
                <span className="mx-2">•</span>
                <Link href={`/topics/${post.topic.slug}`} className="text-blue-600 hover:underline">
                  {post.topic.name}
                </Link>
                <span className="mx-2">•</span>
                <Clock className="h-4 w-4 mr-1" />
                <span>{formatDistance(new Date(post.createdAt), new Date(), { addSuffix: true })}</span>
              </div>
              <p className="text-gray-700 mb-3 line-clamp-2">
                {/* Safely strip HTML tags from content */}
                {post.content.replace(/<[^>]*>/g, '').substring(0, 150)}
                {post.content.length > 150 ? '...' : ''}
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    <span>{post._count.comments}</span>
                  </div>
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    <span>{post.views}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}