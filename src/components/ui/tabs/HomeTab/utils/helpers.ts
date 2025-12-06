export function getTimeGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function formatContractAddress(address?: string | null) {
  if (!address) return "Address unavailable";
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function getShortTimezone() {
  const longTZ = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const map = {
    "Asia/Kolkata": "IST",
    "Asia/Calcutta": "IST",
    "America/New_York": "EST",
    "America/Los_Angeles": "PST",
    "America/Chicago": "CST",
    "America/Denver": "MST",
    "Europe/London": "GMT",
    "Europe/Paris": "CET",
    "Asia/Dubai": "GST",
    "Asia/Tokyo": "JST",
    "Australia/Sydney": "AEST",
  } as Record<string, string>;

  return map[longTZ] ?? longTZ;
}
