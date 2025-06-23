// Defines constant values used throughout the application

export const USER_ROLES = {
  OWNER: 'owner',
  MANAGER: 'manager',
  CHEF: 'chef',
  SERVER: 'server',
  CASHIER: 'cashier',
  EMPLOYEE: 'employee', // General employee role for users table
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

export const EMPLOYEE_JOB_TITLES = {
  MANAGER: 'manager',
  CHEF: 'chef',
  SERVER: 'server',
  CASHIER: 'cashier',
} as const;

export type EmployeeJobTitle = typeof EMPLOYEE_JOB_TITLES[keyof typeof EMPLOYEE_JOB_TITLES];

// Add other constants here as needed, for example:
// export const ORDER_STATUSES = { ... }
// export const PAYMENT_METHODS = { ... }
