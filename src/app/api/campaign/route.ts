import { NextRequest, NextResponse } from "next/server"
import { MongoClient, ObjectId } from "mongodb"

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const campaignId = searchParams.get("campaignId")

    if (!campaignId) {
      return NextResponse.json(
        { error: "campaignId is required" },
        { status: 400 }
      )
    }

    if (!ObjectId.isValid(campaignId)) {
      return NextResponse.json(
        { error: "Invalid campaignId format" },
        { status: 400 }
      )
    }

    const client = new MongoClient(process.env.MONGODB_URI!)
    await client.connect()
    const db = client.db()

    const campaign = await db.collection("campaigns").findOne({
      _id: new ObjectId(campaignId),
    })

    await client.close()

    if (!campaign) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      deviceId: campaign.deviceId || null,
    })
  } catch (error) {
    console.error("Error fetching campaign:", error)
    return NextResponse.json(
      { error: "Failed to fetch campaign" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { campaignId, deviceId } = body

    if (!campaignId) {
      return NextResponse.json(
        { error: "campaignId is required" },
        { status: 400 }
      )
    }

    if (!deviceId) {
      return NextResponse.json(
        { error: "deviceId is required" },
        { status: 400 }
      )
    }

    if (!ObjectId.isValid(campaignId)) {
      return NextResponse.json(
        { error: "Invalid campaignId format" },
        { status: 400 }
      )
    }

    const client = new MongoClient(process.env.MONGODB_URI!)
    await client.connect()
    const db = client.db()

    const result = await db.collection("campaigns").updateOne(
      { _id: new ObjectId(campaignId) },
      {
        $set: {
          deviceId: deviceId,
          devices: [
            {
              id: deviceId,
              calculateUnique: true,
            },
          ],
          updatedAt: new Date(),
        },
      }
    )

    await client.close()

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Campaign device updated successfully",
      deviceId: deviceId,
      devices: [
        {
          id: deviceId,
          calculateUnique: true,
        },
      ],
    })
  } catch (error) {
    console.error("Error updating campaign device:", error)
    return NextResponse.json(
      { error: "Failed to update campaign device" },
      { status: 500 }
    )
  }
}
