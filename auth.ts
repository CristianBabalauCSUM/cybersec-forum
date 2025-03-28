import NextAuth from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter";
import bcrypt from "bcrypt"
import { UserRole } from "@prisma/client"
import { prisma } from "@/lib/prisma"

// No need to redefine types since they're already in next-auth.d.ts

export const { handlers, 
  signIn, 
  signOut, 
  auth  } = NextAuth( {
  adapter: PrismaAdapter(prisma),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        // Type guard for credentials
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Find user by email
        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string }
        })

        // Check if user exists and password is correct
        if (user && await bcrypt.compare(
          credentials.password as string, 
          user.passwordHash
        )) {
          return {
            _id: user.id,
            email: user.email,
            username: user.username,
            role: user.role
          }
        }

        return null
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token._id = user._id;
        token.username = user.username
        token.role = user.role
        token.email = user.email
      }
      return token
    },
    async session({ session, token }) {
      if (token) {
        session.user._id = token._id as string;
        session.user.username = token.username
        session.user.role = token.role
        session.user.email = token.email
      }
      return session
    }
  },
  pages: {
    signIn: "/login"
  },
  session: {
    strategy: "jwt",
    maxAge: 60 * 60, // 1 hour
  }
})
