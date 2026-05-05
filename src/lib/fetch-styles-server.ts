import { getDatabase } from '@/lib/mongodb';
import { CampaignSharedStyles, defaultSharedStyles } from '@/lib/shared-styles-types';
import { ObjectId } from 'mongodb';

const COLLECTION_NAME = 'campaignSharedStyles';

/**
 * Server-side function to fetch campaign styles
 * This runs on the server and can be used in Server Components or Server Actions
 * Returns plain objects only (no MongoDB types)
 */
export async function fetchCampaignStylesServer(
  campaignId: string
): Promise<CampaignSharedStyles> {
  try {
    const db = await getDatabase();
    const collection = db.collection(COLLECTION_NAME);
    
    // Convert campaignId string to ObjectId for querying
    const campaignObjectId = new ObjectId(campaignId);
    const styles = await collection.findOne({ campaignId: campaignObjectId });

    if (!styles) {
      // Return default styles if none exist
      return {
        ...defaultSharedStyles,
        campaignId,
      };
    }

    // Ensure all required fields exist with fallbacks
    const stylesWithDefaults: CampaignSharedStyles = {
      ...defaultSharedStyles,
      ...styles,
      _id: styles._id?.toString(),
      campaignId: styles.campaignId || campaignId,
      metrics: styles.metrics || defaultSharedStyles.metrics,
      blocks: styles.blocks || defaultSharedStyles.blocks,
      orientation: styles.orientation || defaultSharedStyles.orientation,
      boxStyle: styles.boxStyle || defaultSharedStyles.boxStyle,
      spacing: styles.spacing || defaultSharedStyles.spacing,
      footer: styles.footer || defaultSharedStyles.footer,
      metricsCaps: styles.metricsCaps || defaultSharedStyles.metricsCaps,
      useFallbackData: styles.useFallbackData || defaultSharedStyles.useFallbackData,
    };

    // Serialize to plain objects using JSON parse/stringify
    // This removes any MongoDB types, Dates, etc.
    return JSON.parse(JSON.stringify(stylesWithDefaults));
  } catch (error) {
    console.error('Error fetching campaign styles server-side:', error);
    // Return defaults on error
    return {
      ...defaultSharedStyles,
      campaignId,
    };
  }
}

