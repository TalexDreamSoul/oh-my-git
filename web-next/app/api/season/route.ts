import { activeSeason, seasons } from '../../lib/seasons';

export async function GET() {
  return Response.json({ activeSeason: activeSeason(), seasons });
}
