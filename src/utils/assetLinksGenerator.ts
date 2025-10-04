/**
 * Generate Android App Links assetlinks.json from mobile linking settings
 */

interface AssetLinkTarget {
  relation: string[];
  target: {
    namespace: string;
    package_name: string;
    sha256_cert_fingerprints: string[];
  };
}

export function validateSHA256Fingerprint(fingerprint: string): boolean {
  // SHA-256 fingerprints are 64 hex characters with colons: AA:BB:CC:...
  const pattern = /^([A-F0-9]{2}:){31}[A-F0-9]{2}$/i;
  return pattern.test(fingerprint);
}

export function generateAssetLinks(
  releasePackage?: string,
  releaseFingerprints?: string[],
  debugPackage?: string,
  debugFingerprints?: string[]
): AssetLinkTarget[] {
  const links: AssetLinkTarget[] = [];

  // Add release config
  if (releasePackage && releaseFingerprints && releaseFingerprints.length > 0) {
    const validFingerprints = releaseFingerprints.filter(validateSHA256Fingerprint);
    if (validFingerprints.length > 0) {
      links.push({
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: releasePackage,
          sha256_cert_fingerprints: validFingerprints
        }
      });
    }
  }

  // Add debug config
  if (debugPackage && debugFingerprints && debugFingerprints.length > 0) {
    const validFingerprints = debugFingerprints.filter(validateSHA256Fingerprint);
    if (validFingerprints.length > 0) {
      links.push({
        relation: ["delegate_permission/common.handle_all_urls"],
        target: {
          namespace: "android_app",
          package_name: debugPackage,
          sha256_cert_fingerprints: validFingerprints
        }
      });
    }
  }

  return links;
}

export function assetLinksToJSON(links: AssetLinkTarget[]): string {
  return JSON.stringify(links, null, 2);
}
