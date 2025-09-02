import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthUser } from '@/hooks/useAuthUser';
import { useToast } from '@/hooks/use-toast';

export interface ApiKey {
  id: string;
  user_id: string;
  label: string;
  key_preview: string;
  created_at: string;
  last_used?: string;
  revoked: boolean;
}

export const useApiKeys = () => {
  const { user } = useAuthUser();
  const { toast } = useToast();
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchApiKeys = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setApiKeys(data || []);
    } catch (error) {
      console.error('Error fetching API keys:', error);
      toast({
        title: "Error",
        description: "Failed to load API keys",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const generateApiKey = () => {
    // Generate a secure random API key
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = 'ak_'; // API key prefix
    for (let i = 0; i < 40; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const createApiKey = async (label: string) => {
    if (!user) return;

    try {
      const fullKey = generateApiKey();
      const keyPreview = `${fullKey.slice(0, 8)}...${fullKey.slice(-4)}`;

      const { data, error } = await supabase
        .from('api_keys')
        .insert([{
          user_id: user.id,
          label,
          key_preview: keyPreview,
          revoked: false
        }])
        .select()
        .single();

      if (error) throw error;

      setApiKeys(prev => [data, ...prev]);
      
      toast({
        title: "Success",
        description: "API key created successfully",
      });

      return { key: fullKey, preview: keyPreview };
    } catch (error) {
      console.error('Error creating API key:', error);
      toast({
        title: "Error",
        description: "Failed to create API key",
        variant: "destructive",
      });
      throw error;
    }
  };

  const revokeApiKey = async (keyId: string) => {
    try {
      const { data, error } = await supabase
        .from('api_keys')
        .update({ revoked: true })
        .eq('id', keyId)
        .select()
        .single();

      if (error) throw error;

      setApiKeys(prev => prev.map(key => 
        key.id === keyId ? { ...key, revoked: true } : key
      ));

      toast({
        title: "Success",
        description: "API key revoked successfully",
      });
    } catch (error) {
      console.error('Error revoking API key:', error);
      toast({
        title: "Error",
        description: "Failed to revoke API key",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, [user]);

  return {
    apiKeys,
    loading,
    createApiKey,
    revokeApiKey,
    refetch: fetchApiKeys
  };
};