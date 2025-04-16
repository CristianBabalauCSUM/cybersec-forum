import React from 'react'
import { auth, signIn } from "@/auth"


export default async function SettingsPage() {
    const session = await auth()
    return (
        <> 
        {session?.user && 
                    <div>This is the settings page   {session?.user._id} {session?.user.username}</div>
        }
        </>
    )
}
