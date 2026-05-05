"use client";

import { QueryClient, QueryClientProvider, HydrationBoundary } from '@tanstack/react-query';
import { Suspense, useState } from 'react';
import HomeClient from './home-client';
import type { DehydratedState } from '@tanstack/react-query';

interface HomeClientWrapperProps {
  campaignId: string;
  dehydratedState: DehydratedState;
  isAdmin: boolean;
}

export default function HomeClientWrapper({ campaignId, dehydratedState, isAdmin }: HomeClientWrapperProps) {
  // Create QueryClient on the client side
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <HydrationBoundary state={dehydratedState}>
        <Suspense fallback={null}>
          <HomeClient campaignId={campaignId} isAdmin={isAdmin} />
        </Suspense>
      </HydrationBoundary>
    </QueryClientProvider>
  );
}

