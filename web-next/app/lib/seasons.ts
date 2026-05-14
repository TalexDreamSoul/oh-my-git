export type Season = {
  id: string;
  name: string;
  startsAt: string;
  endsAt: string;
  active: boolean;
};

export const seasons: Season[] = [
  {
    id: 's2026-spring',
    name: '2026 春季赛',
    startsAt: '2026-03-01T00:00:00.000Z',
    endsAt: '2026-06-01T00:00:00.000Z',
    active: true
  }
];

export function activeSeason(now = new Date()): Season {
  return seasons.find((season) => {
    const startsAt = new Date(season.startsAt).getTime();
    const endsAt = new Date(season.endsAt).getTime();
    return season.active && now.getTime() >= startsAt && now.getTime() < endsAt;
  }) ?? seasons[0];
}
