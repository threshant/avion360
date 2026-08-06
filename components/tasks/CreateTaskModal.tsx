"use client";

import { useAssignees } from "@/hooks/useAssignees";
import { useAuth } from "@/lib/auth-context";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { CreateTaskPayload, TaskPriority, TaskType } from "@/types/task";
import { useState } from "react";

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: CreateTaskPayload) => Promise<void>;
  isLoading?: boolean;
}

const TASK_TYPES: TaskType[] = [
  "Call",
  "Email",
  "Meeting",
  "Follow-up",
  "Demo",
  "Other",
];
const PRIORITIES: TaskPriority[] = ["High", "Medium", "Low"];

export default function CreateTaskModal({
  isOpen,
  onClose,
  onSubmit,
  isLoading = false,
}: CreateTaskModalProps) {
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<TaskType>("Meeting");
  const [priority, setPriority] = useState<TaskPriority>("Medium");
  const [assignmentMode, setAssignmentMode] = useState<"self" | "user">("self");
  const [assignedTo, setAssignedTo] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [error, setError] = useState<string | null>(null);
  const {
    assignees: users,
    loading: usersLoading,
    error: usersError,
  } = useAssignees(isOpen);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!title.trim()) {
      setError("Task title is required");
      return;
    }

    const resolvedAssignedTo =
      assignmentMode === "self" ? (user?.id ?? "") : assignedTo;

    if (!resolvedAssignedTo.trim()) {
      setError(
        assignmentMode === "self"
          ? "Unable to self-assign. Please re-login and try again."
          : "Please assign the task to a user",
      );
      return;
    }

    if (!dueDate) {
      setError("Due date is required");
      return;
    }

    try {
      const payload: CreateTaskPayload = {
        title: title.trim(),
        description: description.trim(),
        type,
        priority,
        assignedTo: resolvedAssignedTo,
        dueDate,
        status: "Pending",
        completedAt: null,
        relatedTo: undefined,
      };

      await onSubmit(payload);

      // Reset form
      setTitle("");
      setDescription("");
      setType("Meeting");
      setPriority("Medium");
      setAssignmentMode("self");
      setAssignedTo("");
      setDueDate("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create task");
    }
  };

  const visibleError = error || usersError;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Create New Task</SheetTitle>
        </SheetHeader>

        {visibleError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {visibleError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Task Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter task title"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none"
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter task description"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-sky-500 focus:outline-none"
              rows={3}
              disabled={isLoading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Task Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as TaskType)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
              disabled={isLoading}
            >
              {TASK_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
              disabled={isLoading}
            >
              {PRIORITIES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Assignment *
            </label>
            <div className="mt-2 space-y-2 rounded-lg border border-slate-300 p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="assignmentMode"
                  value="self"
                  checked={assignmentMode === "self"}
                  onChange={() => setAssignmentMode("self")}
                  disabled={isLoading || !user}
                />
                Self assign
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                <input
                  type="radio"
                  name="assignmentMode"
                  value="user"
                  checked={assignmentMode === "user"}
                  onChange={() => setAssignmentMode("user")}
                  disabled={isLoading || usersLoading}
                />
                Assign to another user
              </label>
            </div>

            {assignmentMode === "self" ? (
              <p className="mt-2 text-xs text-slate-500">
                Assigned to: <strong>{user?.name ?? "Current user"}</strong>
              </p>
            ) : (
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
                disabled={isLoading || usersLoading}
              >
                <option value="">
                  {usersLoading ? "Loading users..." : "Select a user"}
                </option>
                {users.map((assignee) => (
                  <option key={assignee.id} value={assignee.id}>
                    {assignee.name} ({assignee.email})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Due Date *
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-sky-500 focus:outline-none"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-slate-300 px-4 py-2 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 rounded-lg bg-[#FF6B4A] px-4 py-2 font-medium text-white hover:bg-[#e55a39] disabled:opacity-50"
              disabled={isLoading || usersLoading}
            >
              {isLoading ? "Creating..." : "Create Task"}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
