import { useEffect, useState } from "react";
import { getUserProfile } from "@/services/firebaseService";

// Profile photos change rarely; fetch each person once per session.
const cache = new Map<string, Promise<string | null>>();

const photoOf = (uid: string) => {
  if (!cache.has(uid)) {
    cache.set(
      uid,
      getUserProfile(uid)
        .then((profile) => profile?.photoURL || null)
        .catch(() => null)
    );
  }
  return cache.get(uid)!;
};

/** Profile photo URLs for these people (members with an account), keyed by id. */
export function useMemberPhotos(ids: string[]) {
  const [photos, setPhotos] = useState<Record<string, string | null>>({});
  const key = ids.join("|");
  useEffect(() => {
    let cancelled = false;
    Promise.all(ids.map(async (id) => [id, await photoOf(id)] as const)).then((entries) => {
      if (!cancelled) setPhotos(Object.fromEntries(entries));
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return photos;
}
