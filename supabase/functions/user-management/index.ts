import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Bold Reports configuration
const BOLD_SITE_ID = Deno.env.get('BOLD_SITE_ID') || '';
const BOLD_EMBED_SECRET = Deno.env.get('BOLD_EMBED_SECRET') || '';
const BOLD_EMAIL = Deno.env.get('BOLD_EMAIL') || '';

// External Supabase configuration
const EXTERNAL_SUPABASE_URL = Deno.env.get('EXTERNAL_SUPABASE_URL') || '';
const EXTERNAL_SUPABASE_SERVICE_KEY = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY') || '';

interface CreateUserPayload {
  action: 'create';
  email: string;
  firstName: string;
  lastName?: string;
  password: string;
}

interface UpdateUserPayload {
  action: 'update';
  email: string;
  firstName: string;
  lastName?: string;
  contactNumber?: string;
}

interface DeleteUserPayload {
  action: 'delete';
  email: string;
  boldUserId: number;
}

type RequestPayload = CreateUserPayload | UpdateUserPayload | DeleteUserPayload;

// Generate Bold Reports auth token
async function getBoldAuthToken(): Promise<string | null> {
  try {
    const nonce = crypto.randomUUID();
    const timestamp = Date.now();
    const message = `${BOLD_EMAIL}${nonce}${timestamp}`;
    
    const encoder = new TextEncoder();
    const keyData = encoder.encode(BOLD_EMBED_SECRET);
    const messageData = encoder.encode(message);
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signature = await crypto.subtle.sign('HMAC', cryptoKey, messageData);
    const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)));
    
    const tokenUrl = `https://${BOLD_SITE_ID}.boldreports.com/reporting/api/site/${BOLD_SITE_ID}/token`;
    
    const formData = new URLSearchParams();
    formData.append('grant_type', 'embed_secret');
    formData.append('username', BOLD_EMAIL);
    formData.append('embed_nonce', nonce);
    formData.append('embed_signature', signatureBase64);
    formData.append('timestamp', timestamp.toString());
    
    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData.toString(),
    });
    
    if (!response.ok) {
      console.error('[user-management] Token request failed:', response.status);
      return null;
    }
    
    const tokenData = await response.json();
    return tokenData.access_token || null;
  } catch (error) {
    console.error('[user-management] Error getting Bold token:', error);
    return null;
  }
}

// Create user in Bold Reports
async function createBoldUser(token: string, email: string, firstName: string, lastName: string, password: string): Promise<{ success: boolean; error?: string; userId?: number }> {
  try {
    const url = `https://${BOLD_SITE_ID}.boldreports.com/reporting/api/site/${BOLD_SITE_ID}/v1.0/users`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        Email: email,
        FirstName: firstName,
        Lastname: lastName || '',
        Password: password,
      }),
    });
    
    const data = await response.json();
    console.log('[user-management] Bold Reports create user response:', { status: response.status, data });
    
    if (!response.ok) {
      return { success: false, error: data.Message || data.error || 'Erro ao criar usuário no Bold Reports' };
    }
    
    return { success: true, userId: data.UserId || data.Id };
  } catch (error) {
    console.error('[user-management] Error creating Bold user:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// Update user in Bold Reports
async function updateBoldUser(token: string, email: string, firstName: string, lastName: string, contactNumber?: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://${BOLD_SITE_ID}.boldreports.com/reporting/api/site/${BOLD_SITE_ID}/v1.0/users/${encodeURIComponent(email)}`;
    
    const body: Record<string, string> = {
      FirstName: firstName,
      Lastname: lastName || '',
    };
    
    if (contactNumber) {
      body.ContactNumber = contactNumber;
    }
    
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    console.log('[user-management] Bold Reports update user response:', response.status);
    
    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.Message || data.error || 'Erro ao atualizar usuário no Bold Reports' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[user-management] Error updating Bold user:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// Delete user from Bold Reports
async function deleteBoldUser(token: string, email: string): Promise<{ success: boolean; error?: string }> {
  try {
    const url = `https://${BOLD_SITE_ID}.boldreports.com/reporting/api/site/${BOLD_SITE_ID}/v1.0/users/${encodeURIComponent(email)}`;
    
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    console.log('[user-management] Bold Reports delete user response:', response.status);
    
    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.Message || data.error || 'Erro ao excluir usuário no Bold Reports' };
    }
    
    return { success: true };
  } catch (error) {
    console.error('[user-management] Error deleting Bold user:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// Get user permissions from Bold Reports
async function getBoldUserPermissions(token: string, userId: number): Promise<{ success: boolean; permissions?: unknown[]; error?: string }> {
  try {
    const url = `https://${BOLD_SITE_ID}.boldreports.com/reporting/api/site/${BOLD_SITE_ID}/v1.0/permissions/users/${userId}`;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const data = await response.json();
      return { success: false, error: data.Message || 'Erro ao buscar permissões' };
    }
    
    const data = await response.json();
    console.log('[user-management] Bold Reports permissions response:', data);
    
    // The API returns different structures, handle both
    const permissions = data.Result || data.PermissionList || data || [];
    
    return { success: true, permissions: Array.isArray(permissions) ? permissions : [] };
  } catch (error) {
    console.error('[user-management] Error getting permissions:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido' };
  }
}

// Create external Supabase client with service role
function getExternalSupabaseAdmin() {
  return createClient(EXTERNAL_SUPABASE_URL, EXTERNAL_SUPABASE_SERVICE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    // GET request - fetch permissions
    if (req.method === 'GET') {
      const userId = url.searchParams.get('userId');
      
      if (!userId) {
        return new Response(
          JSON.stringify({ success: false, error: 'userId é obrigatório' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const token = await getBoldAuthToken();
      if (!token) {
        return new Response(
          JSON.stringify({ success: false, error: 'Falha na autenticação com Bold Reports' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      const result = await getBoldUserPermissions(token, parseInt(userId, 10));
      
      return new Response(
        JSON.stringify(result),
        { status: result.success ? 200 : 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST/PUT/DELETE - parse body
    const payload: RequestPayload = await req.json();
    
    // Get Bold Reports token
    const token = await getBoldAuthToken();
    if (!token) {
      return new Response(
        JSON.stringify({ success: false, error: 'Falha na autenticação com Bold Reports' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const externalSupabase = getExternalSupabaseAdmin();

    // CREATE USER
    if (payload.action === 'create') {
      const { email, firstName, lastName, password } = payload;
      
      console.log('[user-management] Creating user:', email);
      
      // 1. Create in Bold Reports
      const boldResult = await createBoldUser(token, email, firstName, lastName || '', password);
      if (!boldResult.success) {
        return new Response(
          JSON.stringify({ success: false, error: boldResult.error, stage: 'bold' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // 2. Create in external Supabase
      const { data: authData, error: authError } = await externalSupabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: `${firstName} ${lastName || ''}`.trim(),
        },
      });
      
      if (authError) {
        console.error('[user-management] Supabase create user error:', authError);
        // Rollback: try to delete from Bold Reports
        await deleteBoldUser(token, email);
        return new Response(
          JSON.stringify({ success: false, error: authError.message, stage: 'supabase' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // 3. Update profile to set needs_password_reset = true
      if (authData.user) {
        const { error: profileError } = await externalSupabase
          .from('profiles')
          .update({ needs_password_reset: true })
          .eq('id', authData.user.id);
        
        if (profileError) {
          console.error('[user-management] Profile update error:', profileError);
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Usuário criado com sucesso',
          userId: authData.user?.id,
          boldUserId: boldResult.userId,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // UPDATE USER
    if (payload.action === 'update') {
      const { email, firstName, lastName, contactNumber } = payload;
      
      console.log('[user-management] Updating user:', email);
      
      // 1. Update in Bold Reports
      const boldResult = await updateBoldUser(token, email, firstName, lastName || '', contactNumber);
      if (!boldResult.success) {
        return new Response(
          JSON.stringify({ success: false, error: boldResult.error, stage: 'bold' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // 2. Update in Supabase (profile)
      const fullName = `${firstName} ${lastName || ''}`.trim();
      
      const { error: profileError } = await externalSupabase
        .from('profiles')
        .update({ full_name: fullName })
        .eq('email', email);
      
      if (profileError) {
        console.error('[user-management] Profile update error:', profileError);
        // Don't rollback Bold, just warn
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'Usuário atualizado com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE USER
    if (payload.action === 'delete') {
      const { email } = payload;
      
      console.log('[user-management] Deleting user:', email);
      
      // 1. Delete from Bold Reports
      const boldResult = await deleteBoldUser(token, email);
      if (!boldResult.success) {
        return new Response(
          JSON.stringify({ success: false, error: boldResult.error, stage: 'bold' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      // 2. Find user in Supabase by email
      const { data: users, error: listError } = await externalSupabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('[user-management] List users error:', listError);
      } else {
        const userToDelete = users.users.find((u: { email?: string }) => u.email === email);
        if (userToDelete) {
          const { error: deleteError } = await externalSupabase.auth.admin.deleteUser(userToDelete.id);
          if (deleteError) {
            console.error('[user-management] Supabase delete user error:', deleteError);
          }
        }
      }
      
      return new Response(
        JSON.stringify({ success: true, message: 'Usuário excluído com sucesso' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Ação inválida' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[user-management] Error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
