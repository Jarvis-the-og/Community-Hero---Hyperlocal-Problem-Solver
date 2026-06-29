import { Leaderboard } from '@/components/leaderboard/Leaderboard';

export default function LeaderboardPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-2">Leaderboard</h1>
      <p className="text-muted mb-8">Top community contributors making a difference</p>
      <Leaderboard />
    </div>
  );
}
