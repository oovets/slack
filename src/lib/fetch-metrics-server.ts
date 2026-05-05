import { MongoClient, ObjectId } from 'mongodb';
import {
  calculateMetrics,
  calculateAgeGroups,
  calculateAgeGroupsPercentage,
  calculateGenderDistribution,
  calculateRacComparison,
  calculateReach,
  calculateVisibility,
  type AnalyticsRecord
} from '@/lib/calculations';
import { getDatabase } from './mongodb';
import { applyTempDemoMetricsToPayload } from '@/lib/temp-demo-metrics';
import { getCampaignOrientation } from '@/lib/dashboard-orientation';

interface Campaign {
  _id: ObjectId;
  deviceId: string;
  orientation?: string;
  layout?: string;
  screenOrientation?: string;
  settings?: { orientation?: string };
  display?: { orientation?: string };
  displaySettings?: { orientation?: string };
  dashboard?: { orientation?: string };
  startDate?: Date;
  endDate?: Date;
  startTime?: string;
  endTime?: string;
  devices?: Array<{ id: string; calculateUnique: boolean }>;
  mediaBroadcasts?: Array<{ media?: Array<{ code?: string; locationId?: string }> }>;
}

/**
 * Fetches campaign configuration from MongoDB
 */
async function fetchCampaign(campaignId: string): Promise<Campaign | null> {
  try {
    // Validate ObjectId format before querying
    if (!ObjectId.isValid(campaignId)) {
      console.error('Invalid campaignId format:', campaignId);
      return null;
    }

    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    const db = client.db();
    
    const campaign = await db
      .collection('campaigns')
      .findOne({ _id: new ObjectId(campaignId) }) as Campaign | null;

    await client.close();
    return campaign;
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return null;
  }
}

/**
 * Fetches analytics data from tracking database
 */
async function fetchAnalyticsData(deviceId: string): Promise<AnalyticsRecord[]> {
  const client = new MongoClient(process.env.TRACKING_MONGODB_URI!);
  await client.connect();
  const db = client.db('stadium_ai');

  const analyticsRecords = await db
    .collection('analytics')
    .find({ camera_id: deviceId })
    .toArray() as AnalyticsRecord[];

  await client.close();
  return analyticsRecords;
}

/**
 * Server-side function to fetch campaign metrics
 * This runs on the server and can be used in Server Components
 * Returns plain objects only (no MongoDB types)
 */
export async function fetchCampaignMetricsServer(campaignId: string) {
  try {
    // Fetch campaign configuration

    const campaign = await fetchCampaign(campaignId);
    
    if (!campaign) {
      throw new Error('Campaign not found');
    }
    
    let location: { identifier?: string } | null = null;

    const db = await getDatabase();
    try {
      const mediaBroadcast = campaign.mediaBroadcasts?.[0];
      const media = mediaBroadcast?.media?.[0];
      if (media && media.locationId) {
        location = (await db.collection("locations").findOne({
          _id: new ObjectId(media.locationId),
        })) as { identifier?: string } | null;
      } else if (media?.code) {
        const mediaLocations = await db.collection('mediaLocation').find({ 
          mediaCodes: { $in: [media.code] } 
        }).toArray();
        const locationId = mediaLocations[0]?.locationId;
        location = (await db.collection("locations").findOne({
          _id: new ObjectId(locationId),
        })) as { identifier?: string } | null;
      }
    } catch (e) {
      console.error('Error fetching location:', e);
      location = null;
    }

    const devicesToCalculateUnique =
      campaign.devices?.filter((d) => d.calculateUnique).map((d) => d.id) ?? [];

    // Fetch analytics data from tracking database
    const analyticsRecords = await fetchAnalyticsData(
      location?.identifier ?? campaign.deviceId,
    );

    if (!analyticsRecords || analyticsRecords.length === 0) {
      return JSON.parse(
        JSON.stringify(
          applyTempDemoMetricsToPayload({
            metrics: [],
            ageGroups: [],
            ageGroupsPercentage: [],
            genderDistribution: {
              malePercentage: 100,
              femalePercentage: 0,
              maleCount: 0,
              femaleCount: 0,
              totalWithGender: 0,
            },
            racComparison: [],
            reach: [],
            visibility: {
              total_unique_contacts: 0,
              total_humans: 0,
              total_observation_time: 0,
              looked_at_screen: 0,
              looked_left: 0,
              looked_right: 0,
              looked_away: 0,
              avarage_spent_in_zone: 0,
            },
            campaign: {
              _id: campaign._id.toString(),
              deviceId: campaign.deviceId,
              orientation: getCampaignOrientation(campaign),
            },
          }),
        ),
      );
    }

    // Calculate all metrics server-side
    const metrics = calculateMetrics(analyticsRecords, undefined, devicesToCalculateUnique);
    const ageGroups = calculateAgeGroups(analyticsRecords, devicesToCalculateUnique);
    const ageGroupsPercentage = calculateAgeGroupsPercentage(ageGroups);
    const genderDistribution = calculateGenderDistribution(
      analyticsRecords,
      devicesToCalculateUnique,
    );
    const racComparison = calculateRacComparison(analyticsRecords);
    const reach = calculateReach(analyticsRecords);
    const visibility = calculateVisibility(analyticsRecords);

    // Serialize to plain objects using JSON parse/stringify
    // This removes any MongoDB types, Buffers, etc.
    return JSON.parse(
      JSON.stringify(
        applyTempDemoMetricsToPayload({
          metrics,
          ageGroups,
          ageGroupsPercentage,
          genderDistribution,
          racComparison,
          reach,
          visibility,
          campaign: {
            _id: campaign._id.toString(),
            deviceId: campaign.deviceId,
            orientation: getCampaignOrientation(campaign),
          },
        }),
      ),
    );
  } catch (error) {
    console.error('Error calculating metrics server-side:', error);
    throw error;
  }
}

