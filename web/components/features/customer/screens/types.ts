import type { CartItem } from "../CartContext"; // Assuming CartContext.ts is in the parent directory

export interface OrderItemDetail {
  itemId: string;
  name: string;
  qty: number;
  price: number;
  quantity?: number; // For compatibility
  itemName?: string;  // For compatibility
}

export interface MenuViewProps {
  tableId?: string;
  sessionId?: string;
  tableNumber?: string;
  canAddItems?: boolean;
  // Props that might be passed when navigating to menu, e.g., from ThankYouScreen or OrderHistoryScreen
  orderId?: string;
  items?: OrderItemDetail[];
  total?: number;
}

export interface CheckoutViewProps { // For ReviewOrderScreen
  tableId?: string;
  sessionId?: string;
  tableNumber?: string;
  // Add other properties if ReviewOrderScreen needs more from its viewProps
}

export interface ReviewViewProps {
  canAddItems: boolean;
  orderId?: string;
  items?: OrderItemDetail[];
}

/*
export interface BookingViewProps {
  // Define any specific props needed when setView("booking", props) is called
  // Example: preselectedTableId?: string;
}*/

export interface OrderPlacedScreenViewProps {
  orderId: string;
  items: CartItem[]; // Items directly from the cart
  total: number;
  tableId?: string; // For navigation options like "add more items"
}

export interface ThankYouScreenViewProps {
  orderId: string;
  items: OrderItemDetail[]; // Formatted items for display
  total: number;
  tableId?: string;
  tableNumber?: string;
}

// For OrderHistoryScreen, it currently accepts `viewProps: MenuViewProps`.
// If it needed distinct props via setView, we would define OrderHistoryScreenViewProps.

export type ViewType =
  | "menu"
  | "checkout"
  | "orderplaced"
  | "thankyou"
  | "review"
  | "booking"
  | "admin"
  | "expired"
  | "invalid"
  | "orderhistory";

// ViewProps is the union of all possible props objects that can be associated with a view.
// This type is used for the `viewProps` state in customer-client-content.tsx
// and for the `props` parameter in the `setView` function.
export type ViewProps =
  | MenuViewProps
  | CheckoutViewProps
  | OrderPlacedScreenViewProps
  | ThankYouScreenViewProps
  | ReviewViewProps; //| BookingViewProps;

export interface SessionData {
  sessionId?: string;
  tableNumber?: string;
  sessionStatus: 'valid' | 'expired' | 'invalid' | 'new';
  canAddItems: boolean;
  orderId?: string;
  isNewSession?: boolean;
}