
import { BaseEntity } from './index';

export type NewsStatus = 'Draft' | 'Published' | 'Archived';

export interface News extends BaseEntity {
  title: string;
  content: string;
  excerpt?: string;
  slug: string;
  author: string;
  category: string;
  tags: string[];
  featuredImage?: string;
  status: NewsStatus;
  isSticky: boolean;
  viewCount: number;
  publishedAt?: Date;
  metadata?: NewsMetadata;
}

export interface NewsMetadata {
  seoTitle?: string;
  seoDescription?: string;
  socialImage?: string;
  readingTime?: number;
  wordCount?: number;
}

export interface NewsCategory {
  name: string;
  slug: string;
  description: string;
  color: string;
  articlesCount: number;
}

export interface NewsAnalytics {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalViews: number;
  averageViews: number;
  popularArticles: PopularArticle[];
  categoryStats: CategoryStats[];
}

export interface PopularArticle {
  id: string;
  title: string;
  views: number;
  publishedAt: Date;
  category: string;
}

export interface CategoryStats {
  category: string;
  articlesCount: number;
  totalViews: number;
  averageViews: number;
}

export interface NewsFilter {
  search?: string;
  status?: NewsStatus;
  category?: string;
  author?: string;
  dateFrom?: string;
  dateTo?: string;
  isSticky?: boolean;
}

export interface NewsCreateRequest {
  title: string;
  content: string;
  excerpt?: string;
  category: string;
  tags: string[];
  featuredImage?: string;
  status: NewsStatus;
  isSticky?: boolean;
  publishedAt?: Date;
  metadata?: NewsMetadata;
}

export interface NewsUpdateRequest {
  title?: string;
  content?: string;
  excerpt?: string;
  category?: string;
  tags?: string[];
  featuredImage?: string;
  status?: NewsStatus;
  isSticky?: boolean;
  publishedAt?: Date;
}
