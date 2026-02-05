// Types for Bold Reports authentication integration

export interface BoldReportsInfo {
  token: string | null;
  userId: number | null;
  email: string | null;
  isAdmin: boolean;
  synced: boolean;
  syncError: string | null;
  groups: string[];
}

export interface BoldAuthResponse {
  success: boolean;
  synced?: boolean;
  boldToken?: string;
  userId?: number | null;
  email?: string;
  isAdmin?: boolean;
  groups?: string[];
  message?: string;
  error?: string;
}

export const defaultBoldReportsInfo: BoldReportsInfo = {
  token: null,
  userId: null,
  email: null,
  isAdmin: false,
  synced: false,
  syncError: null,
  groups: [],
};
