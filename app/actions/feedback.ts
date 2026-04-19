"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { feedbacks } from "@/lib/db/schema";
import { sendEmail } from "@/lib/resend";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

const feedbackSchema = z.object({
  rating: z.number().int().min(1).max(5),
  content: z.string().min(10, "Feedback must be at least 10 characters long"),
  suggestions: z.string().optional(),
});

export async function submitFeedback(values: z.infer<typeof feedbackSchema>) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const validated = feedbackSchema.parse(values);

  await db.insert(feedbacks).values({
    userId: session.user.id,
    rating: validated.rating,
    content: validated.content,
    suggestions: validated.suggestions,
  });

  // Send email notification to admin
  const adminEmail = "rizky@useaudora.com";
  const { user } = session;
  const stars = "⭐".repeat(validated.rating);

  await sendEmail({
    to: adminEmail,
    subject: `New Feedback Received (${validated.rating} Stars) from ${user.name}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #1a202c; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px;">New User Feedback</h2>
        
        <div style="margin-top: 20px;">
          <p><strong>User:</strong> ${user.name} (${user.email})</p>
          <p><strong>Rating:</strong> <span style="font-size: 1.25rem;">${stars}</span> (${validated.rating}/5)</p>
          <p><strong>Feedback:</strong></p>
          <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px; color: #2d3748; line-height: 1.5;">
            ${validated.content.replace(/\n/g, '<br>')}
          </div>
        </div>

        ${validated.suggestions ? `
        <div style="margin-top: 20px;">
          <p><strong>Suggestions for Improvement:</strong></p>
          <div style="background-color: #f7fafc; padding: 15px; border-radius: 5px; color: #2d3748; line-height: 1.5;">
            ${validated.suggestions.replace(/\n/g, '<br>')}
          </div>
        </div>
        ` : ''}

        <div style="margin-top: 30px; font-size: 0.875rem; color: #718096; border-top: 1px solid #e2e8f0; padding-top: 15px;">
          <p>Submitted on: ${new Date().toLocaleString()}</p>
          <p>User ID: ${user.id}</p>
        </div>
      </div>
    `,
  });

  return { success: true };
}
