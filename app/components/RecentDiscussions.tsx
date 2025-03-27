import Link from "next/link"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ArrowBigUp, ArrowBigDown, MessageSquare, Eye } from "lucide-react"

const discussions = [
  {
    id: 1,
    title: "Latest zero-day exploit in popular CMS",
    author: "Alice",
    avatar: "/avatars/alice.jpg",
    replies: 23,
    views: 1200,
    votes: 45,
    tags: ["exploit", "cms"],
  },
  {
    id: 2,
    title: "Best practices for secure coding in Python",
    author: "Bob",
    avatar: "/avatars/bob.jpg",
    replies: 15,
    views: 800,
    votes: 32,
    tags: ["python", "best-practices"],
  },
  {
    id: 3,
    title: "New ransomware strain targeting healthcare",
    author: "Charlie",
    avatar: "/avatars/charlie.jpg",
    replies: 37,
    views: 2500,
    votes: 67,
    tags: ["ransomware", "healthcare"],
  },
]

const RecentDiscussions = ({ filter = "latest" }) => {
  return (
    <ul className="space-y-4">
      {discussions.map((discussion) => (
        <li key={discussion.id} className="border rounded-lg p-4 hover:bg-gray-50">
          <div className="flex items-start space-x-4">
            <div className="flex flex-col items-center space-y-2">
              <Button variant="ghost" size="sm">
                <ArrowBigUp className="h-5 w-5" />
              </Button>
              <span className="font-bold">{discussion.votes}</span>
              <Button variant="ghost" size="sm">
                <ArrowBigDown className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-grow">
              <Link href={`/discussion/${discussion.id}`}>
                <h3 className="font-medium text-lg mb-1">{discussion.title}</h3>
              </Link>
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <Avatar className="h-6 w-6 mr-2">
                  <AvatarImage src={discussion.avatar} alt={discussion.author} />
                  <AvatarFallback>{discussion.author[0]}</AvatarFallback>
                </Avatar>
                <span>{discussion.author}</span>
                <span className="mx-2">•</span>
                <MessageSquare className="h-4 w-4 mr-1" />
                <span>{discussion.replies}</span>
                <span className="mx-2">•</span>
                <Eye className="h-4 w-4 mr-1" />
                <span>{discussion.views}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {discussion.tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default RecentDiscussions

