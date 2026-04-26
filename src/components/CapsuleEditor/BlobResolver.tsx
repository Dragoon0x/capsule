import { useEffect, useState } from 'react';
import { getBlob } from '../../db/repo';

/**
 * Resolves a blob id to an object URL, revoking on unmount.
 */
export function useBlobUrl(blobId: string | null | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined);
  useEffect(() => {
    if (!blobId) return undefined;
    let revoked = false;
    let current: string | undefined;
    void getBlob(blobId).then((rec) => {
      if (revoked || !rec) return;
      current = URL.createObjectURL(rec.data);
      setUrl(current);
    });
    return () => {
      revoked = true;
      if (current) URL.revokeObjectURL(current);
    };
  }, [blobId]);
  return url;
}
