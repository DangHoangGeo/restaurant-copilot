"use client";

import React, { useState, useEffect } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Shift as ShiftType } from '../app/[locale]/dashboard/employees/[employeeId]/schedule/page'; // Import type

// Zod schema for shift form validation
const shiftFormSchema = z.object({
  weekday: z.coerce.number().min(0, "Day is required.").max(6, "Invalid day."), // 0=Sun, 1=Mon, ..., 6=Sat
  start_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use HH:mm format for start time."),
  end_time: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, "Use HH:mm format for end time."),
}).refine(data => {
    const [startHour, startMinute] = data.start_time.split(':').map(Number);
    const [endHour, endMinute] = data.end_time.split(':').map(Number);
    if (endHour < startHour || (endHour === startHour && endMinute <= startMinute)) {
        return false;
    }
    return true;
}, {
    message: "End time must be after start time.",
    path: ["end_time"],
});

type ShiftFormData = z.infer<typeof shiftFormSchema>;

interface ScheduleCalendarProps {
  employeeId: string;
  employeeName: string;
  initialShifts: ShiftType[];
  restaurantId: string;
  locale: string; // For future localization of days/times if needed
}

const daysOfWeek = [
  { value: 1, label: "Monday" }, { value: 2, label: "Tuesday" }, { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" }, { value: 5, label: "Friday" }, { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

// Helper to format time for display (e.g., from "HH:mm:ss" to "HH:mm" if needed)
const formatTime = (timeStr: string) => timeStr.substring(0, 5);


export default function ScheduleCalendar({
  employeeId,
  employeeName,
  initialShifts,
  restaurantId,
  locale,
}: ScheduleCalendarProps) {
  const [shifts, setShifts] = useState<ShiftType[]>(initialShifts);
  const [showShiftModal, setShowShiftModal] = useState(false);
  const [editingShift, setEditingShift] = useState<ShiftType | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<ShiftFormData>({
    resolver: zodResolver(shiftFormSchema),
  });

  useEffect(() => {
    setShifts(initialShifts);
  }, [initialShifts]);

  const openModalToCreate = () => {
    reset({ weekday: 1, start_time: "09:00", end_time: "17:00" }); // Default values
    setEditingShift(null);
    setShowShiftModal(true);
    setFeedback(null);
  };

  const openModalToEdit = (shift: ShiftType) => {
    reset({
      weekday: shift.weekday,
      start_time: formatTime(shift.start_time),
      end_time: formatTime(shift.end_time),
    });
    setEditingShift(shift);
    setShowShiftModal(true);
    setFeedback(null);
  };

  const closeModal = () => {
    setShowShiftModal(false);
    setEditingShift(null);
  };

  const onFormSubmit: SubmitHandler<ShiftFormData> = async (formData) => {
    setFeedback(null);
    const payload = {
      ...formData,
      employee_id: employeeId,
      restaurant_id: restaurantId,
    };

    const url = editingShift ? `/api/v1/schedules/${editingShift.id}` : '/api/v1/schedules';
    const method = editingShift ? 'PATCH' : 'POST';

    try {
      const response = await fetch(url, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resultData = await response.json();

      if (!response.ok) {
        throw new Error(resultData.error || resultData.details?.body?.[0]?.message || `Failed to ${editingShift ? 'update' : 'create'} shift.`);
      }

      if (editingShift) {
        setShifts(shifts.map(s => s.id === editingShift.id ? { ...s, ...resultData } : s));
        setFeedback({ type: 'success', message: 'Shift updated successfully!' });
      } else {
        setShifts([...shifts, resultData]);
        setFeedback({ type: 'success', message: 'Shift created successfully!' });
      }
      closeModal();
    } catch (error: any) {
      console.error("Error submitting shift:", error);
      setFeedback({ type: 'error', message: error.message });
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!window.confirm("Are you sure you want to delete this shift?")) return;
    setFeedback(null);
    try {
      const response = await fetch(`/api/v1/schedules/${shiftId}`, { method: 'DELETE' });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete shift.');
      }
      setShifts(shifts.filter(s => s.id !== shiftId));
      setFeedback({ type: 'success', message: 'Shift deleted successfully!' });
      closeModal(); // If delete is from modal
    } catch (error: any) {
      console.error("Error deleting shift:", error);
      setFeedback({ type: 'error', message: error.message });
    }
  };

  const shiftsByDay = daysOfWeek.map(day => ({
    ...day,
    shifts: shifts.filter(s => s.weekday === day.value).sort((a,b) => a.start_time.localeCompare(b.start_time)),
  }));

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-300">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Schedule for {employeeName}</h1>
          <button
            onClick={openModalToCreate}
            className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition ease-in-out duration-150"
          >
            Add New Shift
          </button>
        </div>

        {feedback && !showShiftModal && ( // Only show global feedback if modal is closed
          <div className={`mb-4 p-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {feedback.message}
          </div>
        )}

        {/* List Display of Shifts */}
        <div className="space-y-6">
          {shiftsByDay.map(day => (
            <div key={day.value} className="bg-white p-4 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-gray-700 mb-3">{day.label}</h3>
              {day.shifts.length > 0 ? (
                <ul className="space-y-2">
                  {day.shifts.map(shift => (
                    <li key={shift.id}
                        className="flex justify-between items-center p-3 bg-gray-100 rounded-md hover:bg-gray-200 cursor-pointer"
                        onClick={() => openModalToEdit(shift)}>
                      <span className="font-medium text-indigo-700">{formatTime(shift.start_time)} - {formatTime(shift.end_time)}</span>
                      {/* Edit button can be here or rely on click-to-edit */}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No shifts scheduled for {day.label}.</p>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Shift Modal Form */}
      {showShiftModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 transition-opacity duration-300 ease-in-out">
          <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md transform transition-all duration-300 ease-in-out scale-100">
            <h2 className="text-xl font-semibold mb-4">{editingShift ? 'Edit Shift' : 'Add New Shift'}</h2>
            {feedback && showShiftModal && ( // Show modal-specific feedback
                <div className={`mb-4 p-3 rounded-md text-sm ${feedback.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                    {feedback.message}
                </div>
            )}
            <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
              <div>
                <label htmlFor="weekday" className="block text-sm font-medium text-gray-700">Day of Week</label>
                <Controller
                  name="weekday"
                  control={control}
                  render={({ field }) => (
                    <select {...field} id="weekday" className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                      {daysOfWeek.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                    </select>
                  )}
                />
                {errors.weekday && <p className="mt-1 text-sm text-red-600">{errors.weekday.message}</p>}
              </div>
              <div>
                <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">Start Time</label>
                <input type="time" id="start_time" {...register("start_time")} className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                {errors.start_time && <p className="mt-1 text-sm text-red-600">{errors.start_time.message}</p>}
              </div>
              <div>
                <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">End Time</label>
                <input type="time" id="end_time" {...register("end_time")} className="mt-1 block w-full py-2 px-3 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" />
                {errors.end_time && <p className="mt-1 text-sm text-red-600">{errors.end_time.message}</p>}
              </div>
              <div className="flex justify-end space-x-3 pt-3">
                <button type="button" onClick={closeModal} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                  {editingShift ? 'Save Changes' : 'Add Shift'}
                </button>
                {editingShift && (
                  <button type="button" onClick={() => handleDeleteShift(editingShift.id)} className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500">
                    Delete
                  </button>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
