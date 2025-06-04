"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // Corrected import
import type { Table as TableType } from '../app/[locale]/dashboard/tables/page'; // Assuming type is exported from page

interface TableListProps {
  initialTables: TableType[];
  locale: string;
  restaurantId: string;
}

export default function TableList({ initialTables, locale, restaurantId }: TableListProps) {
  const [tables, setTables] = useState<TableType[]>(initialTables);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const router = useRouter(); // For navigation

  useEffect(() => {
    setTables(initialTables);
  }, [initialTables]);

  const handleDeleteTable = async (tableId: string) => {
    if (!window.confirm("Are you sure you want to delete this table? This action cannot be undone.")) {
      return;
    }

    setFeedback(null);
    try {
      const response = await fetch(`/api/v1/tables/${tableId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          // Include auth headers if your API needs them explicitly, though createRouteHandlerClient handles cookies
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete table.');
      }

      setTables(currentTables => currentTables.filter(table => table.id !== tableId));
      setFeedback({ type: 'success', message: 'Table deleted successfully!' });

    } catch (error: any) {
      console.error('Error deleting table:', error);
      setFeedback({ type: 'error', message: error.message || 'An error occurred while deleting the table.' });
    }
    setTimeout(() => setFeedback(null), 4000); // Clear feedback after 4 seconds
  };

  const cardClass = "bg-white shadow-lg rounded-lg p-6 hover:shadow-xl transition-shadow duration-300 ease-in-out";
  const buttonClass = "py-2 px-4 rounded-md font-medium text-sm transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2";
  const primaryButtonClass = `bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 ${buttonClass}`;
  const secondaryButtonClass = `bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-400 ${buttonClass}`;
  const dangerButtonClass = `bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 ${buttonClass}`;


  return (
    <div className="container mx-auto px-4">
      {feedback && (
        <div className={`mb-6 p-4 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {feedback.message}
        </div>
      )}

      <div className="flex justify-end mb-6">
        <Link href={`/${locale}/dashboard/tables/new?restaurantId=${restaurantId}`} legacyBehavior>
          <a className={primaryButtonClass}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline-block mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            New Table
          </a>
        </Link>
      </div>

      {tables.length === 0 ? (
        <div className="text-center py-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2z" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No tables found</h3>
          <p className="mt-1 text-sm text-gray-500">Get started by creating a new table.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {tables.map((table) => (
            <div key={table.id} className={cardClass}>
              <h3 className="text-xl font-semibold text-gray-800 mb-3 truncate">{table.name}</h3>
              {/* Future: Display position_x, position_y or other details here if available */}
              {/* <p className="text-sm text-gray-500">ID: {table.id}</p> */}

              <div className="mt-4 space-y-2">
                 <Link href={`/${locale}/dashboard/tables/${table.id}/edit?restaurantId=${restaurantId}`} legacyBehavior>
                   <a className={`${primaryButtonClass} w-full block text-center`}>Edit</a>
                 </Link>
                 <Link href={`/${locale}/dashboard/tables/${table.id}/qr?restaurantId=${restaurantId}`} legacyBehavior>
                   <a className={`${secondaryButtonClass} w-full block text-center`}>QR Code</a>
                 </Link>
                 <button
                    onClick={() => handleDeleteTable(table.id)}
                    className={`${dangerButtonClass} w-full block text-center`}
                  >
                    Delete
                  </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
