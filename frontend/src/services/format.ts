// Timestamps are shown in UTC so screenshots and tests look identical on every machine and in CI.
const formatter = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'UTC',
});

export function formatTimestamp(iso: string, { withZone = true } = {}): string {
  const formatted = formatter.format(new Date(iso));
  return withZone ? `${formatted} UTC` : formatted;
}
