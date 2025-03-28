// app/components/Navbar.tsx
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Shield, Bell, MessageSquare, User, LogOut, LogIn } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { auth, signOut } from "@/auth"
import Link from "next/link"

export default async function Navbar() {
  const session = await auth()

  return (
    <nav className="bg-gray-800 text-white p-4 sticky top-0 z-10">
      <div className="container mx-auto flex items-center justify-between">
        <Link href="/" className="flex items-center space-x-2">
          <Shield className="h-8 w-8" />
          <span className="text-xl font-bold">CyberSecure Forum</span>
        </Link>
        <div className="flex items-center space-x-4">
          <Input
            type="search"
            placeholder="Search forums..."
            className="w-64 bg-gray-700 text-white placeholder-gray-400 border-gray-600"
          />
          <Link href="/topics" className="hover:text-gray-300">
            Topics
          </Link>
          {session?.user ? (
            <>
              <Button variant="ghost" size="icon">
                <Bell className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="icon">
                <MessageSquare className="h-5 w-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/avatars/user.png" alt="User" />
                      <AvatarFallback>{session.user.username[0]}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{session.user.username}</p>
                      <p className="text-xs leading-none text-muted-foreground">{session.user.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <User className="mr-2 h-4 w-4" />
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem>Settings</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <form 
                    action={async () => {
                      "use server"
                      await signOut()
                    }}
                  >
                    <DropdownMenuItem asChild>
                      <button type="submit" className="w-full text-left">
                        <LogOut className="mr-2 h-4 w-4" />
                        <span>Log out</span>
                      </button>
                    </DropdownMenuItem>
                  </form>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <Link href="/auth/login">
              <Button variant="ghost">
                <LogIn className="mr-2 h-4 w-4" />
                Login
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  )
}