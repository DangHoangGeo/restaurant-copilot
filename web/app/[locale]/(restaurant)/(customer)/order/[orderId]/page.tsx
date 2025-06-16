import { OrderConfirmationClient } from '@/components/features/customer/order/OrderConfirmationClient';

interface OrderPageProps {
  params: Promise<{ locale: string; orderId: string }>;
}

export default async function OrderPage({ params }: OrderPageProps) {
  const { orderId } = await params;
  
  return <OrderConfirmationClient orderId={orderId} />;
}
