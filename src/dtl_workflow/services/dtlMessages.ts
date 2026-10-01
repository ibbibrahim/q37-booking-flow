import { formatDtlBookingTime } from './dtlTime';

// WhatsApp uses single asterisks for bold.
export function buildDtlLinkMessage(
  guestName: string,
  programName: string,
  time: string | null,
  link: string,
): string {
  const name = guestName || 'there';
  const program = programName || 'your program';
  const when = formatDtlBookingTime(time);

  const en = [
    `Hi ${name},`,
    '',
    when
      ? `Here is your DTL booking link for the *${program}* program at *${when} Qatar time*.`
      : `Here is your DTL booking link for the *${program}* program.`,
    '',
    '*Booking Link:*',
    link,
    '',
    'Thanks.',
  ];

  const ar = [
    `مرحباً ${guestName || ''}،`,
    '',
    when
      ? `هذا هو رابط حجز الـ DTL الخاص بك لبرنامج *${program}* في تمام الساعة *${when} بتوقيت قطر*.`
      : `هذا هو رابط حجز الـ DTL الخاص بك لبرنامج *${program}*.`,
    '',
    '*رابط الحجز:*',
    link,
    '',
    'شكراً.',
  ];

  return [...ar, '', '---', '', ...en].join('\n');
}

export function buildDtlWhatsAppUrl(phone: string, message: string): string | null {
  const digits = phone.replace(/[^\d]/g, '');
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
