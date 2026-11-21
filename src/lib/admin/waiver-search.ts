import "server-only";

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a MongoDB filter that finds signed waivers by name, email, booking/waiver number,
 * date of birth or phone number (phone matches regardless of spaces, dashes or brackets).
 */
export function waiverSearchFilter(q: string) {
  const query = q.trim().slice(0, 100);
  const rx = { $regex: escapeRegex(query), $options: "i" };
  const or: Record<string, unknown>[] = ["participantName", "firstName", "lastName", "email", "bookingNumber", "waiverNumber", "signerName", "participantDob", "guardian.name"].map(
    (f) => ({ [f]: rx }),
  );

  // "Jane Smith" -> first name Jane + last name Smith
  const parts = query.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    or.push({
      firstName: { $regex: `^${escapeRegex(parts[0])}`, $options: "i" },
      lastName: { $regex: `^${escapeRegex(parts.slice(1).join(" "))}`, $options: "i" },
    });
  }

  // Phone: match the digits with any separators in between, e.g. 2047744303 finds "204-774-4303".
  const digits = query.replace(/\D/g, "");
  if (digits.length >= 4) {
    const pattern = digits.split("").join("[^0-9]*");
    or.push({ phone: { $regex: pattern } }, { emergencyPhone: { $regex: pattern } }, { "guardian.phone": { $regex: pattern } });
  }
  return { $or: or };
}
