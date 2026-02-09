'use client';

import { useQuery } from '@tanstack/react-query';
import { forecastingApi } from '../../api/forecasting';

interface UseSimilarCampaignsParams {
  promotionType?: string;
  productIds?: string[];
  limit?: number;
  enabled?: boolean;
}

/**
 * Hook to fetch similar campaigns
 */
export function useSimilarCampaigns(params?: UseSimilarCampaignsParams) {
  const { enabled = true, ...queryParams } = params || {};

  return useQuery({
    queryKey: ['similar-campaigns', params],
    queryFn: () => forecastingApi.getSimilarCampaigns(queryParams),
    staleTime: 1000 * 60 * 5, // 5 minutes
    enabled,
  });
}
