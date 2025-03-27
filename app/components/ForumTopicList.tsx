import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Users } from "lucide-react"

const topics = [
  { id: 1, name: "Network Security", posts: 1234, users: 567, color: "bg-red-500" },
  { id: 2, name: "Malware Analysis", posts: 987, users: 432, color: "bg-blue-500" },
  { id: 3, name: "Cryptography", posts: 756, users: 321, color: "bg-green-500" },
  { id: 4, name: "Web Security", posts: 543, users: 234, color: "bg-yellow-500" },
  { id: 5, name: "Mobile Security", posts: 321, users: 123, color: "bg-purple-500" },
]

const ForumTopicList = () => {
  return (
    <ul className="space-y-4">
      {topics.map((topic) => (
        <li key={topic.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
          <Link href={`/topic/${topic.id}`} className="flex items-center space-x-2">
            <Badge className={`${topic.color} w-3 h-3 rounded-full`} />
            <span className="font-medium">{topic.name}</span>
          </Link>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <div className="flex items-center">
              <MessageSquare className="h-4 w-4 mr-1" />
              <span>{topic.posts} posts</span>
            </div>
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-1" />
              <span>{topic.users} users</span>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}

export default ForumTopicList

