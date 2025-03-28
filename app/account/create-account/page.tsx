import React from 'react'
import { redirect } from "next/navigation"
import { auth, signIn } from "@/auth"
import { PrismaClient } from "@prisma/client"
import bcrypt from "bcrypt"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card"
import Link from "next/link"
import SignUpForm from './SignUpForm'
import {prisma} from "@/lib/prisma";
import { error } from 'console'
import { Alert, AlertDescription } from "@/components/ui/alert"


export default function OpenAccountPage() {
    
    async function registerAction(formData: FormData) {
        "use server"
        const email = formData.get("email") as string
        const password = formData.get("password") as string
        const username = email.split("@")[0]
    
        try {
          // Check if user already exists
          const existingUser = await prisma.user.findUnique({
            where: { email }
          })
    
          if (existingUser) {
            return { error: "User with this email already exists" }
          }
    
          // Hash password
          const passwordHash = await bcrypt.hash(password, 10)
    
          // Create new user
          await prisma.user.create({
            data: {
              email,
              username,
              passwordHash,
              role: "MEMBER"
            }
          })
    
          // Automatically sign in after registration
          const result  = await signIn("credentials", {
            redirect: false,
            email,
            password
          })
    
          if (result?.error) {
            return { error: "Login after registration failed" }
          }
      
          // Use Next.js redirect
          return { success: true }
        } catch (error) {
          console.error("Registration error:", error)
          return { error: "Registration failed" }
        }
      }

    return (
        <div className="flex justify-center items-center min-h-screen">
        <Card className="w-full max-w-md">

            <CardHeader>
            <CardTitle>Login to CyberSecure Forum</CardTitle>
            </CardHeader>

            <SignUpForm authenticate={registerAction} />
            <div className="text-sm text-center">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-blue-500 hover:underline mb-3">
              Log in
            </Link>
          </div>
        </Card>
        </div>
    )
}
