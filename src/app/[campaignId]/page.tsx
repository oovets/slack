import { QueryClient, dehydrate } from '@tanstack/react-query';
import HomeClientWrapper from '../home-client-wrapper';
import { fetchCampaignStylesServer } from "@/lib/fetch-styles-server";
import { fetchCampaignMetricsServer } from "@/lib/fetch-metrics-server";
import { auth } from "@/lib/auth";
import { notFound } from 'next/navigation';
import { ObjectId } from 'mongodb';
import type { Metadata } from 'next';

interface CampaignPageProps {
  params: Promise<{
    campaignId: string;
  }>;
}

// Generate dynamic metadata for each campaign
export async function generateMetadata({ params }: CampaignPageProps): Promise<Metadata> {
  const { campaignId } = await params;

  // Validate campaignId
  if (!campaignId || campaignId.includes('.') || !ObjectId.isValid(campaignId)) {
    return {
      title: 'Campaign Not Found',
    };
  }

  try {
    // Fetch styles to get the logo
    const styles = await fetchCampaignStylesServer(campaignId);
    
    return {
      title: 'Campaign Metrics Dashboard',
      description: 'Real-time campaign metrics and analytics',
      icons: {
        icon: styles.logo.url,
        shortcut: styles.logo.url,
        apple: styles.logo.url,
      },
    };
  } catch (error) {
    console.error('Error generating metadata:', error);
    return {
      title: 'Campaign Metrics Dashboard',
      icons: {
        icon: '/favicon_32x32.png',
      },
    };
  }
}

export default async function CampaignPage({ params }: CampaignPageProps) {
  // Get session server-side
  const session = await auth();
  
  // Await params in Next.js 15
  const { campaignId } = await params;

  // Validate campaignId exists and is valid
  if (!campaignId) {
    notFound();
  }

  // Check if it's a file request (favicon.ico, robots.txt, etc.)
  if (campaignId.includes('.')) {
    notFound();
  }

  // Validate it's a valid MongoDB ObjectId format (24 hex characters)
  if (!ObjectId.isValid(campaignId)) {
    notFound();
  }
  
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
      },
    },
  });

  // Prefetch styles server-side using TanStack Query
  await queryClient.prefetchQuery({
    queryKey: ['campaignStyles', campaignId],
    queryFn: () => fetchCampaignStylesServer(campaignId),
  });

  // Prefetch metrics server-side using TanStack Query
  if (campaignId) {
    await queryClient.prefetchQuery({
      queryKey: ['campaignMetrics', campaignId],
      queryFn: () => fetchCampaignMetricsServer(campaignId),
    });
  }

  // Dehydrate state to pass as plain object (not class instance)
  const dehydratedState = dehydrate(queryClient);

  // Check if user is authenticated and is admin
  const isAdmin = session?.user?.isAdmin ?? false;

  return <HomeClientWrapper campaignId={campaignId} dehydratedState={dehydratedState} isAdmin={isAdmin} />;
}

