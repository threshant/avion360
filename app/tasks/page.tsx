"use client";

import LeadDetailSheet, {
  type LeadDetailData,
} from "@/components/LeadDetailSheet";
import PageHeader from "@/components/PageHeader";
import CrmShell from "@/components/layout/CrmShell";
import CreateTaskModal from "@/components/tasks/CreateTaskModal";
import LeadAssignmentsTable from "@/components/tasks/LeadAssignmentsTable";
import TaskList from "@/components/tasks/TaskList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTasks } from "@/hooks/useTasks";
import type { CreateTaskPayload } from "@/types/task";
import { useState } from "react";

export default function TasksPage() {
  const { tasks, loading, error, addTask, markComplete, removeTask, refetch: refetchTasks } =
    useTasks();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedLead, setSelectedLead] = useState<LeadDetailData | null>(null);

  const handleCreateTask = async (payload: CreateTaskPayload) => {
    setIsCreating(true);
    try {
      await addTask(payload);
    } finally {
      setIsCreating(false);
    }
  };

  const handleMarkComplete = async (id: number) => {
    try {
      await markComplete(id);
    } catch (err) {
      console.error("Failed to mark task as complete:", err);
    }
  };

  const handleDeleteTask = async (id: number) => {
    if (confirm("Are you sure you want to delete this task?")) {
      try {
        await removeTask(id);
      } catch (err) {
        console.error("Failed to delete task:", err);
      }
    }
  };

  return (
    <CrmShell activeNav="My Tasks">
      <div className="space-y-5 p-4 md:p-6">
        {/* Header Section */}
        <PageHeader title="Tasks" subtitle="Organize follow-ups and daily activities." onRefresh={() => refetchTasks()}>
          <button
            onClick={() => setIsModalOpen(true)}
            className="rounded-lg bg-[#FF6B4A] px-4 py-2 font-medium text-white hover:bg-[#e55a39]"
          >
            + Create Task
          </button>
        </PageHeader>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm">
            <p className="font-semibold text-red-900">Error loading tasks:</p>
            <p className="mt-1 text-red-700">{error}</p>
            {error.includes("Cannot reach Supabase") && (
              <div className="mt-3 space-y-1 text-xs text-red-600">
                <p className="font-medium">Troubleshooting:</p>
                <ul className="list-inside list-disc">
                  <li>Check your internet connection</li>
                  <li>Verify Supabase credentials in .env.local</li>
                  <li>
                    Ensure your Supabase project is active (not suspended)
                  </li>
                  <li>Restart the dev server: npm run dev</li>
                </ul>
              </div>
            )}
          </div>
        )}

        <section className="rounded-3xl border border-sky-100/90 bg-white/85 p-6 shadow-sm">
          <Tabs defaultValue="todos" className="w-full">
            <TabsList>
              <TabsTrigger value="todos">Todos</TabsTrigger>
              <TabsTrigger value="leads">Leads</TabsTrigger>
            </TabsList>

            <TabsContent
              value="todos"
              className="mt-4 border-0 bg-transparent p-0 shadow-none"
            >
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Todo Assignments ({tasks.length})
                </h2>
              </div>
              <TaskList
                tasks={tasks}
                isLoading={loading}
                onMarkComplete={handleMarkComplete}
                onDelete={handleDeleteTask}
              />
            </TabsContent>

            <TabsContent
              value="leads"
              className="mt-4 border-0 bg-transparent p-0 shadow-none"
            >
              <div className="mb-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Lead Assignments
                </h2>
              </div>
              <LeadAssignmentsTable
                onLeadClick={(lead) =>
                  setSelectedLead({
                    id: lead.id,
                    name: lead.name,
                    temperature: lead.temperature,
                    source: lead.source,
                    assignedTo: lead.assignedTo,
                    stage_name: lead.stage_name,
                    conversation_id: lead.conversation_id,
                    call_id: lead.call_id,
                    phone: lead.phone,
                    email: lead.email,
                    notes: lead.notes,
                    custom_fields: lead.custom_fields,
                  })
                }
              />
            </TabsContent>
          </Tabs>
        </section>

        {/* Create Task Modal */}
        <CreateTaskModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleCreateTask}
          isLoading={isCreating}
        />

        {/* Lead Detail Sheet */}
        <LeadDetailSheet
          lead={selectedLead}
          isOpen={!!selectedLead}
          onClose={() => setSelectedLead(null)}
          onUpdated={(updates) => {
            if (selectedLead) {
              setSelectedLead({ ...selectedLead, ...updates });
            }
          }}
        />
      </div>
    </CrmShell>
  );
}
