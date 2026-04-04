import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy");

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  const { data, error } = await resend.emails.send({
    from: "Audora <noreply@useaudora.com>",
    to: [to],
    subject,
    html,
  });

  if (error) {
    console.error("Resend email error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }

  return data;
}
