import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ForumTopicList from "./components/ForumTopicList"
import RecentDiscussions from "./components/RecentDiscussions"
import Sidebar from "./components/Sidebar"
import TopicView from "./components/TopicView"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"

export default async function Home() {
  // Fetch featured post - get the most upvoted post
  const featuredPost = await prisma.post.findFirst({
    orderBy: {
      upvotes: "desc"
    },
    include: {
      author: {
        select: {
          id: true,
          username: true,
          avatar: true
        }
      },
      topic: true,
      comments: {
        select: {
          id: true
        }
      },
      _count: {
        select: {
          comments: true
        }
      }
    }
  });

  // Fetch latest topics
  const latestTopics = await prisma.topic.findMany({
    take: 5,
    orderBy: {
      createdAt: "desc"
    },
    include: {
      _count: {
        select: {
          posts: true
        }
      },
      posts: {
        select: {
          author: {
            select: {
              id: true
            }
          }
        },
        take: 100 // Limit to calculate unique users
      }
    }
  });

  // Fetch popular topics
  const popularTopics = await prisma.topic.findMany({
    take: 5,
    orderBy: {
      posts: {
        _count: "desc"
      }
    },
    include: {
      _count: {
        select: {
          posts: true
        }
      },
      posts: {
        select: {
          author: {
            select: {
              id: true
            }
          }
        },
        take: 100 // Limit to calculate unique users
      }
    }
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Welcome to CyberSecure Forum</h1>
          <Link href="/topics/new-post">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <PlusCircle className="h-4 w-4 mr-2" />
              New Post
            </Button>
          </Link>
        </div>
        
        {/* Featured Topic Card */}
        {featuredPost && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Featured Topic</CardTitle>
            </CardHeader>
            <CardContent>
              <TopicView post={featuredPost} featured={true} />
            </CardContent>
          </Card>
        )}
        
        {/* Recent Discussions */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Recent Discussions</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentDiscussions filter="latest" />
          </CardContent>
        </Card>
        
        {/* Topic Categories */}
        <Tabs defaultValue="latest" className="mb-6">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="latest" className="flex-1">Latest Topics</TabsTrigger>
            <TabsTrigger value="popular" className="flex-1">Most Popular Topics</TabsTrigger>
          </TabsList>
          
          <TabsContent value="latest">
            <Card>
              <CardHeader>
                <CardTitle>Latest Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <ForumTopicList topics={latestTopics} />
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="popular">
            <Card>
              <CardHeader>
                <CardTitle>Most Popular Topics</CardTitle>
              </CardHeader>
              <CardContent>
                <ForumTopicList topics={popularTopics} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      <Sidebar />
    </div>
  )
}