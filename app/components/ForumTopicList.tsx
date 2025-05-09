import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Users } from "lucide-react"
import { TopicWithPostCounts } from "@/types/prisma"

// Array of colors for topic badges
const colors = [
  "bg-red-500",
  "bg-blue-500",
  "bg-green-500",
  "bg-yellow-500",
  "bg-purple-500",
  "bg-pink-500",
  "bg-indigo-500",
  "bg-teal-500"
];

interface ForumTopicListProps {
  topics: TopicWithPostCounts[];
}

const ForumTopicList = ({ topics }: ForumTopicListProps) => {
  // Function to count unique users in a topic
  const countUniqueUsers = (posts: { author: { id: string } }[]) => {
    const uniqueUserIds = new Set(posts.map(post => post.author.id));
    return uniqueUserIds.size;
  };

  return (
    <ul className="space-y-4">
      {topics.map((topic, index) => (
        <li key={topic.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
          <Link href={`/topics/${topic.slug}`} className="flex items-center space-x-2">
            <Badge className={`${colors[index % colors.length]} w-3 h-3 rounded-full`} />
            <span className="font-medium">{topic.name}</span>
          </Link>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-1" />
              <span>{topic._count.posts} posts</span>
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              <span>{countUniqueUsers(topic.posts)} users</span>
            </div>
          </div>
        </li>
      ))}
      {topics.length === 0 && (
        <li className="p-4 text-center text-gray-500">No topics available.</li>
      )}
    </ul>
  )
}

export default ForumTopicList