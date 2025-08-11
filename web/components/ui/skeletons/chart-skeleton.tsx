import React from 'react';
import { Skeleton } from './skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

export function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-1/3" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-64 w-full" />
      </CardContent>
    </Card>
  );
}
