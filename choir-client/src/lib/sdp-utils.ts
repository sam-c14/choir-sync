/**
 * Opus SDP Optimization Utility
 * 
 * Enforces Opus mono voice parameters for high-resilience and low-bandwidth conferencing:
 * - useinbandfec=1: Enables Forward Error Correction to recover from packet loss
 * - usedtx=1: Enables Discontinuous Transmission (stops transmitting silence)
 * - maxaveragebitrate=32000: Limits audio bandwidth to 32 kbps per stream
 * - stereo=0; sprop-stereo=0: Enforces mono audio transmission
 */
export function optimizeOpusSdp(sdp: string): string {
  if (!sdp) return sdp;

  const lines = sdp.split('\r\n');
  let opusPayloadType: string | null = null;

  // 1. Locate Opus payload type
  for (const line of lines) {
    const match = line.match(/^a=rtpmap:(\d+)\s+opus\/48000(?:\/2)?/i);
    if (match) {
      opusPayloadType = match[1];
      break;
    }
  }

  if (!opusPayloadType) {
    return sdp;
  }

  const opusParams = [
    'useinbandfec=1',
    'usedtx=1',
    'maxaveragebitrate=32000',
    'stereo=0',
    'sprop-stereo=0',
  ];

  let fmtpFound = false;
  const modifiedLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for existing a=fmtp line for Opus
    if (line.startsWith(`a=fmtp:${opusPayloadType}`)) {
      fmtpFound = true;
      const parts = line.split(' ');
      const prefix = parts[0]; // e.g. a=fmtp:111
      const existingParams = parts.slice(1).join(' ').split(';').map((p) => p.trim()).filter(Boolean);

      // Merge and override with target parameters
      const paramMap = new Map<string, string>();
      for (const param of existingParams) {
        const [k, v] = param.split('=');
        if (k) paramMap.set(k.trim(), v ? v.trim() : '');
      }

      for (const override of opusParams) {
        const [k, v] = override.split('=');
        paramMap.set(k, v);
      }

      const mergedParams = Array.from(paramMap.entries())
        .map(([k, v]) => (v ? `${k}=${v}` : k))
        .join(';');

      modifiedLines.push(`${prefix} ${mergedParams}`);
    } else {
      modifiedLines.push(line);

      // If no fmtp line exists yet, inject it immediately after the rtpmap line
      if (!fmtpFound && line.startsWith(`a=rtpmap:${opusPayloadType}`)) {
        // Look ahead to check if next line is already fmtp
        const nextLine = lines[i + 1] || '';
        if (!nextLine.startsWith(`a=fmtp:${opusPayloadType}`)) {
          modifiedLines.push(`a=fmtp:${opusPayloadType} ${opusParams.join(';')}`);
          fmtpFound = true;
        }
      }
    }
  }

  return modifiedLines.join('\r\n');
}
