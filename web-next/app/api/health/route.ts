export async function GET() {
  return Response.json({ ok: true, service: 'oh-my-git-web-next', time: new Date().toISOString() });
}
