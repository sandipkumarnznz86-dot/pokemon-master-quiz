export interface RankDefinition {
  name: string;
  minimumPoints: number;
}

export const RANKS: readonly RankDefinition[] = [
  { name: 'Rookie', minimumPoints: 0 },
  { name: 'Trainer', minimumPoints: 100 },
  { name: 'Ace Trainer', minimumPoints: 300 },
  { name: 'Gym Leader', minimumPoints: 700 },
  { name: 'Elite Four', minimumPoints: 1500 },
  { name: 'Champion', minimumPoints: 3000 },
];

export function getRank(points: number): RankDefinition {
  const safePoints = Math.max(0, points);
  return [...RANKS]
    .reverse()
    .find((rank) => safePoints >= rank.minimumPoints) ?? RANKS[0];
}

export function getNextRank(points: number): RankDefinition | null {
  const currentRank = getRank(points);
  return (
    RANKS.find((rank) => rank.minimumPoints > currentRank.minimumPoints) ?? null
  );
}

export function getRankProgress(points: number): number {
  const safePoints = Math.max(0, points);
  const currentRank = getRank(safePoints);
  const nextRank = getNextRank(safePoints);

  if (!nextRank) {
    return 100;
  }

  return Math.min(
    100,
    Math.round(
      ((safePoints - currentRank.minimumPoints) /
        (nextRank.minimumPoints - currentRank.minimumPoints)) *
        100,
    ),
  );
}
