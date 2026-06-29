'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { MapPin, ThumbsUp, Clock, ChevronRight } from 'lucide-react';
import { Issue } from '@/lib/api';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { CATEGORY_LABELS, STATUS_LABELS } from '@/constants';
import { formatRelativeTime, getPriorityColor } from '@/lib/utils';

interface IssueCardProps {
  issue: Issue;
  index?: number;
  compact?: boolean;
}

export function IssueCard({ issue, index = 0, compact = false }: IssueCardProps) {
  const priorityVariant = issue.priority as 'critical' | 'medium' | 'low';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/issues/${issue.id}`}>
        <Card className="group hover:border-primary/30 transition-all duration-300 cursor-pointer p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <Badge variant={priorityVariant}>{issue.priority}</Badge>
                <Badge variant="info">{CATEGORY_LABELS[issue.category] || issue.category}</Badge>
              </div>

              <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors line-clamp-1 min-h-[1.5rem]">
                {issue.title}
              </h3>

              {!compact && (
                <div className="min-h-[2.5rem] mt-1">
                  <p className="text-sm text-muted line-clamp-2 leading-snug">{issue.description}</p>
                </div>
              )}

              <div className="flex items-center gap-4 mt-3 text-xs text-muted">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {issue.location?.address?.split(',')[0] || 'Unknown'}
                </span>
                <span className="flex items-center gap-1">
                  <ThumbsUp className="w-3 h-3" />
                  {issue.supportCount}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatRelativeTime(issue.createdAt)}
                </span>
              </div>
            </div>

            <ChevronRight className="w-5 h-5 text-muted group-hover:text-primary transition-colors shrink-0 mt-2" />
          </div>

          {!compact && (
            <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
              <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(issue.status)}`}>
                {STATUS_LABELS[issue.status] || issue.status}
              </span>
              {issue.verificationScore > 0 && (
                <span className="text-xs text-muted">
                  {issue.verificationScore}% verified
                </span>
              )}
            </div>
          )}
        </Card>
      </Link>
    </motion.div>
  );
}
