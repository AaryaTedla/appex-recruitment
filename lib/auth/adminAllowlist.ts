export const ADMIN_EMAILS = new Set([
  "meg.sanjeev@gmail.com",
  "aaryatedla@gmail.com",
  "bhaveshvelluru@gmail.com",
  "rahul.dutta.bwn@gmail.com",
  "tadipatrirohansai@gmail.com",
]);

export function isAllowedAdminEmail(email: string | null | undefined) {
  return Boolean(email && ADMIN_EMAILS.has(email.trim().toLowerCase()));
}
