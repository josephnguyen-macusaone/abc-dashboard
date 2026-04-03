import { create } from 'zustand';

/**
 * Tracks when API calls fail because the server is unreachable (network, proxy, or gateway).
 * Drives a global banner so users see a clear message instead of endless loading.
 */
interface ApiConnectivityState {
  isUnreachable: boolean;
  /** Last error message from the client, if any (for debugging / support). */
  detailMessage: string | null;
  userDismissed: boolean;
  reportUnreachable: (message?: string) => void;
  reportReachable: () => void;
  dismissBanner: () => void;
}

export const useApiConnectivityStore = create<ApiConnectivityState>((set) => ({
  isUnreachable: false,
  detailMessage: null,
  userDismissed: false,
  reportUnreachable: (message) =>
    set({
      isUnreachable: true,
      detailMessage: message?.trim() ? message.trim() : null,
      userDismissed: false,
    }),
  reportReachable: () =>
    set({
      isUnreachable: false,
      detailMessage: null,
      userDismissed: false,
    }),
  dismissBanner: () => set({ userDismissed: true }),
}));
