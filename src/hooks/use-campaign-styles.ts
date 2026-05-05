import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CampaignSharedStyles, CampaignSharedStylesInput } from '@/lib/shared-styles-types';

/**
 * Fetch campaign shared styles
 */
async function fetchCampaignStyles(campaignId: string): Promise<CampaignSharedStyles> {
  const response = await fetch(`/api/campaign-styles?campaignId=${campaignId}`);
  
  if (!response.ok) {
    throw new Error('Failed to fetch campaign styles');
  }
  
  return response.json();
}

/**
 * Save campaign shared styles
 */
async function saveCampaignStyles(styles: CampaignSharedStylesInput): Promise<CampaignSharedStyles> {
  const response = await fetch('/api/campaign-styles', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(styles),
  });
  
  if (!response.ok) {
    throw new Error('Failed to save campaign styles');
  }
  
  return response.json();
}

/**
 * Hook to fetch campaign styles
 */
export function useCampaignStyles(campaignId: string) {
  return useQuery({
    queryKey: ['campaignStyles', campaignId],
    queryFn: () => fetchCampaignStyles(campaignId),
    enabled: !!campaignId,
  });
}

/**
 * Hook to save campaign styles
 */
export function useSaveCampaignStyles(campaignId: string) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (styles: CampaignSharedStylesInput) => saveCampaignStyles(styles),
    onSuccess: () => {
      // Invalidate and refetch
      queryClient.invalidateQueries({ queryKey: ['campaignStyles', campaignId] });
    },
  });
}

