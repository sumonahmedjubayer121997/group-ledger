type Claims = { members: { id: string; name: string }[]; aliases?: Record<string, string> };

/**
 * The member behind a person on an expense. A name added without an account and later claimed
 * ("I'm Rahim") counts as the person who claimed it; anyone else keeps their own id and name.
 */
export function memberFor(group: Claims | undefined, person: { id?: string; name?: string } | undefined) {
  const id = (person?.id && group?.aliases?.[person.id]) || person?.id || "";
  const member = group?.members.find((m) => m.id === id);
  return { id, name: member?.name ?? person?.name ?? "" };
}
