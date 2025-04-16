// app/login/page.tsx
import { redirect } from "next/navigation"
import { auth, signIn } from "@/auth"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import Link from "next/link"
import SignInForm from './SignInForm'
import { AuthError } from "next-auth"

 

export default async function LoginPage() {
  const session = await auth();

  async function loginAction(formData: FormData) {
    "use server";
    try {
      const email = formData.get("email") as string
      const password = formData.get("password") as string
  
      // Validate input
      if (!email || !password) {
        return { 
          error: "Email and password are required" 
        }
      }
  
      // Attempt to sign in
      const result = await signIn("credentials", {
        redirect: false,
        email,
        password
      })
  
      // If successful, redirect
      return { success: true }
    } catch (error) {
      // Handle specific authentication errors
      if (error instanceof AuthError) {
        switch (error.type) {
          case 'CredentialsSignin':
            return { 
              error: "Invalid email or password" 
            }
          default:
            return { 
              error: "An unexpected error occurred" 
            }
        }
      }
  
      // Log unexpected errors
      console.error("Login error:", error)
      return { 
        error: "An unexpected error occurred" 
      }
    }
  }

  if (session) {
    // Redirect to home if already logged in
    redirect("/");
  }

  return (

    <div className="flex justify-center items-center min-h-screen">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to CyberSecure Forum</CardTitle>
        </CardHeader>
        <SignInForm authenticate={loginAction} />

        <CardFooter className="flex flex-col space-y-4">
          <form >
            <input 
              type="hidden" 
              name="email" 
              value="m@example.com" 
            />
            <input 
              type="hidden" 
              name="password" 
              value="password123" 
            />
            <Button 
              type="submit" 
              variant="outline" 
              className="w-full"
            >
              Quick Register
            </Button>
          </form>
          <div className="text-sm text-center">
            Don't have an account?{" "}
            <Link href="/account/create-account" className="text-blue-500 hover:underline">
              Sign up
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}