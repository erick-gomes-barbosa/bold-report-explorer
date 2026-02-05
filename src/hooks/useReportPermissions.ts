import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Report IDs
export const REPORT_IDS = {
  BENS_NECESSIDADE: '8fae90ee-011b-40d4-a53a-65b74f97b3cb',
  INVENTARIO: '0d93ea95-4d38-4b5e-b8c2-35c784564ff0',
  AUDITORIA: '4d08d16c-8e95-4e9e-b937-570cd49bb207',
} as const;

export interface Permission {
  Id?: number;
  PermissionEntity: string;
  PermissionAccess: string;
  ItemId?: string;
  ItemName?: string;
}

interface UseReportPermissionsResult {
  loading: boolean;
  error: string | null;
  permissions: Permission[];
  canAccessReport: (reportId: string) => boolean;
  accessibleReports: string[];
  refresh: () => Promise<void>;
}

const READ_ACCESS_LEVELS = ['Read', 'ReadWrite', 'ReadWriteDelete', 'Download'];

export function useReportPermissions(): UseReportPermissionsResult {
  const { boldReportsInfo, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permission[]>([]);

  const fetchPermissions = useCallback(async () => {
    // Skip if not synced with Bold Reports or if user is admin
    if (!boldReportsInfo.synced || !boldReportsInfo.userId) {
      console.log('[useReportPermissions] Skipping fetch - not synced or no userId');
      return;
    }

    // Admins have access to everything
    if (boldReportsInfo.isAdmin) {
      console.log('[useReportPermissions] User is admin - skipping permission fetch');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      console.log('[useReportPermissions] Fetching permissions for userId:', boldReportsInfo.userId);
      
      const { data, error: fetchError } = await supabase.functions.invoke('user-management', {
        body: {
          action: 'getPermissions',
          userId: boldReportsInfo.userId,
        },
      });

      if (fetchError) {
        console.error('[useReportPermissions] Error fetching permissions:', fetchError);
        setError(fetchError.message);
        return;
      }

      if (data?.success && Array.isArray(data.permissions)) {
        console.log('[useReportPermissions] Permissions fetched:', data.permissions.length);
        setPermissions(data.permissions);
      } else {
        console.warn('[useReportPermissions] No permissions in response:', data);
        setPermissions([]);
      }
    } catch (err) {
      console.error('[useReportPermissions] Exception:', err);
      setError(err instanceof Error ? err.message : 'Erro ao buscar permissões');
    } finally {
      setLoading(false);
    }
  }, [boldReportsInfo.synced, boldReportsInfo.userId, boldReportsInfo.isAdmin]);

  // Fetch permissions when Bold Reports sync completes
  useEffect(() => {
    if (boldReportsInfo.synced && !boldReportsInfo.isAdmin) {
      fetchPermissions();
    }
  }, [boldReportsInfo.synced, boldReportsInfo.isAdmin, fetchPermissions]);

  // Check if user can access a specific report
  const canAccessReport = useCallback((reportId: string): boolean => {
    // 1. Admin has access to everything
    if (boldReportsInfo.isAdmin) {
      return true;
    }

    // 2. If not synced, deny access (safer default)
    if (!boldReportsInfo.synced) {
      return false;
    }

    // 3. Check AllReports permission
    const hasAllReportsAccess = permissions.some(p => 
      p.PermissionEntity === 'AllReports' && 
      READ_ACCESS_LEVELS.includes(p.PermissionAccess)
    );
    if (hasAllReportsAccess) {
      return true;
    }

    // 4. Check SpecificReports with matching ItemId
    const hasSpecificAccess = permissions.some(p => 
      p.PermissionEntity === 'SpecificReports' && 
      p.ItemId === reportId &&
      READ_ACCESS_LEVELS.includes(p.PermissionAccess)
    );
    if (hasSpecificAccess) {
      return true;
    }

    // 5. No matching permission found
    return false;
  }, [boldReportsInfo.isAdmin, boldReportsInfo.synced, permissions]);

  // Compute list of accessible report IDs
  const accessibleReports = useMemo(() => {
    const allReportIds = Object.values(REPORT_IDS);
    return allReportIds.filter(reportId => canAccessReport(reportId));
  }, [canAccessReport]);

  return {
    loading,
    error,
    permissions,
    canAccessReport,
    accessibleReports,
    refresh: fetchPermissions,
  };
}
