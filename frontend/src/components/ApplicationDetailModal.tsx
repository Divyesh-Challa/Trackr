"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Application,
  ApplicationStateTransition,
  ApplicationStatus,
  ApplicationTask,
  ApplicationContact,
  ApplicationNote,
} from "../types";
import {
  fetchTransitions,
  generateOutreach,
  OutreachResponse,
  fetchTasks,
  createTask,
  toggleTask,
  deleteTask,
  fetchContacts,
  createContact,
  deleteContact,
  fetchNotes,
  createNote,
  deleteNote,
  deleteApplication,
  updateApplicationStatus,
} from "../lib/api";
import {
  X,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Building,
  Copy,
  Check,
  Send,
  FileText,
  MessageSquare,
  Mail,
  History,
  Loader2,
  Database,
  CheckSquare,
  Plus,
  Trash2,
  Calendar,
  Users,
  UserPlus,
  Phone,
  Linkedin,
  ExternalLink,
  MapPin,
  Clock,
  ChevronDown,
  StickyNote,
} from "lucide-react";

interface Props {
  application: Application | null;
  onClose: () => void;
  onStatusChange?: (id: string, newStatus: ApplicationStatus) => void;
  onDelete?: (id: string) => void;
  onDataChanged?: () => void;
}

const STATUS_OPTIONS: { id: ApplicationStatus; label: string; color: string }[] = [
  { id: "WISHLIST", label: "Wishlist", color: "text-slate-300" },
  { id: "APPLIED", label: "Applied", color: "text-sky-400" },
  { id: "OA_SCHEDULED", label: "OA Scheduled", color: "text-amber-400" },
  { id: "INTERVIEWING", label: "Interviewing", color: "text-indigo-400" },
  { id: "OFFER", label: "Offer", color: "text-emerald-400" },
  { id: "REJECTED", label: "Rejected", color: "text-rose-400" },
  { id: "WITHDRAWN", label: "Withdrawn", color: "text-slate-400" },
];

export default function ApplicationDetailModal({
  application,
  onClose,
  onStatusChange,
  onDelete,
  onDataChanged,
}: Props) {
  const [activeTab, setActiveTab] = useState<"tasks" | "contacts" | "notes" | "ai" | "overview" | "audit">("tasks");

  // Hub data state
  const [tasks, setTasks] = useState<ApplicationTask[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskDueDate, setNewTaskDueDate] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  const [contacts, setContacts] = useState<ApplicationContact[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactLinkedin, setContactLinkedin] = useState("");
  const [contactNotes, setContactNotes] = useState("");
  const [savingContact, setSavingContact] = useState(false);

  const [notes, setNotes] = useState<ApplicationNote[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);
  const [showAddNote, setShowAddNote] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Transitions audit state
  const [transitions, setTransitions] = useState<ApplicationStateTransition[]>([]);
  const [loadingTransitions, setLoadingTransitions] = useState(false);

  // Outreach RAG Generator State
  const [outreachType, setOutreachType] = useState<"COVER_LETTER" | "LINKEDIN_NOTE" | "EMAIL_RECRUITER">("COVER_LETTER");
  const [tone, setTone] = useState<"IMPACT_DRIVEN" | "CONCISE" | "TECHNICAL">("IMPACT_DRIVEN");
  const [generatingOutreach, setGeneratingOutreach] = useState(false);
  const [outreachData, setOutreachData] = useState<OutreachResponse | null>(null);
  const [copied, setCopied] = useState(false);
  const [outreachError, setOutreachError] = useState("");

  // Deletion confirm state
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (application?.id) {
      // Load tasks
      setLoadingTasks(true);
      fetchTasks(application.id)
        .then(setTasks)
        .finally(() => setLoadingTasks(false));

      // Load contacts
      setLoadingContacts(true);
      fetchContacts(application.id)
        .then(setContacts)
        .finally(() => setLoadingContacts(false));

      // Load notes
      setLoadingNotes(true);
      fetchNotes(application.id)
        .then(setNotes)
        .finally(() => setLoadingNotes(false));

      // Load transitions
      setLoadingTransitions(true);
      fetchTransitions(application.id)
        .then(setTransitions)
        .finally(() => setLoadingTransitions(false));

      setOutreachData(null);
      setOutreachError("");
      setConfirmDelete(false);
    }
  }, [application?.id]);

  if (!application) return null;

  const match = application.match_details;

  // Task actions
  const handleToggleTask = async (taskId: string, currentVal: boolean) => {
    const nextVal = !currentVal;
    setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_completed: nextVal } : t)));
    try {
      await toggleTask(taskId, nextVal);
      onDataChanged?.();
    } catch {
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, is_completed: currentVal } : t)));
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim() || !application?.id) return;
    setCreatingTask(true);
    try {
      const created = await createTask(application.id, newTaskTitle.trim(), newTaskDueDate || undefined);
      setTasks((prev) => [...prev, created]);
      setNewTaskTitle("");
      setNewTaskDueDate("");
      onDataChanged?.();
    } catch (err: any) {
      alert("Failed to create task: " + err.message);
    } finally {
      setCreatingTask(false);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await deleteTask(taskId);
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      onDataChanged?.();
    } catch (err: any) {
      alert("Failed to delete task: " + err.message);
    }
  };

  // Contact actions
  const handleCreateContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !application?.id) return;
    setSavingContact(true);
    try {
      const created = await createContact(application.id, {
        name: contactName.trim(),
        role_title: contactRole.trim() || undefined,
        email: contactEmail.trim() || undefined,
        phone: contactPhone.trim() || undefined,
        linkedin_url: contactLinkedin.trim() || undefined,
        notes: contactNotes.trim() || undefined,
      });
      setContacts((prev) => [...prev, created]);
      setContactName("");
      setContactRole("");
      setContactEmail("");
      setContactPhone("");
      setContactLinkedin("");
      setContactNotes("");
      setShowAddContact(false);
      onDataChanged?.();
    } catch (err: any) {
      alert("Failed to create contact: " + err.message);
    } finally {
      setSavingContact(false);
    }
  };

  const handleDeleteContact = async (contactId: string) => {
    try {
      await deleteContact(contactId);
      setContacts((prev) => prev.filter((c) => c.id !== contactId));
      onDataChanged?.();
    } catch (err: any) {
      alert("Failed to delete contact: " + err.message);
    }
  };

  // Note actions
  const handleCreateNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !application?.id) return;
    setSavingNote(true);
    try {
      const created = await createNote(application.id, {
        title: noteTitle.trim(),
        content: noteContent.trim(),
      });
      setNotes((prev) => [created, ...prev]);
      setNoteTitle("");
      setNoteContent("");
      setShowAddNote(false);
      onDataChanged?.();
    } catch (err: any) {
      alert("Failed to create note: " + err.message);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    try {
      await deleteNote(noteId);
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      onDataChanged?.();
    } catch (err: any) {
      alert("Failed to delete note: " + err.message);
    }
  };

  // Application stage update & deletion
  const handleStatusSelect = async (newStatus: ApplicationStatus) => {
    if (newStatus === application.status || !application.id) return;
    try {
      await updateApplicationStatus(application.id, newStatus);
      if (onStatusChange) {
        onStatusChange(application.id, newStatus);
      }
      onDataChanged?.();
    } catch (err: any) {
      alert("Failed to update status: " + err.message);
    }
  };

  const handleDeleteApplication = async () => {
    if (!application?.id) return;
    try {
      await deleteApplication(application.id);
      if (onDelete) {
        onDelete(application.id);
      }
      onClose();
    } catch (err: any) {
      alert("Failed to delete application: " + err.message);
    }
  };

  // AI Outreach actions
  const handleGenerateOutreach = async () => {
    if (!application?.id) return;
    setGeneratingOutreach(true);
    setOutreachError("");
    try {
      const res = await generateOutreach(application.id, outreachType, tone);
      setOutreachData(res);
    } catch (err: any) {
      setOutreachError(err.message || "Failed to generate outreach");
    } finally {
      setGeneratingOutreach(false);
    }
  };

  const handleCopy = () => {
    if (!outreachData?.content) return;
    const fullText = outreachData.subject
      ? `Subject: ${outreachData.subject}\n\n${outreachData.content}`
      : outreachData.content;
    navigator.clipboard.writeText(fullText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const completedTasksCount = tasks.filter((t) => t.is_completed).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
      {/* Slide-over panel */}
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 28, stiffness: 280 }}
        className="relative w-full max-w-3xl h-full bg-white dark:bg-[#161b22] border-l border-slate-200 dark:border-[#30363d] shadow-2xl flex flex-col z-50 overflow-hidden"
      >
        {/* Header Section */}
        <div className="p-6 border-b border-slate-200 dark:border-[#30363d] bg-slate-50 dark:bg-[#0d1117] space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5" />
                  {application.company_name}
                </span>
                <span className="text-slate-300 dark:text-slate-700">•</span>
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {application.work_model || "ONSITE"}
                </span>
                {application.job_location && (
                  <>
                    <span className="text-slate-300 dark:text-slate-700">•</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 truncate">
                      <MapPin className="h-3 w-3 text-slate-400" />
                      {application.job_location}
                    </span>
                  </>
                )}
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight leading-snug">
                {application.role_title}
              </h2>
            </div>

            {/* Actions: Delete & Close */}
            <div className="flex items-center gap-2 shrink-0">
              {confirmDelete ? (
                <div className="flex items-center gap-1.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 p-1 rounded-lg text-xs">
                  <span className="text-rose-600 dark:text-rose-400 font-medium text-[11px] px-1.5">Delete?</span>
                  <button
                    onClick={handleDeleteApplication}
                    className="px-2 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded font-medium"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-1 bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  title="Delete Application"
                  className="p-2 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20 transition"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Hub Status Selector & Quick Meta Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200 dark:border-[#21262d]">
            {/* Status Dropdown */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 dark:text-slate-400">Stage:</span>
              <div className="relative">
                <select
                  data-testid="stage-select"
                  value={application.status}
                  onChange={(e) => handleStatusSelect(e.target.value as ApplicationStatus)}
                  className="appearance-none bg-white dark:bg-[#161b22] border border-slate-200 dark:border-[#30363d] rounded-lg px-3 py-1.5 pr-8 text-xs font-semibold text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500 shadow-sm"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Compensation & Match Score */}
            <div className="flex items-center gap-2.5 text-xs">
              {application.salary_range && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                  {application.salary_range}
                </span>
              )}
              {application.match_score !== undefined && (
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5" />
                  {Math.round(application.match_score)}% Match
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] px-6 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("tasks")}
            className={`py-3 px-3.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "tasks"
                ? "border-[#0066FF] text-[#0066FF]"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <CheckSquare className="h-3.5 w-3.5" />
            <span>Tasks</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
              {completedTasksCount}/{tasks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("contacts")}
            className={`py-3 px-3.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "contacts"
                ? "border-[#0066FF] text-[#0066FF]"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <Users className="h-3.5 w-3.5" />
            <span>Contacts</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
              {contacts.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={`py-3 px-3.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "notes"
                ? "border-[#0066FF] text-[#0066FF]"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <StickyNote className="h-3.5 w-3.5" />
            <span>Notes</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-slate-100 text-slate-600">
              {notes.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`py-3 px-3.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "ai"
                ? "border-[#0066FF] text-[#0066FF]"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span>AI Materials</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`py-3 px-3.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "overview"
                ? "border-[#0066FF] text-[#0066FF]"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>ATS Keywords & JD</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={`py-3 px-3.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition whitespace-nowrap ${
              activeTab === "audit"
                ? "border-[#0066FF] text-[#0066FF]"
                : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>Audit Velocity</span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: TASKS & CHECKLIST */}
          {activeTab === "tasks" && (
            <div className="space-y-6">
              {/* Inline Add Task Form */}
              <form
                onSubmit={handleCreateTask}
                className="p-4 rounded-2xl bg-slate-900/80 border border-white/5 space-y-3 shadow-md"
              >
                <div className="text-xs font-mono font-semibold text-slate-300 flex items-center gap-2">
                  <Plus className="h-3.5 w-3.5 text-sky-400" />
                  <span>Add Checklist Item</span>
                </div>
                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                  <input
                    type="text"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    placeholder="e.g. Send thank-you note to recruiter, complete coding assessment..."
                    className="flex-1 w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-sky-500"
                  />
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                      className="px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-slate-300 focus:outline-none focus:border-sky-500"
                      title="Due Date"
                    />
                    <button
                      type="submit"
                      disabled={creatingTask || !newTaskTitle.trim()}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 disabled:opacity-40 transition shrink-0"
                    >
                      {creatingTask ? "Adding..." : "Add"}
                    </button>
                  </div>
                </div>
              </form>

              {/* Tasks List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-slate-400 pb-1">
                  <span>To-do Checklist ({tasks.length})</span>
                  <span>{completedTasksCount} Completed</span>
                </div>

                {loadingTasks ? (
                  <p className="text-xs text-slate-500 font-mono py-4 text-center">Loading tasks...</p>
                ) : tasks.length === 0 ? (
                  <div className="p-8 text-center rounded-2xl border border-dashed border-slate-800 text-slate-500 space-y-1">
                    <CheckSquare className="h-6 w-6 mx-auto text-slate-600 mb-2" />
                    <p className="text-xs font-medium">No tasks added yet</p>
                    <p className="text-[11px]">Track your application to-dos, follow-ups, and prep deadlines above.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`group p-3.5 rounded-xl border transition-all flex items-center justify-between gap-3 ${
                          task.is_completed
                            ? "bg-slate-950/40 border-white/5 opacity-60"
                            : "bg-slate-900/90 border-white/5 hover:border-sky-500/30"
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() => handleToggleTask(task.id, task.is_completed)}
                            className={`h-5 w-5 rounded-lg border flex items-center justify-center transition shrink-0 ${
                              task.is_completed
                                ? "bg-emerald-500 border-emerald-400 text-slate-950"
                                : "border-slate-700 hover:border-sky-400"
                            }`}
                          >
                            {task.is_completed && <Check className="h-3.5 w-3.5 stroke-[3]" />}
                          </button>
                          <span
                            className={`text-xs text-slate-200 truncate ${
                              task.is_completed ? "line-through text-slate-500" : ""
                            }`}
                          >
                            {task.title}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          {task.due_date && (
                            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-400">
                              <Calendar className="h-3 w-3 text-slate-500" />
                              <span>{new Date(task.due_date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteTask(task.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition"
                            title="Delete Task"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: CONTACTS CRM */}
          {activeTab === "contacts" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Application Contacts</h3>
                  <p className="text-xs text-slate-400">Recruiters, hiring managers, and interviewers at {application.company_name}</p>
                </div>
                {!showAddContact && (
                  <button
                    onClick={() => setShowAddContact(true)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 transition flex items-center gap-1.5"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    <span>Add Contact</span>
                  </button>
                )}
              </div>

              {/* Add Contact Drawer/Form */}
              {showAddContact && (
                <form
                  onSubmit={handleCreateContact}
                  className="p-5 rounded-2xl bg-slate-900 border border-sky-500/30 space-y-4 shadow-xl"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-xs font-mono font-bold text-sky-400">New Contact Record</span>
                    <button
                      type="button"
                      onClick={() => setShowAddContact(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="text-slate-400 block mb-1 font-mono text-[11px]">Name *</label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="e.g. Jane Doe"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 font-mono text-[11px]">Role / Title</label>
                      <input
                        type="text"
                        value={contactRole}
                        onChange={(e) => setContactRole(e.target.value)}
                        placeholder="e.g. Technical Recruiter"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 font-mono text-[11px]">Email</label>
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="jane@company.com"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 outline-none focus:border-sky-500"
                      />
                    </div>
                    <div>
                      <label className="text-slate-400 block mb-1 font-mono text-[11px]">LinkedIn URL</label>
                      <input
                        type="url"
                        value={contactLinkedin}
                        onChange={(e) => setContactLinkedin(e.target.value)}
                        placeholder="https://linkedin.com/in/janedoe"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-slate-400 block mb-1 font-mono text-[11px]">Phone</label>
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+1 (555) 000-0000"
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 outline-none focus:border-sky-500"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-slate-400 block mb-1 font-mono text-[11px]">Notes / Context</label>
                      <textarea
                        rows={2}
                        value={contactNotes}
                        onChange={(e) => setContactNotes(e.target.value)}
                        placeholder="Met at university career fair, prefers email outreach..."
                        className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-white/10 text-slate-200 outline-none focus:border-sky-500"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddContact(false)}
                      className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingContact || !contactName.trim()}
                      className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 disabled:opacity-40 transition"
                    >
                      {savingContact ? "Saving..." : "Save Contact"}
                    </button>
                  </div>
                </form>
              )}

              {/* Contacts Grid */}
              {loadingContacts ? (
                <p className="text-xs text-slate-500 font-mono py-4 text-center">Loading contacts...</p>
              ) : contacts.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-800 text-slate-500 space-y-1">
                  <Users className="h-6 w-6 mx-auto text-slate-600 mb-2" />
                  <p className="text-xs font-medium">No contacts recorded</p>
                  <p className="text-[11px]">Add recruiters and interviewers to follow up with directly.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {contacts.map((contact) => (
                    <div
                      key={contact.id}
                      className="group p-4 rounded-2xl bg-slate-900/80 border border-white/5 hover:border-sky-500/30 transition space-y-3 relative shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="font-semibold text-xs text-white">{contact.name}</h4>
                          {contact.role_title && (
                            <p className="text-[11px] text-sky-400 font-mono">{contact.role_title}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteContact(contact.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition"
                          title="Delete Contact"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="space-y-1.5 text-[11px] font-mono text-slate-300">
                        {contact.email && (
                          <a
                            href={`mailto:${contact.email}`}
                            className="flex items-center gap-1.5 text-sky-400 hover:underline truncate"
                          >
                            <Mail className="h-3 w-3 shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </a>
                        )}
                        {contact.phone && (
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Phone className="h-3 w-3 shrink-0" />
                            <span>{contact.phone}</span>
                          </div>
                        )}
                        {contact.linkedin_url && (
                          <a
                            href={contact.linkedin_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-indigo-400 hover:underline truncate"
                          >
                            <Linkedin className="h-3 w-3 shrink-0" />
                            <span className="truncate">LinkedIn Profile</span>
                            <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                          </a>
                        )}
                      </div>

                      {contact.notes && (
                        <p className="text-[11px] text-slate-400 pt-2 border-t border-white/5 italic">
                          {contact.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: NOTES / SCRATCHPAD */}
          {activeTab === "notes" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white">Interview Notes & Prep</h3>
                  <p className="text-xs text-slate-400">Scratchpad for questions, interview notes, and research</p>
                </div>
                {!showAddNote && (
                  <button
                    onClick={() => setShowAddNote(true)}
                    className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 transition flex items-center gap-1.5"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>New Note</span>
                  </button>
                )}
              </div>

              {/* Add Note Form */}
              {showAddNote && (
                <form
                  onSubmit={handleCreateNote}
                  className="p-5 rounded-2xl bg-slate-900 border border-sky-500/30 space-y-3 shadow-xl"
                >
                  <div className="flex items-center justify-between pb-2 border-b border-white/5">
                    <span className="text-xs font-mono font-bold text-sky-400">New Note</span>
                    <button
                      type="button"
                      onClick={() => setShowAddNote(false)}
                      className="text-slate-400 hover:text-white"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Note title (e.g. Phone screen recap, Questions for hiring manager)..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 outline-none focus:border-sky-500"
                  />

                  <textarea
                    rows={4}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Type your notes, takeaways, or prep questions here..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-200 outline-none focus:border-sky-500 font-mono"
                  />

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowAddNote(false)}
                      className="px-3 py-1.5 rounded-xl text-xs text-slate-400 hover:text-white"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={savingNote || !noteTitle.trim()}
                      className="px-4 py-1.5 rounded-xl text-xs font-semibold bg-sky-500 hover:bg-sky-400 text-slate-950 disabled:opacity-40 transition"
                    >
                      {savingNote ? "Saving..." : "Save Note"}
                    </button>
                  </div>
                </form>
              )}

              {/* Notes List */}
              {loadingNotes ? (
                <p className="text-xs text-slate-500 font-mono py-4 text-center">Loading notes...</p>
              ) : notes.length === 0 ? (
                <div className="p-8 text-center rounded-2xl border border-dashed border-slate-800 text-slate-500 space-y-1">
                  <StickyNote className="h-6 w-6 mx-auto text-slate-600 mb-2" />
                  <p className="text-xs font-medium">No notes recorded</p>
                  <p className="text-[11px]">Save recruiter phone notes, interview prep, and questions above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notes.map((n) => (
                    <div
                      key={n.id}
                      className="group p-4 rounded-2xl bg-slate-900/80 border border-white/5 hover:border-sky-500/30 transition space-y-2 shadow-md relative"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h4 className="font-semibold text-xs text-white">{n.title}</h4>
                          <span className="text-[10px] font-mono text-slate-500">
                            {new Date(n.created_at).toLocaleString()}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteNote(n.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition"
                          title="Delete Note"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <p className="text-xs text-slate-300 font-mono whitespace-pre-wrap leading-relaxed">
                        {n.content}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: AI MATERIALS (COVER LETTER & OUTREACH) */}
          {activeTab === "ai" && (
            <div className="space-y-5">
              <div className="p-4 rounded-2xl bg-slate-900/90 border border-white/5 space-y-4 shadow-md">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Format selection */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-slate-400 uppercase">Format</span>
                    <div className="flex gap-1.5">
                      <button
                        type="button"
                        onClick={() => setOutreachType("COVER_LETTER")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
                          outreachType === "COVER_LETTER"
                            ? "bg-emerald-950 border-emerald-700 text-emerald-300"
                            : "bg-slate-950 border-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        <FileText className="h-3 w-3" />
                        Cover Letter
                      </button>
                      <button
                        type="button"
                        onClick={() => setOutreachType("LINKEDIN_NOTE")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
                          outreachType === "LINKEDIN_NOTE"
                            ? "bg-emerald-950 border-emerald-700 text-emerald-300"
                            : "bg-slate-950 border-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        <MessageSquare className="h-3 w-3" />
                        LinkedIn Note
                      </button>
                      <button
                        type="button"
                        onClick={() => setOutreachType("EMAIL_RECRUITER")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition flex items-center gap-1.5 ${
                          outreachType === "EMAIL_RECRUITER"
                            ? "bg-emerald-950 border-emerald-700 text-emerald-300"
                            : "bg-slate-950 border-white/5 text-slate-400 hover:text-white"
                        }`}
                      >
                        <Mail className="h-3 w-3" />
                        Recruiter Email
                      </button>
                    </div>
                  </div>

                  {/* Tone selection */}
                  <div className="space-y-1">
                    <span className="text-[11px] font-mono text-slate-400 uppercase">Tone</span>
                    <div className="flex gap-1.5">
                      {(["IMPACT_DRIVEN", "CONCISE", "TECHNICAL"] as const).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => setTone(t)}
                          className={`px-2.5 py-1.5 rounded-xl text-[11px] font-mono border transition ${
                            tone === t
                              ? "bg-sky-950 border-sky-700 text-sky-300 font-semibold"
                              : "bg-slate-950 border-white/5 text-slate-400 hover:text-white"
                          }`}
                        >
                          {t === "IMPACT_DRIVEN" ? "Impact" : t === "CONCISE" ? "Concise" : "Tech"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    disabled={generatingOutreach}
                    onClick={handleGenerateOutreach}
                    className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-600/20 disabled:opacity-50 transition flex items-center gap-1.5"
                  >
                    {generatingOutreach ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Finding Relevant Experience & Drafting...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5" />
                        <span>Generate Tailored Application</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {outreachError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-900/60 text-xs text-rose-300 font-mono">
                  {outreachError}
                </div>
              )}

              {/* Generated Output Preview */}
              {outreachData && (
                <div className="space-y-4">
                  {/* Matched Bullets Badge List */}
                  {outreachData.matched_bullets && outreachData.matched_bullets.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-slate-950 border border-white/5 space-y-2">
                      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span className="flex items-center gap-1.5 text-sky-400">
                          <Database className="h-3 w-3" />
                          Matching Experience Highlights ({outreachData.matched_bullets.length} highlights)
                        </span>
                        <span>Top Relevant Bullets</span>
                      </div>
                      <div className="space-y-1">
                        {outreachData.matched_bullets.map((b, i) => (
                          <div key={i} className="text-[11px] text-slate-300 font-mono flex items-start gap-2">
                            <span className="text-emerald-400 font-semibold shrink-0">[{Math.round(b.similarity * 100)}%]</span>
                            <span className="truncate">{b.content}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Generated Content Box */}
                  <div className="rounded-2xl bg-slate-950 border border-white/5 overflow-hidden shadow-lg">
                    <div className="p-3 bg-slate-900/90 border-b border-white/5 flex items-center justify-between">
                      <span className="text-xs font-semibold text-white font-mono truncate">
                        {outreachData.subject}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopy}
                        className="px-2.5 py-1 rounded-lg text-xs font-mono font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 transition flex items-center gap-1.5 shrink-0"
                      >
                        {copied ? (
                          <>
                            <Check className="h-3 w-3 text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy className="h-3 w-3 text-slate-400" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="p-4 text-xs text-slate-200 leading-relaxed font-mono whitespace-pre-wrap max-h-80 overflow-y-auto">
                      {outreachData.content}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ATS KEYWORDS & JD ANALYSIS */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Simplify-Style ATS Match & Keyword Gap Inspector */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#0d1117] border border-slate-200 dark:border-[#30363d] space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-[#21262d]">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-emerald-500" />
                      Resume Keyword Checklist
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      Skills you have vs. keywords in the job description.
                    </p>
                  </div>
                  {application.match_score !== undefined && (
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                      {Math.round(application.match_score)}% Match Score
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Column: Skills Found in Resume */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Skills Found in Resume ({match?.matched_skills?.length || 0})
                    </h4>
                    {match?.matched_skills && match.matched_skills.length > 0 ? (
                      <div className="space-y-2">
                        {match.matched_skills.map((skill, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-emerald-900 dark:text-emerald-300">
                                {skill.requirement}
                              </span>
                              <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                                {Math.round(skill.similarity)}%
                              </span>
                            </div>
                            {skill.matched_bullet && (
                              <p className="text-[11px] text-slate-600 dark:text-slate-400 italic">
                                &ldquo;{skill.matched_bullet}&rdquo;
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 text-center">
                        No direct keyword matches extracted
                      </div>
                    )}
                  </div>

                  {/* Right Column: Missing Keywords from JD */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Missing Keywords from JD ({match?.deficiencies?.length || 0})
                    </h4>
                    {match?.deficiencies && match.deficiencies.length > 0 ? (
                      <div className="space-y-2">
                        {match.deficiencies.map((item, idx) => (
                          <div
                            key={idx}
                            className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 text-xs space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-amber-900 dark:text-amber-300">
                                {item.requirement}
                              </span>
                              <span className="text-[10px] font-mono text-amber-600 dark:text-amber-400">
                                Gap Flagged
                              </span>
                            </div>
                            {item.actionable_feedback ? (
                              <p className="text-[11px] text-amber-800 dark:text-amber-300/90 font-medium">
                                💡 Tip: {item.actionable_feedback}
                              </p>
                            ) : (
                              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                                Add this keyword or project experience to your resume to pass ATS filters.
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 text-xs text-emerald-600 dark:text-emerald-400 text-center">
                        ✓ No critical keyword deficiencies detected!
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Raw JD or Snapshot Preview */}
              {application.raw_description && (
                <div className="space-y-1.5 pt-3 border-t border-white/5">
                  <h4 className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                    Ingested Job Description Snapshot
                  </h4>
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-white/5 text-xs text-slate-300 font-mono max-h-56 overflow-y-auto whitespace-pre-wrap">
                    {application.raw_description}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 6: AUDIT LOG */}
          {activeTab === "audit" && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-1.5">
                <History className="h-4 w-4 text-purple-400" />
                State Transition Audit Log (PostgreSQL Transactional)
              </h3>

              {loadingTransitions ? (
                <p className="text-xs text-slate-500 font-mono">Loading audit history...</p>
              ) : transitions.length === 0 ? (
                <p className="text-xs text-slate-500 font-mono">No transitions recorded yet.</p>
              ) : (
                <div className="relative pl-4 border-l-2 border-white/10 space-y-3 text-xs">
                  {transitions.map((t) => (
                    <div key={t.id} className="relative">
                      <div className="absolute -left-[21px] top-1 h-2 w-2 rounded-full bg-purple-400"></div>
                      <div className="flex items-center gap-2 font-mono">
                        <span className="text-slate-400">{t.from_status}</span>
                        <span className="text-slate-600">→</span>
                        <span className="text-purple-300 font-semibold">{t.to_status}</span>
                        <span className="text-[11px] text-slate-500 ml-auto">
                          {new Date(t.transitioned_at).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
