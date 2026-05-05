import { NextRequest, NextResponse } from "next/server";
import { MongoClient, ObjectId } from "mongodb";
import {
  calculateAgeGroups,
  calculateAgeGroupsPercentage,
  calculateGenderDistribution,
  calculateMetrics,
  calculateRacComparison,
  calculateReach,
  calculateVisibility,
} from "@/lib/calculations";
import {
  DEFAULT_FALLBACK_AGE_GROUPS_PERCENTAGE,
  defaultAgeGroupsPercentageIfAllZero,
} from "@/lib/constants";
import { applyTempDemoMetricsToPayload } from "@/lib/temp-demo-metrics";
import { getCampaignOrientation } from "@/lib/dashboard-orientation";

interface Campaign {
  _id: ObjectId;
  name?: string;
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
  useFallbackData?: boolean;
  devices: {
    id: string;
    calculateUnique: boolean;
  }[];
}

/**
 * YYYYMMDD suffixes for `analytics_${day}` collections: each UTC calendar day from
 * campaign start through yesterday. Live data for the current UTC day is read from `analytics`.
 */
function getAnalyticsArchiveDayKeys(
  startDate: Date | undefined,
  now: Date = new Date(),
): string[] {
  if (!startDate) return [];

  const startUtc = Date.UTC(
    startDate.getUTCFullYear(),
    startDate.getUTCMonth(),
    startDate.getUTCDate(),
  );
  const todayUtc = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );

  if (todayUtc < startUtc) return [];

  const keys: string[] = [];
  for (let t = startUtc; t < todayUtc; t += 86_400_000) {
    keys.push(new Date(t).toISOString().slice(0, 10).replace(/-/g, ""));
  }
  return keys;
}

interface AnalyticsRecord {
  _id: ObjectId;
  person_id: string;
  camera_id: string;
  detected_genders?: Record<string, number>;
  detected_ages?: Array<{ age: number; confidence: number }>;
  age?: number | null;
  gender?: string | null;
  tracking: Array<{
    start_timestamp: Date;
    stop_timestamp: Date;
  }>;
  looking_at_camera: Array<{
    start_timestamp: Date;
    stop_timestamp: Date;
  }>;
}

export async function GET(request: NextRequest) {
  let trackingClient: MongoClient | null = null;
  
  try {
    const searchParams = request.nextUrl.searchParams;
    const campaignId = searchParams.get("campaignId");
    const skipFallback = searchParams.get("skipFallback") === "true" || false;


    if (!campaignId) {
      return NextResponse.json(
        { error: "campaignId is required" },
        { status: 400 },
      );
    }

    // Validate ObjectId format
    if (!ObjectId.isValid(campaignId)) {
      return NextResponse.json(
        { error: "Invalid campaignId format" },
        { status: 400 },
      );
    }

    // Fetch campaign from main database
    const mainClient = new MongoClient(process.env.MONGODB_URI!);
    await mainClient.connect();
    const mainDb = mainClient.db();

    const campaign = await mainDb.collection("campaigns").findOne({
      _id: new ObjectId(campaignId),
    }) as Campaign | null;

    const previousData = await mainDb.collection("calculatedMetrics").findOne({ campaignId: new ObjectId(campaignId) });

    if (!campaign) {
      await mainClient.close();
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    const campaignOrientation = getCampaignOrientation(campaign);

    // Fixed: Get location from the first mediaBroadcast's first media's locationId if available
    // (When re-enabled, use location doc `identifier` for deviceId in responses.)

    // If current date is before campaign start date, return zeros
    if (campaign.startDate) {
      const today = new Date().toISOString().slice(0, 10);
      const start = new Date(campaign.startDate).toISOString().slice(0, 10);
      if (today < start) {
        const emptyMetrics = [
          { label: 'Unique Contacts', value: 0, format: 'number', tooltip: 'The total number of unique individuals who looked at the camera. Each person is counted only once.' },
          { label: 'RAC', value: 0, format: 'number', tooltip: 'Realtime Accurate Contacts. The total number of times people looked at the camera.' },
          { label: 'Aggregated audience', value: 0, format: 'number', tooltip: 'The total number of people who were tracked by the camera during the period.' },
          { label: 'View freq. (avr.)', value: 0, format: 'number', tooltip: 'The average number of times each unique person looked at the camera.' },
          { label: 'Visit freq. (avr.)', value: 0, format: 'number', tooltip: 'The average number of times each person was tracked passing by.' },
          { label: 'View Time (avr.)', value: 0, format: 'time', tooltip: 'The average time each observation lasted.' },
          { label: 'View Time (Total)', value: 0, format: 'time', roundTo: 'minutes', tooltip: 'The total combined time people looked at the camera.' },
          { label: 'Share of voice', value: 0, format: 'percentage', tooltip: 'The share of total screen time your campaign had on the location.' }
        ];
        await mainClient.close();
        const demoAgePct = defaultAgeGroupsPercentageIfAllZero(null);
        return NextResponse.json({
          metrics: emptyMetrics,
          ageGroups: {
            ageGroup: {
              '18 - 24': demoAgePct['18 - 24'] ?? 0,
              '25 - 34': demoAgePct['25 - 34'] ?? 0,
              '35 - 44': demoAgePct['35 - 44'] ?? 0,
              '45 - 54': demoAgePct['45 - 54'] ?? 0,
              '55 - 64': demoAgePct['55 - 64'] ?? 0,
              '65+': demoAgePct['65+'] ?? 0,
            },
            totalHumans: 0
          },
          ageGroupsPercentage: demoAgePct,
          genderDistribution: { malePercentage: 100, femalePercentage: 0, maleCount: 0, femaleCount: 0, totalWithGender: 0 },
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
            avarage_spent_in_zone: 0
          },
          campaign: {
            _id: campaign._id.toString(),
            name: campaign.name || 'Unnamed Campaign',
            deviceId: campaign.deviceId,
            orientation: campaignOrientation,
          }
        });
      }
    }

    const devices = campaign.devices;
    // Fetch campaign styles to get caps and fallback flag
    const stylesCollection = mainDb.collection("campaignSharedStyles");
    const styles = await stylesCollection.findOne({ campaignId: campaign._id });
    const caps = styles?.metricsCaps;

    
    // Get useFallbackData from campaign document (primary) or styles (fallback)
    const useFallbackData = !skipFallback && (campaign.useFallbackData || styles?.useFallbackData || false);

    // If useFallbackData is true, return fallback data instead of calculating
    if (useFallbackData) {
      const fallbackData = await mainDb.collection("fallbackCampaignData").findOne({
        campaignId: campaign._id
      });

      await mainClient.close();

      // If no fallback data found, return empty values
      if (!fallbackData) {
        const emptyMetrics = [
          { label: 'Unique Contacts', value: 0, format: 'number', tooltip: 'The total number of unique individuals who looked at the camera. Each person is counted only once.' },
          { label: 'RAC', value: 0, format: 'number', tooltip: 'Realtime Accurate Contacts. The total number of times people looked at the camera.' },
          { label: 'Aggregated audience', value: 0, format: 'number', tooltip: 'The total number of people who were tracked by the camera during the period.' },
          { label: 'View freq. (avr.)', value: 0, format: 'number', tooltip: 'The average number of times each unique person looked at the camera.' },
          { label: 'Visit freq. (avr.)', value: 0, format: 'number', tooltip: 'The average number of times each person was tracked passing by.' },
          { label: 'View Time (avr.)', value: 0, format: 'time', tooltip: 'The average time each observation lasted.' },
          { label: 'View Time (Total)', value: 0, format: 'time', roundTo: 'minutes', tooltip: 'The total combined time people looked at the camera.' },
          { label: 'Share of voice', value: 0, format: 'percentage', tooltip: 'The share of total screen time your campaign had on the location.' }
        ];

        const demoAgePctFallback = defaultAgeGroupsPercentageIfAllZero(null);
        return NextResponse.json({
          metrics: emptyMetrics,
          ageGroups: {
            ageGroup: {
              '18 - 24': demoAgePctFallback['18 - 24'] ?? 0,
              '25 - 34': demoAgePctFallback['25 - 34'] ?? 0,
              '35 - 44': demoAgePctFallback['35 - 44'] ?? 0,
              '45 - 54': demoAgePctFallback['45 - 54'] ?? 0,
              '55 - 64': demoAgePctFallback['55 - 64'] ?? 0,
              '65+': demoAgePctFallback['65+'] ?? 0,
            },
            totalHumans: 0
          },
          ageGroupsPercentage: demoAgePctFallback,
          genderDistribution: { malePercentage: 0, femalePercentage: 0, maleCount: 0, femaleCount: 0, totalWithGender: 0 },
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
            avarage_spent_in_zone: 0
          },
          campaign: {
            _id: campaign._id.toString(),
            name: campaign.name || 'Unnamed Campaign',
            deviceId: campaign.deviceId,
            orientation: campaignOrientation,
          },
          _fallbackMode: true
        });
      }

      // Reconstruct metrics format from fallback essentials
      const fallbackMetrics = [
        {
          label: 'Unique Contacts',
          value: fallbackData.uniqueContacts || 0,
          format: 'number',
          tooltip: 'The total number of unique individuals who looked at the camera. Each person is counted only once.'
        },
        {
          label: 'RAC',
          value: Math.round(fallbackData.uniqueContacts * fallbackData.viewFrequency) || 0, // Not stored in fallback
          format: 'number',
          tooltip: 'Realtime Accurate Contacts. The total number of times people looked at the camera.'
        },
        {
          label: 'Aggregated audience',
          value: fallbackData.totalHumans || 0,
          format: 'number',
          tooltip: 'The total number of people who were tracked by the camera during the period.'
        },
        {
          label: 'View freq. (avr.)',
          value: fallbackData.viewFrequency || 0,
          format: 'number',
          tooltip: 'The average number of times each unique person looked at the camera.'
        },
        {
          label: 'Visit freq. (avr.)',
          value: fallbackData.visitFrequency || 0,
          format: 'number',
          tooltip: 'The average number of times each person was tracked passing by.'
        },
        {
          label: 'View Time (avr.)',
          value: fallbackData.viewTime || 0,
          format: 'time',
          tooltip: 'The average time each observation lasted.'
        },
        {
          label: 'View Time (Total)',
          value: fallbackData.uniqueContacts * fallbackData.viewTime * fallbackData.viewFrequency / 60 || 0,
          format: 'time',
          roundTo: 'minutes',
          tooltip: 'The total combined time people looked at the camera.'
        },
        {
          label: 'Share of voice',
          value: 0,
          format: 'percentage',
          tooltip: 'The share of total screen time your campaign had on the location.'
        }
      ];

      const fallbackAgeGroupsPercentage = defaultAgeGroupsPercentageIfAllZero({
        ...DEFAULT_FALLBACK_AGE_GROUPS_PERCENTAGE,
        ...(fallbackData.ageGroupsPercentage || {}),
      });

      return NextResponse.json({
        metrics: fallbackMetrics,
        ageGroups: {
          ageGroup: {
            "18 - 24": fallbackAgeGroupsPercentage["18 - 24"],
            "25 - 34": fallbackAgeGroupsPercentage["25 - 34"],
            "35 - 44": fallbackAgeGroupsPercentage["35 - 44"],
            "45 - 54": fallbackAgeGroupsPercentage["45 - 54"],
            "55 - 64": fallbackAgeGroupsPercentage["55 - 64"],
            "65+": fallbackAgeGroupsPercentage["65+"],
          },
          totalHumans: fallbackData.totalHumans || 0
        },
        ageGroupsPercentage: fallbackAgeGroupsPercentage,
        genderDistribution: {
          malePercentage: fallbackData.malePercentage || 100,
          femalePercentage: fallbackData.femalePercentage || 0,
          maleCount: Math.round(((fallbackData.malePercentage || 100) / 100) * (fallbackData.uniqueContacts || 0)),
          femaleCount: Math.round(((fallbackData.femalePercentage || 0) / 100) * (fallbackData.uniqueContacts || 0)),
          totalWithGender: fallbackData.uniqueContacts || 0
        },
        racComparison: [],
        reach: [],
        visibility: {
          total_unique_contacts: fallbackData.uniqueContacts || 0,
          total_humans: fallbackData.totalHumans || 0,
          total_observation_time: 0,
          looked_at_screen: 0,
          looked_left: 0,
          looked_right: 0,
          looked_away: 0,
          avarage_spent_in_zone: 0
        },
        campaign: {
          _id: campaign._id.toString(),
          name: campaign.name || 'Unnamed Campaign',
          deviceId: campaign.deviceId,
          orientation: campaignOrientation,
        },
        _fallbackMode: true
      });
    }

    await mainClient.close();

    // Fetch analytics data from tracking database
    trackingClient = new MongoClient(process.env.TRACKING_MONGODB_URI!);
    await trackingClient.connect();
    const trackingDb = trackingClient.db("stadium_ai");

    const previousDays = getAnalyticsArchiveDayKeys(campaign.startDate);
    const analyticsRecords: AnalyticsRecord[] = [];

    for (const day of previousDays) {
      const previousAnalyticsRecords = await trackingDb
        .collection(`analytics_${day}`)
        .find({ camera_id: { $in: devices.map((device) => device.id) } })
        .toArray() as AnalyticsRecord[];

      analyticsRecords.push(...previousAnalyticsRecords);
    }

    const currentAnalyticsRecords = await trackingDb
      .collection("analytics")
      .find({ camera_id: { $in: devices.map((device) => device.id) } })
      .toArray() as AnalyticsRecord[];

    analyticsRecords.push(...currentAnalyticsRecords);

    // If no analytics data, return empty values instead of error
    if (!analyticsRecords || analyticsRecords.length === 0) {
      const emptyMetrics = [
        { label: 'Unique Contacts', value: 0, format: 'number', tooltip: 'The total number of unique individuals who looked at the camera. Each person is counted only once.' },
        { label: 'RAC', value: 0, format: 'number', tooltip: 'Realtime Accurate Contacts. The total number of times people looked at the camera.' },
        { label: 'Aggregated audience', value: 0, format: 'number', tooltip: 'The total number of people who were tracked by the camera during the period.' },
        { label: 'View freq. (avr.)', value: 0, format: 'number', tooltip: 'The average number of times each unique person looked at the camera.' },
        { label: 'Visit freq. (avr.)', value: 0, format: 'number', tooltip: 'The average number of times each person was tracked passing by.' },
        { label: 'View Time (avr.)', value: 0, format: 'time', tooltip: 'The average time each observation lasted.' },
        { label: 'View Time (Total)', value: 0, format: 'time', roundTo: 'minutes', tooltip: 'The total combined time people looked at the camera.' },
        { label: 'Share of voice', value: 0, format: 'percentage', tooltip: 'The share of total screen time your campaign had on the location.' }
      ];

      const demoAgePctNoAnalytics = defaultAgeGroupsPercentageIfAllZero(null);
      return NextResponse.json({
        metrics: emptyMetrics,
        ageGroups: {
          ageGroup: {
            '18 - 24': demoAgePctNoAnalytics['18 - 24'] ?? 0,
            '25 - 34': demoAgePctNoAnalytics['25 - 34'] ?? 0,
            '35 - 44': demoAgePctNoAnalytics['35 - 44'] ?? 0,
            '45 - 54': demoAgePctNoAnalytics['45 - 54'] ?? 0,
            '55 - 64': demoAgePctNoAnalytics['55 - 64'] ?? 0,
            '65+': demoAgePctNoAnalytics['65+'] ?? 0,
          },
          totalHumans: 0
        },
        ageGroupsPercentage: demoAgePctNoAnalytics,
        genderDistribution: { malePercentage: 100, femalePercentage: 0, maleCount: 0, femaleCount: 0, totalWithGender: 0 },
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
          avarage_spent_in_zone: 0
        },
        campaign: {
          _id: campaign._id.toString(),
          name: campaign.name || 'Unnamed Campaign',
          deviceId: campaign.deviceId,
          orientation: campaignOrientation,
        }
      });
    }
    
    const previousViewFrequency = previousData?.metrics.find((m: { label: string; value: number }) => m.label === 'View freq. (avr.)')?.value;

    const devicesToCalculateUnique = devices.filter((device) => device.calculateUnique).map((device) => device.id);

    // Calculate all metrics from analytics data
    const metrics = calculateMetrics(analyticsRecords, caps, devicesToCalculateUnique);

    const ageGroups = calculateAgeGroups(analyticsRecords, devicesToCalculateUnique);
    const ageGroupsPercentage = defaultAgeGroupsPercentageIfAllZero(
      calculateAgeGroupsPercentage(ageGroups),
    );
    const genderDistribution = calculateGenderDistribution(analyticsRecords, devicesToCalculateUnique);

    // if (caps?.totalHumanCap && previousData && previousData.genderDistribution && previousData.genderDistribution.malePercentage && previousData.genderDistribution.femalePercentage) {
    //   if (previousData.genderDistribution.malePercentage > 57 ) {
    //     const newMalePercentage = Math.floor(Math.random() * 3) + 55;
    //     genderDistribution.malePercentage = newMalePercentage;
    //     genderDistribution.femalePercentage = 100 - newMalePercentage;
    //     // Recalculate counts based on new percentages
    //     genderDistribution.maleCount = Math.round((newMalePercentage / 100) * genderDistribution.totalWithGender);
    //     genderDistribution.femaleCount = genderDistribution.totalWithGender - genderDistribution.maleCount;
    //   } else if (previousData.genderDistribution.femalePercentage > 57) {
    //     const newFemalePercentage = Math.floor(Math.random() * 3) + 55;
    //     genderDistribution.femalePercentage = newFemalePercentage;
    //     genderDistribution.malePercentage = 100 - newFemalePercentage;
    //     // Recalculate counts based on new percentages
    //     genderDistribution.femaleCount = Math.round((newFemalePercentage / 100) * genderDistribution.totalWithGender);
    //     genderDistribution.maleCount = genderDistribution.totalWithGender - genderDistribution.femaleCount;
    //   } else {
    //     genderDistribution.malePercentage = previousData.genderDistribution.malePercentage;
    //     genderDistribution.femalePercentage = previousData.genderDistribution.femalePercentage;
    //     // Recalculate counts based on previous percentages
    //     genderDistribution.maleCount = Math.round((genderDistribution.malePercentage / 100) * genderDistribution.totalWithGender);
    //     genderDistribution.femaleCount = genderDistribution.totalWithGender - genderDistribution.maleCount;
    //   }
    // }

    const racComparison = calculateRacComparison(analyticsRecords);
    const reach = calculateReach(analyticsRecords);
    const visibility = calculateVisibility(analyticsRecords);


    const calculatedData = {
      metrics,
      ageGroups,
      ageGroupsPercentage,
      genderDistribution,
      racComparison,
      reach,
      visibility,
      campaign: {
        _id: campaign._id.toString(),
        name: campaign.name || 'Unnamed Campaign',
        deviceId: campaign.deviceId,
        orientation: campaignOrientation,
      },
    };

    // Store calculated metrics in separate collection

    if (!skipFallback) {
      try {
        const mainClient2 = new MongoClient(process.env.MONGODB_URI!);
        await mainClient2.connect();
        const mainDb2 = mainClient2.db();
        
        const calculatedMetricsCollection = mainDb2.collection("calculatedMetrics");
        
        await calculatedMetricsCollection.updateOne({
          campaignId: new ObjectId(campaignId),
        }, {
          $set: {
            ...calculatedData,
            updatedAt: new Date(),
            lastCalculatedAt: new Date(),
            source: 'calculated'
          }
        }, {
          upsert: true
        });

        // Also store/update essentials in fallbackCampaignData collection
        const fallbackCollection = mainDb2.collection("fallbackCampaignData");
        
        // Extract essentials from calculated data
        const essentials = {
          uniqueContacts: metrics.find(m => m.label === 'Unique Contacts')?.value || 0,
          totalHumans: metrics.find(m => m.label === 'Aggregated audience')?.value || 0,
          malePercentage: genderDistribution.malePercentage,
          femalePercentage: genderDistribution.femalePercentage,
          ageGroupsPercentage,
          viewFrequency: metrics.find(m => m.label === 'View freq. (avr.)')?.value.toFixed(2) || 0,
          visitFrequency: metrics.find(m => m.label === 'Visit freq. (avr.)')?.value.toFixed(2) || 0,
          viewTime: metrics.find(m => m.label === 'View Time (avr.)')?.value.toFixed(2) || 0,
          viewTimeTotal: metrics.find(m => m.label === 'View Time (Total)')?.value || 0,
        };

        await fallbackCollection.updateOne(
          { campaignId: new ObjectId(campaignId) },
          {
            $set: {
              ...essentials,
              updatedAt: new Date(),
              lastCalculatedAt: new Date(),
              source: 'calculated'
            },
            $setOnInsert: {
              campaignId: new ObjectId(campaignId),
              createdAt: new Date(),
            }
          },
          { upsert: true }
        );

        await mainClient2.close();
        
        
      } catch (error) {
        console.error('❌ Error storing calculated metrics:', error);
        // Don't fail the request if storage fails
      }
    }
    // Return all calculated data
    return NextResponse.json(applyTempDemoMetricsToPayload(calculatedData));
  } catch (error) {
    console.error("Error calculating metrics:", error);
    return NextResponse.json(
      { error: "Failed to calculate metrics" },
      { status: 500 },
    );
  } finally {
    if (trackingClient) {
      await trackingClient.close();
    }
  }
}

