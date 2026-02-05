// Types for Bold Reports authentication integration

export interface BoldReportsInfo {
  token: string | null;
  userId: number | null;
  email: string | null;
  isAdmin: boolean;
  synced: boolean;
  syncError: string | null;
}

export interface BoldAuthResponse {
  success: boolean;
  boldToken?: string;
  userId?: number;
  email?: string;
  isAdmin?: boolean;
  error?: string;
}

export const defaultBoldReportsInfo: BoldReportsInfo = {
  token: null,
  userId: null,
  email: null,
  isAdmin: false,
  synced: false,
  syncError: null,
};
