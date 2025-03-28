import "next-auth"
import { UserRole } from "@prisma/client"

declare module "next-auth" {

  interface User extends DefaultUser {
    _id: string
    username: string
    role: UserRole
    email: string
  }


  interface Session{
    user: {
      _id: string
      username: string
      role: UserRole
      email: string
    } & DefaultSession;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    _id: string
    username: string
    role: UserRole
    email: string
  }
}