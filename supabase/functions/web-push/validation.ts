export function allowedEndpoint(endpoint: string): boolean {
  try {
    const url = new URL(endpoint);
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') && (
      url.hostname === 'fcm.googleapis.com' ||
      url.hostname === 'updates.push.services.mozilla.com' ||
      url.hostname === 'push.services.mozilla.com' ||
      url.hostname === 'web.push.apple.com' || url.hostname.endsWith('.push.apple.com')
    );
  } catch {return false;}
}
