import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { campaignId, useFallbackData } = body;

    if (!campaignId) {
      return NextResponse.json(
        { error: "campaignId is required" },
        { status: 400 }
      );
    }

    if (!ObjectId.isValid(campaignId)) {
      return NextResponse.json(
        { error: "Invalid campaignId format" },
        { status: 400 }
      );
    }

    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db();

    const result = await db.collection("campaigns").updateOne(
      { _id: new ObjectId(campaignId) },
      {
        $set: {
          useFallbackData: useFallbackData || false,
          updatedAt: new Date(),
        }
      }
    );

    await client.close();

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "Campaign not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Campaign fallback flag updated successfully",
      useFallbackData: useFallbackData || false
    });
  } catch (error) {
    console.error("Error updating campaign fallback flag:", error);
    return NextResponse.json(
      { error: "Failed to update campaign fallback flag" },
      { status: 500 }
    );
  }
}
