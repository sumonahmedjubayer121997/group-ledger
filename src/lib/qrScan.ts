/**
 * Reads QR codes from the camera or from a photo. Uses the browser's own BarcodeDetector where it
 * exists (Chrome on Android, macOS), and otherwise jsQR, which only downloads when first needed.
 */

type Detector = { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> };
type DetectorClass = { new (options: { formats: string[] }): Detector; getSupportedFormats?: () => Promise<string[]> };

const MAX_SIDE = 720;

async function makeDecoder(): Promise<(source: CanvasImageSource, width: number, height: number) => Promise<string | null>> {
  const Native = (window as unknown as { BarcodeDetector?: DetectorClass }).BarcodeDetector;
  if (Native) {
    try {
      const formats = (await Native.getSupportedFormats?.()) ?? ["qr_code"];
      if (formats.includes("qr_code")) {
        const detector = new Native({ formats: ["qr_code"] });
        return async (source) => (await detector.detect(source))[0]?.rawValue ?? null;
      }
    } catch {
      // Fall through to jsQR.
    }
  }
  const { default: jsQR } = await import("jsqr");
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  return async (source, width, height) => {
    if (!ctx || !width || !height) return null;
    const scale = Math.min(1, MAX_SIDE / Math.max(width, height));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
  };
}

export type ScanError = "denied" | "no-camera" | "unavailable";

export const scanErrorOf = (error: unknown): ScanError => {
  const name = (error as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError") return "denied";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "no-camera";
  return "unavailable";
};

/** Starts the back camera in `video` and calls `onText` with each QR code it reads. Returns stop(). */
export async function startQrScanner(video: HTMLVideoElement, onText: (text: string) => void): Promise<() => void> {
  if (!navigator.mediaDevices?.getUserMedia) throw Object.assign(new Error("No camera API"), { name: "NotFoundError" });
  const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
  let stopped = false;
  let timer = 0;
  const stop = () => {
    stopped = true;
    window.clearTimeout(timer);
    stream.getTracks().forEach((t) => t.stop());
    video.srcObject = null;
  };
  try {
    video.srcObject = stream;
    video.muted = true;
    video.setAttribute("playsinline", "true");
    await video.play();
    const decode = await makeDecoder();
    const tick = async () => {
      if (stopped) return;
      if (video.readyState >= 2) {
        const text = await decode(video, video.videoWidth, video.videoHeight).catch(() => null);
        if (text && !stopped) onText(text);
      }
      if (!stopped) timer = window.setTimeout(tick, 200);
    };
    void tick();
  } catch (error) {
    stop();
    throw error;
  }
  return stop;
}

/** Reads a QR code from a photo or screenshot, or returns null if there isn't one. */
export async function readQrFromImage(file: Blob): Promise<string | null> {
  const bitmap = await createImageBitmap(file);
  try {
    const decode = await makeDecoder();
    return await decode(bitmap, bitmap.width, bitmap.height);
  } finally {
    bitmap.close();
  }
}
