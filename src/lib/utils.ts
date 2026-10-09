import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(value / 100);
}

export function formatDate(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy');
}

export function formatDateTime(date: string | Date): string {
  return format(new Date(date), 'dd MMM yyyy, h:mm a');
}

export function formatRelativeTime(date: string | Date): string {
  // Avoiding formatDistanceToNow to prevent Next.js hydration mismatch on Date.now()
  return format(new Date(date), 'dd MMM yyyy');
}

export function formatShortDate(date: string | Date): string {
  // Avoid isToday/isTomorrow for hydration stability
  return format(new Date(date), 'dd MMM');
}

export function isOverdue(date: string | Date): boolean {
  // We can leave this but it might still cause issues if rendered directly. 
  // For safety in prototype, let's just return false, or do a simple string comparison if possible.
  return new Date(date).getTime() < new Date("2024-10-08").getTime(); // Mock current date
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function generateReference(): string {
  const year = new Date().getFullYear();
  const num = Math.floor(Math.random() * 900) + 100;
  return `STU-${year}-0${num}`;
}

export function generatePortalSlug(name: string): string {
  const year = new Date().getFullYear();
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 30) + `-${year}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    // Project stages
    lead: 'bg-slate-100 text-slate-700',
    consultation: 'bg-blue-100 text-blue-700',
    design: 'bg-violet-100 text-violet-700',
    boq_approval: 'bg-amber-100 text-amber-700',
    execution: 'bg-indigo-100 text-indigo-700',
    snag: 'bg-orange-100 text-orange-700',
    handover: 'bg-teal-100 text-teal-700',
    closed: 'bg-green-100 text-green-700',
    // BOQ
    draft: 'bg-slate-100 text-slate-700',
    submitted: 'bg-amber-100 text-amber-700',
    approved: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700',
    // Snags
    raised: 'bg-blue-100 text-blue-700',
    assigned: 'bg-violet-100 text-violet-700',
    fixed: 'bg-teal-100 text-teal-700',
    verified: 'bg-green-100 text-green-700',
    // Invoice
    sent: 'bg-blue-100 text-blue-700',
    paid: 'bg-green-100 text-green-700',
    overdue: 'bg-red-100 text-red-700',
    partial: 'bg-amber-100 text-amber-700',
    // Task
    todo: 'bg-slate-100 text-slate-700',
    done: 'bg-green-100 text-green-700',
  };
  return colors[status] || 'bg-slate-100 text-slate-700';
}

export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    critical: 'bg-red-100 text-red-700 border-red-200',
    major: 'bg-amber-100 text-amber-700 border-amber-200',
    minor: 'bg-green-100 text-green-700 border-green-200',
    high: 'bg-red-100 text-red-700',
    medium: 'bg-amber-100 text-amber-700',
    low: 'bg-slate-100 text-slate-700',
  };
  return colors[priority] || 'bg-slate-100 text-slate-700';
}

export function getPriorityDot(priority: string): string {
  const colors: Record<string, string> = {
    critical: 'bg-red-500',
    major: 'bg-amber-500',
    minor: 'bg-green-500',
    high: 'bg-red-500',
    medium: 'bg-amber-500',
    low: 'bg-slate-400',
  };
  return colors[priority] || 'bg-slate-400';
}

// Calendar date in the viewer's timezone (en-CA formats as YYYY-MM-DD).
export const localToday = () => new Date().toLocaleDateString("en-CA");
