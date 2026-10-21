import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
  arrayUnion,
  arrayRemove,
  setDoc,
  deleteField,
  FieldPath,
} from "firebase/firestore";
import { User, deleteUser } from "firebase/auth";
import { auth, db } from "@/lib/firebase";
import { Group, Expense, Member, Settlement } from "@/stores/expenseStore";
import { Budget } from "@/stores/budgetStore";
// User Profile Interface
export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  photoURL?: string;
  joinedAt: Date;
  lastActivity: Date;
  verified: boolean;
  preferences: {
    currency: string;
    theme: string;
    language: string;
    notifications?: boolean;
    /** Set when the person picks a theme, so their choice follows them to other devices. */
    themeUpdatedAt?: number;
  };
  stats: {
    groupsJoined: number;
    totalPaid: number;
    totalOwed: number;
  };
  displayName?: string;
  emailVerified?: boolean;
  role?: "user" | "admin";
  createdAt?: Date;
  lastLoginAt?: Date;
}

// User Operations
export const createUserProfile = async (
  userProfileOrUid:
    | Omit<UserProfile, "joinedAt" | "lastActivity" | "stats">
    | string,
  data?: { email: string; name: string; verified: boolean }
): Promise<UserProfile> => {
  try {
    // Handle both old and new function signatures
    let userProfile: Omit<UserProfile, "joinedAt" | "lastActivity" | "stats">;

    if (typeof userProfileOrUid === "string" && data) {
      // New signature: uid and data object
      userProfile = {
        uid: userProfileOrUid,
        email: data.email,
        name: data.name,
        verified: data.verified,
        preferences: {
          currency: "USD",
          theme: "light",
          language: "en",
        },
      };
    } else {
      // Old signature: complete userProfile object
      userProfile = userProfileOrUid as Omit<
        UserProfile,
        "joinedAt" | "lastActivity" | "stats"
      >;
    }

    const userRef = doc(db, "users", userProfile.uid);
    const userData = {
      ...userProfile,
      joinedAt: serverTimestamp(),
      lastActivity: serverTimestamp(),
      stats: {
        groupsJoined: 0,
        totalPaid: 0,
        totalOwed: 0,
      },
    };

    await setDoc(userRef, userData);

    // Return with proper Date types and compatibility properties
    return {
      ...userProfile,
      joinedAt: new Date(),
      lastActivity: new Date(),
      stats: {
        groupsJoined: 0,
        totalPaid: 0,
        totalOwed: 0,
      },
      // Add compatibility properties
      displayName: userProfile.name,
      emailVerified: userProfile.verified,
      role: "user" as const,
      createdAt: new Date(),
      lastLoginAt: new Date(),
    };
  } catch (error) {
    console.error("Error creating user profile:", error);
    throw error;
  }
};

export const getUserProfile = async (
  uid: string
): Promise<UserProfile | null> => {
  try {
    console.log(`🔍 Firebase: Fetching user profile for UID: ${uid}`);
    const userRef = doc(db, "users", uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const data = userDoc.data();
      console.log(`✅ Firebase: Raw user data for ${uid}:`, data);
      console.log(`📸 Firebase: PhotoURL for ${uid}:`, data.photoURL);

      const profile = {
        uid: userDoc.id,
        ...data,
        joinedAt: data.joinedAt?.toDate() || new Date(),
        lastActivity: data.lastActivity?.toDate() || new Date(),

        // Ensure defaults
        stats: {
          groupsJoined: data.stats?.groupsJoined || 0,
          totalPaid: data.stats?.totalPaid || 0,
          totalOwed: data.stats?.totalOwed || 0,
        },

        // Add compatibility properties
        displayName: data.name,
        emailVerified: data.verified,
        role: "user" as const,
        createdAt: data.joinedAt?.toDate() || new Date(),
        lastLoginAt: data.lastActivity?.toDate() || new Date(),
      } as UserProfile;

      console.log(`✅ Firebase: Processed profile for ${uid}:`, profile);
      return profile;
    } else {
      console.log(`❌ Firebase: No document found for UID: ${uid}`);
    }

    return null;
  } catch (error) {
    console.error(
      `❌ Firebase: Error fetching user profile for ${uid}:`,
      error
    );
    throw error;
  }
};

export const updateUserProfile = async (
  uid: string,
  updates: Partial<UserProfile>
) => {
  try {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
      ...updates,
      lastActivity: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

/**
 * Path to a member's entry in a group's `users` map. Some older placeholder IDs contain dots, which a
 * dotted string path ("users.a.b") would treat as nesting, so always address entries with FieldPath.
 */
const memberField = (memberId: string, ...rest: string[]) => new FieldPath("users", memberId, ...rest);

/**
 * A group's members from its `users` map. A name added without an account (`isTemporary`) that
 * someone claimed when they joined (`claimedBy`) is left out of the list and returned as an alias,
 * so its expenses and payments count as the claimer's.
 */
export const membersFromUsers = (users: Record<string, any> | undefined) => {
  const members: Member[] = [];
  const aliases: Record<string, string> = {};
  for (const [uid, entry] of Object.entries(users || {})) {
    if (!entry) continue;
    if (entry.claimedBy) {
      aliases[uid] = entry.claimedBy;
      continue;
    }
    members.push({
      userId: uid,
      id: uid,
      name: entry.name || "Unknown",
      email: entry.email || "",
      role: entry.role as "admin" | "member",
      joinedAt: entry.joinedAt?.toDate?.() || new Date(),
      isTemporary: !!entry.isTemporary,
    });
  }
  return { members, aliases };
};

/** Names in a group that were added without an account and nobody has claimed yet. */
export const unclaimedNames = async (groupId: string) => {
  const snap = await getDoc(doc(db, "groups", groupId));
  const users = (snap.data()?.users ?? {}) as Record<string, any>;
  return Object.entries(users)
    .filter(([, entry]) => entry && entry.isTemporary && !entry.claimedBy && !entry.email && !entry.left && !/\(left\)$/.test(entry.name || ""))
    .map(([id, entry]) => ({ id, name: String(entry.name || "Someone") }));
};

/**
 * "I'm Rahim": after joining, take over a name someone added for you, with its expenses and
 * payments. The rules allow this once per name, only for yourself.
 */
export const claimName = async (groupId: string, placeholderId: string, user: User, placeholderName: string) => {
  await updateDoc(doc(db, "groups", groupId), memberField(placeholderId, "claimedBy"), user.uid, "lastClaim", placeholderId);
  const profile = await getUserProfile(user.uid).catch(() => null);
  await logGroupActivity(groupId, {
    type: "member_added",
    actorId: user.uid,
    actorName: profile?.name || user.displayName || "A member",
    description: `joined as ${placeholderName}`,
  }).catch((error) => console.error("Error logging activity:", error));
};

/**
 * Exact-email lookup through `emailIndex/{email}`. The security rules only allow reading a single
 * entry, so nobody can list every user. People appear here once they sign in with a verified email.
 */
export const getUserByEmail = async (
  email: string
): Promise<UserProfile | null> => {
  try {
    const entry = await getDoc(doc(db, "emailIndex", normalizeEmail(email)));
    if (!entry.exists()) return null;
    return await getUserProfile(entry.data().uid);
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
};

/** Publishes the signed-in user's verified email so friends can add them to groups by email. */
export const registerEmailIndex = async (user: User) => {
  if (!user.email || !user.emailVerified) return;
  await setDoc(doc(db, "emailIndex", normalizeEmail(user.email)), {
    uid: user.uid,
    updatedAt: serverTimestamp(),
  });
};

type InviteDetails = { email: string; tempId: string; role: string; name: string };

/**
 * Records that someone without an account was added to a group. When they sign in with that
 * (verified) email, `mergeTemporaryUserWithRealUser` swaps their placeholder for their real account.
 */
export const createInvite = async (
  groupId: string,
  invite: InviteDetails,
  invitedBy: string
) => {
  const email = normalizeEmail(invite.email);
  if (!email) return;
  await setDoc(doc(db, "invites", `${groupId}_${email}`), {
    groupId,
    email,
    tempId: invite.tempId,
    role: invite.role || "member",
    name: invite.name || email,
    invitedBy,
    createdAt: serverTimestamp(),
  });
};

/**
 * Groups created before invites existed have placeholder members with no invite record.
 * Members create the missing records as they open the app, once per session.
 */
const invitesEnsured = new Set<string>();
export const ensureInvitesForTemporaryMembers = async (
  groups: { id: string; rawUsers?: Record<string, any> }[],
  currentUserId: string
) => {
  for (const group of groups) {
    const me = group.rawUsers?.[currentUserId];
    if (!me || !["admin", "member"].includes(me.role)) continue;
    for (const [tempId, data] of Object.entries(group.rawUsers || {})) {
      if (!data?.isTemporary || !data.email) continue;
      const key = `${group.id}_${normalizeEmail(data.email)}`;
      if (invitesEnsured.has(key)) continue;
      invitesEnsured.add(key);
      try {
        await createInvite(
          group.id,
          { email: data.email, tempId, role: data.role, name: data.name },
          currentUserId
        );
      } catch (error) {
        console.error("Error recording invite:", error);
      }
    }
  }
};

/**
 * On sign-in, joins every group this person was invited to by email: their placeholder entry is
 * replaced by their real account. Only verified emails can claim an invite.
 */
export const mergeTemporaryUserWithRealUser = async (realUser: User) => {
  const userId = realUser.uid;
  if (!userId || !realUser.email || !realUser.emailVerified) return;
  const email = normalizeEmail(realUser.email);

  const invites = await getDocs(
    query(collection(db, "invites"), where("email", "==", email))
  );

  for (const inviteDoc of invites.docs) {
    const { groupId, tempId, role, name } = inviteDoc.data();
    try {
      // Already a member (e.g. added twice): keep the existing entry and role, just drop the placeholder.
      const existing = await getDoc(doc(db, "groups", groupId)).catch(() => null);
      if (existing?.exists() && existing.data().users?.[userId]) {
        await updateDoc(doc(db, "groups", groupId), memberField(tempId), deleteField());
        await deleteDoc(doc(db, "groups", groupId, "members", tempId)).catch(() => undefined);
        await deleteDoc(inviteDoc.ref);
        continue;
      }

      await updateDoc(
        doc(db, "groups", groupId),
        memberField(userId),
        {
          name: realUser.displayName || name || email,
          email,
          role: role || "member",
          joinedAt: serverTimestamp(),
          isTemporary: false,
        },
        memberField(tempId),
        deleteField()
      );

      // Now a member: finish joining and tidy up the placeholder's records.
      await setDoc(doc(db, "groups", groupId, "members", userId), {
        role: role || "member",
        joinedAt: serverTimestamp(),
      });
      await setDoc(doc(db, "users", userId, "groups", groupId), {
        groupId,
        role: role || "member",
        joinedAt: serverTimestamp(),
      });
      await deleteDoc(doc(db, "groups", groupId, "members", tempId)).catch(() => undefined);
      await deleteDoc(doc(db, "users", tempId, "groups", groupId)).catch(() => undefined);
      await deleteDoc(inviteDoc.ref);
    } catch (error) {
      // The placeholder may already have been merged (e.g. on another device); leave the invite for a retry.
      console.error(`Error joining group ${groupId} from invite:`, error);
    }
  }
};

// ---------- invite links (/join/<code>) ----------
// inviteCodes/{code} -> { groupId, groupName } exists only while a group allows joining by link
// (groupType "public"). The security rules check the code against the group's own inviteCode.

export type InviteCodeInfo = { groupId: string; groupName: string };

const isUsableCode = (code?: string) => !!code && code.length >= 16;

/** Makes sure a link-enabled group has a long random code and that the link resolves to it. */
export const ensureInviteLink = async (group: Pick<Group, "id" | "name" | "inviteCode">) => {
  let code = group.inviteCode;
  if (!isUsableCode(code)) {
    code = crypto.randomUUID();
    await updateDoc(doc(db, "groups", group.id), { inviteCode: code, updatedAt: serverTimestamp() });
  }
  const ref = doc(db, "inviteCodes", code);
  const current = await getDoc(ref);
  if (!current.exists() || current.data().groupId !== group.id || current.data().groupName !== group.name) {
    await setDoc(ref, { groupId: group.id, groupName: group.name, updatedAt: serverTimestamp() });
  }
  return code;
};

/** Turns joining by link on or off. Turning it off makes existing links stop working straight away. */
export const setLinkJoining = async (group: Pick<Group, "id" | "name" | "inviteCode">, enabled: boolean) => {
  await updateDoc(doc(db, "groups", group.id), {
    groupType: enabled ? "public" : "private",
    updatedAt: serverTimestamp(),
  });
  if (enabled) return ensureInviteLink(group);
  if (group.inviteCode) await deleteDoc(doc(db, "inviteCodes", group.inviteCode)).catch(() => undefined);
  return group.inviteCode;
};

/** Replaces the group's code; links shared before stop working. */
export const regenerateInviteLink = async (group: Pick<Group, "id" | "name" | "inviteCode" | "groupType">) => {
  const code = crypto.randomUUID();
  await updateDoc(doc(db, "groups", group.id), { inviteCode: code, updatedAt: serverTimestamp() });
  if (group.inviteCode) await deleteDoc(doc(db, "inviteCodes", group.inviteCode)).catch(() => undefined);
  if (group.groupType === "public") {
    await setDoc(doc(db, "inviteCodes", code), { groupId: group.id, groupName: group.name, updatedAt: serverTimestamp() });
  }
  return code;
};

/** Which group a link opens, or null if the link is wrong or joining by link was turned off. */
export const lookupInviteCode = async (code: string): Promise<InviteCodeInfo | null> => {
  if (!isUsableCode(code)) return null;
  const snap = await getDoc(doc(db, "inviteCodes", code));
  if (!snap.exists()) return null;
  const { groupId, groupName } = snap.data();
  return { groupId, groupName: groupName || "a group" };
};

/** Adds the signed-in person to a group as a member, using the group's invite link. */
export const joinGroupWithInviteCode = async (user: User, invite: InviteCodeInfo, code: string) => {
  const email = normalizeEmail(user.email || "");
  const profile = await getUserProfile(user.uid).catch(() => null);
  const name = (profile?.name || user.displayName || email.split("@")[0] || "Member").trim();

  await updateDoc(doc(db, "groups", invite.groupId), memberField(user.uid), {
    name,
    email,
    role: "member",
    joinedAt: serverTimestamp(),
    isTemporary: false,
    inviteCode: code,
  });
  await setDoc(doc(db, "groups", invite.groupId, "members", user.uid), {
    role: "member",
    joinedAt: serverTimestamp(),
  });
  await setDoc(doc(db, "users", user.uid, "groups", invite.groupId), {
    groupId: invite.groupId,
    role: "member",
    joinedAt: serverTimestamp(),
  });
  await logGroupActivity(invite.groupId, {
    type: "member_added",
    actorId: user.uid,
    actorName: name,
    description: "joined with the invite link",
  }).catch((error) => console.error("Error logging activity:", error));
};

// Group Operations
// ✅ Full working createGroup() function fixed with safe fallbacks
export const createGroup = async (
  groupData: Omit<Group, "id">,
  userId: string
) => {
  try {
    console.log("Creating group with userId:", userId);

    // Get current user's profile, create if it doesn't exist
    let currentUserProfile = await getUserProfile(userId);
    if (!currentUserProfile) {
      console.log(
        "User profile not found, attempting to create it from auth..."
      );
      // Try to get the user from Firebase Auth to create profile
      const currentUser = auth.currentUser;
      if (currentUser) {
        await createUserProfile(currentUser.uid, {
          email: currentUser.email || "",
          name:
            currentUser.displayName ||
            currentUser.email?.split("@")[0] ||
            "User",
          verified: currentUser.emailVerified,
        });
        currentUserProfile = await getUserProfile(userId);
      }

      if (!currentUserProfile) {
        throw new Error("Unable to create or retrieve user profile");
      }
    }

    // Create users object with safe structure
    const users: Record<string, any> = {};

    // Add current user as admin using profile fallback
    users[userId] = {
      name: currentUserProfile.name || "Unknown",
      email: currentUserProfile.email || "unknown@example.com",
      role: "admin",
      joinedAt: serverTimestamp(),
    };
    console.log("🔍 groupData.members", groupData.members);
    console.log("📌 Type:", typeof groupData.members);
    console.log("📌 IsArray?", Array.isArray(groupData.members));
    console.log("users:", users);

    // Process members - ensure it's an array
    const membersArray = Array.isArray(groupData.members)
      ? groupData.members
      : [];

    for (const member of membersArray) {
      const memberId = member.id;
      const existingUser = await getUserProfile(memberId);
      console.log("👤 Checking user profile for memberId:", memberId);

      const name = (member.name || existingUser?.name || "Unknown").trim();
      const email = (member.email || existingUser?.email || "").trim();

      users[memberId] = {
        name,
        email,
        role: member.role || "member",
        joinedAt: serverTimestamp(),
        isTemporary: !existingUser,
      };
    }

    const firestoreGroup = {
      name: groupData.name.trim(),
      description: groupData.description?.trim() || "",
      users,
      createdBy: userId,
      createdAt: serverTimestamp(),
      groupType: groupData.groupType || "private",
      inviteCode: groupData.inviteCode || crypto.randomUUID(),
      settings: groupData.settings || {
        currency: "USD",
        simplifyDebts: true,
        notifications: true,
        recurringBills: false,
      },
      isArchived: groupData.isArchived || false,
    };

    console.log("Creating group with new structure:", firestoreGroup);
    console.log("Users object structure:", firestoreGroup.users);

    const docRef = await addDoc(collection(db, "groups"), firestoreGroup);
    const groupId = docRef.id;

    // New groups start with their invite link working, so "Invite" can share it straight away.
    if (firestoreGroup.groupType === "public" && isUsableCode(firestoreGroup.inviteCode)) {
      await setDoc(doc(db, "inviteCodes", firestoreGroup.inviteCode), {
        groupId,
        groupName: firestoreGroup.name,
        updatedAt: serverTimestamp(),
      }).catch((error) => console.error("Error publishing invite link:", error));
    }

    console.log("Group created with ID:", groupId);

    const batch = [];
    for (const [uid, userData] of Object.entries(users)) {
      if (!userData.isTemporary) {
        const memberRef = doc(db, "groups", groupId, "members", uid);
        batch.push(
          setDoc(memberRef, {
            role: userData.role,
            joinedAt: serverTimestamp(),
          })
        );

        const userGroupRef = doc(db, "users", uid, "groups", groupId);
        batch.push(
          setDoc(userGroupRef, {
            groupId,
            role: userData.role,
            joinedAt: serverTimestamp(),
          })
        );
      }
    }

    await Promise.all(batch);

    // People without an account yet join when they first sign in with this email.
    for (const [uid, userData] of Object.entries(users)) {
      if (userData.isTemporary && userData.email) {
        await createInvite(
          groupId,
          { email: userData.email, tempId: uid, role: userData.role, name: userData.name },
          userId
        );
      }
    }

    await updateUserProfile(userId, {
      stats: {
        groupsJoined: (currentUserProfile.stats?.groupsJoined || 0) + 1,
        totalPaid: currentUserProfile.stats?.totalPaid || 0,
        totalOwed: currentUserProfile.stats?.totalOwed || 0,
      },
    });

    const membersReturnArray = Object.entries(users).map(([id, userData]) => ({
      id,
      name: userData.name,
      email: userData.email,
      role: userData.role,
      joinedAt: new Date(),
    }));

    return {
      id: groupId,
      ...groupData,
      members: membersReturnArray,
      createdAt: new Date(),
    };
  } catch (error) {
    console.error("Error creating group:", error);
    throw error;
  }
};

export const updateGroup = async (groupId: string, updates: Partial<Group>) => {
  try {
    const groupRef = doc(db, "groups", groupId);
    await updateDoc(groupRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating group:", error);
    throw error;
  }
};
/**
 * Fetch a single group by its ID from Firestore.
 * @param groupId The Firestore document ID of the group.
 * @returns The Group object or null if not found.
 */

export const fetchGroupById = async (
  groupId: string
): Promise<Group | null> => {
  try {
    const groupRef = doc(db, "groups", groupId);
    const groupSnap = await getDoc(groupRef);

    if (!groupSnap.exists()) return null;

    const data = groupSnap.data();

    // Debug: log the raw Firestore data
    console.log("Firestore group data:", data);

    // Members from the users map; claimed names become aliases (see membersFromUsers).
    const { members: membersArray, aliases } = membersFromUsers(data.users);

    console.log("Transformed members array:", membersArray);
    const group: Group = {
      id: groupSnap.id,
      name: data.name || "Unnamed Group",
      description: data.description || "",
      photo: data.photo || "",
      coverImage: data.coverImage || "",
      members: membersArray,
      aliases,
      createdBy: data.createdBy || "",
      createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
      groupType: data.groupType || "private",
      inviteCode: data.inviteCode || "",
      settings: data.settings || {
        currency: "USD",
        simplifyDebts: true,
        notifications: true,
        recurringBills: false,
      },
      isArchived: data.isArchived || false,
      tags: data.tags || [],
      location: data.location || "",
    };

    // Debug: log the constructed group object
    console.log("Constructed group object:", group);

    return group;
  } catch (error) {
    console.error("Error fetching group by ID:", error);
    return null;
  }
};

export const getUserGroups = async (userId: string) => {
  try {
    console.log("Fetching groups for user:", userId);

    // Query using the new users structure
    const groupsRef = collection(db, "groups");
    const q = query(
      groupsRef,
      where(`users.${userId}.role`, "in", ["admin", "member", "viewer"])
    );

    const querySnapshot = await getDocs(q);
    const groups: Group[] = [];

    console.log("Found groups:", querySnapshot.size);

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      console.log("Processing group:", doc.id, data);

      // Members from the users map; names someone has claimed become aliases instead (see membersFromUsers).


      const { members: membersArray, aliases } = membersFromUsers(data.users);

      const group: Group = {
        id: doc.id,
        name: data.name || "Unnamed Group",
        description: data.description || "",
        members: membersArray,
        aliases,
        createdAt: data.createdAt?.toDate() || new Date(),
        createdBy: data.createdBy || "",
        groupType: data.groupType || "private",
        inviteCode: data.inviteCode || "",
        settings: data.settings || {
          currency: "USD",
          simplifyDebts: true,
          notifications: true,
          recurringBills: false,
        },
        isArchived: data.isArchived || false,
      };

      groups.push(group);
    });

    console.log("Processed groups:", groups.length);
    return groups;
  } catch (error) {
    console.error("Error fetching groups:", error);
    throw error;
  }
};

// Expense Operations
export const createExpense = async (
  expenseData: Omit<Expense, "id">,
  userId: string
) => {
  try {
    console.log("Creating expense in Firebase:", expenseData);
    const expenseRef = collection(
      db,
      "groups",
      expenseData.groupId,
      "expenses"
    );

    // Clean the expense data to remove undefined fields
    const cleanExpenseData = {
      description: expenseData.description,
      amount: expenseData.amount,
      paidBy: expenseData.paidBy,
      splitAmong: expenseData.splitAmong,
      groupId: expenseData.groupId,
      category: expenseData.category,
      date: expenseData.date,
      splitType: expenseData.splitType,
      userId,
      createdAt: serverTimestamp(),
    };

    // Only add split details when there are some
    if (
      expenseData.splitData &&
      Object.keys(expenseData.splitData).length > 0
    ) {
      (cleanExpenseData as any).splitData = expenseData.splitData;
    }
    if (expenseData.splitPercentages) {
      (cleanExpenseData as any).splitPercentages = expenseData.splitPercentages;
    }
    if (expenseData.splitVersion) {
      (cleanExpenseData as any).splitVersion = expenseData.splitVersion;
    }

    console.log("Creating expense with clean data:", cleanExpenseData);
    const docRef = await addDoc(expenseRef, cleanExpenseData);
    console.log("Expense created with ID:", docRef.id);
    return { id: docRef.id, ...expenseData };
  } catch (error) {
    console.error("Error creating expense:", error);
    throw error;
  }
};

export const updateExpense = async (
  groupId: string,
  expenseId: string,
  updates: Partial<Expense>
) => {
  try {
    const expenseRef = doc(db, "groups", groupId, "expenses", expenseId);
    // Firestore rejects undefined; an undefined split field means "remove it" (e.g. switched to equal).
    const cleaned = Object.fromEntries(
      Object.entries(updates).map(([key, value]) => [key, value === undefined ? deleteField() : value])
    );
    await updateDoc(expenseRef, {
      ...cleaned,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error("Error updating expense:", error);
    throw error;
  }
};

export const deleteExpense = async (groupId: string, expenseId: string) => {
  try {
    const expenseRef = doc(db, "groups", groupId, "expenses", expenseId);
    await deleteDoc(expenseRef);
  } catch (error) {
    console.error("Error deleting expense:", error);
    throw error;
  }
};

export const getGroupExpenses = async (groupId: string) => {
  try {
    const expensesRef = collection(db, "groups", groupId, "expenses");
    const q = query(expensesRef, orderBy("date", "desc"));
    const querySnapshot = await getDocs(q);

    const expenses: Expense[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      expenses.push({
        id: doc.id,
        ...data,
        date: data.date?.toDate() || new Date(),
      } as Expense);
    });

    return expenses;
  } catch (error) {
    console.error("Error fetching expenses:", error);
    throw error;
  }
};

// Real-time listeners
export const subscribeToUserGroups = (
  userId: string,
  callback: (groups: Group[]) => void
) => {
  console.log("Setting up groups subscription for user:", userId);
  const groupsRef = collection(db, "groups");
  const q = query(
    groupsRef,
    where(`users.${userId}.role`, "in", ["admin", "member", "viewer"])
  );

  return onSnapshot(
    q,
    (snapshot) => {
      console.log("📡 Groups snapshot received, size:", snapshot.size);
      console.log(
        "🔍 Query used for user:",
        userId,
        `-> users.${userId}.role in [admin, member]`
      );
      const groups: Group[] = [];

      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log(
          "📋 Processing group from subscription:",
          doc.id,
          data.name
        );
        console.log("👥 Group users structure:", data.users);

        // Members from the users map; names someone has claimed become aliases instead (see membersFromUsers).


        const { members: membersArray, aliases } = membersFromUsers(data.users);

        const group: Group = {
          id: doc.id,
          name: data.name || "Unnamed Group",
          description: data.description || "",
          members: membersArray,
          aliases,
          createdAt: data.createdAt?.toDate() || new Date(),
          createdBy: data.createdBy || "",
          groupType: data.groupType || "private",
          inviteCode: data.inviteCode || "",
          settings: data.settings || {
            currency: "USD",
            simplifyDebts: true,
            notifications: true,
            recurringBills: false,
          },
          isArchived: data.isArchived || false,
        };

        groups.push(group);
      });

      console.log(
        "Firebase groups subscription updated with groups:",
        groups.length
      );
      void ensureInvitesForTemporaryMembers(
        snapshot.docs.map((d) => ({ id: d.id, rawUsers: d.data().users })),
        userId
      );
      callback(groups);
    },
    (error) => {
      console.error("Error in groups subscription:", error);
    }
  );
};

export const subscribeToGroupExpenses = (
  groupId: string,
  callback: (expenses: Expense[]) => void,
  onError?: (error: Error) => void
) => {
  console.log("Setting up expense subscription for group:", groupId);
  const expensesRef = collection(db, "groups", groupId, "expenses");
  const q = query(expensesRef, orderBy("date", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      console.log(
        "Expense subscription triggered for group:",
        groupId,
        "Changes:",
        snapshot.docChanges().length
      );
      const expenses: Expense[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        expenses.push({
          id: doc.id,
          ...data,
          date: data.date?.toDate() || new Date(),
        } as Expense);
      });
      console.log("Calling callback with expenses:", expenses);
      callback(expenses);
    },
    (error) => {
      console.error("Error in expense subscription for group:", groupId, error);
      onError?.(error);
    }
  );
};

// Member management with new structure
export const addMemberToGroup = async (
  groupId: string,
  member: Member,
  userId: string
) => {
  try {
    const email = normalizeEmail(member.email || "");
    const role = member.role || "member";

    // Exact match only. Someone without an account (or not yet verified) gets a placeholder
    // entry plus an invite, and joins for real when they sign in with this email.
    const existingUser = email ? await getUserByEmail(email) : null;
    const memberId = existingUser?.uid ?? crypto.randomUUID();
    const isTemporary = !existingUser;
    const name = (existingUser?.name || member.name || email).trim();

    await updateDoc(doc(db, "groups", groupId), memberField(memberId), {
      name,
      email: existingUser?.email || email,
      role,
      joinedAt: serverTimestamp(),
      isTemporary,
    });

    await setDoc(doc(db, "groups", groupId, "members", memberId), {
      role,
      joinedAt: serverTimestamp(),
    });

    if (isTemporary) {
      await createInvite(groupId, { email, tempId: memberId, role, name }, userId);
    } else {
      await setDoc(doc(db, "users", memberId, "groups", groupId), {
        groupId,
        role,
        joinedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    console.error("Error adding member to group:", error);
    throw error;
  }
};

export const getGroupMembers = async (groupId: string): Promise<Member[]> => {
  try {
    const membersRef = collection(db, "groups", groupId, "members");
    const querySnapshot = await getDocs(membersRef);

    const members: Member[] = [];
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      members.push({
        userId: doc.id,
        id: doc.id,
        name: data.name || "Unknown",
        email: data.email || "",
        role: data.role as "admin" | "member",
        joinedAt: data.joinedAt?.toDate() || new Date(),
      });
    });

    return members;
  } catch (error) {
    console.error("Error fetching group members:", error);
    throw error;
  }
};

export const deleteGroup = async (groupId: string) => {
  try {
    await deleteDoc(doc(db, "groups", groupId));
    console.log("Document successfully deleted!");
  } catch (error) {
    console.error("Error deleting document: ", error);
  }
};

export const updateMemberRole = async (
  groupId: string,
  memberId: string,
  newRole: "admin" | "member" | "viewer"
) => {
  try {
    // The group's `users` map is what permissions are checked against; the members doc mirrors it
    // (placeholders added before invites existed may not have one yet).
    await updateDoc(doc(db, "groups", groupId), memberField(memberId, "role"), newRole);
    await setDoc(doc(db, "groups", groupId, "members", memberId), { role: newRole }, { merge: true });
  } catch (error) {
    console.error("Error updating member role:", error);
    throw error;
  }
};

export const removeMemberFromGroup = async (
  groupId: string,
  memberId: string
) => {
  try {
    const groupRef = doc(db, "groups", groupId);
    const groupSnap = await getDoc(groupRef);
    const removed = groupSnap.data()?.users?.[memberId];

    // Delete the key (setting it to null left removed members looking like members).
    await updateDoc(groupRef, memberField(memberId), deleteField());

    await deleteDoc(doc(db, "groups", groupId, "members", memberId));
    await deleteDoc(doc(db, "users", memberId, "groups", groupId)).catch(() => undefined);

    if (removed?.isTemporary && removed.email) {
      await deleteDoc(doc(db, "invites", `${groupId}_${normalizeEmail(removed.email)}`)).catch(
        () => undefined
      );
    }
  } catch (error) {
    console.error("Error removing member from group:", error);
    throw error;
  }
};

// Personal Budget Functions
export const createPersonalBudget = async (
  budget: Omit<Budget, "id" | "createdAt">,
  userId: string
) => {
  try {
    const budgetData = {
      ...budget,
      userId,
      createdAt: serverTimestamp(),
    };

    const userBudgetsRef = collection(db, "users", userId, "budgets");
    const docRef = await addDoc(userBudgetsRef, budgetData);
    console.log("Personal budget created with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating personal budget:", error);
    throw error;
  }
};

export const updatePersonalBudget = async (
  budgetId: string,
  updates: Partial<Budget>,
  userId: string
) => {
  try {
    const budgetRef = doc(db, "users", userId, "budgets", budgetId);
    await updateDoc(budgetRef, updates);
    console.log("Personal budget updated:", budgetId);
  } catch (error) {
    console.error("Error updating personal budget:", error);
    throw error;
  }
};

export const deletePersonalBudget = async (
  budgetId: string,
  userId: string
) => {
  try {
    await deleteDoc(doc(db, "users", userId, "budgets", budgetId));
    console.log("Personal budget deleted:", budgetId);
  } catch (error) {
    console.error("Error deleting personal budget:", error);
    throw error;
  }
};

export const getUserPersonalBudgets = async (
  userId: string
): Promise<Budget[]> => {
  try {
    const userBudgetsRef = collection(db, "users", userId, "budgets");
    const q = query(userBudgetsRef, orderBy("createdAt", "desc"));

    const querySnapshot = await getDocs(q);
    const budgets: Budget[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      budgets.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Budget);
    });

    return budgets;
  } catch (error) {
    console.error("Error fetching user personal budgets:", error);
    throw error;
  }
};

export const subscribeToUserPersonalBudgets = (
  userId: string,
  callback: (budgets: Budget[]) => void
) => {
  const userBudgetsRef = collection(db, "users", userId, "budgets");
  const q = query(userBudgetsRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (querySnapshot) => {
      const budgets: Budget[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        budgets.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as Budget);
      });
      callback(budgets);
    },
    (error) => {
      console.error("Error in personal budgets subscription:", error);
    }
  );
};

// Group Budget Functions
export const createGroupBudget = async (
  budget: Omit<Budget, "id" | "createdAt">,
  groupId: string,
  userId: string
) => {
  try {
    const budgetData = {
      ...budget,
      groupId,
      userId,
      createdAt: serverTimestamp(),
    };

    const groupBudgetsRef = collection(db, "groups", groupId, "budgets");
    const docRef = await addDoc(groupBudgetsRef, budgetData);
    console.log("Group budget created with ID:", docRef.id);
    return docRef.id;
  } catch (error) {
    console.error("Error creating group budget:", error);
    throw error;
  }
};

export const updateGroupBudget = async (
  budgetId: string,
  updates: Partial<Budget>,
  groupId: string
) => {
  try {
    const budgetRef = doc(db, "groups", groupId, "budgets", budgetId);
    
    // Check if document exists before updating
    const budgetSnap = await getDoc(budgetRef);
    if (!budgetSnap.exists()) {
      throw new Error(`Budget document ${budgetId} does not exist in group ${groupId}`);
    }
    
    await updateDoc(budgetRef, updates);
    console.log("Group budget updated:", budgetId);
  } catch (error) {
    console.error("Error updating group budget:", error);
    throw error;
  }
};

export const deleteGroupBudget = async (budgetId: string, groupId: string) => {
  try {
    const budgetRef = doc(db, "groups", groupId, "budgets", budgetId);
    
    // Check if document exists before deleting
    const budgetSnap = await getDoc(budgetRef);
    if (!budgetSnap.exists()) {
      throw new Error(`Budget document ${budgetId} does not exist in group ${groupId}`);
    }
    
    await deleteDoc(budgetRef);
    console.log("Group budget deleted:", budgetId);
  } catch (error) {
    console.error("Error deleting group budget:", error);
    throw error;
  }
};

export const getGroupBudgets = async (groupId: string): Promise<Budget[]> => {
  try {
    const groupBudgetsRef = collection(db, "groups", groupId, "budgets");
    const q = query(groupBudgetsRef, orderBy("createdAt", "desc"));

    const querySnapshot = await getDocs(q);
    const budgets: Budget[] = [];

    querySnapshot.forEach((doc) => {
      const data = doc.data();
      budgets.push({
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate() || new Date(),
      } as Budget);
    });

    return budgets;
  } catch (error) {
    console.error("Error fetching group budgets:", error);
    throw error;
  }
};

export const subscribeToGroupBudgets = (
  groupId: string,
  callback: (budgets: Budget[]) => void
) => {
  const groupBudgetsRef = collection(db, "groups", groupId, "budgets");
  const q = query(groupBudgetsRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (querySnapshot) => {
      const budgets: Budget[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        budgets.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate() || new Date(),
        } as Budget);
      });
      callback(budgets);
    },
    (error) => {
      console.error("Error in group budgets subscription:", error);
    }
  );
};

// Subscribe to all budgets for a user (personal + group budgets)
export const subscribeToUserAllBudgets = (
  userId: string,
  userGroups: Group[],
  callback: (budgets: Budget[]) => void
) => {
  const allBudgets: Budget[] = [];
  let personalBudgets: Budget[] = [];
  let groupBudgets: Budget[] = [];

  const unsubscribers: (() => void)[] = [];

  const updateCallback = () => {
    const combinedBudgets = [...personalBudgets, ...groupBudgets];
    callback(combinedBudgets);
  };

  // Subscribe to personal budgets
  const personalUnsubscriber = subscribeToUserPersonalBudgets(
    userId,
    (budgets) => {
      personalBudgets = budgets;
      updateCallback();
    }
  );
  unsubscribers.push(personalUnsubscriber);

  // Subscribe to group budgets for each group the user is part of
  userGroups.forEach((group) => {
    const groupUnsubscriber = subscribeToGroupBudgets(group.id, (budgets) => {
      // Remove old budgets for this group and add new ones
      groupBudgets = groupBudgets.filter(
        (budget) => budget.groupId !== group.id
      );
      groupBudgets = [...groupBudgets, ...budgets];
      updateCallback();
    });
    unsubscribers.push(groupUnsubscriber);
  });

  // Return cleanup function
  return () => {
    unsubscribers.forEach((unsubscriber) => unsubscriber());
  };
};

// Settlement Firebase Functions
/** Removes a recorded payment (members of its group only, per the rules). */
export const deleteSettlement = async (settlementId: string) => {
  await deleteDoc(doc(db, "settlements", settlementId));
};

export const createSettlement = async (settlement: Omit<Settlement, 'id'>, groupId: string, userId: string): Promise<Settlement> => {
  try {
    console.log('Creating settlement in Firebase:', settlement);
    
    const settlementDoc = {
      ...settlement,
      createdAt: serverTimestamp(),
      createdBy: userId,
      groupId,
      status: 'confirmed'
    };

    const docRef = await addDoc(collection(db, 'settlements'), settlementDoc);
    
    const createdSettlement = {
      ...settlement,
      id: docRef.id,
      status: 'confirmed' as const
    };

    console.log('✅ Settlement created successfully:', createdSettlement.id);
    return createdSettlement;
  } catch (error) {
    console.error('❌ Error creating settlement:', error);
    throw error;
  }
};

const toSettlement = (id: string, data: any): Settlement =>
  ({
    id,
    ...data,
    date: data.date?.toDate ? data.date.toDate() : new Date(data.date ?? Date.now()),
  }) as Settlement;

const newestFirst = (a: Settlement, b: Settlement) =>
  new Date(b.date).getTime() - new Date(a.date).getTime();

// Sorted here rather than with orderBy, so the query needs no composite index.
export const getGroupSettlements = async (groupId: string): Promise<Settlement[]> => {
  try {
    const snapshot = await getDocs(
      query(collection(db, "settlements"), where("groupId", "==", groupId))
    );
    return snapshot.docs.map((d) => toSettlement(d.id, d.data())).sort(newestFirst);
  } catch (error) {
    console.error("Error fetching group settlements:", error);
    return [];
  }
};

export const subscribeToGroupSettlements = (
  groupId: string,
  callback: (settlements: Settlement[]) => void,
  onError?: (error: Error) => void
): (() => void) =>
  onSnapshot(
    query(collection(db, "settlements"), where("groupId", "==", groupId)),
    (snapshot) => {
      callback(snapshot.docs.map((d) => toSettlement(d.id, d.data())).sort(newestFirst));
    },
    (error) => {
      console.error("Error in settlements subscription:", error);
      onError?.(error);
    }
  );

// ---------- Group activity log ----------
// Expenses and settlements are their own history; this log records what would otherwise leave no
// trace: edits, deletions and membership changes.

export type GroupActivityType =
  | "expense_updated"
  | "expense_deleted"
  | "member_added"
  | "member_removed"
  | "group_updated";

export type GroupActivityRecord = {
  id: string;
  type: GroupActivityType;
  actorId: string;
  actorName: string;
  description: string;
  createdAt: Date;
};

export const logGroupActivity = async (
  groupId: string,
  activity: Omit<GroupActivityRecord, "id" | "createdAt">
) => {
  await addDoc(collection(db, "groups", groupId, "activities"), {
    ...activity,
    createdAt: serverTimestamp(),
  });
};

export const subscribeToGroupActivities = (
  groupId: string,
  callback: (activities: GroupActivityRecord[]) => void
) =>
  onSnapshot(
    query(collection(db, "groups", groupId, "activities"), orderBy("createdAt", "desc")),
    (snapshot) => {
      callback(
        snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            ...data,
            createdAt: data.createdAt?.toDate?.() ?? new Date(),
          } as GroupActivityRecord;
        })
      );
    },
    (error) => console.error("Error in activity subscription:", error)
  );

/**
 * Deletes a group and everything in it: expenses, chat, budgets, settlements, invites. Admin only (the
 * rules enforce it). Children go first, while the group still exists to prove membership.
 */
export const deleteGroupCompletely = async (groupId: string) => {
  const groupRef = doc(db, "groups", groupId);
  const snap = await getDoc(groupRef);
  if (!snap.exists()) return;
  const data = snap.data();
  const memberIds = Object.keys(data.users ?? {});

  const subcollections = ["expenses", "members", "messages", "pinnedNotes", "tasks", "polls", "budgets", "activities"];
  for (const name of subcollections) {
    const docs = await getDocs(collection(db, "groups", groupId, name));
    await Promise.all(docs.docs.map((d) => deleteDoc(d.ref)));
  }
  const settlements = await getDocs(query(collection(db, "settlements"), where("groupId", "==", groupId)));
  await Promise.all(settlements.docs.map((d) => deleteDoc(d.ref)));
  const invites = await getDocs(query(collection(db, "invites"), where("groupId", "==", groupId)));
  await Promise.all(invites.docs.map((d) => deleteDoc(d.ref)));
  await Promise.all(
    memberIds.map((uid) => deleteDoc(doc(db, "users", uid, "groups", groupId)).catch(() => undefined))
  );
  if (data.inviteCode) {
    await deleteDoc(doc(db, "inviteCodes", data.inviteCode)).catch(() => undefined);
  }
  await deleteDoc(groupRef);
};

const joinedMillis = (entry: { joinedAt?: { toMillis?: () => number } }) =>
  entry?.joinedAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;

/**
 * Deletes the signed-in person's account. Call it right after they confirm who they are (Firebase
 * only deletes recently signed-in accounts).
 *
 * - Groups where nobody else has an account are deleted.
 * - In shared groups their entry becomes a "(left)" placeholder, so past expenses and everyone else's
 *   balances stay correct. If they were the only admin, the longest-standing member becomes admin.
 * - Their profile, group list, personal budgets, notifications and email lookup are deleted, then
 *   their sign-in.
 */
export const deleteMyAccount = async (user: User) => {
  const uid = user.uid;
  const groups = await getDocs(
    query(collection(db, "groups"), where(`users.${uid}.role`, "in", ["admin", "member", "viewer"]))
  );

  for (const group of groups.docs) {
    const groupRef = group.ref;
    const users = (group.data().users ?? {}) as Record<string, any>;
    const me = users[uid];
    const others = Object.entries(users).filter(([id, entry]) => id !== uid && entry && !entry.isTemporary);

    if (others.length === 0) {
      if (me.role === "admin") {
        await deleteGroupCompletely(group.id);
        continue;
      }
    } else if (me.role === "admin" && !others.some(([, entry]) => entry.role === "admin")) {
      const [heirId] = others
        .slice()
        .sort(([, a], [, b]) => Number(a.role === "viewer") - Number(b.role === "viewer") || joinedMillis(a) - joinedMillis(b))[0];
      await updateDoc(groupRef, memberField(heirId, "role"), "admin");
      await setDoc(doc(db, "groups", group.id, "members", heirId), { role: "admin" }, { merge: true });
    }

    if (me.role !== "viewer") {
      await logGroupActivity(group.id, {
        type: "member_removed",
        actorId: uid,
        actorName: me.name || "A member",
        description: "deleted their account and left the group",
      }).catch(() => undefined);
    }
    const name = `${me.name || "Former member"} (left)`;
    await updateDoc(groupRef, memberField(uid), {
      name,
      email: "",
      role: me.role === "admin" ? "member" : me.role,
      isTemporary: true,
      // Nobody can claim this name later (see isClaimingName in the rules).
      left: true,
      joinedAt: me.joinedAt ?? serverTimestamp(),
    });
    if (me.role !== "viewer") {
      await deleteDoc(doc(db, "groups", group.id, "members", uid)).catch(() => undefined);
    }
  }

  const ownCollections = ["groups", "budgets", "loans", "settings"];
  for (const name of ownCollections) {
    const docs = await getDocs(collection(db, "users", uid, name));
    await Promise.all(docs.docs.map((d) => deleteDoc(d.ref)));
  }
  const notifications = await getDocs(query(collection(db, "notifications"), where("to", "==", uid)));
  await Promise.all(notifications.docs.map((d) => deleteDoc(d.ref)));
  if (user.email) {
    await deleteDoc(doc(db, "emailIndex", normalizeEmail(user.email))).catch(() => undefined);
  }
  // The profile photo they uploaded, if any (Storage lets people delete their own files).
  const photoURL = (await getUserProfile(uid).catch(() => null))?.photoURL;
  if (photoURL?.includes("firebasestorage")) {
    const { deleteObject, ref } = await import("firebase/storage");
    const { storage } = await import("@/lib/firebase");
    await deleteObject(ref(storage, photoURL)).catch(() => undefined);
  }
  await deleteDoc(doc(db, "users", uid)).catch(() => undefined);

  await deleteUser(user);
};
