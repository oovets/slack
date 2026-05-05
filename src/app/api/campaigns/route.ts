import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"
import { auth } from "@/lib/auth"
import { getCampaignOrientation } from "@/lib/dashboard-orientation"

export async function GET() {
  const session = await auth()
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let client: MongoClient | null = null
  try {
    client = new MongoClient(process.env.MONGODB_URI!)
    await client.connect()
    const db = client.db()

    const cursor = db
      .collection("campaigns")
      .find(
        {},
        {
          projection: {
            name: 1,
            orientation: 1,
            layout: 1,
            screenOrientation: 1,
            settings: 1,
            display: 1,
            displaySettings: 1,
            dashboard: 1,
          },
        },
      )
      .sort({ name: 1 })
      .limit(500)

    const docs = await cursor.toArray()

    const campaigns = docs.map((doc) => ({
      id: doc._id.toString(),
      name: typeof doc.name === "string" && doc.name.trim() ? doc.name : "Unnamed campaign",
      orientation: getCampaignOrientation(doc),
    }))

    return NextResponse.json({ campaigns })
  } catch (error) {
    console.error("Error listing campaigns:", error)
    return NextResponse.json(
      { error: "Failed to list campaigns" },
      { status: 500 },
    )
  } finally {
    if (client) {
      await client.close().catch(() => undefined)
    }
  }
}
