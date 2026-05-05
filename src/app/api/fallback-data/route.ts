import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import {
  DEFAULT_FALLBACK_AGE_GROUPS_PERCENTAGE,
  defaultAgeGroupsPercentageIfAllZero,
} from "@/lib/constants";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get("campaignId");

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

    const fallbackData = await db.collection("fallbackCampaignData").findOne({
      campaignId: new ObjectId(campaignId),
    });

    await client.close();

    if (!fallbackData) {
      return NextResponse.json(
        { error: "No fallback data found for this campaign" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      _id: fallbackData._id.toString(),
      campaignId: fallbackData.campaignId.toString(),
      uniqueContacts: fallbackData.uniqueContacts || 0,
      totalHumans: fallbackData.totalHumans || 0,
      malePercentage: fallbackData.malePercentage || 0,
      femalePercentage: fallbackData.femalePercentage || 0,
      ageGroupsPercentage: defaultAgeGroupsPercentageIfAllZero({
        ...DEFAULT_FALLBACK_AGE_GROUPS_PERCENTAGE,
        ...(fallbackData.ageGroupsPercentage || {}),
      }),
      viewFrequency: fallbackData.viewFrequency || 0,
      visitFrequency: fallbackData.visitFrequency || 0,
      viewTime: fallbackData.viewTime || 0,
      viewTimeTotal: fallbackData.viewTimeTotal || 0,
      source: fallbackData.source || 'manual',
      lastCalculatedAt: fallbackData.lastCalculatedAt,
      updatedAt: fallbackData.updatedAt,
      createdAt: fallbackData.createdAt,
    });
  } catch (error) {
    console.error("Error fetching fallback data:", error);
    return NextResponse.json(
      { error: "Failed to fetch fallback data" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      campaignId, 
      uniqueContacts, 
      totalHumans, 
      malePercentage, 
      femalePercentage, 
      ageGroupsPercentage,
      viewFrequency,
      visitFrequency,
      viewTime,
      viewTimeTotal
    } = body;

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

    const result = await db.collection("fallbackCampaignData").updateOne(
      { campaignId: new ObjectId(campaignId) },
      {
        $set: {
          uniqueContacts: uniqueContacts || 0,
          totalHumans: totalHumans || 0,
          malePercentage: malePercentage || 0,
          femalePercentage: femalePercentage || 0,
          ageGroupsPercentage: defaultAgeGroupsPercentageIfAllZero({
            ...DEFAULT_FALLBACK_AGE_GROUPS_PERCENTAGE,
            ...(ageGroupsPercentage || {}),
          }),
          viewFrequency: viewFrequency || 0,
          visitFrequency: visitFrequency || 0,
          viewTime: viewTime || 0,
          viewTimeTotal: viewTimeTotal || 0,
          updatedAt: new Date(),
          source: 'manual'
        },
        $setOnInsert: {
          campaignId: new ObjectId(campaignId),
          createdAt: new Date(),
        }
      },
      { upsert: true }
    );

    await client.close();

    return NextResponse.json({
      success: true,
      message: "Fallback data saved successfully",
      upserted: result.upsertedCount > 0,
      modified: result.modifiedCount > 0
    });
  } catch (error) {
    console.error("Error saving fallback data:", error);
    return NextResponse.json(
      { error: "Failed to save fallback data" },
      { status: 500 }
    );
  }
}
