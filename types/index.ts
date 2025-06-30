export * from './auth';
export * from './user';
export * from './transaction';
export * from './referral';
export * from './plan';
export * from './loan';
export * from './task';
export * from './notification';
export * from './news';
export * from './support';
export * from './dashboard';
export * from './api';
export * from './settings';
// Common utility types
export type Currency = 'USD' | 'BDT';
export type Status = 'Active' | 'Inactive' | 'Pending' | 'Approved' | 'Rejected';
export type Priority = 'Low' | 'Medium' | 'High' | 'Urgent';

export interface BaseEntity {
  _id: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface FilterParams {
  search?: string;
  status?: string;
  dateFrom?: string;
  dateTo?: string;
  [key: string]: any;
}

export interface SortParams {
  field: string;
  direction: 'asc' | 'desc';
}

export interface TableColumn<T = any> {
  key: keyof T;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  render?: (value: any, row: T) => React.ReactNode;
}
