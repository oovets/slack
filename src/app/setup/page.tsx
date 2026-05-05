import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import SetupClient from "./setup-client"

export default async function SetupPage() {
  const session = await auth()
  if (!session?.user) {
    redirect("/login?callbackUrl=/setup")
  }

  return <SetupClient />
}
