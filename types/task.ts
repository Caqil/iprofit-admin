import { BaseEntity, Currency } from './index';

export type TaskStatus = 'Active' | 'Inactive' | 'Paused';
export type TaskDifficulty = 'Easy' | 'Medium' | 'Hard';
export type SubmissionStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Task extends BaseEntity {
  name: string;
  description: string;
  criteria: string;
  reward: number;
  currency: Currency;
  category: string;
  difficulty: TaskDifficulty;
  estimatedTime: number;
  instructions: string[];
  requiredProof: string[];
  status: TaskStatus;
  maxCompletions?: number;
  currentCompletions: number;
  validFrom: Date;
  validUntil?: Date;
  isRepeatable: boolean;
  cooldownPeriod?: number;
  metadata?: TaskMetadata;
}

export interface TaskMetadata {
  externalUrl?: string;
  imageUrl?: string;
  tags?: string[];
  targetAudience?: string[];
  conversionGoals?: string[];
}

export interface TaskSubmission extends BaseEntity {
  taskId: string;
  userId: string;
  status: SubmissionStatus;
  proof: SubmissionProof[];
  submissionNote?: string;
  reviewNote?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  reward: number;
  transactionId?: string;
}

export interface SubmissionProof {
  type: string;
  content: string;
  uploadedAt: Date;
}

export interface TaskCategory {
  name: string;
  description: string;
  icon: string;
  color: string;
  taskCount: number;
  totalRewards: number;
}

export interface TaskAnalytics {
  totalTasks: number;
  activeTasks: number;
  totalSubmissions: number;
  approvedSubmissions: number;
  rejectedSubmissions: number;
  totalRewardsPaid: number;
  averageCompletionTime: number;
  popularCategories: TaskCategory[];
}

export interface TaskFilter {
  category?: string;
  status?: TaskStatus;
  difficulty?: TaskDifficulty;
  rewardMin?: number;
  rewardMax?: number;
  hasSubmissions?: boolean;
  validityPeriod?: 'active' | 'expired' | 'upcoming';
}

export interface TaskCreateRequest {
  name: string;
  description: string;
  criteria: string;
  reward: number;
  currency: Currency;
  category: string;
  difficulty: TaskDifficulty;
  estimatedTime: number;
  instructions: string[];
  requiredProof: string[];
  validFrom: Date;
  validUntil?: Date;
  maxCompletions?: number;
  isRepeatable?: boolean;
  cooldownPeriod?: number;
}

export interface TaskUpdateRequest {
  name?: string;
  description?: string;
  reward?: number;
  status?: TaskStatus;
  validUntil?: Date;
  maxCompletions?: number;
}
