import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface EmailAccount {
  id: string;
  user_id: string;
  provider: 'resend' | 'gmail' | 'outlook' | 'siteground' | 'custom';
  email_address: string;
  display_name: string | null;
  smtp_host: string;
  smtp_port: number;
  imap_host: string;
  imap_port: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EmailMessage {
  id: string;
  account_id: string;
  message_id: string;
  folder: 'inbox' | 'sent' | 'drafts' | 'trash';
  from_address: string;
  from_name: string | null;
  to_addresses: string[];
  cc_addresses: string[];
  bcc_addresses: string[];
  subject: string | null;
  body_text: string | null;
  body_html: string | null;
  is_read: boolean;
  is_starred: boolean;
  has_attachments: boolean;
  follow_up_at: string | null;
  received_at: string;
  created_at: string;
}

export interface EmailAccountConfig {
  provider: 'resend' | 'gmail' | 'outlook' | 'siteground' | 'custom';
  email_address: string;
  display_name?: string;
  smtp_host?: string;
  smtp_port?: number;
  imap_host?: string;
  imap_port?: number;
  password: string;
}

export interface SendEmailRequest {
  account_id: string;
  to: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  body_text?: string;
  body_html?: string;
  reply_to_message_id?: string;
}

export function useEmailAccounts() {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['email-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke('email-accounts', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw new Error(error.message);
      return data.accounts as EmailAccount[];
    },
    enabled: !!session?.access_token,
  });
}

export function useCreateEmailAccount() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (config: EmailAccountConfig) => {
      const { data, error } = await supabase.functions.invoke('email-accounts', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: config,
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      return data.account as EmailAccount;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
    },
  });
}

export function useTestEmailAccount() {
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (config: EmailAccountConfig) => {
      const { data, error } = await supabase.functions.invoke('email-accounts?action=test', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: config,
      });

      if (error) throw new Error(error.message);
      return data as { success: boolean; message: string };
    },
  });
}

export function useDeleteEmailAccount() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (accountId: string) => {
      const { data, error } = await supabase.functions.invoke(`email-accounts?id=${accountId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-accounts'] });
    },
  });
}

export function useEmailMessages(accountId: string | null, folder: string = 'inbox', page: number = 1, search?: string) {
  const { session } = useAuth();

  return useQuery({
    queryKey: ['email-messages', accountId, folder, page, search],
    queryFn: async () => {
      const params = new URLSearchParams({
        folder,
        page: page.toString(),
        limit: '50',
      });
      if (accountId) params.set('account_id', accountId);
      if (search) params.set('search', search);

      const { data, error } = await supabase.functions.invoke(`email-sync?${params}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw new Error(error.message);
      return {
        messages: data.messages as EmailMessage[],
        total: data.total as number,
        page: data.page as number,
        totalPages: data.total_pages as number,
      };
    },
    enabled: !!session?.access_token,
  });
}

export function useSyncEmails() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ account_id, folder }: { account_id: string; folder?: string }) => {
      const { data, error } = await supabase.functions.invoke('email-sync', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: { account_id, folder },
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-messages'] });
    },
  });
}

export function useSendEmail() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async (request: SendEmailRequest) => {
      const { data, error } = await supabase.functions.invoke('email-send', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: request,
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-messages'] });
    },
  });
}

export function useUpdateEmailMessage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<EmailMessage> }) => {
      const { data, error } = await supabase.functions.invoke(`email-sync?id=${id}`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${session?.access_token}` },
        body: updates,
      });

      if (error) throw new Error(error.message);
      return data.message as EmailMessage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-messages'] });
    },
  });
}

export function useDeleteEmailMessage() {
  const queryClient = useQueryClient();
  const { session } = useAuth();

  return useMutation({
    mutationFn: async ({ id, permanent }: { id: string; permanent?: boolean }) => {
      const { data, error } = await supabase.functions.invoke(`email-sync?id=${id}${permanent ? '&permanent=true' : ''}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });

      if (error) throw new Error(error.message);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-messages'] });
    },
  });
}
