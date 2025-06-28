import { BaseEntity } from './index';

export type TicketStatus = 'Open' | 'In Progress' | 'Waiting for User' | 'Resolved' | 'Closed';
export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface SupportTicket extends BaseEntity {
  userId: string;
  ticketNumber: string;
  subject: string;
  message: string;
  category: string;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;
  attachments: TicketAttachment[];
  responses: TicketResponse[];
  tags: string[];
  resolution?: string;
  satisfactionRating?: number;
  feedbackComment?: string;
  resolvedAt?: Date;
  closedAt?: Date;
  lastResponseAt: Date;
  responseTime?: number;
  resolutionTime?: number;
  metadata?: TicketMetadata;
}

export interface TicketAttachment {
  filename: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
}

export interface TicketResponse {
  message: string;
  isAdminResponse: boolean;
  adminId?: string;
  attachments?: TicketAttachment[];
  createdAt: Date;
}

export interface TicketMetadata {
  ipAddress?: string;
  userAgent?: string;
  source?: string;
  relatedTickets?: string[];
}

export interface FAQ extends BaseEntity {
  question: string;
  answer: string;
  category: string;
  tags: string[];
  priority: number;
  isActive: boolean;
  viewCount: number;
  helpfulCount: number;
  notHelpfulCount: number;
  createdBy: string;
  updatedBy?: string;
}

export interface TicketCategory {
  name: string;
  description: string;
  color: string;
  assignmentRules: AssignmentRule[];
  slaHours: number;
}

export interface AssignmentRule {
  condition: string;
  adminId: string;
  priority: number;
}

export interface SupportAnalytics {
  totalTickets: number;
  openTickets: number;
  resolvedTickets: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  satisfactionScore: number;
  ticketsByCategory: CategoryTicketStats[];
  ticketsByStatus: StatusTicketStats[];
  agentPerformance: AgentPerformance[];
}

export interface CategoryTicketStats {
  category: string;
  count: number;
  averageResolutionTime: number;
  satisfactionScore: number;
}

export interface StatusTicketStats {
  status: TicketStatus;
  count: number;
  percentage: number;
}

export interface AgentPerformance {
  adminId: string;
  adminName: string;
  assignedTickets: number;
  resolvedTickets: number;
  averageResponseTime: number;
  averageResolutionTime: number;
  satisfactionScore: number;
}

export interface LiveChat {
  id: string;
  userId: string;
  adminId?: string;
  status: 'Waiting' | 'Active' | 'Ended';
  messages: ChatMessage[];
  startedAt: Date;
  endedAt?: Date;
  rating?: number;
  feedback?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderType: 'user' | 'admin';
  message: string;
  timestamp: Date;
  isRead: boolean;
}

export interface TicketFilter {
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: string;
  assignedTo?: string;
  userId?: string;
  dateFrom?: string;
  dateTo?: string;
  isOverdue?: boolean;
}
