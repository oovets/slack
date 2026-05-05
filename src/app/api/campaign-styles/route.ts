import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/mongodb';
import { defaultSharedStyles } from '@/lib/shared-styles-types';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'campaignSharedStyles';

/**
 * GET /api/campaign-styles?campaignId=xxx
 * Fetch campaign styles by campaign ID
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get('campaignId');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'campaignId is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    const styles = await collection.findOne({ campaignId: new ObjectId(campaignId) });

    if (!styles) {
      // Return default styles if none exist
      return NextResponse.json({
        ...defaultSharedStyles,
        campaignId,
      });
    }

    // Ensure all required fields exist with fallbacks
    const stylesWithDefaults = {
      ...defaultSharedStyles,
      ...styles,
      _id: styles._id?.toString(),
      campaignId: styles.campaignId || campaignId,
      metrics: styles.metrics || defaultSharedStyles.metrics,
      blocks: styles.blocks || defaultSharedStyles.blocks,
      orientation: styles.orientation || defaultSharedStyles.orientation,
      boxStyle: styles.boxStyle || defaultSharedStyles.boxStyle,
      spacing: styles.spacing || defaultSharedStyles.spacing,
    };

    return NextResponse.json(stylesWithDefaults);
  } catch (error) {
    console.error('Error fetching campaign styles:', error);
    return NextResponse.json(
      { error: 'Failed to fetch campaign styles' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/campaign-styles
 * Create or update campaign styles (upsert)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Partial<Record<string, unknown>>;

    if (!body.campaignId) {
      return NextResponse.json(
        { error: 'campaignId is required' },
        { status: 400 }
      );
    }

    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    const now = new Date();
    const campaignObjectId = new ObjectId(body.campaignId as string);

    // Remove _id, createdAt, updatedAt from body (managed by database)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _id, createdAt, updatedAt, ...updateData } = body as Record<string, unknown>;

    // Use updateOne with upsert to create or update in one atomic operation
    const result = await collection.updateOne(
      { campaignId: campaignObjectId },
      {
        $set: {
          ...updateData,
          campaignId: campaignObjectId,
          updatedAt: now,
        },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true }
    );

    // Fetch and return the updated/created styles
    const savedStyles = await collection.findOne({ 
      campaignId: campaignObjectId 
    });

    if (!savedStyles) {
      return NextResponse.json(
        { error: 'Failed to save campaign styles' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ...savedStyles,
      _id: savedStyles._id.toString(),
      message: result.upsertedCount > 0 ? 'Created' : 'Updated',
    });
  } catch (error) {
    console.error('Error saving campaign styles:', error);
    return NextResponse.json(
      { error: 'Failed to save campaign styles' },
      { status: 500 }
    );
  }
}

