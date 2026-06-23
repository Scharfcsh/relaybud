export function computeSessionToken(): string {
  const secret = process.env.SESSION_SECRET ?? "";
  const password = process.env.DASHBOARD_PASSWORD ?? "";
  return btoa(`${password}:${secret}`);
}
