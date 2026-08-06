"use client";

import {
  Dialog,
  DialogActionButton,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAssignees } from "@/hooks/useAssignees";
import { createTicket } from "@/services/ticketService";
import type { TicketCategory, TicketPriority } from "@/types/ticket";
import { Loader2 } from "lucide-react";
import { useState } from "react";

interface CreateTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreateTicketModal({
  isOpen,
  onClose,
  onCreated,
}: CreateTicketModalProps) {
  const { assignees } = useAssignees();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("Medium");
  const [category, setCategory] = useState<TicketCategory>("General");
  const [assignedTo, setAssignedTo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setPriority("Medium");
    setCategory("General");
    setAssignedTo("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      await createTicket({
        title: title.trim(),
        description: description.trim(),
        priority,
        category,
        assigned_to: assignedTo || null,
      });
      resetForm();
      onCreated();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Raise New Ticket</DialogTitle>
          <DialogDescription>
            Create a new ticket and assign it to a team member.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Title *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Brief description of the issue"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#FF6B4A] focus:outline-none focus:ring-1 focus:ring-[#FF6B4A]"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description..."
              rows={3}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#FF6B4A] focus:outline-none focus:ring-1 focus:ring-[#FF6B4A]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TicketPriority)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#FF6B4A] focus:outline-none focus:ring-1 focus:ring-[#FF6B4A]"
              >
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as TicketCategory)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#FF6B4A] focus:outline-none focus:ring-1 focus:ring-[#FF6B4A]"
              >
                <option value="General">General</option>
                <option value="Bug">Bug</option>
                <option value="Feature Request">Feature Request</option>
                <option value="Support">Support</option>
                <option value="Task">Task</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700">
              Assign To
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-[#FF6B4A] focus:outline-none focus:ring-1 focus:ring-[#FF6B4A]"
            >
              <option value="">Unassigned</option>
              {assignees.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <DialogFooter>
            <DialogActionButton onClick={onClose} disabled={submitting}>
              Cancel
            </DialogActionButton>
            <DialogActionButton
              type="submit"
              variant="primary"
              disabled={submitting || !title.trim()}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create Ticket"
              )}
            </DialogActionButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
