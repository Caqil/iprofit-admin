import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  SupportTicket, 
  FAQ,
  LiveChat,
  TicketFilter,
  SupportAnalytics,
  PaginationParams,
  ListResponse 
} from '@/types';
import { toast } from 'sonner';

interface SupportHookReturn {
  // Tickets
  tickets: SupportTicket[];
  totalTickets: number;
  isTicketsLoading: boolean;
  
  // FAQs
  faqs: FAQ[];
  totalFAQs: number;
  isFAQsLoading: boolean;
  
  // Live Chat
  chats: LiveChat[];
  totalChats: number;
  isChatsLoading: boolean;
  
  // Analytics
  analytics: SupportAnalytics | undefined;
  isAnalyticsLoading: boolean;
  
  // Mutations
  createTicket: (data: Partial<SupportTicket>) => Promise<SupportTicket>;
  updateTicket: (id: string, data: Partial<SupportTicket>) => Promise<SupportTicket>;
  assignTicket: (id: string, adminId: string, notes?: string) => Promise<SupportTicket>;
  respondToTicket: (id: string, message: string, attachments?: any[]) => Promise<void>;
  updateTicketStatus: (id: string, status: string, resolution?: string) => Promise<SupportTicket>;
  deleteTicket: (id: string) => Promise<void>;
  
  createFAQ: (data: Partial<FAQ>) => Promise<FAQ>;
  updateFAQ: (id: string, data: Partial<FAQ>) => Promise<FAQ>;
  deleteFAQ: (id: string) => Promise<void>;
  submitFAQFeedback: (id: string, helpful: boolean) => Promise<void>;
  
  sendChatMessage: (chatId: string, message: string) => Promise<void>;
  updateChatStatus: (chatId: string, status: string) => Promise<LiveChat>;
  
  // Utilities
  refreshAll: () => void;
  error: string | null;
}

export function useSupport(
  ticketFilters?: TicketFilter,
  pagination?: PaginationParams
): SupportHookReturn {
  const queryClient = useQueryClient();

  // Tickets query
  const ticketsQuery = useQuery({
    queryKey: ['support', 'tickets', ticketFilters, pagination],
    queryFn: async (): Promise<ListResponse<SupportTicket>> => {
      const params = new URLSearchParams();
      
      if (ticketFilters) {
        Object.entries(ticketFilters).forEach(([key, value]) => {
          if (value !== undefined && value !== null && value !== '') {
            params.append(key, value.toString());
          }
        });
      }
      
      if (pagination) {
        params.append('page', pagination.page.toString());
        params.append('limit', pagination.limit.toString());
        if (pagination.sortBy) params.append('sortBy', pagination.sortBy);
        if (pagination.sortOrder) params.append('sortOrder', pagination.sortOrder);
      }

      const response = await fetch(`/api/support/tickets?${params}`);
      if (!response.ok) {
        throw new Error('Failed to fetch tickets');
      }

      const result = await response.json();
      return result.success ? result.data : result;
    },
    staleTime: 30 * 1000 // 30 seconds
  });

  // FAQs query
  const faqsQuery = useQuery({
    queryKey: ['support', 'faqs'],
    queryFn: async (): Promise<ListResponse<FAQ>> => {
      const response = await fetch('/api/support/faq');
      if (!response.ok) {
        throw new Error('Failed to fetch FAQs');
      }

      const result = await response.json();
      return result.success ? result.data : result;
    },
    staleTime: 5 * 60 * 1000 // 5 minutes
  });

  // Live chat query
  const chatsQuery = useQuery({
    queryKey: ['support', 'chats'],
    queryFn: async (): Promise<ListResponse<LiveChat>> => {
      const response = await fetch('/api/support/chat');
      if (!response.ok) {
        throw new Error('Failed to fetch chats');
      }

      const result = await response.json();
      return result.success ? result.data : result;
    },
    staleTime: 10 * 1000 // 10 seconds (more frequent for live data)
  });

  // Analytics query
  const analyticsQuery = useQuery({
    queryKey: ['support', 'analytics'],
    queryFn: async (): Promise<SupportAnalytics> => {
      const response = await fetch('/api/support/analytics');
      if (!response.ok) {
        throw new Error('Failed to fetch analytics');
      }

      const result = await response.json();
      return result.success ? result.data : result;
    },
    staleTime: 2 * 60 * 1000 // 2 minutes
  });

  // Mutations
  const createTicketMutation = useMutation({
    mutationFn: async (data: Partial<SupportTicket>) => {
      const response = await fetch('/api/support/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create ticket');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
      queryClient.invalidateQueries({ queryKey: ['support', 'analytics'] });
      toast.success('Support ticket created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<SupportTicket> }) => {
      const response = await fetch(`/api/support/tickets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update ticket');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
      toast.success('Ticket updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  const assignTicketMutation = useMutation({
    mutationFn: async ({ id, adminId, notes }: { id: string; adminId: string; notes?: string }) => {
      const response = await fetch(`/api/support/tickets/${id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminId, notes })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to assign ticket');
      }

      const result = await response.json();
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['support', 'tickets'] });
      toast.success('Ticket assigned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message);
    }
  });

  // Extract data with proper fallbacks
  const tickets = ticketsQuery.data?.data || [];
  const totalTickets = ticketsQuery.data?.pagination?.total || 0;
  
  const faqs = faqsQuery.data?.data || [];
  const totalFAQs = faqsQuery.data?.pagination?.total || 0;
  
  const chats = chatsQuery.data?.data || [];
  const totalChats = chatsQuery.data?.pagination?.total || 0;

  return {
    // Data
    tickets,
    totalTickets,
    isTicketsLoading: ticketsQuery.isLoading,
    
    faqs,
    totalFAQs,
    isFAQsLoading: faqsQuery.isLoading,
    
    chats,
    totalChats,
    isChatsLoading: chatsQuery.isLoading,
    
    analytics: analyticsQuery.data,
    isAnalyticsLoading: analyticsQuery.isLoading,
    
    // Mutations
    createTicket: createTicketMutation.mutateAsync,
    updateTicket: (id: string, data: Partial<SupportTicket>) => 
      updateTicketMutation.mutateAsync({ id, data }),
    assignTicket: (id: string, adminId: string, notes?: string) => 
      assignTicketMutation.mutateAsync({ id, adminId, notes }),
    
    // Placeholder functions for other mutations
    respondToTicket: async () => {},
    updateTicketStatus: async () => ({} as SupportTicket),
    deleteTicket: async () => {},
    createFAQ: async () => ({} as FAQ),
    updateFAQ: async () => ({} as FAQ),
    deleteFAQ: async () => {},
    submitFAQFeedback: async () => {},
    sendChatMessage: async () => {},
    updateChatStatus: async () => ({} as LiveChat),
    
    // Utilities
    refreshAll: () => {
      queryClient.invalidateQueries({ queryKey: ['support'] });
    },
    error: ticketsQuery.error?.message || faqsQuery.error?.message || chatsQuery.error?.message || null
  };
}