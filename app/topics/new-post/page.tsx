import { auth } from "@/auth"
import CreatePostForm from "./CreatePostForm"
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink } from "@/components/ui/breadcrumb"
import { Home } from 'lucide-react'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'

export default async function CreatePostPage() {
  const session = await auth()
  


  // Sample topics array to pass to the form component
  const topics = [
    { id: "101", name: "Security News", category: "General Security" },
    { id: "102", name: "Security Tools", category: "General Security" },
    { id: "103", name: "Security Careers", category: "General Security" },
    { id: "201", name: "Firewalls & IDS/IPS", category: "Network Security" },
    { id: "202", name: "VPNs & Secure Tunneling", category: "Network Security" },
    { id: "203", name: "Network Monitoring", category: "Network Security" },
    { id: "204", name: "Wireless Security", category: "Network Security" },
    { id: "301", name: "Web Application Security", category: "Application Security" },
    { id: "302", name: "Mobile App Security", category: "Application Security" },
    { id: "303", name: "Secure Coding Practices", category: "Application Security" },
    { id: "401", name: "Malware Analysis", category: "Threat Intelligence" },
    { id: "402", name: "Vulnerability Disclosures", category: "Threat Intelligence" },
    { id: "403", name: "Threat Actors & Campaigns", category: "Threat Intelligence" },
    { id: "404", name: "Incident Response", category: "Threat Intelligence" },
    { id: "501", name: "Encryption Algorithms", category: "Cryptography" },
    { id: "502", name: "PKI & Certificates", category: "Cryptography" },
    { id: "503", name: "Cryptographic Protocols", category: "Cryptography" },
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
          <BreadcrumbLink href="/topics">Topics</BreadcrumbLink>
        </BreadcrumbItem>
        <BreadcrumbItem>
          <BreadcrumbLink href="/topics/new-post">
            Create Post
          </BreadcrumbLink>
        </BreadcrumbItem>
      </Breadcrumb>

      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold">Create New Post</h1>
        <p className="text-muted-foreground mt-2">
          Share your knowledge, ask questions, or start a discussion with the cybersecurity community
        </p>
      </div>

        <CreatePostFormWrapper 
          topics={topics} 
          session={session} 
        />
    </div>
  )
}

function CreatePostFormWrapper({ topics, session } : { topics: any[], session: any }) {
  if (!session) {
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
        <p>You must be logged in to create a post.</p>
        <a href="/auth/login" className="text-blue-600 hover:underline">Sign in</a>
      </div>
    )
  }
  
  return <CreatePostForm topics={topics} session={session} />
}