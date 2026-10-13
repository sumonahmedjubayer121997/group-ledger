import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, ImageUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { parseInviteCode } from "@/lib/inviteCode";
import { readQrFromImage, scanErrorOf, startQrScanner, type ScanError } from "@/lib/qrScan";

const scanMessages: Record<ScanError, string> = {
  denied: "Camera access is blocked. Allow it in your browser's site settings, or use a photo or the link instead.",
  "no-camera": "No camera found. Use a photo of the QR code, or paste the link instead.",
  unavailable: "The camera couldn't start. Use a photo of the QR code, or paste the link instead.",
};
const NOT_AN_INVITE = "That isn't a SplitWize invite. Ask for the group's QR code or invite link.";

/**
 * Join a group from its QR code (camera or photo) or a pasted invite link. It opens the invite
 * page, which shows the group and asks before joining.
 */
export function JoinGroupDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stopRef = useRef<(() => void) | null>(null);
  const [scanning, setScanning] = useState(false);
  const [starting, setStarting] = useState(false);
  const [scanError, setScanError] = useState("");
  const [link, setLink] = useState("");
  const [linkError, setLinkError] = useState("");

  const stopScan = () => {
    stopRef.current?.();
    stopRef.current = null;
    setScanning(false);
  };

  // Always release the camera when the dialog closes.
  useEffect(() => {
    if (!open) {
      stopRef.current?.();
      stopRef.current = null;
      setScanning(false);
      setScanError("");
      setLinkError("");
      setLink("");
    }
  }, [open]);
  useEffect(() => () => stopRef.current?.(), []);

  const go = (code: string) => {
    stopScan();
    onOpenChange(false);
    navigate(`/join/${code}`);
  };

  const startScan = async () => {
    setScanError("");
    setStarting(true);
    setScanning(true);
    try {
      // The video element renders once scanning is true.
      await new Promise((r) => requestAnimationFrame(r));
      if (!videoRef.current) throw new Error("No video element");
      stopRef.current = await startQrScanner(videoRef.current, (text) => {
        const code = parseInviteCode(text);
        if (code) go(code);
        else setScanError(NOT_AN_INVITE);
      });
    } catch (error) {
      setScanning(false);
      setScanError(scanMessages[scanErrorOf(error)]);
    } finally {
      setStarting(false);
    }
  };

  const fromPhoto = async (file: File | undefined) => {
    if (!file) return;
    setScanError("");
    try {
      const text = await readQrFromImage(file);
      const code = text ? parseInviteCode(text) : null;
      if (code) go(code);
      else setScanError(text ? NOT_AN_INVITE : "No QR code found in that picture. Try a sharper, closer photo.");
    } catch {
      setScanError("Couldn't read that picture. Try another one.");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const fromLink = (e: React.FormEvent) => {
    e.preventDefault();
    const code = parseInviteCode(link);
    if (code) go(code);
    else setLinkError(link.trim() ? "That doesn't look like an invite link. It should contain /join/ followed by a code." : "Paste the invite link first.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Join a group</DialogTitle>
          <DialogDescription>Scan the group's QR code, or paste the invite link someone sent you.</DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {scanning ? (
            <div className="relative mx-auto aspect-square w-full max-w-[18rem] overflow-hidden rounded-xl bg-black">
              <video ref={videoRef} className="h-full w-full object-cover" aria-label="Camera view for scanning a QR code" />
              <div className="pointer-events-none absolute inset-[18%] rounded-lg border-2 border-white/80" aria-hidden="true" />
              {starting && (
                <div className="absolute inset-0 flex items-center justify-center text-sm text-white">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Starting the camera…
                </div>
              )}
            </div>
          ) : (
            <Button className="w-full" onClick={() => void startScan()}>
              <Camera aria-hidden="true" />
              Scan QR code
            </Button>
          )}
          {scanning && (
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm text-muted-foreground" aria-live="polite">
                Point the camera at the QR code.
              </p>
              <Button variant="outline" size="sm" onClick={stopScan}>
                Stop
              </Button>
            </div>
          )}
          <Button variant="ghost" size="sm" className="w-full" onClick={() => fileRef.current?.click()}>
            <ImageUp aria-hidden="true" />
            Use a photo or screenshot instead
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(e) => void fromPhoto(e.target.files?.[0])}
          />
          {scanError && (
            <p role="alert" className="text-sm text-destructive">
              {scanError}
            </p>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground" aria-hidden="true">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={fromLink} className="grid gap-1.5" noValidate>
          <Label htmlFor="join-link">Invite link</Label>
          <div className="flex gap-2">
            <Input
              id="join-link"
              value={link}
              onChange={(e) => {
                setLink(e.target.value);
                setLinkError("");
              }}
              placeholder="https://…/join/…"
              autoComplete="off"
              aria-invalid={!!linkError}
              aria-describedby={linkError ? "join-link-error" : undefined}
            />
            <Button type="submit" variant="outline">
              Open
            </Button>
          </div>
          {linkError && (
            <p id="join-link-error" className="text-sm text-destructive">
              {linkError}
            </p>
          )}
        </form>
      </DialogContent>
    </Dialog>
  );
}
