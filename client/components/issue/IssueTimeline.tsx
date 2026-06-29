'use client';

import { motion } from 'framer-motion';
import { CheckCircle2, Circle } from 'lucide-react';
import { TimelineEvent } from '@/lib/api';
import { formatDate } from '@/lib/utils';

const TIMELINE_STEPS = [
  'reported',
  'ai_categorized',
  'community_verified',
  'assigned',
  'in_progress',
  'completed',
  'ai_verified',
];

interface IssueTimelineProps {
  timeline: TimelineEvent[];
  currentStatus: string;
}

export function IssueTimeline({ timeline, currentStatus }: IssueTimelineProps) {
  const currentIndex = TIMELINE_STEPS.indexOf(currentStatus);

  return (
    <div className="space-y-0">
      {TIMELINE_STEPS.map((step, index) => {
        const event = timeline.find((e) => e.status === step);
        const isComplete = index <= currentIndex;
        const isCurrent = step === currentStatus;

        return (
          <div key={step} className="flex gap-4">
            <div className="flex flex-col items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.1 }}
              >
                {isComplete ? (
                  <CheckCircle2 className={`w-6 h-6 ${isCurrent ? 'text-primary' : 'text-success'}`} />
                ) : (
                  <Circle className="w-6 h-6 text-muted/30" />
                )}
              </motion.div>
              {index < TIMELINE_STEPS.length - 1 && (
                <div className={`w-0.5 h-8 ${isComplete ? 'bg-primary/50' : 'bg-white/10'}`} />
              )}
            </div>

            <div className="pb-6">
              <p className={`font-medium text-sm ${isComplete ? 'text-foreground' : 'text-muted/50'}`}>
                {event?.label || step.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
              </p>
              {event?.description && (
                <p className="text-xs text-muted mt-0.5">{event.description}</p>
              )}
              {event?.timestamp && (
                <p className="text-xs text-muted/60 mt-1">{formatDate(event.timestamp)}</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
