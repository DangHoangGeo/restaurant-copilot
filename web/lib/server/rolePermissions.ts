import { AuthUser } from './getUserFromRequest';
import { NextResponse } from 'next/server';

export type UserRole = 'owner' | 'manager' | 'chef' | 'server';

export interface RolePermissions {
  categories: UserRole[];
  menu_items: UserRole[];
  menu_item_sizes: UserRole[];
  toppings: UserRole[];
  tables: UserRole[];
  orders: UserRole[];
  order_items: UserRole[];
  reviews: UserRole[];
  feedback: UserRole[];
  inventory_items: UserRole[];
  bookings: UserRole[];
  employees: UserRole[];
  schedules: UserRole[];
  analytics: UserRole[];
  settings: UserRole[];
}

// Define role permissions for different resources and operations
export const ROLE_PERMISSIONS: RolePermissions = {
  categories: ['owner', 'manager'],
  menu_items: ['owner', 'manager', 'chef'],
  menu_item_sizes: ['owner', 'manager', 'chef'],
  toppings: ['owner', 'manager', 'chef'],
  tables: ['owner', 'manager'],
  orders: ['owner', 'manager', 'server'],
  order_items: ['owner', 'manager', 'server'],
  reviews: ['owner', 'manager'],
  feedback: ['owner', 'manager'],
  inventory_items: ['owner', 'manager'],
  bookings: ['owner', 'manager', 'server'],
  employees: ['owner', 'manager'],
  schedules: ['owner', 'manager'],
  analytics: ['owner', 'manager'],
  settings: ['owner', 'manager'],
};

// Special permissions for DELETE operations (more restrictive)
export const DELETE_PERMISSIONS: Partial<RolePermissions> = {
  orders: ['owner', 'manager'], // servers can't delete orders
  order_items: ['owner', 'manager'], // servers can't delete order items
  bookings: ['owner', 'manager'], // servers can't delete bookings
};

/**
 * Check if a user has permission to perform an operation on a resource
 * @param user - The authenticated user
 * @param resource - The resource being accessed
 * @param operation - The operation being performed (INSERT, UPDATE, DELETE)
 * @returns boolean indicating if the user has permission
 */
export function hasPermission(
  user: AuthUser,
  resource: keyof RolePermissions,
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT' = 'SELECT'
): boolean {
  if (!user || !user.role) {
    return false;
  }

  const userRole = user.role as UserRole;
  
  // For DELETE operations, use more restrictive permissions if defined
  if (operation === 'DELETE' && DELETE_PERMISSIONS[resource]) {
    return DELETE_PERMISSIONS[resource]!.includes(userRole);
  }

  // For all other operations, use standard permissions
  return ROLE_PERMISSIONS[resource].includes(userRole);
}

/**
 * Middleware function to check user authorization before proceeding with API logic
 * @param user - The authenticated user
 * @param resource - The resource being accessed
 * @param operation - The operation being performed
 * @returns NextResponse with 403 error if unauthorized, null if authorized
 */
export function checkAuthorization(
  user: AuthUser | null,
  resource: keyof RolePermissions,
  operation: 'INSERT' | 'UPDATE' | 'DELETE' | 'SELECT' = 'SELECT'
): NextResponse | null {
  if (!user || !user.restaurantId) {
    return NextResponse.json(
      { error: 'Unauthorized: Missing user or restaurant ID' },
      { status: 401 }
    );
  }

  if (!hasPermission(user, resource, operation)) {
    return NextResponse.json(
      { 
        error: 'Forbidden: Insufficient permissions',
        details: `User with role '${user.role}' cannot ${operation} ${resource}`
      },
      { status: 403 }
    );
  }

  return null; // Authorization passed
}

/**
 * Get user role display name
 * @param role - The user role
 * @returns string display name for the role
 */
export function getRoleDisplayName(role: UserRole): string {
  const roleNames = {
    owner: 'Owner',
    manager: 'Manager',
    chef: 'Chef',
    server: 'Server'
  };
  return roleNames[role] || 'Unknown';
}

/**
 * Get all permissions for a specific role
 * @param role - The user role
 * @returns object with resources and their allowed operations
 */
export function getRolePermissions(role: UserRole): Record<string, string[]> {
  const permissions: Record<string, string[]> = {};
  
  for (const [resource, allowedRoles] of Object.entries(ROLE_PERMISSIONS)) {
    if (allowedRoles.includes(role)) {
      permissions[resource] = ['SELECT', 'INSERT', 'UPDATE'];
      
      // Check if DELETE is allowed for this resource
      if (!DELETE_PERMISSIONS[resource as keyof RolePermissions] || 
          DELETE_PERMISSIONS[resource as keyof RolePermissions]!.includes(role)) {
        permissions[resource].push('DELETE');
      }
    }
  }
  
  return permissions;
}
