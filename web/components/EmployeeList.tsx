"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { EmployeeWithUser } from '../app/[locale]/dashboard/employees/page'; // Import type

interface EmployeeListProps {
  initialEmployees: EmployeeWithUser[];
  locale: string;
  restaurantId: string;
}

// Helper to display localized role (example)
const getLocalizedRole = (role: string, locale: string): string => {
  // This is a placeholder. In a real app, use an i18n library like react-i18next or next-intl.
  const roles: { [key: string]: { [key: string]: string } } = {
    chef: { en: "Chef", ja: "シェフ", vi: "Đầu bếp" },
    server: { en: "Server", ja: "サーバー", vi: "Phục vụ" },
    cashier: { en: "Cashier", ja: "キャッシャー", vi: "Thu ngân" },
    manager: { en: "Manager", ja: "マネージャー", vi: "Quản lý" },
  };
  return roles[role]?.[locale] || roles[role]?.['en'] || role.charAt(0).toUpperCase() + role.slice(1);
};

export default function EmployeeList({ initialEmployees, locale, restaurantId }: EmployeeListProps) {
  const [employees, setEmployees] = useState<EmployeeWithUser[]>(initialEmployees);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    setEmployees(initialEmployees);
  }, [initialEmployees]);

  const handleDeleteEmployee = async (employeeId: string) => {
    if (!window.confirm("Are you sure you want to remove this employee from the restaurant? This does not delete their user account.")) {
      return;
    }

    setFeedback(null);
    try {
      const response = await fetch(`/api/v1/employees/${employeeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete employee.');
      }

      setEmployees(currentEmployees => currentEmployees.filter(emp => emp.id !== employeeId));
      setFeedback({ type: 'success', message: 'Employee removed successfully!' });

    } catch (error: any) {
      console.error('Error deleting employee:', error);
      setFeedback({ type: 'error', message: error.message || 'An error occurred.' });
    }
    setTimeout(() => setFeedback(null), 4000);
  };

  const thClass = "px-5 py-3 border-b-2 border-gray-200 bg-gray-100 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider";
  const tdClass = "px-5 py-4 border-b border-gray-200 bg-white text-sm";
  const buttonClass = "py-1 px-3 rounded text-xs font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-offset-1";
  const primaryButtonClass = `bg-indigo-500 text-white hover:bg-indigo-600 focus:ring-indigo-400 ${buttonClass}`;
  // const secondaryButtonClass = `bg-green-500 text-white hover:bg-green-600 focus:ring-green-400 ${buttonClass}`;
  const warningButtonClass = `bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-400 ${buttonClass}`;
  const dangerButtonClass = `bg-red-500 text-white hover:bg-red-600 focus:ring-red-400 ${buttonClass}`;


  return (
    <div className="bg-white shadow-md rounded-lg overflow-hidden">
      {feedback && (
        <div className={`p-3 text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {feedback.message}
        </div>
      )}

      <div className="p-4 flex justify-between items-center border-b">
        <h2 className="text-xl font-semibold text-gray-700">Employees</h2>
        <Link href={`/${locale}/dashboard/employees/new?restaurantId=${restaurantId}`} legacyBehavior>
          <a className={`${primaryButtonClass} py-2 px-4 text-sm`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 inline-block mr-1 -mt-0.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Employee
          </a>
        </Link>
      </div>

      {employees.length === 0 ? (
        <div className="p-6 text-center text-gray-500">
          No employees found. Get started by adding an employee.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full leading-normal">
            <thead>
              <tr>
                <th className={thClass}>Name</th>
                <th className={thClass}>Email</th>
                <th className={thClass}>Role</th>
                <th className={thClass}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.id} className="hover:bg-gray-50">
                  <td className={tdClass}>
                    <p className="text-gray-900 whitespace-no-wrap">{employee.users?.name || 'N/A'}</p>
                  </td>
                  <td className={tdClass}>
                    <p className="text-gray-900 whitespace-no-wrap">{employee.users?.email || 'N/A'}</p>
                  </td>
                  <td className={tdClass}>
                    <span className="relative inline-block px-3 py-1 font-semibold text-green-900 leading-tight">
                        <span aria-hidden className="absolute inset-0 bg-green-200 opacity-50 rounded-full"></span>
                        <span className="relative">{getLocalizedRole(employee.role, locale)}</span>
                    </span>
                  </td>
                  <td className={`${tdClass} space-x-1 whitespace-no-wrap`}>
                    <Link href={`/${locale}/dashboard/employees/${employee.id}/edit?restaurantId=${restaurantId}`} legacyBehavior>
                      <a className={warningButtonClass}>Edit</a>
                    </Link>
                    <Link href={`/${locale}/dashboard/employees/${employee.id}/schedule?restaurantId=${restaurantId}`} legacyBehavior>
                      <a className={`${primaryButtonClass} bg-blue-500 hover:bg-blue-600 focus:ring-blue-400`}>Schedule</a>
                    </Link>
                    <button
                      onClick={() => handleDeleteEmployee(employee.id)}
                      className={dangerButtonClass}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
