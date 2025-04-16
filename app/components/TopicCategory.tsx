import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MessageSquare, Clock, FileText } from "lucide-react"
import Link from "next/link"

interface Topic {
  id: number
  name: string
  threads: number
  posts: number
  lastPost: string
}

interface Category {
  id: number
  name: string
  description: string
  topics: Topic[]
}

interface TopicCategoryProps {
  category: Category
}

const TopicCategory = ({ category }: TopicCategoryProps) => {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{category.name}</CardTitle>
        <CardDescription>{category.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="divide-y">
          {category.topics.map((topic) => (
            <div key={topic.id} className="py-4 first:pt-0 last:pb-0">
              <div className="flex items-center justify-between">
                <Link href={`/topic/${topic.id}`} className="flex items-center space-x-2 hover:underline">
                  <Badge className="bg-gray-800 w-2 h-2 rounded-full" />
                  <span className="font-medium text-lg">{topic.name}</span>
                </Link>
                <div className="flex items-center space-x-6 text-sm text-gray-500">
                  <div className="flex items-center">
                    <FileText className="h-4 w-4 mr-1" />
                    <span>{topic.threads} threads</span>
                  </div>
                  <div className="flex items-center">
                    <MessageSquare className="h-4 w-4 mr-1" />
                    <span>{topic.posts} posts</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    <span>Last post: {topic.lastPost}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

export default TopicCategory
