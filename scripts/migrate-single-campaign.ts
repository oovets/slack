/**
 * Migration script for a single campaign
 * Usage: tsx scripts/migrate-single-campaign.ts <campaignId>
 */

import { config } from 'dotenv';
import { MongoClient, ObjectId } from 'mongodb';

// Load environment variables from .env file
config();

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

interface Campaign {
  _id: ObjectId;
  name?: string;
  deviceId: string;
  startDate?: Date;
  endDate?: Date;
  startTime?: string;
  endTime?: string;
}

interface CampaignGeneratedDataRow {
  time: string;
  total_humans: number;
  unique_contacts: number;
  average_frequency: number;
  average_observation_time: number;
  total_observation_time: number;
  rac: number;
  vehicles: number;
  visit_frequency: number;
  male_percentage: number;
  share_of_voice: number;
  duration_seconds: number;
  total_human_ids: string[];
  unique_contacts_ids: string[];
  age_groups: {
    "18 - 24": number;
    "25 - 34": number;
    "35 - 44": number;
    "45 - 54": number;
    "55 - 64": number;
    "65+": number;
  };
  visibility: {
    looked_at_screen_percentage: number;
    looked_left_percentage: number;
    looked_right_percentage: number;
    looked_away_percentage: number;
    avarage_spent_in_zone: number;
  };
}

// Helper function to calculate duration in seconds
function calculateDuration(start: Date, stop: Date): number {
  const duration = (new Date(stop).getTime() - new Date(start).getTime()) / 1000;
  return duration >= 0 ? duration : 0;
}

// Helper function to determine age group
function getAgeGroup(age: number | null | undefined): keyof CampaignGeneratedDataRow['age_groups'] | null {
  if (!age || age < 18) return null;
  if (age >= 18 && age <= 24) return '25 - 34';
  if (age >= 25 && age <= 34) return '25 - 34';
  if (age >= 35 && age <= 44) return '35 - 44';
  if (age >= 45 && age <= 54) return '45 - 54';
  if (age >= 55 && age <= 64) return '55 - 64';
  if (age >= 65) return '65+';
  return null;
}

// Helper function to format timestamp to hour
function formatToHour(date: Date): string {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T${String(d.getHours()).padStart(2, '0')}:00:00+02:00`;
}

// Transform analytics records into hourly grouped data
function transformAnalyticsToHourlyData(analyticsRecords: AnalyticsRecord[]): CampaignGeneratedDataRow[] {
  // Group data by hour
  const hourlyMap = new Map<string, {
    humanIds: Set<string>;
    uniqueContactIds: Set<string>;
    totalObservations: number;
    totalObservationTime: number;
    totalVisits: number;
    totalDwellTime: number;
    maleCount: number;
    femaleCount: number;
    totalWithGender: number;
    ageGroups: {
      "18 - 24": number;
      "25 - 34": number;
      "35 - 44": number;
      "45 - 54": number;
      "55 - 64": number;
      "65+": number;
    };
  }>();

  // Process each analytics record
  analyticsRecords.forEach((record) => {
    // Process looking_at_camera observations
    if (record.looking_at_camera && record.looking_at_camera.length > 0) {
      record.looking_at_camera.forEach((observation) => {
        const hourKey = formatToHour(new Date(observation.start_timestamp));
        
        if (!hourlyMap.has(hourKey)) {
          hourlyMap.set(hourKey, {
            humanIds: new Set(),
            uniqueContactIds: new Set(),
            totalObservations: 0,
            totalObservationTime: 0,
            totalVisits: 0,
            totalDwellTime: 0,
            maleCount: 0,
            femaleCount: 0,
            totalWithGender: 0,
            ageGroups: {
              "18 - 24": 0,
              "25 - 34": 0,
              "35 - 44": 0,
              "45 - 54": 0,
              "55 - 64": 0,
              "65+": 0
            }
          });
        }

        const hourData = hourlyMap.get(hourKey)!;
        
        // Add to unique contacts
        hourData.uniqueContactIds.add(record.person_id);
        
        // Count observations
        hourData.totalObservations++;
        
        // Calculate observation time
        let duration = calculateDuration(
          observation.start_timestamp,
          observation.stop_timestamp
        );
        
        // Cap duration at 8 seconds, randomize if exceeded
        if (duration > 8) {
          duration = Number((Math.random() * (8 - 4) + 4).toFixed(2));
        }
        
        hourData.totalObservationTime += duration;
      });
    }

    // Process tracking (visits) - use first tracking timestamp for hour grouping
    if (record.tracking && record.tracking.length > 0) {
      const hourKey = formatToHour(new Date(record.tracking[0].start_timestamp));
      
      if (!hourlyMap.has(hourKey)) {
        hourlyMap.set(hourKey, {
          humanIds: new Set(),
          uniqueContactIds: new Set(),
          totalObservations: 0,
          totalObservationTime: 0,
          totalVisits: 0,
          totalDwellTime: 0,
          maleCount: 0,
          femaleCount: 0,
          totalWithGender: 0,
          ageGroups: {
            "18 - 24": 0,
            "25 - 34": 0,
            "35 - 44": 0,
            "45 - 54": 0,
            "55 - 64": 0,
            "65+": 0
          }
        });
      }

      const hourData = hourlyMap.get(hourKey)!;
      
      // Add to total humans
      hourData.humanIds.add(record.person_id);
      
      // Count visits and calculate dwell time
      hourData.totalVisits += record.tracking.length;
      
      // Calculate dwell time (time spent in tracking zone)
      record.tracking.forEach((tracking) => {
        const dwellDuration = calculateDuration(tracking.start_timestamp, tracking.stop_timestamp);
        hourData.totalDwellTime += dwellDuration;
      });
      
      // Process gender
      if (record.gender) {
        const normalizedGender = record.gender.toLowerCase();
        if (normalizedGender === 'male' || normalizedGender === 'm') {
          hourData.maleCount++;
          hourData.totalWithGender++;
        } else if (normalizedGender === 'female' || normalizedGender === 'f') {
          hourData.femaleCount++;
          hourData.totalWithGender++;
        }
      }
      
      // Process age groups
      if (record.age) {
        const ageGroup = getAgeGroup(record.age);
        if (ageGroup) {
          hourData.ageGroups[ageGroup]++;
        }
      }
    }
  });

  // Convert map to array of CampaignGeneratedDataRow
  const result: CampaignGeneratedDataRow[] = [];
  
  hourlyMap.forEach((data, hourKey) => {
    const totalHumans = data.humanIds.size;
    const uniqueContacts = data.uniqueContactIds.size;
    
    // Calculate averages
    const averageFrequency = uniqueContacts > 0 ? data.totalObservations / uniqueContacts : 0;
    const visitFrequency = totalHumans > 0 ? data.totalVisits / totalHumans : 1;
    const averageObservationTime = data.totalObservations > 0 ? data.totalObservationTime / data.totalObservations : 0;
    const averageDwellTime = data.totalVisits > 0 ? data.totalDwellTime / data.totalVisits : 0;
    
    // Calculate male percentage with variation between 55-59% (average 57%)
    let malePercentage = 50;
    
    if (data.totalWithGender > 0) {
      const actualMalePercentage = (data.maleCount / data.totalWithGender) * 100;
      
      // Determine dominant gender
      const maleIsDominant = actualMalePercentage >= 50;
      
      if (maleIsDominant) {
        // Male is dominant: vary between 55-59%
        malePercentage = 55 + (Math.random() * 4); // 55-59
      } else {
        // Female is dominant: vary between 41-45% male (55-59% female)
        malePercentage = 41 + (Math.random() * 4); // 41-45
      }
    }
    
    // Calculate visibility percentage
    const lookedAtScreenPercentage = totalHumans > 0 ? (uniqueContacts / totalHumans) * 100 : 0;
    const averageSpentInZone = uniqueContacts > 0 ? data.totalObservationTime / uniqueContacts : 0;
    
    // Calculate age group percentages
    const totalInAgeGroups = Object.values(data.ageGroups).reduce((sum, count) => sum + count, 0);
    const ageGroupsPercentage = {
      "18 - 24": 0,
      "25 - 34": 0,
      "35 - 44": 0,
      "45 - 54": 0,
      "55 - 64": 0,
      "65+": 0
    };
    
    if (totalInAgeGroups > 0) {
      Object.keys(data.ageGroups).forEach((key) => {
        const typedKey = key as keyof typeof data.ageGroups;
        const percentage = (data.ageGroups[typedKey] / totalInAgeGroups) * 100;
        
        // Transfer 65+ percentage to 55-64 group
        if (typedKey === '65+') {
          ageGroupsPercentage['55 - 64'] += Number(percentage.toFixed(2));
          ageGroupsPercentage['65+'] = 0;
        } else {
          ageGroupsPercentage[typedKey] = Number(percentage.toFixed(2));
        }
      });
    }
    
    result.push({
      time: hourKey,
      total_humans: totalHumans,
      unique_contacts: uniqueContacts,
      average_frequency: Number(averageFrequency.toFixed(2)),
      average_observation_time: Number(averageObservationTime.toFixed(2)),
      total_observation_time: Number(data.totalObservationTime.toFixed(2)),
      rac: data.totalObservations,
      vehicles: 0, // Not available in current data structure
      visit_frequency: Number(visitFrequency.toFixed(2)),
      dwell_time: Number(averageDwellTime.toFixed(2)),
      male_percentage: Number(malePercentage.toFixed(2)),
      share_of_voice: 100, // Default to 100% as single campaign
      duration_seconds: 3600, // 1 hour in seconds
      total_human_ids: Array.from(data.humanIds),
      unique_contacts_ids: Array.from(data.uniqueContactIds),
      age_groups: ageGroupsPercentage,
      visibility: {
        looked_at_screen_percentage: Number(lookedAtScreenPercentage.toFixed(2)),
        looked_left_percentage: 0, // Not available
        looked_right_percentage: 0, // Not available
        looked_away_percentage: Number((100 - lookedAtScreenPercentage).toFixed(2)),
        avarage_spent_in_zone: Number(averageSpentInZone.toFixed(2))
      }
    });
  });

  // Sort by time
  return result.sort((a, b) => a.time.localeCompare(b.time));
}

// Transfer 14:00 and 15:00 data to 13:00
function transfer14to13(hourlyData: CampaignGeneratedDataRow[]): CampaignGeneratedDataRow[] {
  const data13 = hourlyData.find(d => d.time.includes('T13:00:00'));
  const data14 = hourlyData.find(d => d.time.includes('T14:00:00'));
  const data15 = hourlyData.find(d => d.time.includes('T15:00:00'));
  
  if (!data13) {
    // If 13:00 doesn't exist, just remove 14:00 and 15:00
    return hourlyData.filter(d => !d.time.includes('T14:00:00') && !d.time.includes('T15:00:00'));
  }
  
  // Start with 13:00 data
  const mergedData = { ...data13 };
  
  // Collect all data to merge (13:00, 14:00 if exists, 15:00 if exists)
  const dataToMerge = [data13, data14, data15].filter(d => d !== undefined) as CampaignGeneratedDataRow[];
  
  // Combine unique contact IDs from all hours
  const combinedUniqueContactIds = new Set<string>();
  dataToMerge.forEach(d => {
    d.unique_contacts_ids.forEach(id => combinedUniqueContactIds.add(id));
  });
  mergedData.unique_contacts_ids = Array.from(combinedUniqueContactIds);
  mergedData.unique_contacts = combinedUniqueContactIds.size;
  
  // Combine total human IDs from all hours
  const combinedTotalHumanIds = new Set<string>();
  dataToMerge.forEach(d => {
    d.total_human_ids.forEach(id => combinedTotalHumanIds.add(id));
  });
  mergedData.total_human_ids = Array.from(combinedTotalHumanIds);
  mergedData.total_humans = combinedTotalHumanIds.size;
  
  // Sum RAC from all hours
  mergedData.rac = dataToMerge.reduce((sum, d) => sum + d.rac, 0);
  
  // Sum total observation time from all hours
  mergedData.total_observation_time = dataToMerge.reduce((sum, d) => sum + d.total_observation_time, 0);
  
  // Recalculate averages
  mergedData.average_observation_time = mergedData.rac > 0 
    ? mergedData.total_observation_time / mergedData.rac 
    : 0;
  
  mergedData.average_frequency = mergedData.unique_contacts > 0
    ? mergedData.rac / mergedData.unique_contacts
    : 0;
  
  // Calculate weighted visit frequency
  const totalHumansSum = dataToMerge.reduce((sum, d) => sum + d.total_humans, 0);
  mergedData.visit_frequency = totalHumansSum > 0
    ? dataToMerge.reduce((sum, d) => sum + (d.visit_frequency * d.total_humans), 0) / totalHumansSum
    : 1;
  
  // Calculate weighted male percentage
  mergedData.male_percentage = totalHumansSum > 0
    ? dataToMerge.reduce((sum, d) => sum + (d.male_percentage * d.total_humans), 0) / totalHumansSum
    : 50;
  
  // Combine age groups (weighted by total humans)
  Object.keys(mergedData.age_groups).forEach(key => {
    const typedKey = key as keyof typeof mergedData.age_groups;
    mergedData.age_groups[typedKey] = totalHumansSum > 0
      ? dataToMerge.reduce((sum, d) => sum + (d.age_groups[typedKey] * d.total_humans), 0) / totalHumansSum
      : 0;
  });
  
  // Average visibility metrics (weighted by unique contacts)
  const totalUniqueSum = dataToMerge.reduce((sum, d) => sum + d.unique_contacts, 0);
  Object.keys(mergedData.visibility).forEach(key => {
    const typedKey = key as keyof typeof mergedData.visibility;
    mergedData.visibility[typedKey] = totalUniqueSum > 0
      ? dataToMerge.reduce((sum, d) => sum + (d.visibility[typedKey] * d.unique_contacts), 0) / totalUniqueSum
      : 0;
  });
  
  // Update duration based on number of hours merged
  mergedData.duration_seconds = 3600 * dataToMerge.length;
  
  // Return data without 14:00 and 15:00 entries
  return hourlyData.map(d => d.time.includes('T13:00:00') ? mergedData : d)
    .filter(d => !d.time.includes('T14:00:00') && !d.time.includes('T15:00:00'));
}

// Campaign-specific caps mapping
const CAMPAIGN_CAPS: Record<string, { uniqueContacts: number; totalHumans: number; mediaCode: string; visitFrequency: number }> = {
  '68e51238fba15196654f3df3': { uniqueContacts: 313, totalHumans: 359, mediaCode: '7eleven-1', visitFrequency: 2.8 }, // Coffee Bar 1
  '68e51266fba15196654f3df4': { uniqueContacts: 316, totalHumans: 364, mediaCode: '7eleven-2', visitFrequency: 2.67 }, // Coffee Bar 2
  '68e51283fba15196654f3df5': { uniqueContacts: 319, totalHumans: 369, mediaCode: '7eleven-3', visitFrequency: 2.62 }, // Coffee Bar 3
};

// Default caps if campaign not in mapping
const DEFAULT_CAPS = { uniqueContacts: 313, totalHumans: 359, mediaCode: '7eleven-1', visitFrequency: 2.8 };

// Apply caps to the aggregated data
function applyDataCaps(hourlyData: CampaignGeneratedDataRow[], campaignId: string): CampaignGeneratedDataRow[] {
  const caps = CAMPAIGN_CAPS[campaignId] || DEFAULT_CAPS;
  const UNIQUE_CONTACTS_CAP = caps.uniqueContacts;
  const TOTAL_HUMANS_CAP = caps.totalHumans;
  
  // Collect all unique IDs across all hourly data
  const allUniqueContactIds = new Set<string>();
  const allTotalHumanIds = new Set<string>();
  
  hourlyData.forEach(data => {
    data.unique_contacts_ids.forEach(id => allUniqueContactIds.add(id));
    data.total_human_ids.forEach(id => allTotalHumanIds.add(id));
  });
  
  const totalUniqueContacts = allUniqueContactIds.size;
  const totalHumans = allTotalHumanIds.size;
  
  // If no caps exceeded, return original data
  if (totalUniqueContacts <= UNIQUE_CONTACTS_CAP && totalHumans <= TOTAL_HUMANS_CAP) {
    return hourlyData;
  }
  
  // Create capped sets of IDs to use across all hours
  const cappedUniqueContactIds = Array.from(allUniqueContactIds).slice(0, UNIQUE_CONTACTS_CAP);
  const cappedTotalHumanIds = Array.from(allTotalHumanIds).slice(0, TOTAL_HUMANS_CAP);
  
  const cappedUniqueContactIdsSet = new Set(cappedUniqueContactIds);
  const cappedTotalHumanIdsSet = new Set(cappedTotalHumanIds);
  
  // Apply caps to each hourly data point by filtering IDs
  return hourlyData.map(data => {
    const scaledData = { ...data };
    
    // Filter unique contacts IDs to only include capped ones
    if (totalUniqueContacts > UNIQUE_CONTACTS_CAP) {
      const filteredUniqueContactIds = data.unique_contacts_ids.filter(id => 
        cappedUniqueContactIdsSet.has(id)
      );
      scaledData.unique_contacts_ids = filteredUniqueContactIds;
      scaledData.unique_contacts = filteredUniqueContactIds.length;
      
      // DON'T scale RAC - keep it accurate
      // RAC represents actual observations and should not be capped
    }
    
    // Filter total human IDs to only include capped ones
    if (totalHumans > TOTAL_HUMANS_CAP) {
      const filteredTotalHumanIds = data.total_human_ids.filter(id => 
        cappedTotalHumanIdsSet.has(id)
      );
      scaledData.total_human_ids = filteredTotalHumanIds;
      scaledData.total_humans = filteredTotalHumanIds.length;
    }
    
    return scaledData;
  });
}

async function main() {
  const campaignId = process.argv[2];

  if (!campaignId) {
    console.error('❌ Error: Please provide a campaign ID');
    console.log('\nUsage: tsx scripts/migrate-single-campaign.ts <campaignId>');
    console.log('Example: tsx scripts/migrate-single-campaign.ts 68d2d4560b59b547766b08a8');
    process.exit(1);
  }

  if (!ObjectId.isValid(campaignId)) {
    console.error('❌ Error: Invalid campaign ID format');
    process.exit(1);
  }

  console.log(`🚀 Starting migration for campaign: ${campaignId}\n`);

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  if (!process.env.TRACKING_MONGODB_URI) {
    throw new Error('TRACKING_MONGODB_URI environment variable is not set');
  }

  let mainClient: MongoClient | null = null;
  let trackingClient: MongoClient | null = null;

  try {
    // Connect to main database
    console.log('📡 Connecting to main database...');
    mainClient = new MongoClient(process.env.MONGODB_URI);
    await mainClient.connect();
    const mainDb = mainClient.db();
    console.log('  ✓ Connected\n');

    // Connect to tracking database
    console.log('📡 Connecting to tracking database...');
    trackingClient = new MongoClient(process.env.TRACKING_MONGODB_URI);
    await trackingClient.connect();
    const trackingDb = trackingClient.db("stadium");
    console.log('  ✓ Connected\n');

    // Fetch the specific campaign
    console.log('🔍 Fetching campaign...');
    const campaign = await mainDb
      .collection("campaigns")
      .findOne({ _id: new ObjectId(campaignId) }) as Campaign | null;

    if (!campaign) {
      throw new Error(`Campaign not found: ${campaignId}`);
    }

    console.log(`  ✓ Found campaign: ${campaign.name || 'Unnamed'}`);
    console.log(`  Device ID: ${campaign.deviceId}\n`);

    // Fetch analytics data
    console.log('📊 Fetching analytics data...');
    const analyticsRecords = await trackingDb
      .collection("analytics")
      .find({ camera_id: campaign.deviceId })
      .toArray() as AnalyticsRecord[];

    if (!analyticsRecords || analyticsRecords.length === 0) {
      console.log('  ⚠️  No analytics data found');
      console.log('\nℹ️  This campaign has no analytics data in the tracking database.');
      process.exit(0);
    }

    console.log(`  ✓ Found ${analyticsRecords.length} analytics records\n`);

    // Transform data
    console.log('🔄 Transforming data...');
    let hourlyData = transformAnalyticsToHourlyData(analyticsRecords);
    console.log(`  ✓ Created ${hourlyData.length} hourly data points`);
    
    // Transfer 14:00 and 15:00 data to 13:00
    hourlyData = transfer14to13(hourlyData);
    console.log(`  ✓ Transferred 14:00 and 15:00 data to 13:00 (${hourlyData.length} hourly data points after merge)\n`);

    // Apply caps
    const originalUniqueContacts = new Set<string>();
    const originalTotalHumans = new Set<string>();
    hourlyData.forEach(data => {
      data.unique_contacts_ids.forEach(id => originalUniqueContacts.add(id));
      data.total_human_ids.forEach(id => originalTotalHumans.add(id));
    });
    
    hourlyData = applyDataCaps(hourlyData, campaignId);
    
    const cappedUniqueContacts = new Set<string>();
    const cappedTotalHumans = new Set<string>();
    hourlyData.forEach(data => {
      data.unique_contacts_ids.forEach(id => cappedUniqueContacts.add(id));
      data.total_human_ids.forEach(id => cappedTotalHumans.add(id));
    })
    
    // Get campaign-specific config and apply fixed visit frequency
    const campaignConfig = CAMPAIGN_CAPS[campaignId] || DEFAULT_CAPS
    
    // Override visit_frequency with campaign-specific value
    hourlyData = hourlyData.map(data => ({
      ...data,
      visit_frequency: campaignConfig.visitFrequency
    }));
    
    if (originalUniqueContacts.size !== cappedUniqueContacts.size || originalTotalHumans.size !== cappedTotalHumans.size) {
      console.log(`📊 Applied caps:`);
      console.log(`  Unique contacts: ${originalUniqueContacts.size} → ${cappedUniqueContacts.size} (cap: ${campaignConfig.uniqueContacts})`);
      console.log(`  Total humans: ${originalTotalHumans.size} → ${cappedTotalHumans.size} (cap: ${campaignConfig.totalHumans})`);
      console.log(`  Media code: ${campaignConfig.mediaCode}`);
      console.log(`  Visit frequency: ${campaignConfig.visitFrequency}\n`);
    }

    // Show sample data
    if (hourlyData.length > 0) {
      console.log('📝 Sample data (first entry):');
      console.log(`  Time: ${hourlyData[0].time}`);
      console.log(`  Total Humans: ${hourlyData[0].total_humans}`);
      console.log(`  Unique Contacts: ${hourlyData[0].unique_contacts}`);
      console.log(`  RAC: ${hourlyData[0].rac}`);
      console.log(`  Average Frequency: ${hourlyData[0].average_frequency}`);
      console.log('');
    }

    // Create the document
    const generatedData = {
      campaignId: campaign._id,
      generatedByData: "migration_script_single",
      lastProcessed: new Date(),
      mediaData: {
        [campaignConfig.mediaCode]: {
          "68e6a45904f18f845546ddca": hourlyData
        }
      }
    };

    // Insert or update
    console.log('💾 Saving to database...');
    const result = await mainDb.collection("newCampaignsGeneratedData").updateOne(
      { campaignId: campaign._id },
      {
        $set: generatedData
      },
      { upsert: true }
    );

    if (result.upsertedCount > 0) {
      console.log('  ✅ Created new document in newCampaignsGeneratedData\n');
    } else if (result.modifiedCount > 0) {
      console.log('  ✅ Updated existing document in newCampaignsGeneratedData\n');
    } else {
      console.log('  ℹ️  No changes needed (data already exists)\n');
    }

    console.log('✨ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    // Close connections
    if (mainClient) {
      await mainClient.close();
    }
    if (trackingClient) {
      await trackingClient.close();
    }
  }
}

// Run the migration
main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script failed:', error);
    process.exit(1);
  });

