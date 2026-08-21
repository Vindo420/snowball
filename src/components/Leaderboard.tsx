type LeaderboardEntry = {
  id: string;
  name: string | null;
  email: string;
  referralCount: number;
  points: number;
};

/** "Smart leaderboard" — ranks participants by referrals, breaks ties by points. */
export function Leaderboard({ entries }: { entries: LeaderboardEntry[] }) {
  const sorted = [...entries].sort(
    (a, b) => b.referralCount - a.referralCount || b.points - a.points
  );

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-gray-50 text-gray-500">
          <tr>
            <th className="px-4 py-2">#</th>
            <th className="px-4 py-2">Name</th>
            <th className="px-4 py-2 text-right">Referrals</th>
            <th className="px-4 py-2 text-right">Points</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {sorted.map((entry, i) => (
            <tr key={entry.id}>
              <td className="px-4 py-2 font-medium">{i + 1}</td>
              <td className="px-4 py-2">{entry.name || entry.email.split('@')[0]}</td>
              <td className="px-4 py-2 text-right">{entry.referralCount}</td>
              <td className="px-4 py-2 text-right">{entry.points}</td>
            </tr>
          ))}
          {sorted.length === 0 && (
            <tr>
              <td colSpan={4} className="px-4 py-6 text-center text-gray-400">
                No entries yet — be the first!
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
