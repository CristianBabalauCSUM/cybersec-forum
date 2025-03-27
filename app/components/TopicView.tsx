import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MessageSquare, Eye, ArrowBigUp, ArrowBigDown } from "lucide-react"
import Link from "next/link"

const TopicView = ({ featured = false }) => {
  const topic = {
    id: 1,
    title: "Critical vulnerability found in widely-used encryption library",
    author: "SecurityExpert",
    avatar: "/avatars/security-expert.jpg",
    content:
      "A critical vulnerability has been discovered in a widely-used encryption library that could potentially compromise the security of millions of devices. This flaw allows attackers to bypass encryption...",
    replies: 78,
    views: 5600,
    votes: 234,
    tags: ["vulnerability", "encryption", "security-alert"],
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start space-x-4">
        <div className="flex flex-col items-center space-y-2">
          <Button variant="ghost" size="sm">
            <ArrowBigUp className="h-5 w-5" />
          </Button>
          <span className="font-bold">{topic.votes}</span>
          <Button variant="ghost" size="sm">
            <ArrowBigDown className="h-5 w-5" />
          </Button>
        </div>
        <div className="flex-grow">
          <Link href={`/topic/${topic.id}`}>
            <h3 className="font-bold text-xl mb-2">{topic.title}</h3>
          </Link>
          <div className="flex items-center text-sm text-gray-500 mb-2">
            <Avatar className="h-6 w-6 mr-2">
              <AvatarImage src={topic.avatar} alt={topic.author} />
              <AvatarFallback>{topic.author[0]}</AvatarFallback>
            </Avatar>
            <span>{topic.author}</span>
            <span className="mx-2">•</span>
            <MessageSquare className="h-4 w-4 mr-1" />
            <span>{topic.replies}</span>
            <span className="mx-2">•</span>
            <Eye className="h-4 w-4 mr-1" />
            <span>{topic.views}</span>
          </div>
          <p className="text-gray-700 mb-4">{topic.content}</p>
          <div className="flex flex-wrap gap-2">
            {topic.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
        </div>
      </div>
      {featured && (
        <div className="flex justify-end">
          <Button>Read More</Button>
        </div>
      )}
    </div>
  )
}

export default TopicView

