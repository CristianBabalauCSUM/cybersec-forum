import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { MessageSquare, Eye, ArrowBigUp, ArrowBigDown } from "lucide-react"
import Link from "next/link"
import { formatDistance } from "date-fns"
import { PostWithAuthor } from "@/types/prisma"

interface TopicViewProps {
  post: PostWithAuthor;
  featured?: boolean;
}

const TopicView = ({ post, featured = false }: TopicViewProps) => {
  // Function to strip HTML tags from content
  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>/g, '');
  };

  // Get a preview of the content
  const contentPreview = stripHtml(post.content).substring(0, featured ? 180 : 120);
  
  return (
    <div className="space-y-4">
      <div className="flex items-start space-x-4">
        <div className="flex flex-col items-center space-y-2">
          <Button variant="ghost" size="sm">
            <ArrowBigUp className="h-5 w-5" />
          </Button>
          <span className="font-bold">{post.upvotes - post.downvotes}</span>
          <Button variant="ghost" size="sm">
            <ArrowBigDown className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-grow">
          <Link href={`/topics/${post.topic.slug}/${post.id}`}>
            <h3 className="font-bold text-xl mb-2 hover:text-blue-600 transition">{post.title}</h3>
          </Link>
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Avatar className="h-6 w-6 mr-2">
              {post.author.avatar ? (
                <AvatarImage src={post.author.avatar} alt={post.author.username} />
              ) : (
                <AvatarFallback>{post.author.username[0].toUpperCase()}</AvatarFallback>
              )}
            </Avatar>
            <span>{post.author.username}</span>
            <span className="mx-2">•</span>
            <span>{formatDistance(new Date(post.createdAt), new Date(), { addSuffix: true })}</span>
            <span className="mx-2">•</span>
            <MessageSquare className="h-4 w-4 mr-1" />
            <span>{post._count.comments}</span>
            <span className="mx-2">•</span>
            <Eye className="h-4 w-4 mr-1" />
            <span>{post.views}</span>
          </div>
          <p className="text-gray-700 mb-4">
            {contentPreview}
            {post.content.length > (featured ? 180 : 120) ? '...' : ''}
          </p>
        </div>
      </div>
      {featured && (
        <div className="flex justify-end">
          <Link href={`/topics/${post.topic.slug}/${post.id}`}>
            <Button>Read More</Button>
          </Link>
        </div>
      )}
    </div>
  )
}

export default TopicView