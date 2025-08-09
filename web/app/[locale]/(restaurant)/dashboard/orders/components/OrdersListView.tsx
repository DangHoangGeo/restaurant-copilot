"use client";

import { Card, CardContent } from "@/components/ui/card";
import { useTranslations } from "next-intl";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { useState } from "react";
import { Order, OrderItem } from "../types";
import { OrderItemCard } from "./OrderItemCard";
import { Badge } from "@/components/ui/badge";
import { Clock, ChefHat, CheckCircle } from "lucide-react";

interface OrdersListViewProps {
  orders: Order[];
  onItemStatusUpdate: (itemId: string, newStatus: string) => Promise<void>;
  onItemEdit?: (itemId: string, updates: Partial<OrderItem>) => Promise<void>;
  getItemStatusBadgeVariant: (status: string) => "default" | "secondary" | "outline" | "destructive";
  locale: string;
}

type OrderItemWithContext = OrderItem & {
  orderInfo: {
    tableName: string;
    orderTime: string;
    orderId: string;
  };
};

const statusOrder = {
  "new": 0,
  "preparing": 1,
  "ready": 2,
  "served": 3,
  "canceled": 4
};

export function OrdersListView({ 
  orders, 
  onItemStatusUpdate, 
  onItemEdit,
  getItemStatusBadgeVariant,
  locale 
}: OrdersListViewProps) {
  const t = useTranslations("owner.orders");
  const [isDragging, setIsDragging] = useState(false);

  // Flatten all order items with their order context and sort by order time then status
  const orderItemsWithContext: OrderItemWithContext[] = orders.flatMap(order =>
    order.order_items.map(item => ({
      ...item,
      orderInfo: {
        tableName: order.tables?.name || 'No Table',
        orderTime: order.created_at,
        orderId: order.id
      }
    }))
  ).sort((a, b) => {
    // First sort by order time (newest first)
    const timeCompare = new Date(b.orderInfo.orderTime).getTime() - new Date(a.orderInfo.orderTime).getTime();
    if (timeCompare !== 0) return timeCompare;
    
    // Then by status order
    return statusOrder[a.status] - statusOrder[b.status];
  });

  // Group items by status
  const groupedItems = {
    new: orderItemsWithContext.filter(item => item.status === 'new'),
    preparing: orderItemsWithContext.filter(item => item.status === 'preparing'),
    ready: orderItemsWithContext.filter(item => item.status === 'ready'),
    served: orderItemsWithContext.filter(item => item.status === 'served')
  };

  const handleDragStart = () => {
    setIsDragging(true);
  };

  const handleDragEnd = async (result: DropResult) => {
    setIsDragging(false);
    
    if (!result.destination) return;
    
    const sourceStatus = result.source.droppableId as keyof typeof groupedItems;
    const destinationStatus = result.destination.droppableId as keyof typeof groupedItems;
    
    if (sourceStatus === destinationStatus) return;
    
    const item = groupedItems[sourceStatus][result.source.index];
    if (!item) return;
    
    // Map the column IDs to actual status values
    const statusMap = {
      new: 'new',
      preparing: 'preparing',
      ready: 'ready',
      served: 'served'
    };
    
    const newStatus = statusMap[destinationStatus];
    
    // Update the item status
    await onItemStatusUpdate(item.id, newStatus);
  };

  const getColumnIcon = (status: string) => {
    switch (status) {
      case 'new': return <Clock className="h-4 w-4" />;
      case 'preparing': return <ChefHat className="h-4 w-4" />;
      case 'ready': return <CheckCircle className="h-4 w-4" />;
      case 'served': return <CheckCircle className="h-4 w-4" />;
      default: return null;
    }
  };

  const getColumnColor = (status: string) => {
    switch (status) {
      case 'new': return 'bg-blue-50 border-blue-200';
      case 'preparing': return 'bg-yellow-50 border-yellow-200';
      case 'ready': return 'bg-green-50 border-green-200';
      case 'served': return 'bg-gray-50 border-gray-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  // Mobile view - show as simple list
  const MobileView = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">
          {t('orderItems')} ({orderItemsWithContext.length})
        </h2>
      </div>

      {orderItemsWithContext.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-gray-500">{t('noOrderItems')}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {orderItemsWithContext.map((item) => (
            <div key={`${item.orderInfo.orderId}-${item.id}`}>
              <OrderItemCard
                item={item}
                locale={locale}
                onStatusUpdate={onItemStatusUpdate}
                onEdit={onItemEdit}
                getItemStatusBadgeVariant={getItemStatusBadgeVariant}
                showActions={true}
                showEditActions={item.status === 'new'}
                availableSizes={item.availableSizes || []}
                availableToppings={item.availableToppings || []}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Desktop view - show as Kanban columns
  const DesktopView = () => (
    <DragDropContext onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">
            {t('orderItems')} ({orderItemsWithContext.length})
          </h2>
          <div className="text-sm text-gray-500">
            {t('dragDropToChangeStatus')}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-6">
          {/* New Orders Column */}
          <div className={`rounded-lg border-2 ${getColumnColor('new')} ${isDragging ? 'border-dashed' : ''}`}>
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                {getColumnIcon('new')}
                <h3 className="font-medium">{t('new')}</h3>
                <Badge variant="secondary" className="ml-auto">
                  {groupedItems.new.length}
                </Badge>
              </div>
            </div>
            <Droppable droppableId="new">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`p-4 space-y-3 min-h-[200px] ${snapshot.isDraggingOver ? 'bg-blue-100' : ''}`}
                >
                  {groupedItems.new.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`${snapshot.isDragging ? 'rotate-2 scale-105' : ''} transition-transform`}
                        >
                          <OrderItemCard
                            item={item}
                            locale={locale}
                            onStatusUpdate={onItemStatusUpdate}
                            onEdit={onItemEdit}
                            getItemStatusBadgeVariant={getItemStatusBadgeVariant}
                            showActions={false}
                            showEditActions={true}
                            availableSizes={item.availableSizes || []}
                            availableToppings={item.availableToppings || []}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* Preparing Column */}
          <div className={`rounded-lg border-2 ${getColumnColor('preparing')} ${isDragging ? 'border-dashed' : ''}`}>
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                {getColumnIcon('preparing')}
                <h3 className="font-medium">{t('preparing')}</h3>
                <Badge variant="secondary" className="ml-auto">
                  {groupedItems.preparing.length}
                </Badge>
              </div>
            </div>
            <Droppable droppableId="preparing">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`p-4 space-y-3 min-h-[200px] ${snapshot.isDraggingOver ? 'bg-yellow-100' : ''}`}
                >
                  {groupedItems.preparing.map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`${snapshot.isDragging ? 'rotate-2 scale-105' : ''} transition-transform`}
                        >
                          <OrderItemCard
                            item={item}
                            locale={locale}
                            onStatusUpdate={onItemStatusUpdate}
                            onEdit={onItemEdit}
                            getItemStatusBadgeVariant={getItemStatusBadgeVariant}
                            showActions={false}
                            showEditActions={false}
                            availableSizes={item.availableSizes || []}
                            availableToppings={item.availableToppings || []}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* Ready/Served Column */}
          <div className={`rounded-lg border-2 ${getColumnColor('ready')} ${isDragging ? 'border-dashed' : ''}`}>
            <div className="p-4 border-b">
              <div className="flex items-center gap-2">
                {getColumnIcon('ready')}
                <h3 className="font-medium">{t('readyAndServed')}</h3>
                <Badge variant="secondary" className="ml-auto">
                  {groupedItems.ready.length + groupedItems.served.length}
                </Badge>
              </div>
            </div>
            <Droppable droppableId="ready">
              {(provided, snapshot) => (
                <div
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                  className={`p-4 space-y-3 min-h-[200px] ${snapshot.isDraggingOver ? 'bg-green-100' : ''}`}
                >
                  {[...groupedItems.ready, ...groupedItems.served].map((item, index) => (
                    <Draggable key={item.id} draggableId={item.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`${snapshot.isDragging ? 'rotate-2 scale-105' : ''} transition-transform`}
                        >
                          <OrderItemCard
                            item={item}
                            locale={locale}
                            onStatusUpdate={onItemStatusUpdate}
                            onEdit={onItemEdit}
                            getItemStatusBadgeVariant={getItemStatusBadgeVariant}
                            showActions={false}
                            showEditActions={false}
                            availableSizes={item.availableSizes || []}
                            availableToppings={item.availableToppings || []}
                          />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        </div>
      </div>
    </DragDropContext>
  );

  return (
    <>
      {/* Mobile View */}
      <div className="block md:hidden">
        <MobileView />
      </div>
      
      {/* Desktop View */}
      <div className="hidden md:block">
        <DesktopView />
      </div>
    </>
  );
}
