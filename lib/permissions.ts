
import { AdminRole } from '@/types';

export type Permission = 
  | 'users.view'
  | 'users.create'
  | 'users.update'
  | 'users.delete'
  | 'users.kyc.approve'
  | 'transactions.view'
  | 'transactions.approve'
  | 'transactions.reject'
  | 'loans.view'
  | 'loans.approve'
  | 'loans.reject'
  | 'plans.view'
  | 'plans.create'
  | 'plans.update'
  | 'plans.delete'
  | 'tasks.view'
  | 'tasks.create'
  | 'tasks.update'
  | 'tasks.approve'
  | 'referrals.view'
  | 'referrals.approve'
  | 'notifications.view'
  | 'notifications.send'
  | 'news.view'
  | 'news.create'
  | 'news.update'
  | 'news.delete'
  | 'support.view'
  | 'support.respond'
  | 'audit.view'
  | 'dashboard.view'
  | 'settings.view'
  | 'settings.update'
  | 'admin.create'
  | 'admin.update'
  | 'admin.delete';

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  SuperAdmin: [
    // Full access to everything
    'users.view', 'users.create', 'users.update', 'users.delete', 'users.kyc.approve',
    'transactions.view', 'transactions.approve', 'transactions.reject',
    'loans.view', 'loans.approve', 'loans.reject',
    'plans.view', 'plans.create', 'plans.update', 'plans.delete',
    'tasks.view', 'tasks.create', 'tasks.update', 'tasks.approve',
    'referrals.view', 'referrals.approve',
    'notifications.view', 'notifications.send',
    'news.view', 'news.create', 'news.update', 'news.delete',
    'support.view', 'support.respond',
    'audit.view',
    'dashboard.view',
    'settings.view', 'settings.update',
    'admin.create', 'admin.update', 'admin.delete'
  ],
  Moderator: [
    // Limited access
    'users.view', 'users.update', 'users.kyc.approve',
    'transactions.view', 'transactions.approve', 'transactions.reject',
    'loans.view', 'loans.approve', 'loans.reject',
    'plans.view',
    'tasks.view', 'tasks.approve',
    'referrals.view',
    'notifications.view',
    'news.view',
    'support.view', 'support.respond',
    'dashboard.view'
  ]
};

export function hasPermission(userRole: AdminRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[userRole] || [];
  return rolePermissions.includes(permission);
}

export function hasAnyPermission(userRole: AdminRole, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(userRole, permission));
}

export function hasAllPermissions(userRole: AdminRole, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(userRole, permission));
}

export function filterByPermissions<T extends { action: Permission }>(
  userRole: AdminRole, 
  items: T[]
): T[] {
  return items.filter(item => hasPermission(userRole, item.action));
}

export function canAccessRoute(userRole: AdminRole, route: string): boolean {
  const routePermissions: Record<string, Permission[]> = {
    '/dashboard': ['dashboard.view'],
    '/users': ['users.view'],
    '/transactions': ['transactions.view'],
    '/loans': ['loans.view'],
    '/plans': ['plans.view'],
    '/tasks': ['tasks.view'],
    '/referrals': ['referrals.view'],
    '/notifications': ['notifications.view'],
    '/news': ['news.view'],
    '/support': ['support.view'],
    '/audit': ['audit.view'],
    '/settings': ['settings.view']
  };

  const requiredPermissions = routePermissions[route];
  if (!requiredPermissions) return false;

  return hasAnyPermission(userRole, requiredPermissions);
}
