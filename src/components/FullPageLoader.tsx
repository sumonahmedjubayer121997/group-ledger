import { Loader2 } from "lucide-react";

/** Shown for a moment while sign-in is restored or a part of the app downloads. */
export function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background" role="status" aria-label="Loading">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-hidden="true" />
    </div>
  );
}
