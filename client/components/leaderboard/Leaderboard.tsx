'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Medal, Award } from 'lucide-react';
import { api, User } from '@/lib/api';
import { BADGE_LABELS } from '@/constants';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

const rankIcons = [Trophy, Medal, Award];

export function Leaderboard() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getLeaderboard(10)
      .then(({ leaderboard }) => setUsers(leaderboard))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (!users.length) {
    return (
      <Card className="text-center py-8">
        <Trophy className="w-12 h-12 text-muted mx-auto mb-3" />
        <p className="text-muted">No leaderboard data yet. Be the first to earn points!</p>
      </Card>
    );
  }

  return (
    <div className="space-y-2">
      {users.map((user, index) => {
        const RankIcon = rankIcons[index] || Award;
        const rankColors = ['text-yellow-400', 'text-gray-300', 'text-amber-600'];

        return (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="flex items-center gap-4 p-4 hover:border-primary/20 transition-colors">
              <div className={`w-8 text-center font-bold ${rankColors[index] || 'text-muted'}`}>
                {index < 3 ? <RankIcon className="w-6 h-6 mx-auto" /> : `#${index + 1}`}
              </div>

              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center font-semibold">
                {user.displayName?.[0]?.toUpperCase() || '?'}
              </div>

              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.displayName}</p>
                {user.badges?.length > 0 && (
                  <p className="text-xs text-muted truncate">
                    {user.badges.map((b) => BADGE_LABELS[b] || b).join(', ')}
                  </p>
                )}
              </div>

              <div className="text-right">
                <p className="font-bold text-primary">{user.points}</p>
                <p className="text-xs text-muted">points</p>
              </div>
            </Card>
          </motion.div>
        );
      })}
    </div>
  );
}
