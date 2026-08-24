type RewardTier = {
  id: string;
  name: string;
  referralsRequired: number;
  rewardDescription: string;
};

export function RewardTiersSection({
  tiers,
  myProgress,
}: {
  tiers: RewardTier[];
  /** The current visitor's own progress, once they've entered. `null` before entry. */
  myProgress: { referralCount: number } | null;
}) {
  return (
    <section className="text-left">
      <h2 className="mb-3 text-lg font-semibold">Reward tiers</h2>
      <ul className="space-y-2">
        {tiers.map((tier) => {
          const unlocked = myProgress ? myProgress.referralCount >= tier.referralsRequired : false;
          return (
            <li
              key={tier.id}
              className={`flex items-center justify-between rounded-lg border p-3 ${
                unlocked ? 'border-brand-600 bg-brand-50' : 'border-gray-200 bg-white'
              }`}
            >
              <div>
                <p className="font-medium">{tier.name}</p>
                <p className="text-sm text-gray-500">
                  {tier.referralsRequired} referral{tier.referralsRequired === 1 ? '' : 's'} —{' '}
                  {tier.rewardDescription}
                </p>
              </div>
              {myProgress && (
                <span className={`text-sm font-medium ${unlocked ? 'text-brand-700' : 'text-gray-400'}`}>
                  {unlocked
                    ? 'Unlocked'
                    : `${Math.max(tier.referralsRequired - myProgress.referralCount, 0)} to go`}
                </span>
              )}
            </li>
          );
        })}
        {tiers.length === 0 && <li className="text-gray-400">No reward tiers configured yet.</li>}
      </ul>
    </section>
  );
}
