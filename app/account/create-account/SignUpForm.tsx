"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { CardContent } from "@/components/ui/card" // Import CardContent
import { useRouter } from "next/navigation"

interface SignUpFormProps {
  authenticate: (formData: FormData) => Promise<{ error?: string; success?: boolean }>;
}

export default function SignUpForm({ authenticate }: SignUpFormProps) {
  //States that can be used for future improvements (Loading, Error, etc.)
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const router =  useRouter();

  async function onSubmit(formData: FormData) {
    setError(null);
    setIsLoading(true);
    setShowOverlay(true);

    try {
      const result = await authenticate(formData);
      
      if (result?.error) {
        setError(result.error);
        setShowOverlay(false);
      }

      if (result?.success) {
        // Redirect to home page on successful login
        router.push("/");
      }
      
    } catch (error) {
      setError("An unexpected error occurred");
      setShowOverlay(false);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
    <CardContent>
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}  
        <form action={onSubmit}>
        <div className="space-y-4">
            <div className="space-y-2">
            <label
                htmlFor="email"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
                Email
            </label>
            <Input 
                id="email" 
                name="email" 
                type="email" 
                placeholder="m@example.com" 
                required 
            />
            </div>
            <div className="space-y-2">
            <label
                htmlFor="password"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
                Password
            </label>
            <Input 
                id="password" 
                name="password" 
                type="password" 
                required 
            />
            </div>
        </div>
        <div className="mt-4">
            <Button type="submit" className="w-full">Register</Button>
        </div>
        </form>
        </CardContent>

    </>
  );
}

