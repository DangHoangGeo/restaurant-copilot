"use client";
import EmployeesDashboard from "./components/EmployeesDashboard"; // Adjust path if needed

export default function EmployeesClientContent() {
  // Existing state/logic might be here, needs to be cleaned up or integrated
  // For this step, we are replacing the old content with the new dashboard structure.
  return (
    <div>
      {/* Old UI to be removed or commented out */}
      {/* <h1 className="text-2xl font-bold mb-4">Employee Management (Old)</h1> */}
      {/* ... existing list/schedule UI ... */}

      <EmployeesDashboard />
    </div>
  );
}
