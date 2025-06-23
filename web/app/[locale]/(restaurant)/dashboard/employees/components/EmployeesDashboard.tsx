'use client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import EmployeeList from './EmployeeList';
import EmployeeForm from './EmployeeForm';
import PerformanceOverview from './PerformanceOverview';
import { useState } from 'react';

export default function EmployeesDashboard() {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button onClick={() => setOpen(true)}>Add</button>
      {open && <EmployeeForm onSaved={() => setOpen(false)} />}
      <Tabs defaultValue="list">
        <TabsList>
          <TabsTrigger value="list">Employees</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>
        <TabsContent value="list">
          <EmployeeList />
        </TabsContent>
        <TabsContent value="performance">
          <PerformanceOverview />
        </TabsContent>
      </Tabs>
    </div>
  );
}
