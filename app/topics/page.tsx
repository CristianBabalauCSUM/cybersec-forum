import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Home, Filter, ArrowUpDown, PlusCircle, Clock, Flame, Plus } from 'lucide-react'
import TopicCategory from "../components/TopicCategory"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { formatDistance } from "date-fns"

export default async function TopicsPage() {
  // Fetch the 4 most recent topics
  const recentTopics = await prisma.topic.findMany({
    orderBy: {
      createdAt: "desc"
    },
    take: 4,
    include: {
      posts: {
        select: {
          id: true,
          createdAt: true
        }
      },
      _count: {
        select: { posts: true }
      }
    }
  });

  // Fetch some "popular" topics (can be random or based on post count for now)
  const popularTopics = await prisma.topic.findMany({
    orderBy: {
      posts: {
        _count: "desc"
      }
    },
    take: 4,
    include: {
      posts: {
        select: {
          id: true,
          createdAt: true
        }
      },
      _count: {
        select: { posts: true }
      }
    }
  });
  
  // Format the recent topics for display
  const formattedRecentTopics = recentTopics.map(topic => {
    const lastPost = topic.posts.length > 0 
      ? formatDistance(new Date(Math.max(...topic.posts.map(p => new Date(p.createdAt).getTime()))), new Date(), { addSuffix: true })
      : "No posts yet";
    
    return {
      id: topic.id,
      name: topic.name,
      slug: topic.slug || topic.id,
      threads: topic._count.posts,
      posts: topic.posts.length,
      lastPost
    };
  });

  // Format the popular topics for display
  const formattedPopularTopics = popularTopics.map(topic => {
    const lastPost = topic.posts.length > 0 
      ? formatDistance(new Date(Math.max(...topic.posts.map(p => new Date(p.createdAt).getTime()))), new Date(), { addSuffix: true })
      : "No posts yet";
    
    return {
      id: topic.id,
      name: topic.name,
      slug: topic.slug || topic.id,
      threads: topic._count.posts,
      posts: topic.posts.length,
      lastPost
    };
  });

  // Sample data for our categories and topics (keeping this for the "All Topics" tab)
  const categories = [
    {
      id: 1,
      name: "General Security",
      description: "General discussions about cybersecurity topics",
      topics: [
        { id: 101, name: "Security News", threads: 342, posts: 1567, lastPost: "2 hours ago" },
        { id: 102, name: "Security Tools", threads: 256, posts: 982, lastPost: "5 hours ago" },
        { id: 103, name: "Security Careers", threads: 189, posts: 734, lastPost: "1 day ago" },
      ],
    },
    {
      id: 2,
      name: "Network Security",
      description: "Discussions about securing networks and infrastructure",
      topics: [
        { id: 201, name: "Firewalls & IDS/IPS", threads: 423, posts: 2134, lastPost: "30 minutes ago" },
        { id: 202, name: "VPNs & Secure Tunneling", threads: 287, posts: 1245, lastPost: "3 hours ago" },
        { id: 203, name: "Network Monitoring", threads: 176, posts: 823, lastPost: "12 hours ago" },
        { id: 204, name: "Wireless Security", threads: 231, posts: 1056, lastPost: "1 day ago" },
      ],
    },
    {
      id: 3,
      name: "Application Security",
      description: "Securing applications and code",
      topics: [
        { id: 301, name: "Web Application Security", threads: 521, posts: 2876, lastPost: "1 hour ago" },
        { id: 302, name: "Mobile App Security", threads: 312, posts: 1432, lastPost: "4 hours ago" },
        { id: 303, name: "Secure Coding Practices", threads: 267, posts: 1189, lastPost: "8 hours ago" },
      ],
    },
    {
      id: 4,
      name: "Threat Intelligence",
      description: "Information about threats, vulnerabilities, and exploits",
      topics: [
        { id: 401, name: "Malware Analysis", threads: 387, posts: 1876, lastPost: "45 minutes ago" },
        { id: 402, name: "Vulnerability Disclosures", threads: 298, posts: 1543, lastPost: "2 hours ago" },
        { id: 403, name: "Threat Actors & Campaigns", threads: 213, posts: 987, lastPost: "6 hours ago" },
        { id: 404, name: "Incident Response", threads: 245, posts: 1123, lastPost: "1 day ago" },
      ],
    },
    {
      id: 5,
      name: "Cryptography",
      description: "Discussions about encryption, hashing, and cryptographic protocols",
      topics: [
        { id: 501, name: "Encryption Algorithms", threads: 187, posts: 876, lastPost: "3 hours ago" },
        { id: 502, name: "PKI & Certificates", threads: 156, posts: 723, lastPost: "7 hours ago" },
        { id: 503, name: "Cryptographic Protocols", threads: 132, posts: 598, lastPost: "2 days ago" },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      {/* Breadcrumb navigation */}
      <Breadcrumb>
        <BreadcrumbItem>
          <BreadcrumbLink href="/">
            <Home className="h-4 w-4 mr-1 inline" />
            Home
          </BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/topics" >
            Topics
          </BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      {/* Page header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Forum Topics</h1>
        <Link href="/topics/new-post">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <PlusCircle className="h-4 w-4 mr-2" />
            Create New Post
          </Button>
        </Link>
      </div>

      {/* Filter and Sort options */}
      <div className="flex space-x-2">
        <Button variant="outline" size="sm">
          <Filter className="h-4 w-4 mr-1" />
          Filter
        </Button>
        <Button variant="outline" size="sm">
          <ArrowUpDown className="h-4 w-4 mr-1" />
          Sort
        </Button>
      </div>

      {/* Tabs for different views */}
      <Tabs defaultValue="all">
        <TabsList>
          <TabsTrigger value="all">All Topics</TabsTrigger>
          <TabsTrigger value="recent">
            <Clock className="h-4 w-4 mr-1 inline" />
            Recent
          </TabsTrigger>
          <TabsTrigger value="popular">
            <Flame className="h-4 w-4 mr-1 inline" />
            Popular
          </TabsTrigger>
          <TabsTrigger value="new">New Topics</TabsTrigger>
        </TabsList>
        
        {/* All Topics Tab */}
        <TabsContent value="all" className="space-y-6 mt-6">
          {categories.map((category) => (
            <TopicCategory key={category.id} category={category} />
          ))}
        </TabsContent>
        
        {/* Recent Topics Tab */}
        <TabsContent value="recent" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2 text-blue-600" />
                Recently Active Topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formattedRecentTopics.length > 0 ? (
                <div className="divide-y">
                  {formattedRecentTopics.map((topic) => (
                    <div key={topic.id} className="py-4 first:pt-0 last:pb-0">
                      <Link href={`/topics/${topic.slug}`} className="block hover:bg-gray-50 rounded-lg p-3 transition">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium text-blue-600">{topic.name}</h3>
                            <p className="text-sm text-gray-500">{topic.threads} threads • {topic.posts} posts</p>
                          </div>
                          <div className="text-sm text-gray-500">
                            Last post: {topic.lastPost}
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">No recent topics found.</p>
              )}
              <div className="mt-4 text-center">
                <Link href="/topics/new-post">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Start a New Discussion
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Popular Topics Tab */}
        <TabsContent value="popular" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Flame className="h-5 w-5 mr-2 text-orange-500" />
                Popular Topics
              </CardTitle>
            </CardHeader>
            <CardContent>
              {formattedPopularTopics.length > 0 ? (
                <div className="divide-y">
                  {formattedPopularTopics.map((topic) => (
                    <div key={topic.id} className="py-4 first:pt-0 last:pb-0">
                      <Link href={`/topics/${topic.slug}`} className="block hover:bg-gray-50 rounded-lg p-3 transition">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium text-blue-600">{topic.name}</h3>
                            <p className="text-sm text-gray-500">{topic.threads} threads • {topic.posts} posts</p>
                          </div>
                          <div className="text-sm text-gray-500">
                            Last post: {topic.lastPost}
                          </div>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center py-4 text-gray-500">No popular topics found.</p>
              )}
              <div className="mt-4 text-center">
                <Link href="/topics/new-post">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Start a New Discussion
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* New Topics Tab */}
        <TabsContent value="new" className="space-y-6 mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Newly Created Topics</CardTitle>
            </CardHeader>
            <CardContent className="pt-6">
              <p>This will show topics that have been recently created but may not have many posts yet.</p>
              <div className="mt-4 text-center">
                <Link href="/topics/new-post">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="h-4 w-4 mr-2" />
                    Create a New Topic
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}