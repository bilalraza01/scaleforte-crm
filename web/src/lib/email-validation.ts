// Role-based / shared-inbox local-parts that we block on contact creation.
// Cold-outreach to these aliases lands in shared queues, hurts deliverability,
// and almost never reaches a decision-maker. List is intentionally narrow —
// extend only with addresses we know we never want to message.
const BLOCKED_EMAIL_LOCAL_PARTS = new Set([
  "support",
  "customersupport",
  "help",
  "inquiries",
])

// Returns the matched local-part if the email is blocked, otherwise null.
export function blockedEmailLocalPart(email: string): string | null {
  const local = email.split("@")[0]?.toLowerCase().trim()
  if (!local) return null
  return BLOCKED_EMAIL_LOCAL_PARTS.has(local) ? local : null
}

export function validateContactEmail(email: string | undefined): string | true {
  if (!email) return "Email is required"
  const blocked = blockedEmailLocalPart(email)
  if (blocked) return `${blocked}@ aliases aren't accepted — use a personal email instead.`
  return true
}
