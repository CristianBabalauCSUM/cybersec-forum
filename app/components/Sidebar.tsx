import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const Sidebar = () => {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quick Links</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li>
              <Link href="/rules" className="text-blue-500 hover:underline">
                Forum Rules
              </Link>
            </li>
            <li>
              <Link href="/faq" className="text-blue-500 hover:underline">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/members" className="text-blue-500 hover:underline">
                Member List
              </Link>
            </li>
            <li>
              <Link href="/staff" className="text-blue-500 hover:underline">
                Staff
              </Link>
            </li>
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2">
            <li>Total Topics: 1,234</li>
            <li>Total Posts: 5,678</li>
            <li>Members: 9,876</li>
            <li>Newest Member: JohnDoe</li>
          </ul>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Online Users</CardTitle>
        </CardHeader>
        <CardContent>
          <p>There are currently 42 users online.</p>
          <Button variant="outline" className="w-full mt-4">
            View All
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

export default Sidebar

