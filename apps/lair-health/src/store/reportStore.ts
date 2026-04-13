import { create } from 'zustand';
import {
  checkoutPremium as checkoutPremiumApi,
  fetchHeatmap as fetchHeatmapApi,
  fetchLatestCheckout,
  fetchLatestShareCard,
  fetchWeeklyReport,
  generateShareCard as generateShareCardApi,
} from '../services/reportApi';
import type {
  HeatmapData,
  PremiumCheckoutParams,
  PremiumCheckoutResult,
  ShareCard,
  WeeklyReport,
} from '../services/reportApi';

export interface ReportState {
  heatmapData: HeatmapData | null;
  weeklyReport: WeeklyReport | null;
  latestShareCard: ShareCard | null;
  latestCheckout: PremiumCheckoutResult | null;
  isLoadingHeatmap: boolean;
  isLoadingWeekly: boolean;
  isGeneratingShareCard: boolean;
  isCheckingOutPremium: boolean;
  error: string | null;
  fetchHeatmap: (weeks: number) => Promise<void>;
  fetchWeekly: () => Promise<void>;
  generateShareCard: (weekStart?: string) => Promise<void>;
  checkoutPremium: (params: PremiumCheckoutParams) => Promise<void>;
  loadLatestShareCard: () => Promise<void>;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return 'unknown error';
}

export const useReportStore = create<ReportState>((set) => ({
  heatmapData: null,
  weeklyReport: null,
  latestShareCard: null,
  latestCheckout: null,
  isLoadingHeatmap: false,
  isLoadingWeekly: false,
  isGeneratingShareCard: false,
  isCheckingOutPremium: false,
  error: null,

  fetchHeatmap: async (weeks) => {
    set({ isLoadingHeatmap: true, error: null });
    try {
      const heatmapData = await fetchHeatmapApi(weeks);
      set({ heatmapData, isLoadingHeatmap: false });
    } catch (error) {
      set({
        error: getErrorMessage(error),
        isLoadingHeatmap: false,
      });
    }
  },

  fetchWeekly: async () => {
    set({ isLoadingWeekly: true, error: null });
    try {
      const weeklyReport = await fetchWeeklyReport();
      set({ weeklyReport, isLoadingWeekly: false });
    } catch (error) {
      set({
        error: getErrorMessage(error),
        isLoadingWeekly: false,
      });
    }
  },

  generateShareCard: async (weekStart) => {
    set({ isGeneratingShareCard: true, error: null });
    try {
      const generatedShareCard = await generateShareCardApi(weekStart);
      const latestShareCard = await fetchLatestShareCard();
      set({
        latestShareCard: latestShareCard ?? generatedShareCard,
        isGeneratingShareCard: false,
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
        isGeneratingShareCard: false,
      });
    }
  },

  checkoutPremium: async (params) => {
    set({ isCheckingOutPremium: true, error: null });
    try {
      const latestCheckout = await checkoutPremiumApi(params);
      set({
        latestCheckout,
        isCheckingOutPremium: false,
      });
    } catch (error) {
      set({
        error: getErrorMessage(error),
        isCheckingOutPremium: false,
      });
    }
  },

  loadLatestShareCard: async () => {
    set({ error: null });
    try {
      const [latestShareCard, latestCheckout] = await Promise.all([
        fetchLatestShareCard(),
        fetchLatestCheckout(),
      ]);
      set({ latestShareCard, latestCheckout });
    } catch (error) {
      set({ error: getErrorMessage(error) });
    }
  },
}));
