const WEB_PROTOCOLS = new Set(['http:', 'https:']);
const COLLAPSIBLE_PREFIXES = ['www.', 'm.', 'mobile.', 'old.', 'new.'];

export function normalizeDomain(input) {
  if (!input || typeof input !== 'string') return null;

  let url;
  try {
    url = new URL(input);
  } catch {
    try {
      url = new URL(`https://${input}`);
    } catch {
      return null;
    }
  }

  if (!WEB_PROTOCOLS.has(url.protocol)) return null;
  let hostname = url.hostname.toLowerCase().replace(/\.$/, '');
  if (!hostname) return null;

  for (const prefix of COLLAPSIBLE_PREFIXES) {
    if (hostname.startsWith(prefix) && hostname.length > prefix.length) {
      hostname = hostname.slice(prefix.length);
      break;
    }
  }

  return hostname;
}

export function displayDomain(domain) {
  return domain || 'No website';
}
