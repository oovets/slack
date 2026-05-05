import { useQuery } from '@tanstack/react-query';
import type { MetricCardType } from '@/lib/calculations';

export interface CampaignMetricsResponse {
  metrics: MetricCardType[];
  ageGroups: {
    ageGroup: {
      '18 - 24': number;
      '25 - 34': number;
      '35 - 44': number;
      '45 - 54': number;
      '55 - 64': number;
      '65+': number;
    };
    totalHumans: number;
  };
  ageGroupsPercentage: {
    '18 - 24': number;
    '25 - 34': number;
    '35 - 44': number;
    '45 - 54': number;
    '55 - 64': number;
    '65+': number;
  };
  genderDistribution: {
    malePercentage: number;
    femalePercentage: number;
    maleCount?: number;
    femaleCount?: number;
    totalWithGender?: number;
  };
  racComparison: Array<{
    time: string;
    currentValue: number;
    previousValue: number;
  }>;
  reach: Array<{
    time: string;
    currentValue: number;
  }>;
  visibility: {
    total_unique_contacts: number;
    total_humans: number;
    total_observation_time: number;
    looked_at_screen: number;
    looked_left: number;
    looked_right: number;
    looked_away: number;
    avarage_spent_in_zone: number;
  };
  campaign: {
    _id: string;
    name: string;
    deviceId: string;
    orientation?: string;
  };
}

async function fetchCampaignMetrics(campaignId?: string): Promise<CampaignMetricsResponse> {
  // const timestamp = new Date().toLocaleTimeString();
  // console.log(`🔄 [${timestamp}] Fetching campaign metrics for:`, campaignId);
  
  const url = campaignId 
    ? `/api/metrics?campaignId=${campaignId}`
    : '/api/metrics';
    
  const response = await fetch(url);
  
  if (!response.ok) {
    throw new Error('Failed to fetch campaign metrics');
  }
  
  const data = await response.json();
  
  return data;
}

export function useCampaignMetrics(campaignId?: string) {
  const query = useQuery({
    queryKey: ['campaign-metrics', campaignId],
    queryFn: () => fetchCampaignMetrics(campaignId),
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    // These options help with debugging
    refetchIntervalInBackground: true, // Continue refetching even when window is not focused
  });

  return query;
}

