'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import { MapPin, Camera, CheckCircle, Play, Pause, Loader2, HardHat } from 'lucide-react';
import { api, WorkerTasksData, Issue } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useRoleGuard } from '@/hooks/useRoleGuard';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatsSkeleton } from '@/components/ui/skeleton';
import { EmptyState, ErrorState } from '@/components/ui/empty-state';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/constants';

export default function WorkerPage() {
  const { token } = useAuth();
  const { authorized } = useRoleGuard('worker');
  const [data, setData] = useState<WorkerTasksData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const result = await api.getWorkerTasks(token);
      setData(result);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authorized && token) load();
  }, [authorized, token]);

  if (loading) return <div className="max-w-lg mx-auto px-4 py-6"><StatsSkeleton /></div>;
  if (!authorized) return null;
  if (error) return <div className="max-w-lg mx-auto px-4 py-6"><ErrorState message={error} onRetry={load} /></div>;
  if (!data) return null;

  return (
    <div className="max-w-lg mx-auto px-4 py-6 pb-24">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
            <HardHat className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold">Today&apos;s Tasks</h1>
            <p className="text-sm text-muted">{data.stats.total} assigned · {data.stats.inProgress} in progress</p>
          </div>
        </div>

        {data.tasks.length > 0 ? (
          <div className="space-y-3">
            {data.tasks.map((task, i) => (
              <WorkerTaskPreview key={task.id} task={task} index={i} />
            ))}
          </div>
        ) : (
          <EmptyState icon={CheckCircle} title="No tasks for today" description="Check back later for new assignments." />
        )}
      </motion.div>
    </div>
  );
}

function WorkerTaskPreview({ task, index }: { task: Issue; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/worker/tasks/${task.id}`} className="glass-card p-4 block">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant={task.priority as 'critical' | 'medium' | 'low'}>{task.priority}</Badge>
          <Badge>{STATUS_LABELS[task.status]}</Badge>
        </div>
        <h3 className="font-semibold">{task.title}</h3>
        <p className="text-xs text-muted mt-1 flex items-center gap-1">
          <MapPin className="w-3 h-3" /> {task.location?.address?.split(',')[0]}
        </p>
      </Link>
    </motion.div>
  );
}

export { WorkerTaskPreview };
