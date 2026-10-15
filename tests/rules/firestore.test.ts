import { readFileSync } from "node:fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  deleteField,
  doc,
  FieldPath,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

// Fake accounts. `token` mirrors what Firebase Auth puts in request.auth.token.
const ALICE = { uid: "alice", token: { email: "alice@example.com", email_verified: true } }; // group admin
const BOB = { uid: "bob", token: { email: "bob@example.com", email_verified: true } }; // member
const VIC = { uid: "vic", token: { email: "vic@example.com", email_verified: true } }; // viewer
const CAROL = { uid: "carol", token: { email: "carol@example.com", email_verified: true } }; // outsider
const DAVE = { uid: "dave", token: { email: "dave@example.com", email_verified: true } }; // invited by email
const EVE = { uid: "eve", token: { email: "dave@example.com", email_verified: false } }; // claims Dave's email, unverified

let env: RulesTestEnvironment;

const as = (who: { uid: string; token: object }) => env.authenticatedContext(who.uid, who.token).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-splitwize",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8085 },
  });
});

afterAll(async () => {
  await env?.cleanup();
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, "groups/g1"), {
      name: "Sylhet trip",
      createdBy: "alice",
      settings: { currency: "BDT" },
      users: {
        alice: { name: "Alice", email: "alice@example.com", role: "admin" },
        bob: { name: "Bob", email: "bob@example.com", role: "member" },
        vic: { name: "Vic", email: "vic@example.com", role: "viewer" },
        temp1: { name: "Dave", email: "dave@example.com", role: "member", isTemporary: true },
        gone: null,
      },
    });
    await setDoc(doc(db, "groups/g1/expenses/e1"), { description: "Hotel", amount: 6000 });
    await setDoc(doc(db, "invites/g1_dave@example.com"), {
      groupId: "g1",
      email: "dave@example.com",
      tempId: "temp1",
      role: "member",
      name: "Dave",
      invitedBy: "alice",
    });
    await setDoc(doc(db, "settlements/s1"), { groupId: "g1", amount: 500, date: "2026-10-01", createdBy: "bob" });
    await setDoc(doc(db, "notifications/n1"), { to: "bob", title: "New expense", message: "Hotel", isRead: false });
    await setDoc(doc(db, "users/alice"), { name: "Alice", email: "alice@example.com" });
    await setDoc(doc(db, "users/bob"), { name: "Bob", email: "bob@example.com" });
    await setDoc(doc(db, "users/placeholder-dave"), { name: "Dave", email: "dave@example.com", verified: false });
  });
});

describe("groups", () => {
  it("lets members read their group and keeps outsiders out", async () => {
    await assertSucceeds(getDoc(doc(as(BOB), "groups/g1")));
    await assertSucceeds(getDoc(doc(as(VIC), "groups/g1")));
    await assertFails(getDoc(doc(as(CAROL), "groups/g1")));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "groups/g1")));
  });

  it("treats a removed (null) member entry as not a member", async () => {
    await assertFails(getDoc(doc(as({ uid: "gone", token: { email: "gone@example.com", email_verified: true } }), "groups/g1")));
  });

  it("allows the app's 'my groups' query and blocks listing every group", async () => {
    const alice = as(ALICE);
    await assertSucceeds(getDocs(query(collection(alice, "groups"), where("users.alice.role", "in", ["admin", "member"]))));
    const carol = as(CAROL);
    await assertSucceeds(getDocs(query(collection(carol, "groups"), where("users.carol.role", "in", ["admin", "member"]))));
    await assertFails(getDocs(collection(carol, "groups")));
    await assertFails(getDocs(collection(alice, "groups")));
  });

  it("lets anyone create a group they administer, but not on someone else's behalf", async () => {
    const carol = as(CAROL);
    await assertSucceeds(
      setDoc(doc(carol, "groups/g2"), { name: "Flat", createdBy: "carol", users: { carol: { role: "admin" } } }),
    );
    await assertFails(
      setDoc(doc(carol, "groups/g3"), { name: "Fake", createdBy: "alice", users: { carol: { role: "admin" } } }),
    );
  });

  it("lets members edit the group, but not viewers or outsiders; only admins delete", async () => {
    await assertSucceeds(updateDoc(doc(as(BOB), "groups/g1"), { description: "Updated" }));
    await assertFails(updateDoc(doc(as(VIC), "groups/g1"), { description: "Nope" }));
    await assertFails(updateDoc(doc(as(CAROL), "groups/g1"), { description: "Nope" }));
    await assertFails(deleteDoc(doc(as(BOB), "groups/g1")));
    await assertSucceeds(deleteDoc(doc(as(ALICE), "groups/g1")));
  });
});

describe("member list changes", () => {
  const person = (name: string, role: string) => ({ name, email: `${name.toLowerCase()}@example.com`, role });

  it("lets members add one person as a member or viewer, but not an admin or several at once", async () => {
    await assertSucceeds(updateDoc(doc(as(BOB), "groups/g1"), { "users.newbie": person("Newbie", "member") }));
    await assertSucceeds(updateDoc(doc(as(BOB), "groups/g1"), { "users.watcher": person("Watcher", "viewer") }));
    await assertFails(updateDoc(doc(as(BOB), "groups/g1"), { "users.boss": person("Boss", "admin") }));
    await assertFails(
      updateDoc(doc(as(BOB), "groups/g1"), { "users.one": person("One", "member"), "users.two": person("Two", "member") }),
    );
  });

  it("only lets admins change roles or remove people", async () => {
    await assertFails(updateDoc(doc(as(BOB), "groups/g1"), new FieldPath("users", "bob", "role"), "admin"));
    await assertFails(updateDoc(doc(as(BOB), "groups/g1"), new FieldPath("users", "vic", "role"), "member"));
    await assertFails(updateDoc(doc(as(BOB), "groups/g1"), { "users.vic": deleteField() }));
    await assertSucceeds(updateDoc(doc(as(ALICE), "groups/g1"), new FieldPath("users", "vic", "role"), "member"));
    await assertSucceeds(updateDoc(doc(as(ALICE), "groups/g1"), { "users.temp1": deleteField() }));
  });

  it("lets an invited person who is already a member drop their own placeholder", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      await setDoc(doc(ctx.firestore(), "groups/twice"), {
        name: "Added twice",
        createdBy: "alice",
        users: {
          alice: person("Alice", "admin"),
          dave: person("Dave", "member"),
          tempd: { ...person("Dave", "member"), isTemporary: true },
          tempx: { ...person("Xena", "member"), isTemporary: true },
        },
      });
      await setDoc(doc(ctx.firestore(), "invites/twice_dave@example.com"), {
        groupId: "twice",
        email: "dave@example.com",
        tempId: "tempd",
        role: "member",
      });
    });
    await assertFails(updateDoc(doc(as(DAVE), "groups/twice"), { "users.tempx": deleteField() }));
    await assertSucceeds(updateDoc(doc(as(DAVE), "groups/twice"), { "users.tempd": deleteField() }));
  });
});

describe("leaving when deleting an account", () => {
  const left = (role: string, extra: object = {}) => ({
    "users.vic": { name: "Vic (left)", email: "", role, isTemporary: true, ...extra },
  });

  it("lets a viewer retire only their own entry, keeping their role", async () => {
    await assertFails(updateDoc(doc(as(VIC), "groups/g1"), left("member")));
    await assertFails(updateDoc(doc(as(VIC), "groups/g1"), left("viewer", { email: "vic@example.com" })));
    await assertFails(updateDoc(doc(as(VIC), "groups/g1"), { ...left("viewer"), name: "Renamed" }));
    await assertFails(updateDoc(doc(as(VIC), "groups/g1"), { ...left("viewer"), "users.bob": deleteField() }));
    await assertFails(
      updateDoc(doc(as(CAROL), "groups/g1"), { "users.carol": { name: "Carol (left)", email: "", role: "viewer", isTemporary: true } }),
    );
    await assertSucceeds(updateDoc(doc(as(VIC), "groups/g1"), left("viewer")));
  });
});

describe("group contents (expenses, chat, budgets, members)", () => {
  it("lets members read and write, viewers only read, outsiders nothing", async () => {
    await assertSucceeds(getDoc(doc(as(BOB), "groups/g1/expenses/e1")));
    await assertSucceeds(setDoc(doc(as(BOB), "groups/g1/expenses/e2"), { description: "Bus", amount: 2400 }));
    await assertSucceeds(setDoc(doc(as(BOB), "groups/g1/messages/m1"), { text: "Hi" }));
    await assertSucceeds(getDocs(collection(as(VIC), "groups/g1/expenses")));
    await assertFails(setDoc(doc(as(VIC), "groups/g1/expenses/e3"), { description: "No", amount: 1 }));
    await assertFails(getDoc(doc(as(CAROL), "groups/g1/expenses/e1")));
    await assertFails(setDoc(doc(as(CAROL), "groups/g1/expenses/e4"), { description: "No", amount: 1 }));
  });
});

describe("settlements", () => {
  it("lets members query their group's settlements and record their own", async () => {
    const bob = as(BOB);
    await assertSucceeds(
      getDocs(query(collection(bob, "settlements"), where("groupId", "==", "g1"), orderBy("date", "desc"))),
    );
    await assertSucceeds(setDoc(doc(bob, "settlements/s2"), { groupId: "g1", amount: 100, date: "2026-10-02", createdBy: "bob" }));
    await assertFails(setDoc(doc(bob, "settlements/s3"), { groupId: "g1", amount: 100, date: "2026-10-02", createdBy: "alice" }));
  });

  it("keeps outsiders out", async () => {
    const carol = as(CAROL);
    await assertFails(getDocs(query(collection(carol, "settlements"), where("groupId", "==", "g1"))));
    await assertFails(getDoc(doc(carol, "settlements/s1")));
    await assertFails(setDoc(doc(carol, "settlements/s4"), { groupId: "g1", amount: 1, date: "2026-10-02", createdBy: "carol" }));
  });
});

describe("notifications", () => {
  it("lets people read and mark their own notifications only", async () => {
    await assertSucceeds(getDocs(query(collection(as(BOB), "notifications"), where("to", "==", "bob"))));
    await assertFails(getDocs(query(collection(as(ALICE), "notifications"), where("to", "==", "bob"))));
    await assertSucceeds(updateDoc(doc(as(BOB), "notifications/n1"), { isRead: true }));
    await assertFails(updateDoc(doc(as(BOB), "notifications/n1"), { title: "Changed" }));
    await assertSucceeds(setDoc(doc(as(ALICE), "notifications/n2"), { to: "bob", title: "Hi", isRead: false }));
  });
});

describe("user profiles", () => {
  it("lets signed-in people read a profile but never list everyone", async () => {
    await assertSucceeds(getDoc(doc(as(CAROL), "users/alice")));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), "users/alice")));
    await assertFails(getDocs(collection(as(CAROL), "users")));
    await assertSucceeds(getDocs(query(collection(as(ALICE), "users"), where("email", "==", "alice@example.com"))));
    await assertFails(getDocs(query(collection(as(CAROL), "users"), where("email", "==", "alice@example.com"))));
  });

  it("lets people write only their own profile", async () => {
    await assertSucceeds(setDoc(doc(as(ALICE), "users/alice"), { name: "Alice A", email: "alice@example.com" }));
    await assertFails(setDoc(doc(as(ALICE), "users/bob"), { name: "Hacked", email: "bob@example.com" }));
  });

  it("lets a verified user remove an old placeholder profile for their email", async () => {
    await assertFails(deleteDoc(doc(as(EVE), "users/placeholder-dave")));
    await assertSucceeds(deleteDoc(doc(as(DAVE), "users/placeholder-dave")));
  });

  it("lets group members file a group under a member's account, but not outsiders", async () => {
    await assertSucceeds(setDoc(doc(as(ALICE), "users/bob/groups/g1"), { groupId: "g1", role: "member" }));
    await assertFails(setDoc(doc(as(CAROL), "users/bob/groups/g1"), { groupId: "g1", role: "member" }));
    await assertFails(getDoc(doc(as(ALICE), "users/bob/groups/g1")));
  });
});

describe("email lookup", () => {
  it("lets verified users register only their own email", async () => {
    await assertSucceeds(setDoc(doc(as(ALICE), "emailIndex/alice@example.com"), { uid: "alice" }));
    await assertFails(setDoc(doc(as(ALICE), "emailIndex/bob@example.com"), { uid: "alice" }));
    await assertFails(setDoc(doc(as(ALICE), "emailIndex/alice@example.com"), { uid: "bob" }));
    await assertFails(setDoc(doc(as(EVE), "emailIndex/dave@example.com"), { uid: "eve" }));
  });

  it("allows exact lookups but not listing", async () => {
    await env.withSecurityRulesDisabled((ctx) => setDoc(doc(ctx.firestore(), "emailIndex/bob@example.com"), { uid: "bob" }));
    await assertSucceeds(getDoc(doc(as(ALICE), "emailIndex/bob@example.com")));
    await assertFails(getDocs(collection(as(ALICE), "emailIndex")));
  });
});

describe("invites", () => {
  it("lets members invite by email into their own group only", async () => {
    const invite = { groupId: "g1", email: "zed@example.com", tempId: "temp2", role: "member", name: "Zed", invitedBy: "bob" };
    await assertSucceeds(setDoc(doc(as(BOB), "invites/g1_zed@example.com"), invite));
    await assertFails(setDoc(doc(as(BOB), "invites/wrong-id"), invite));
    await assertFails(setDoc(doc(as(CAROL), "invites/g1_zed@example.com"), invite));
    await assertFails(setDoc(doc(as(VIC), "invites/g1_zed@example.com"), invite));
  });

  it("shows invites only to the verified owner of the email", async () => {
    await assertSucceeds(getDocs(query(collection(as(DAVE), "invites"), where("email", "==", "dave@example.com"))));
    await assertFails(getDocs(query(collection(as(EVE), "invites"), where("email", "==", "dave@example.com"))));
    await assertFails(getDocs(query(collection(as(CAROL), "invites"), where("email", "==", "dave@example.com"))));
  });

  const joinAs = (role: string) => ({
    "users.dave": { name: "Dave", email: "dave@example.com", role, isTemporary: false },
    "users.temp1": deleteField(),
  });

  it("lets the invitee swap their placeholder for themselves, keeping its role", async () => {
    await assertSucceeds(updateDoc(doc(as(DAVE), "groups/g1"), joinAs("member")));
    // Now a member: can finish joining.
    await assertSucceeds(setDoc(doc(as(DAVE), "groups/g1/members/dave"), { role: "member" }));
    await assertSucceeds(setDoc(doc(as(DAVE), "users/dave/groups/g1"), { groupId: "g1", role: "member" }));
    await assertSucceeds(deleteDoc(doc(as(DAVE), "invites/g1_dave@example.com")));
  });

  it("works when an old placeholder ID contains dots (addressed with FieldPath)", async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "groups/g2"), {
        name: "Old group",
        createdBy: "alice",
        users: {
          alice: { name: "Alice", email: "alice@example.com", role: "admin" },
          "temp_1753.42": { name: "Dave", email: "dave@example.com", role: "member", isTemporary: true },
        },
      });
      await setDoc(doc(db, "invites/g2_dave@example.com"), {
        groupId: "g2",
        email: "dave@example.com",
        tempId: "temp_1753.42",
        role: "member",
      });
    });
    await assertSucceeds(
      updateDoc(
        doc(as(DAVE), "groups/g2"),
        new FieldPath("users", "dave"),
        { name: "Dave", email: "dave@example.com", role: "member", isTemporary: false },
        new FieldPath("users", "temp_1753.42"),
        deleteField(),
      ),
    );
    let users: Record<string, unknown> = {};
    await env.withSecurityRulesDisabled(async (ctx) => {
      users = (await getDoc(doc(ctx.firestore(), "groups/g2"))).data()?.users ?? {};
    });
    if ("temp_1753.42" in users || !users.dave) throw new Error("placeholder was not replaced");
  });

  it("blocks joining as admin, changing other fields, unverified emails and people without an invite", async () => {
    await assertFails(updateDoc(doc(as(DAVE), "groups/g1"), joinAs("admin")));
    await assertFails(updateDoc(doc(as(DAVE), "groups/g1"), { ...joinAs("member"), name: "Mine now" }));
    await assertFails(
      updateDoc(doc(as(DAVE), "groups/g1"), { ...joinAs("member"), "users.bob": deleteField() }),
    );
    await assertFails(updateDoc(doc(as(EVE), "groups/g1"), joinAs("member")));
    await assertFails(
      updateDoc(doc(as(CAROL), "groups/g1"), {
        "users.carol": { name: "Carol", email: "carol@example.com", role: "member" },
        "users.temp1": deleteField(),
      }),
    );
  });
});

describe("invite links", () => {
  const CODE = "0f8fad5b-d9cb-469f-a165-70867728950e";

  beforeEach(async () => {
    await env.withSecurityRulesDisabled(async (ctx) => {
      const db = ctx.firestore();
      await setDoc(doc(db, "groups/open"), {
        name: "Flat 4B",
        createdBy: "alice",
        groupType: "public",
        inviteCode: CODE,
        users: {
          alice: { name: "Alice", email: "alice@example.com", role: "admin" },
          vic: { name: "Vic", email: "vic@example.com", role: "viewer" },
        },
      });
      await setDoc(doc(db, "groups/closed"), {
        name: "Private",
        createdBy: "alice",
        groupType: "private",
        inviteCode: "11111111-2222-3333-4444-555555555555",
        users: { alice: { name: "Alice", email: "alice@example.com", role: "admin" } },
      });
      await setDoc(doc(db, `inviteCodes/${CODE}`), { groupId: "open", groupName: "Flat 4B" });
    });
  });

  const joinWith = (code: string, extra: Record<string, unknown> = {}) => ({
    "users.carol": { name: "Carol", email: "carol@example.com", role: "member", isTemporary: false, inviteCode: code, ...extra },
  });

  it("lets anyone signed in open a link they were sent, but not list links or open them signed out", async () => {
    await assertSucceeds(getDoc(doc(as(CAROL), `inviteCodes/${CODE}`)));
    await assertFails(getDocs(collection(as(CAROL), "inviteCodes")));
    await assertFails(getDoc(doc(env.unauthenticatedContext().firestore(), `inviteCodes/${CODE}`)));
  });

  it("lets members publish their group's current link only; viewers and outsiders can't", async () => {
    await assertSucceeds(setDoc(doc(as(ALICE), `inviteCodes/${CODE}`), { groupId: "open", groupName: "Renamed" }));
    await assertFails(
      setDoc(doc(as(ALICE), "inviteCodes/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee"), { groupId: "open", groupName: "Flat 4B" }),
    );
    await assertFails(setDoc(doc(as(VIC), `inviteCodes/${CODE}`), { groupId: "open", groupName: "Flat 4B" }));
    await assertFails(setDoc(doc(as(CAROL), `inviteCodes/${CODE}`), { groupId: "open", groupName: "Flat 4B" }));
    await assertFails(deleteDoc(doc(as(CAROL), `inviteCodes/${CODE}`)));
    await assertSucceeds(deleteDoc(doc(as(ALICE), `inviteCodes/${CODE}`)));
  });

  it("lets someone with the link join a link-enabled group as a member", async () => {
    await assertSucceeds(updateDoc(doc(as(CAROL), "groups/open"), joinWith(CODE)));
    // Once in, they can finish joining like any member.
    await assertSucceeds(setDoc(doc(as(CAROL), "groups/open/members/carol"), { role: "member" }));
    await assertSucceeds(getDoc(doc(as(CAROL), "groups/open")));
  });

  it("blocks wrong codes, invite-only groups, admin roles, other people's emails and other changes", async () => {
    await assertFails(updateDoc(doc(as(CAROL), "groups/open"), joinWith("aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee")));
    await assertFails(updateDoc(doc(as(CAROL), "groups/closed"), joinWith("11111111-2222-3333-4444-555555555555")));
    await assertFails(updateDoc(doc(as(CAROL), "groups/open"), joinWith(CODE, { role: "admin" })));
    await assertFails(updateDoc(doc(as(CAROL), "groups/open"), joinWith(CODE, { email: "alice@example.com" })));
    await assertFails(updateDoc(doc(as(CAROL), "groups/open"), { ...joinWith(CODE), name: "Mine now" }));
    await assertFails(
      updateDoc(doc(as(CAROL), "groups/open"), {
        ...joinWith(CODE),
        "users.dave": { name: "Dave", email: "dave@example.com", role: "member", inviteCode: CODE },
      }),
    );
    // A viewer can't use the link to promote themselves.
    await assertFails(
      updateDoc(doc(as(VIC), "groups/open"), {
        "users.vic": { name: "Vic", email: "vic@example.com", role: "member", inviteCode: CODE },
      }),
    );
  });
});

describe("usage events", () => {
  it("accepts counts and timings from signed-in people, and nothing else", async () => {
    const add = (who: ReturnType<typeof as>, data: Record<string, unknown>) =>
      setDoc(doc(collection(who, "usageEvents")), { event: "expense_saved", at: serverTimestamp(), v: 1, ...data });
    await assertSucceeds(add(as(BOB), { durationMs: 8400, guessesChanged: 1, source: "group" }));
    await assertFails(add(as(BOB), { description: "Hotel" }));
    await assertFails(add(as(BOB), { durationMs: "slow" }));
    await assertFails(add(env.unauthenticatedContext().firestore(), {}));
    await assertFails(getDocs(collection(as(ALICE), "usageEvents")));
  });
});

describe("personal loans", () => {
  const loan = (over: Record<string, unknown> = {}) => ({
    direction: "lent",
    person: "Rahim",
    personId: null,
    amountCents: 500000,
    currency: "BDT",
    date: new Date("2026-10-01T12:00:00Z"),
    dueDate: null,
    note: "",
    repayments: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    ...over,
  });
  const ref = (who: ReturnType<typeof as>, owner: string, id = "loan1") => doc(who, "users", owner, "loans", id);

  it("lets only the owner create, read, change and delete their loans", async () => {
    await assertSucceeds(setDoc(ref(as(BOB), "bob"), loan()));
    await assertSucceeds(getDoc(ref(as(BOB), "bob")));
    await assertSucceeds(getDocs(collection(as(BOB), "users", "bob", "loans")));
    await assertFails(getDoc(ref(as(ALICE), "bob")));
    await assertFails(getDocs(collection(as(ALICE), "users", "bob", "loans")));
    await assertFails(setDoc(ref(as(ALICE), "bob", "loan2"), loan()));
    await assertFails(updateDoc(ref(as(ALICE), "bob"), { note: "changed" }));
    await assertFails(deleteDoc(ref(as(ALICE), "bob")));
    await assertSucceeds(
      updateDoc(ref(as(BOB), "bob"), {
        repayments: [{ id: "r1", amountCents: 200000, date: new Date("2026-10-05T12:00:00Z"), note: "" }],
        updatedAt: serverTimestamp(),
      })
    );
    await assertSucceeds(deleteDoc(ref(as(BOB), "bob")));
  });

  it("rejects loans that don't look like loans", async () => {
    const db = as(BOB);
    await assertFails(setDoc(ref(db, "bob", "a"), loan({ direction: "gift" })));
    await assertFails(setDoc(ref(db, "bob", "b"), loan({ amountCents: 0 })));
    await assertFails(setDoc(ref(db, "bob", "c"), loan({ amountCents: 12.5 })));
    await assertFails(setDoc(ref(db, "bob", "d"), loan({ person: "" })));
    await assertFails(setDoc(ref(db, "bob", "e"), loan({ currency: "TAKA" })));
    await assertFails(setDoc(ref(db, "bob", "f"), loan({ secret: "x" })));
    await assertFails(setDoc(ref(db, "bob", "g"), loan({ date: "yesterday" })));
  });

  it("keeps when a loan was first recorded", async () => {
    await assertSucceeds(setDoc(ref(as(BOB), "bob", "keep"), loan()));
    await assertFails(updateDoc(ref(as(BOB), "bob", "keep"), { createdAt: new Date("2020-01-01T00:00:00Z") }));
  });
});
