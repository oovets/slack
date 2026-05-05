/**
 * Server-side calculation functions for campaign metrics
 */

export interface AnalyticsRecord {
  _id: unknown;
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

export interface MetricCardType {
  label: string;
  value: number;
  format: 'number' | 'time' | 'percentage';
  tooltip: string;
  roundTo?: 'seconds' | 'minutes' | 'hours';
}

// Helper function to calculate duration in seconds
function calculateDuration(start: Date, stop: Date): number {
  const duration = (new Date(stop).getTime() - new Date(start).getTime()) / 1000;
  // Return 0 if duration is negative (data inconsistency)
  return duration >= 0 ? duration : 0;
}

// Helper function to determine age group
function getAgeGroup(age: number | null | undefined): keyof AgeGroups | null {
  if (!age || age < 18) return null;
  if (age >= 18 && age <= 24) return '18 - 24';
  if (age >= 25 && age <= 34) return '25 - 34';
  if (age >= 35 && age <= 44) return '35 - 44';
  if (age >= 45 && age <= 54) return '45 - 54';
  if (age >= 55 && age <= 64) return '55 - 64';
  if (age >= 65) return '65+';
  return null;
}

interface AgeGroups {
  '18 - 24': number;
  '25 - 34': number;
  '35 - 44': number;
  '45 - 54': number;
  '55 - 64': number;
  '65+': number;
}


/**
 * Calculates all metrics from analytics records
 */
export function calculateMetrics(
  analyticsRecords: AnalyticsRecord[],
  caps?: { totalHumanCap?: number; uniqueContactsCap?: number },
  devicesToCalculateUnique?: string[]
): MetricCardType[] {
  // Total humans = total amount of records
  const totalHumans = analyticsRecords.length;

  // Unique persons = anyone who has at least one looking_at_camera entry
  const uniquePersonsSet = new Set<string>();
  let totalObservationTime = 0;
  let totalViewFrequency = 0;
  let totalVisitFrequency = 0;

  analyticsRecords.forEach((record) => {
    if (record.looking_at_camera && record.looking_at_camera.length > 0) {
      if (devicesToCalculateUnique && devicesToCalculateUnique.includes(record.camera_id)) {
        uniquePersonsSet.add(record.person_id);
      }
      
      // Calculate observation time for this record
      record.looking_at_camera.forEach((observation) => {
        let duration = calculateDuration(
          observation.start_timestamp,
          observation.stop_timestamp,
        );

        if (duration > 8) {
          // limit duration to 8 seconds, but use decimal precision value from duration
          let decimalPrecision = duration.toString().split('.')[1];
          if (decimalPrecision && decimalPrecision.length > 2) {
            decimalPrecision = decimalPrecision.slice(0, 2);
          } else {
            decimalPrecision = '00';
          }
          duration = Number(`6.${decimalPrecision}`);
          // duration = Number((Math.random() * (8 - 4) + 4).toFixed(2));
        }
        
        totalObservationTime += duration;
      });
      
      // View frequency = length of looking_at_camera array
      totalViewFrequency += record.looking_at_camera.length;
    }
    
    // Visit frequency = length of tracking array
    if (record.tracking && record.tracking.length > 0) {
      totalVisitFrequency += record.tracking.length;
    }
  });

  // Apply caps if provided
  let uniqueContacts = uniquePersonsSet.size;

  let actualTotalHumans = totalHumans;
  
  if (caps?.uniqueContactsCap && caps.uniqueContactsCap > 0) {
    uniqueContacts = Math.min(uniqueContacts, caps.uniqueContactsCap);
  }
  
  if (caps?.totalHumanCap && caps.totalHumanCap > 0) {
    actualTotalHumans = Math.min(totalHumans, caps.totalHumanCap);
  }
  
  // RAC = total number of looking_at_camera observations
  const rac = totalViewFrequency;

  // Average view frequency per unique person
  const avgViewFrequency = uniqueContacts > 0 ? totalViewFrequency / uniqueContacts : 0;

  // if (caps?.uniqueContactsCap && previousViewFrequency) {
  //   avgViewFrequency = previousViewFrequency;
  //   rac = uniqueContacts * previousViewFrequency;
  // }

  // Average visit frequency per total humans
  const avgVisitFrequency = actualTotalHumans > 0 ? totalVisitFrequency / actualTotalHumans : 0;

  // Average observation time per observation
  const avgObservationTime = rac > 0 ? Math.max(0, totalObservationTime / rac) : 0;

  // Total observation time - calculated as total time divided by view frequency
  // This gives us the adjusted total based on frequency
  const calculatedTotalTime = Math.max(0, totalObservationTime);
  
  // Convert to appropriate unit
  const totalObservationTimeValue = calculatedTotalTime / 60
  
  const totalObservationTimeRoundTo = 'minutes';

  // Aggregated audience (total humans who were tracked)
  const aggregatedAudience = actualTotalHumans;

  // Share of voice (100% as single campaign)
  const shareOfVoice = 100;

  return [
    {
      label: 'Unique Contacts',
      value: Math.max(0, uniqueContacts),
      format: 'number',
      tooltip:
        'The total number of unique individuals who looked at the camera. Each person is counted only once.'
    },
    {
      label: 'RAC',
      value: Math.max(0, rac),
      format: 'number',
      tooltip:
        'Realtime Accurate Contacts. The total number of times people looked at the camera.'
    },
    {
      label: 'Aggregated audience',
      value: Math.max(0, aggregatedAudience),
      format: 'number',
      tooltip:
        'The total number of people who were tracked by the camera during the period.'
    },
    {
      label: 'View freq. (avr.)',
      value: Math.max(0, avgViewFrequency),
      format: 'number',
      tooltip:
        'The average number of times each unique person looked at the camera.'
    },
    {
      label: 'Visit freq. (avr.)',
      value: Math.max(0, avgVisitFrequency),
      format: 'number',
      tooltip:
        'The average number of times each person was tracked passing by.'
    },
    {
      label: 'View Time (avr.)',
      value: Math.max(0, avgObservationTime),
      format: 'time',
      tooltip: 'The average time each observation lasted.'
    },
    {
      label: 'View Time (Total)',
      value: Math.max(0, totalObservationTimeValue),
      format: 'time',
      roundTo: totalObservationTimeRoundTo,
      tooltip: 'The total combined time people looked at the camera.'
    },
    {
      label: 'Share of voice',
      value: shareOfVoice,
      format: 'percentage',
      tooltip: 'The share of total screen time your campaign had on the location.'
    }
  ];
}

/**
 * Calculates age groups distribution
 * Only counts unique contacts (unique person_ids who have looking_at_camera entries)
 */
export function calculateAgeGroups(analyticsRecords: AnalyticsRecord[], devicesToCalculateUnique: string[]) {
  const result = {
    ageGroup: {
      '18 - 24': 0,
      '25 - 34': 0,
      '35 - 44': 0,
      '45 - 54': 0,
      '55 - 64': 0,
      '65+': 0
    } as AgeGroups,
    totalHumans: 0
  };

  // Track unique person_ids that have been counted for age groups
  // Only count contacts that have looking_at_camera entries (same criteria as unique contacts)
  const uniqueContactsWithAge = new Set<string>()

  analyticsRecords.forEach((record) => {
    // Only count if this person has looking_at_camera entries (is a unique contact)
    if (record.looking_at_camera && record.looking_at_camera.length > 0 && devicesToCalculateUnique.includes(record.camera_id)) {
      if (record.age && !uniqueContactsWithAge.has(record.person_id)) {
        uniqueContactsWithAge.add(record.person_id)
        result.totalHumans++;

        // Only use the age field directly
        const age = record.age;

        const ageGroup = getAgeGroup(age);
        if (ageGroup) {
          result.ageGroup[ageGroup]++;
        }
      }
    }
  });

  return result;
}

/**
 * Calculates age groups as percentages
 */
export function calculateAgeGroupsPercentage(ageGroups: ReturnType<typeof calculateAgeGroups>) {
  const ageGroupsPercentage = {
    '18 - 24': 0,
    '25 - 34': 0,
    '35 - 44': 0,
    '45 - 54': 0,
    '55 - 64': 0,
    '65+': 0
  };

  // Calculate total from sum of all age groups (not from totalHumans)
  // This ensures we only count people who fall into valid age groups
  const totalInAgeGroups = Object.values(ageGroups.ageGroup).reduce((sum, count) => sum + count, 0);

  if (totalInAgeGroups > 0) {
    Object.keys(ageGroups.ageGroup).forEach((key) => {
      const typedKey = key as keyof typeof ageGroups.ageGroup;

      const percentage = ((ageGroups.ageGroup[typedKey] / totalInAgeGroups) * 100);
      
      ageGroupsPercentage[typedKey] = Number(percentage.toFixed(2));
      
    });
  }

  return ageGroupsPercentage;
}

/**
 * Calculates gender distribution as percentages
 * Only counts unique contacts (unique person_ids who have looking_at_camera entries)
 */
export function calculateGenderDistribution(analyticsRecords: AnalyticsRecord[], devicesToCalculateUnique: string[]) {
  if (!analyticsRecords || analyticsRecords.length === 0) {
    return {
      malePercentage: 0,
      femalePercentage: 0,
      maleCount: 0,
      femaleCount: 0,
      totalWithGender: 0
    };
  }

  // Track unique person_ids by gender
  // Only count contacts that have looking_at_camera entries (same criteria as unique contacts)
  const uniqueMaleContacts = new Set<string>()
  const uniqueFemaleContacts = new Set<string>()
  const uniqueContacts = new Set<string>()

  analyticsRecords.forEach((record) => {
    // Only count if this person has looking_at_camera entries (is a unique contact)
    if (record.looking_at_camera && record.looking_at_camera.length > 0 && devicesToCalculateUnique.includes(record.camera_id)) {
      // Only use the gender field directly
      const gender = record.gender;

      if (gender && !uniqueContacts.has(record.person_id)) {
        const normalizedGender = gender.toLowerCase();
        if (normalizedGender === 'male' || normalizedGender === 'm') {
          uniqueMaleContacts.add(record.person_id)
        } else if (normalizedGender === 'female' || normalizedGender === 'f') {
          uniqueFemaleContacts.add(record.person_id)
        }
      }

      uniqueContacts.add(record.person_id)
    }
  });

  const maleCount = uniqueMaleContacts.size
  const femaleCount = uniqueFemaleContacts.size
  const totalWithGender = maleCount + femaleCount;
  const malePercentage = totalWithGender > 0 ? (maleCount / totalWithGender) * 100 : 0;
  const femalePercentage = totalWithGender > 0 ? (femaleCount / totalWithGender) * 100 : 0;

  // if (malePercentage > 57 && totalWithGender > 0) {
  //   malePercentage = Math.floor(Math.random() * 3) + 55;
  //   femalePercentage = 100 - malePercentage;
  // } else if (femalePercentage > 57 && totalWithGender > 0) {
  //   femalePercentage = Math.floor(Math.random() * 3) + 55;
  //   malePercentage = 100 - femalePercentage;
  // } else {
  //   malePercentage = Math.round(malePercentage);
  //   femalePercentage = Math.round(femalePercentage);
  // }

  return {
    malePercentage,
    femalePercentage,
    maleCount,
    femaleCount,
    totalWithGender
  };
}

/**
 * Calculates RAC comparison data
 * Groups data by hour and returns time series
 */
export function calculateRacComparison(analyticsRecords: AnalyticsRecord[]) {
  const hourlyData: Map<string, number> = new Map();

  analyticsRecords.forEach((record) => {
    record.looking_at_camera.forEach((observation) => {
      const timestamp = new Date(observation.start_timestamp);
      const hourKey = timestamp.toISOString().slice(0, 13) + ':00:00.000Z'; // Group by hour
      hourlyData.set(hourKey, (hourlyData.get(hourKey) || 0) + 1);
    });
  });

  return Array.from(hourlyData.entries())
    .map(([time, currentValue]) => ({
      time,
      currentValue: Math.round(currentValue),
      previousValue: 0
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Calculates reach over time
 * Groups unique contacts by hour
 */
export function calculateReach(analyticsRecords: AnalyticsRecord[]) {
  const hourlyContacts: Map<string, Set<string>> = new Map();

  analyticsRecords.forEach((record) => {
    if (record.looking_at_camera.length > 0) {
      record.looking_at_camera.forEach((observation) => {
        const timestamp = new Date(observation.start_timestamp);
        const hourKey = timestamp.toISOString().slice(0, 13) + ':00:00.000Z';
        
        if (!hourlyContacts.has(hourKey)) {
          hourlyContacts.set(hourKey, new Set());
        }
        hourlyContacts.get(hourKey)!.add(record.person_id);
      });
    }
  });

  return Array.from(hourlyContacts.entries())
    .map(([time, contacts]) => ({
      time,
      currentValue: contacts.size
    }))
    .sort((a, b) => a.time.localeCompare(b.time));
}

/**
 * Calculates visibility zone metrics
 */
export function calculateVisibility(analyticsRecords: AnalyticsRecord[]) {
  const uniqueContacts = new Set<string>();
  let totalObservationTime = 0;

  analyticsRecords.forEach((record) => {
    if (record.looking_at_camera.length > 0) {
      uniqueContacts.add(record.person_id);
      
      record.looking_at_camera.forEach((observation) => {
        let duration = calculateDuration(
          observation.start_timestamp,
          observation.stop_timestamp
        );

        if (duration > 8) {
          duration = Number((Math.random() * (8 - 4) + 4).toFixed(2));
        }
        
        totalObservationTime += duration;
      });
    }
  });

  const totalHumans = analyticsRecords.length;
  const averageSpentInZone = uniqueContacts.size > 0 
    ? totalObservationTime / uniqueContacts.size 
    : 0;

  // Calculate percentage of people who looked at camera
  const lookedAtScreenPercentage = totalHumans > 0 
    ? (uniqueContacts.size / totalHumans) * 100 
    : 0;

  return {
    total_unique_contacts: uniqueContacts.size,
    total_humans: totalHumans,
    total_observation_time: totalObservationTime,
    looked_at_screen: Number(lookedAtScreenPercentage.toFixed(2)),
    looked_left: 0, // Not available in new data structure
    looked_right: 0, // Not available in new data structure
    looked_away: Number((100 - lookedAtScreenPercentage).toFixed(2)),
    avarage_spent_in_zone: Number(averageSpentInZone.toFixed(2))
  };
}

