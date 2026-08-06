"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import {
  completeTask,
  createTask,
  deleteTask,
  fetchTaskById,
  fetchTasks,
  updateTask,
} from "@/services/taskService";
import type {
  CreateTaskPayload,
  Task,
  TaskFilters,
  UpdateTaskPayload,
} from "@/types/task";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";

type UseTasksState = {
  tasks: Task[];
  total: number;
  loading: boolean;
  error: string | null;
};

export function useTasks(initialFilters: TaskFilters = {}) {
  const [filters, setFilters] = useState<TaskFilters>(initialFilters);
  const { mutate: globalMutate } = useSWRConfig();
  const key = swrKey("/swr/tasks", filters as Record<string, unknown>);
  const { data, error, isLoading, isValidating, mutate } = useSWR(key, () =>
    withNetworkActivity(() => fetchTasks(filters)),
  );

  const load = async () => mutate();

  const addTask = async (payload: CreateTaskPayload): Promise<Task> => {
    const task = await withNetworkActivity(() => createTask(payload));
    await invalidateSWRPrefix(globalMutate, ["/swr/tasks", "/swr/dashboard"]);
    return task;
  };

  const editTask = async (
    id: number,
    payload: UpdateTaskPayload,
  ): Promise<Task> => {
    const task = await withNetworkActivity(() => updateTask(id, payload));
    await invalidateSWRPrefix(globalMutate, ["/swr/tasks", "/swr/dashboard"]);
    return task;
  };

  const markComplete = async (id: number): Promise<Task> => {
    const task = await withNetworkActivity(() => completeTask(id));
    await invalidateSWRPrefix(globalMutate, ["/swr/tasks", "/swr/dashboard"]);
    return task;
  };

  const removeTask = async (id: number): Promise<void> => {
    await withNetworkActivity(() => deleteTask(id));
    await invalidateSWRPrefix(globalMutate, ["/swr/tasks", "/swr/dashboard"]);
  };

  const getById = (id: number) => fetchTaskById(id);

  const state: UseTasksState = {
    tasks: data?.data ?? [],
    total: data?.total ?? 0,
    loading: isLoading || isValidating,
    error: error instanceof Error ? error.message : null,
  };

  return {
    ...state,
    filters,
    setFilters,
    refetch: load,
    addTask,
    editTask,
    markComplete,
    removeTask,
    getById,
  };
}
