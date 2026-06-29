import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function formatRelativeTime(date: string | Date) {
  const diff = Date.now() - new Date(date).getTime();
  const hours = Math.floor(diff / 3600000);
  if (hours < 1) return 'Just now';
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function getPriorityColor(priority: string) {
  switch (priority) {
    case 'critical': return 'text-red-400 bg-red-500/10 border-red-500/20';
    case 'medium': return 'text-orange-400 bg-orange-500/10 border-orange-500/20';
    case 'low': return 'text-green-400 bg-green-500/10 border-green-500/20';
    default: return 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20';
  }
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'reported': return 'text-blue-400 bg-blue-500/10';
    case 'ai_categorized': return 'text-purple-400 bg-purple-500/10';
    case 'community_verified': return 'text-cyan-400 bg-cyan-500/10';
    case 'assigned': return 'text-yellow-400 bg-yellow-500/10';
    case 'in_progress': return 'text-orange-400 bg-orange-500/10';
    case 'completed': return 'text-green-400 bg-green-500/10';
    case 'ai_verified': return 'text-emerald-400 bg-emerald-500/10';
    default: return 'text-zinc-400 bg-zinc-500/10';
  }
}

export function getMarkerColor(priority: string, status: string) {
  if (status === 'ai_verified' || status === 'completed') return '#22c55e';
  if (status === 'ai_categorized' || status === 'reported') return '#3b82f6';
  if (priority === 'critical') return '#ef4444';
  if (priority === 'medium') return '#f59e0b';
  return '#22c55e';
}
