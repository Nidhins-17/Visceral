const DEFAULT_CONTACT_TO_EMAIL = 'ns7professional@gmail.com';
const RESEND_EMAILS_URL = 'https://api.resend.com/emails';

export async function sendContactNotification({ name, email, subject, message }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.CONTACT_FROM_EMAIL?.trim();

  if (!apiKey || !from) return { sent: false, status: 'not_configured' };

  const to = process.env.CONTACT_TO_EMAIL?.trim() || DEFAULT_CONTACT_TO_EMAIL;
  const safeSubject = (subject || 'New consultation request').replace(/[\r\n]+/g, ' ').trim();
  const text = [
    'A new consultation request was submitted through The Truth.',
    '',
    `Name: ${name}`,
    `Email: ${email}`,
    `Subject: ${subject || '(none)'}`,
    '',
    'Message:',
    message,
  ].join('\n');

  try {
    const response = await fetch(RESEND_EMAILS_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        reply_to: email,
        subject: `New consultation request: ${safeSubject}`,
        text,
      }),
    });

    if (!response.ok) {
      console.error(`Contact notification email provider returned HTTP ${response.status}.`);
      return { sent: false, status: 'failed' };
    }

    return { sent: true, status: 'sent' };
  } catch (error) {
    console.error('Contact notification email request failed:', error?.message || 'Network error.');
    return { sent: false, status: 'failed' };
  }
}
