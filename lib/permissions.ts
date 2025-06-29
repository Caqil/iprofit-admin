import { AdminRole } from '@/types';

export type Permission = 
  // User management permissions
  | 'users.view'
  | 'users.create'
  | 'users.update'
  | 'users.delete'
  | 'users.kyc.approve'
  | 'users.kyc.reject'
  | 'users.block'
  | 'users.unblock'
  | 'users.export'
  
  // Transaction permissions
  | 'transactions.view'
  | 'transactions.create'
  | 'transactions.update'
  | 'transactions.delete'
  | 'transactions.approve'
  | 'transactions.reject'
  | 'transactions.export'
  | 'transactions.reverse'
  
  // Loan permissions
  | 'loans.read'
  | 'loans.view'
  | 'loans.create'
  | 'loans.update'
  | 'loans.delete'
  | 'loans.approve'
  | 'loans.reject'
  | 'loans.disburse'
  | 'loans.export'
  
  // Plan permissions
  | 'plans.read'
  | 'plans.view'
  | 'plans.create'
  | 'plans.update'
  | 'plans.delete'
  | 'plans.activate'
  | 'plans.deactivate'
  | 'plans.export'
  
  // Task permissions
  | 'tasks.read'
  | 'tasks.view'
  | 'tasks.create'
  | 'tasks.update'
  | 'tasks.delete'
  | 'tasks.approve'
  | 'tasks.reject'
  | 'tasks.assign'
  | 'tasks.complete'
  
  // Referral permissions
  | 'referrals.read'
  | 'referrals.view'
  | 'referrals.create'
  | 'referrals.update'
  | 'referrals.delete'
  | 'referrals.approve'
  | 'referrals.reject'
  | 'referrals.export'
  
  // Notification permissions
  | 'notifications.read'
  | 'notifications.view'
  | 'notifications.create'
  | 'notifications.update'
  | 'notifications.delete'
  | 'notifications.send'
  | 'notifications.broadcast'
  | 'notifications.schedule'
  
  // News permissions
  | 'news.read'
  | 'news.view'
  | 'news.create'
  | 'news.update'
  | 'news.delete'
  | 'news.publish'
  | 'news.unpublish'
  | 'news.schedule'
  
  // Support permissions
  | 'support.read'
  | 'support.view'
  | 'support.create'
  | 'support.update'
  | 'support.delete'
  | 'support.respond'
  | 'support.assign'
  | 'support.close'
  | 'support.escalate'
  | 'support.export'
  | 'support.analytics' 
  
  // Audit permissions
  | 'audit.read'
  | 'audit.view'
  | 'audit.export'
  | 'audit.delete'
  
  // Dashboard permissions
  | 'dashboard.read'
  | 'dashboard.view'
  | 'dashboard.analytics'
  | 'dashboard.reports'
  | 'dashboard.export'
  
  // Settings permissions
  | 'settings.view'
  | 'settings.update'
  | 'settings.system'
  | 'settings.security'
  | 'settings.maintenance'
  | 'settings.backup'
  | 'settings.restore'
  
  // Admin management permissions
  | 'admin.view'
  | 'admin.create'
  | 'admin.update'
  | 'admin.delete'
  | 'admin.roles'
  | 'admin.permissions'
  
  // Reports permissions
  | 'reports.view'
  | 'reports.create'
  | 'reports.export'
  | 'reports.schedule'
  
  // Analytics permissions
  | 'analytics.view'
  | 'analytics.advanced'
  | 'analytics.export'
  
  // Financial permissions
  | 'finance.view'
  | 'finance.manage'
  | 'finance.reconcile'
  | 'finance.export'
  
  // System permissions
  | 'system.logs'
  | 'system.maintenance'
  | 'system.backup'
  | 'system.restore'
  | 'system.config'
  
  // Content permissions
  | 'content.view'
  | 'content.create'
  | 'content.update'
  | 'content.delete'
  | 'content.publish'
  
  // Communication permissions
  | 'communication.sms'
  | 'communication.email'
  | 'communication.push'
  | 'communication.broadcast';

export const ROLE_PERMISSIONS: Record<AdminRole, Permission[]> = {
  SuperAdmin: [
    // Full access to everything - all permissions
    'users.view', 'users.create', 'users.update', 'users.delete', 'users.kyc.approve', 'users.kyc.reject', 'users.block', 'users.unblock', 'users.export',
    'transactions.view', 'transactions.create', 'transactions.update', 'transactions.delete', 'transactions.approve', 'transactions.reject', 'transactions.export', 'transactions.reverse',
    'loans.read', 'loans.view', 'loans.create', 'loans.update', 'loans.delete', 'loans.approve', 'loans.reject', 'loans.disburse', 'loans.export',
    'plans.read', 'plans.view', 'plans.create', 'plans.update', 'plans.delete', 'plans.activate', 'plans.deactivate', 'plans.export',
    'tasks.read', 'tasks.view', 'tasks.create', 'tasks.update', 'tasks.delete', 'tasks.approve', 'tasks.reject', 'tasks.assign', 'tasks.complete',
    'referrals.read', 'referrals.view', 'referrals.create', 'referrals.update', 'referrals.delete', 'referrals.approve', 'referrals.reject', 'referrals.export',
    'notifications.read', 'notifications.view', 'notifications.create', 'notifications.update', 'notifications.delete', 'notifications.send', 'notifications.broadcast', 'notifications.schedule',
    'news.read', 'news.view', 'news.create', 'news.update', 'news.delete', 'news.publish', 'news.unpublish', 'news.schedule',
    'support.read', 'support.view', 'support.create', 'support.update', 'support.delete', 'support.respond', 'support.assign', 'support.close', 'support.escalate', 'support.export',
    'audit.read', 'audit.view', 'audit.export', 'audit.delete',
    'dashboard.read', 'dashboard.view', 'dashboard.analytics', 'dashboard.reports', 'dashboard.export',
    'settings.view', 'settings.update', 'settings.system', 'settings.security', 'settings.maintenance', 'settings.backup', 'settings.restore',
    'admin.view', 'admin.create', 'admin.update', 'admin.delete', 'admin.roles', 'admin.permissions',
    'reports.view', 'reports.create', 'reports.export', 'reports.schedule',
    'analytics.view', 'analytics.advanced', 'analytics.export',
    'finance.view', 'finance.manage', 'finance.reconcile', 'finance.export',
    'system.logs', 'system.maintenance', 'system.backup', 'system.restore', 'system.config',
    'content.view', 'content.create', 'content.update', 'content.delete', 'content.publish',
    'communication.sms', 'communication.email', 'communication.push', 'communication.broadcast','support.analytics',
  ],
  
  Admin: [
    // Comprehensive admin access with some restrictions
    'users.view', 'users.create', 'users.update', 'users.kyc.approve', 'users.kyc.reject', 'users.block', 'users.unblock', 'users.export',
    'transactions.view', 'transactions.create', 'transactions.update', 'transactions.approve', 'transactions.reject', 'transactions.export',
    'loans.read', 'loans.view', 'loans.create', 'loans.update', 'loans.approve', 'loans.reject', 'loans.disburse', 'loans.export',
    'plans.read', 'plans.view', 'plans.create', 'plans.update', 'plans.activate', 'plans.deactivate', 'plans.export',
    'tasks.read', 'tasks.view', 'tasks.create', 'tasks.update', 'tasks.approve', 'tasks.reject', 'tasks.assign', 'tasks.complete',
    'referrals.read', 'referrals.view', 'referrals.create', 'referrals.update', 'referrals.approve', 'referrals.reject', 'referrals.export',
    'notifications.read', 'notifications.view', 'notifications.create', 'notifications.update', 'notifications.send', 'notifications.broadcast', 'notifications.schedule',
    'news.read', 'news.view', 'news.create', 'news.update', 'news.publish', 'news.unpublish', 'news.schedule',
    'support.read', 'support.view', 'support.create', 'support.update', 'support.respond', 'support.assign', 'support.close', 'support.escalate', 'support.export',
    'audit.read', 'audit.view', 'audit.export',
    'dashboard.read', 'dashboard.view', 'dashboard.analytics', 'dashboard.reports', 'dashboard.export',
    'settings.view', 'settings.update',
    'admin.view', 'admin.create', 'admin.update',
    'reports.view', 'reports.create', 'reports.export', 'reports.schedule',
    'analytics.view', 'analytics.advanced', 'analytics.export',
    'finance.view', 'finance.manage', 'finance.reconcile', 'finance.export',
    'content.view', 'content.create', 'content.update', 'content.publish',
    'communication.sms', 'communication.email', 'communication.push', 'communication.broadcast','support.analytics',
  ],
  
  Moderator: [
    // Limited access for moderation tasks
    'users.view', 'users.update', 'users.kyc.approve', 'users.kyc.reject', 'users.export',
    'transactions.view', 'transactions.approve', 'transactions.reject', 'transactions.export',
    'loans.read', 'loans.view', 'loans.approve', 'loans.reject', 'loans.export',
    'plans.read', 'plans.view', 'plans.export',
    'tasks.read', 'tasks.view', 'tasks.approve', 'tasks.reject', 'tasks.complete',
    'referrals.read', 'referrals.view', 'referrals.approve', 'referrals.reject', 'referrals.export',
    'notifications.read', 'notifications.view', 'notifications.send',
    'news.read', 'news.view', 'news.create', 'news.update',
    'support.read', 'support.view', 'support.respond', 'support.assign', 'support.close', 'support.export',
    'dashboard.read', 'dashboard.view', 'dashboard.reports', 'dashboard.export',
    'reports.view', 'reports.export',
    'analytics.view', 'analytics.export',
    'content.view', 'content.create', 'content.update'
  ],
  
  Manager: [
    // Management level access
    'users.view', 'users.update', 'users.kyc.approve', 'users.block', 'users.unblock', 'users.export',
    'transactions.view', 'transactions.create', 'transactions.update', 'transactions.approve', 'transactions.reject', 'transactions.export',
    'loans.read', 'loans.view', 'loans.create', 'loans.update', 'loans.approve', 'loans.reject', 'loans.disburse', 'loans.export',
    'plans.read', 'plans.view', 'plans.create', 'plans.update', 'plans.activate', 'plans.deactivate', 'plans.export',
    'tasks.read', 'tasks.view', 'tasks.create', 'tasks.update', 'tasks.approve', 'tasks.assign', 'tasks.complete',
    'referrals.read', 'referrals.view', 'referrals.create', 'referrals.update', 'referrals.approve', 'referrals.export',
    'notifications.read', 'notifications.view', 'notifications.create', 'notifications.send', 'notifications.broadcast', 'notifications.schedule',
    'news.read', 'news.view', 'news.create', 'news.update', 'news.publish', 'news.schedule',
    'support.read', 'support.view', 'support.create', 'support.update', 'support.respond', 'support.assign', 'support.close', 'support.escalate', 'support.export',
    'audit.read', 'audit.view', 'audit.export',
    'dashboard.read', 'dashboard.view', 'dashboard.analytics', 'dashboard.reports', 'dashboard.export',
    'settings.view', 'settings.update',
    'reports.view', 'reports.create', 'reports.export', 'reports.schedule',
    'analytics.view', 'analytics.advanced', 'analytics.export',
    'finance.view', 'finance.manage', 'finance.export',
    'content.view', 'content.create', 'content.update', 'content.publish',
    'communication.sms', 'communication.email', 'communication.push'
  ],
  
  Support: [
    // Support staff access
    'users.view', 'users.update', 'users.export',
    'transactions.view', 'transactions.export',
    'loans.read', 'loans.view', 'loans.export',
    'plans.read', 'plans.view', 'plans.export',
    'tasks.read', 'tasks.view', 'tasks.create', 'tasks.update', 'tasks.complete',
    'referrals.read', 'referrals.view', 'referrals.export',
    'notifications.read', 'notifications.view', 'notifications.send',
    'news.read', 'news.view',
    'support.read', 'support.view', 'support.create', 'support.update', 'support.respond', 'support.close', 'support.export',
    'dashboard.read', 'dashboard.view', 'dashboard.reports',
    'reports.view', 'reports.export',
    'content.view',
    'communication.email'
  ],
  
  Viewer: [
    // Read-only access
    'users.view',
    'transactions.view',
    'loans.read', 'loans.view',
    'plans.read', 'plans.view',
    'tasks.read', 'tasks.view',
    'referrals.read', 'referrals.view',
    'notifications.read', 'notifications.view',
    'news.read', 'news.view',
    'support.read', 'support.view',
    'audit.read', 'audit.view',
    'dashboard.read', 'dashboard.view',
    'reports.view',
    'analytics.view',
    'content.view'
  ]
};

// Helper functions
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
    '/users/create': ['users.create'],
    '/users/edit': ['users.update'],
    '/users/kyc': ['users.kyc.approve'],
    '/transactions': ['transactions.view'],
    '/transactions/create': ['transactions.create'],
    '/transactions/approve': ['transactions.approve'],
    '/loans': ['loans.view'],
    '/loans/create': ['loans.create'],
    '/loans/approve': ['loans.approve'],
    '/plans': ['plans.view'],
    '/plans/create': ['plans.create'],
    '/plans/edit': ['plans.update'],
    '/tasks': ['tasks.view'],
    '/tasks/create': ['tasks.create'],
    '/tasks/manage': ['tasks.update'],
    '/referrals': ['referrals.view'],
    '/referrals/manage': ['referrals.update'],
    '/notifications': ['notifications.view'],
    '/notifications/create': ['notifications.create'],
    '/notifications/send': ['notifications.send'],
    '/news': ['news.view'],
    '/news/create': ['news.create'],
    '/news/edit': ['news.update'],
    '/support': ['support.view'],
    '/support/tickets': ['support.view'],
    '/support/respond': ['support.respond'],
    '/audit': ['audit.view'],
    '/audit/logs': ['audit.view'],
    '/settings': ['settings.view'],
    '/settings/system': ['settings.system'],
    '/settings/security': ['settings.security'],
    '/admin': ['admin.view'],
    '/admin/create': ['admin.create'],
    '/admin/roles': ['admin.roles'],
    '/reports': ['reports.view'],
    '/reports/create': ['reports.create'],
    '/analytics': ['analytics.view'],
    '/analytics/advanced': ['analytics.advanced'],
    '/finance': ['finance.view'],
    '/finance/reconcile': ['finance.reconcile'],
    '/content': ['content.view'],
    '/content/create': ['content.create']
  };

  const requiredPermissions = routePermissions[route];
  if (!requiredPermissions) return false;

  return hasAnyPermission(userRole, requiredPermissions);
}

// Get permissions for a specific role
export function getRolePermissions(role: AdminRole): Permission[] {
  return ROLE_PERMISSIONS[role] || [];
}

// Get all available permissions
export function getAllPermissions(): Permission[] {
  return [
    // User permissions
    'users.view', 'users.create', 'users.update', 'users.delete', 'users.kyc.approve', 'users.kyc.reject', 'users.block', 'users.unblock', 'users.export',
    // Transaction permissions
    'transactions.view', 'transactions.create', 'transactions.update', 'transactions.delete', 'transactions.approve', 'transactions.reject', 'transactions.export', 'transactions.reverse',
    // Loan permissions
    'loans.read', 'loans.view', 'loans.create', 'loans.update', 'loans.delete', 'loans.approve', 'loans.reject', 'loans.disburse', 'loans.export',
    // Plan permissions
    'plans.read', 'plans.view', 'plans.create', 'plans.update', 'plans.delete', 'plans.activate', 'plans.deactivate', 'plans.export',
    // Task permissions
    'tasks.read', 'tasks.view', 'tasks.create', 'tasks.update', 'tasks.delete', 'tasks.approve', 'tasks.reject', 'tasks.assign', 'tasks.complete',
    // Referral permissions
    'referrals.read', 'referrals.view', 'referrals.create', 'referrals.update', 'referrals.delete', 'referrals.approve', 'referrals.reject', 'referrals.export',
    // Notification permissions
    'notifications.read', 'notifications.view', 'notifications.create', 'notifications.update', 'notifications.delete', 'notifications.send', 'notifications.broadcast', 'notifications.schedule',
    // News permissions
    'news.read', 'news.view', 'news.create', 'news.update', 'news.delete', 'news.publish', 'news.unpublish', 'news.schedule',
    // Support permissions
    'support.read', 'support.view', 'support.create', 'support.update', 'support.delete', 'support.respond', 'support.assign', 'support.close', 'support.escalate', 'support.export',
    // Audit permissions
    'audit.read', 'audit.view', 'audit.export', 'audit.delete',
    // Dashboard permissions
    'dashboard.read', 'dashboard.view', 'dashboard.analytics', 'dashboard.reports', 'dashboard.export',
    // Settings permissions
    'settings.view', 'settings.update', 'settings.system', 'settings.security', 'settings.maintenance', 'settings.backup', 'settings.restore',
    // Admin permissions
    'admin.view', 'admin.create', 'admin.update', 'admin.delete', 'admin.roles', 'admin.permissions',
    // Report permissions
    'reports.view', 'reports.create', 'reports.export', 'reports.schedule',
    // Analytics permissions
    'analytics.view', 'analytics.advanced', 'analytics.export',
    // Finance permissions
    'finance.view', 'finance.manage', 'finance.reconcile', 'finance.export',
    // System permissions
    'system.logs', 'system.maintenance', 'system.backup', 'system.restore', 'system.config',
    // Content permissions
    'content.view', 'content.create', 'content.update', 'content.delete', 'content.publish',
    // Communication permissions
    'communication.sms', 'communication.email', 'communication.push', 'communication.broadcast'
  ];
}

// Check if user can perform bulk operations
export function canPerformBulkOperation(userRole: AdminRole, operation: string): boolean {
  const bulkPermissions: Record<string, Permission[]> = {
    'users': ['users.update', 'users.delete'],
    'transactions': ['transactions.update', 'transactions.approve'],
    'loans': ['loans.update', 'loans.approve'],
    'notifications': ['notifications.broadcast'],
    'export': ['users.export', 'transactions.export', 'loans.export']
  };

  const requiredPermissions = bulkPermissions[operation];
  if (!requiredPermissions) return false;

  return hasAnyPermission(userRole, requiredPermissions);
}

// Get permission level for a user action
export function getPermissionLevel(userRole: AdminRole, resource: string): 'none' | 'read' | 'write' | 'admin' {
  const readPermissions = [`${resource}.read`, `${resource}.view`];
  const writePermissions = [`${resource}.create`, `${resource}.update`];
  const adminPermissions = [`${resource}.delete`, `${resource}.approve`];

  if (hasAnyPermission(userRole, adminPermissions as Permission[])) return 'admin';
  if (hasAnyPermission(userRole, writePermissions as Permission[])) return 'write';
  if (hasAnyPermission(userRole, readPermissions as Permission[])) return 'read';
  return 'none';
}