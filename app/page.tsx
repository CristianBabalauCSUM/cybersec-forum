import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import ForumTopicList from "./components/ForumTopicList"
import RecentDiscussions from "./components/RecentDiscussions"
import Sidebar from "./components/Sidebar"
import TopicView from "./components/TopicView"

export default function Home() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3">
        <h1 className="text-3xl font-bold mb-6">Welcome to CyberSecure Forum</h1>
        <Tabs defaultValue="latest" className="mb-6">
          <TabsList>
            <TabsTrigger value="latest">Latest</TabsTrigger>
            <TabsTrigger value="hot">Hot</TabsTrigger>
            <TabsTrigger value="solved">Solved</TabsTrigger>
            <TabsTrigger value="unanswered">Unanswered</TabsTrigger>
            <TabsTrigger value="sql">SQL</TabsTrigger>
          </TabsList>
          <TabsContent value="latest">
            <RecentDiscussions />
          </TabsContent>
          <TabsContent value="hot">
            <RecentDiscussions filter="hot" />
          </TabsContent>
          <TabsContent value="solved">
            <RecentDiscussions filter="solved" />
          </TabsContent>
          <TabsContent value="unanswered">
            <RecentDiscussions filter="unanswered" />
          </TabsContent>
          <TabsContent value="sql">
            <RecentDiscussions filter="sql" />
          </TabsContent>
        </Tabs>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Featured Topic</CardTitle>
            </CardHeader>
            <CardContent>
              <TopicView featured={true} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Forum Categories</CardTitle>
            </CardHeader>
            <CardContent>
              <ForumTopicList />
            </CardContent>
          </Card>
        </div>
      </div>
      <Sidebar />
    </div>
  )
}

