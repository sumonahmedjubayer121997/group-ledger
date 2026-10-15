import { readFileSync } from "node:fs";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { initializeTestEnvironment, type RulesTestEnvironment } from "@firebase/rules-unit-testing";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";

// Point the app's Firebase setup at the local emulators instead of production.
vi.mock("@/lib/firebase", async () => {
  const { initializeApp } = await import("firebase/app");
  const { getAuth, connectAuthEmulator } = await import("firebase/auth");
  const { getFirestore, connectFirestoreEmulator } = await import("firebase/firestore");
  const app = initializeApp({ projectId: "demo-splitwize", apiKey: "demo-key", authDomain: "demo-splitwize.firebaseapp.com" }, "it");
  const auth = getAuth(app);
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  const db = getFirestore(app);
  connectFirestoreEmulator(db, "127.0.0.1", 8085);
  return { default: app, auth, db, storage: null };
});

const { auth } = await import("@/lib/firebase");
const { deleteMyAccount } = await import("@/services/firebaseService");

let env: RulesTestEnvironment;
let alice = "";
let bob = "";

const read = async (path: string) => {
  let data: Record<string, any> | undefined;
  await env.withSecurityRulesDisabled(async (ctx) => {
    const snap = await getDoc(doc(ctx.firestore(), path));
    data = snap.exists() ? snap.data() : undefined;
  });
  return data;
};

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-splitwize",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8085 },
  });
  await env.clearFirestore();
  await fetch("http://127.0.0.1:9099/emulator/v1/projects/demo-splitwize/accounts", { method: "DELETE" });

  bob = (await createUserWithEmailAndPassword(auth, "bob@example.com", "password-bob")).user.uid;
  alice = (await createUserWithEmailAndPassword(auth, "alice@example.com", "password-alice")).user.uid;

  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    const entry = (name: string, role: string, extra: object = {}) => ({ name, email: `${name.toLowerCase()}@example.com`, role, ...extra });
    // Only Alice has an account here (Tom is a placeholder): deleted with her account.
    await setDoc(doc(db, "groups/solo"), {
      name: "Solo",
      createdBy: alice,
      inviteCode: "solo-code-0000-0000-0000",
      users: { [alice]: entry("Alice", "admin"), tom: entry("Tom", "member", { isTemporary: true }) },
    });
    await setDoc(doc(db, "groups/solo/expenses/e1"), { description: "Snacks", amount: 10 });
    await setDoc(doc(db, "inviteCodes/solo-code-0000-0000-0000"), { groupId: "solo", groupName: "Solo" });
    // Shared, Alice is the only admin: Bob becomes admin, Alice's expense stays.
    await setDoc(doc(db, "groups/shared"), {
      name: "Flat",
      createdBy: alice,
      users: { [alice]: entry("Alice", "admin"), [bob]: entry("Bob", "member") },
    });
    await setDoc(doc(db, "groups/shared/members", alice), { role: "admin" });
    await setDoc(doc(db, "groups/shared/members", bob), { role: "member" });
    await setDoc(doc(db, "groups/shared/expenses/e2"), { description: "Rent", amount: 900, paidBy: { id: alice, name: "Alice" } });
    // Alice is only a viewer here.
    await setDoc(doc(db, "groups/viewing"), {
      name: "Trip",
      createdBy: bob,
      users: { [bob]: entry("Bob", "admin"), [alice]: entry("Alice", "viewer") },
    });
    await setDoc(doc(db, `users/${alice}`), { name: "Alice", email: "alice@example.com" });
    await setDoc(doc(db, `users/${alice}/groups/shared`), { groupId: "shared" });
    await setDoc(doc(db, `users/${alice}/budgets/b1`), { amount: 100 });
    await setDoc(doc(db, `users/${bob}`), { name: "Bob", email: "bob@example.com" });
    await setDoc(doc(db, "emailIndex/alice@example.com"), { uid: alice });
    await setDoc(doc(db, "notifications/n-alice"), { to: alice, title: "Hi" });
    await setDoc(doc(db, "notifications/n-bob"), { to: bob, title: "Hi" });
  });
});

afterAll(async () => {
  await signOut(auth).catch(() => undefined);
  await env?.cleanup();
});

describe("deleteMyAccount", () => {
  it("removes Alice's data and sign-in while keeping shared history intact", async () => {
    const { user } = await signInWithEmailAndPassword(auth, "alice@example.com", "password-alice");
    await deleteMyAccount(user);

    // Her solo group is gone, with its contents and link.
    expect(await read("groups/solo")).toBeUndefined();
    expect(await read("groups/solo/expenses/e1")).toBeUndefined();
    expect(await read("inviteCodes/solo-code-0000-0000-0000")).toBeUndefined();

    // The shared group keeps her as a placeholder and has a new admin.
    const shared = await read("groups/shared");
    expect(shared?.users[bob].role).toBe("admin");
    expect(shared?.users[alice]).toMatchObject({ name: "Alice (left)", email: "", isTemporary: true, role: "member" });
    expect(await read("groups/shared/expenses/e2")).toBeDefined();

    // As a viewer she could still retire her own entry.
    const viewing = await read("groups/viewing");
    expect(viewing?.users[alice]).toMatchObject({ name: "Alice (left)", email: "", isTemporary: true, role: "viewer" });
    expect(viewing?.users[bob].role).toBe("admin");

    // Her own records are gone; Bob's are untouched.
    expect(await read(`users/${alice}`)).toBeUndefined();
    expect(await read(`users/${alice}/groups/shared`)).toBeUndefined();
    expect(await read(`users/${alice}/budgets/b1`)).toBeUndefined();
    expect(await read("emailIndex/alice@example.com")).toBeUndefined();
    expect(await read("notifications/n-alice")).toBeUndefined();
    expect(await read("notifications/n-bob")).toBeDefined();
    expect(await read(`users/${bob}`)).toBeDefined();

    // And she can no longer sign in.
    await expect(signInWithEmailAndPassword(auth, "alice@example.com", "password-alice")).rejects.toThrow();
  });
});
