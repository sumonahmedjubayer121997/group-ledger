import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { ref, uploadBytes } from "firebase/storage";

let env: RulesTestEnvironment;

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-splitwize",
    storage: { rules: readFileSync("storage.rules", "utf8"), host: "127.0.0.1", port: 9199 },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

describe("storage", () => {
  it("lets people upload images to their own folder only", async () => {
    const alice = env.authenticatedContext("alice").storage();
    await assertSucceeds(uploadBytes(ref(alice, "profile-pictures/alice/me.png"), png, { contentType: "image/png" }));
    await assertSucceeds(uploadBytes(ref(alice, "group-photos/alice/trip.png"), png, { contentType: "image/png" }));
    await assertFails(uploadBytes(ref(alice, "profile-pictures/bob/me.png"), png, { contentType: "image/png" }));
  });

  it("rejects non-images, unknown folders and anonymous uploads", async () => {
    const alice = env.authenticatedContext("alice").storage();
    await assertFails(uploadBytes(ref(alice, "profile-pictures/alice/notes.txt"), png, { contentType: "text/plain" }));
    await assertFails(uploadBytes(ref(alice, "anything/alice/me.png"), png, { contentType: "image/png" }));
    const anon = env.unauthenticatedContext().storage();
    await assertFails(uploadBytes(ref(anon, "profile-pictures/alice/me.png"), png, { contentType: "image/png" }));
  });
});
