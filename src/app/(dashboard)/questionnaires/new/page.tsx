import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { NewQuestionnaireClient } from "./new-client"

export default async function NewQuestionnairePage() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) return null

  return <NewQuestionnaireClient />
}
