"use client";

import type { Task } from "@/types/task";
import { formatDate } from "@/utils/formatting";

interface TaskListProps {
  tasks: Task[];
  isLoading: boolean;
  onMarkComplete: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const priorityColors = {
  High: "bg-red-100 text-red-800",
  Medium: "bg-yellow-100 text-yellow-800",
  Low: "bg-green-100 text-green-800",
};

const statusColors = {
  Pending: "bg-slate-100 text-slate-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Completed: "bg-green-100 text-green-800",
  Cancelled: "bg-red-100 text-red-800",
};

// Shimmer skeleton for a task item
function TaskSkeleton() {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <div className="h-5 w-40 animate-pulse rounded bg-slate-200" />
            <div className="h-6 w-16 animate-pulse rounded-full bg-slate-200" />
            <div className="h-6 w-20 animate-pulse rounded-full bg-slate-200" />
          </div>
          <div className="mt-2 h-4 w-60 animate-pulse rounded bg-slate-200" />
          <div className="mt-3 flex flex-wrap gap-3">
            <div className="h-3 w-24 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-32 animate-pulse rounded bg-slate-200" />
            <div className="h-3 w-28 animate-pulse rounded bg-slate-200" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-8 w-20 animate-pulse rounded-lg bg-slate-200" />
          <div className="h-8 w-16 animate-pulse rounded-lg bg-slate-200" />
        </div>
      </div>
    </div>
  );
}

export default function TaskList({
  tasks,
  isLoading,
  onMarkComplete,
  onDelete,
}: TaskListProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <TaskSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center">
        <p className="text-slate-500">
          No tasks yet. Create one to get started!
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-250 text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">Todo</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-left">Priority</th>
            <th className="px-4 py-3 text-left">Status</th>
            <th className="px-4 py-3 text-left">Assigned To</th>
            <th className="px-4 py-3 text-left">Assigned By</th>
            <th className="px-4 py-3 text-left">Created By</th>
            <th className="px-4 py-3 text-left">Due</th>
            <th className="px-4 py-3 text-left">Created</th>
            <th className="px-4 py-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <tr key={task.id} className="border-t border-slate-100 align-top">
              <td className="px-4 py-3">
                <p className="font-semibold text-slate-900">{task.title}</p>
                {task.description && (
                  <p className="mt-1 max-w-xs text-xs text-slate-500">
                    {task.description}
                  </p>
                )}
              </td>
              <td className="px-4 py-3 text-slate-700">{task.type}</td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${priorityColors[task.priority]}`}
                >
                  {task.priority}
                </span>
              </td>
              <td className="px-4 py-3">
                <span
                  className={`rounded-full px-2 py-1 text-xs font-medium ${statusColors[task.status]}`}
                >
                  {task.status}
                </span>
              </td>
              <td className="px-4 py-3 text-slate-700">
                {task.assignedToName
                  ? `${task.assignedToName}${task.selfAssigned ? " (Self)" : ""}`
                  : task.assignedTo}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {task.assignedByName ?? task.assignedBy ?? "-"}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {task.createdByName ?? task.createdBy ?? "-"}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {formatDate(task.dueDate)}
              </td>
              <td className="px-4 py-3 text-slate-700">
                {formatDate(task.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex gap-2">
                  {task.status !== "Completed" && (
                    <button
                      onClick={() => onMarkComplete(task.id)}
                      className="rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 hover:bg-green-200"
                    >
                      Complete
                    </button>
                  )}
                  <button
                    onClick={() => onDelete(task.id)}
                    className="rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-200"
                  >
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Simple date formatting utility (add to utils if not exists)
