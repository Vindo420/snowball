import { Leaderboard } from '@/components/Leaderboard';

type LeaderboardEntry = {
  id: string;
  name: string | null;
  email: string;
  referralCount: number;
  points: number;
};

export function LeaderboardSection({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <section className="text-left">
      <h2 className="mb-3 text-lg font-semibold">Leaderboard</h2>
      <Leaderboard entries={entries} />
    </section>
  );
}
