export function buildDtlLinkMessage(guestName: string, programName: string, link: string): string {
  const name = guestName || 'there';
  const program = programName || 'your program';
  return `hi ${name} here is your link for DTL booking for the ${program}\n\nlink: ${link}\n\nthanks`;
}

export function buildDtlWhatsAppUrl(phone: string, message: string): string | null {
  const digits = phone.replace(/[^\d]/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
