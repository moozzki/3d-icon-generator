import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/lib/db";
import { admin, magicLink, lastLoginMethod } from "better-auth/plugins";
import { sendEmail } from "@/lib/resend";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),

  // Keep emailAndPassword enabled ONLY for admin seed script.
  // UI does NOT expose email+password forms — only Social & Magic Link.
  emailAndPassword: { enabled: true },

  user: {
    changeEmail: {
      enabled: true,
    },
    deleteUser: {
      enabled: true,
    },
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "GOOGLE_CLIENT_ID",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "GOOGLE_CLIENT_SECRET",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "GITHUB_CLIENT_ID",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "GITHUB_CLIENT_SECRET",
    },
  },

  // Link accounts from different providers (Google, GitHub, Magic Link)
  // to the same user if they share the same email address.
  account: {
    accountLinking: {
      enabled: true,
      trustedProviders: ["google", "github", "email-password"],
    },
  },

  plugins: [
    admin(),
    lastLoginMethod(),
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        await sendEmail({
          to: email,
          subject: "Your Audora magic link ✨",
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
              <div style="text-align: center; margin-bottom: 32px;">
                <img src="${process.env.BETTER_AUTH_URL}/assets/audora-square-logo.png" alt="Audora" style="width: 56px; height: 56px; border-radius: 12px; margin: 0 auto;">
              </div>
              <p style="font-size: 16px; color: #333; line-height: 1.6; margin-bottom: 24px;">
                Welcome! Here is your magic link to access your Audora dashboard. It is valid for the next 5 minutes.
              </p>
              <div style="text-align: center; margin-bottom: 32px;">
                <a href="${url}" 
                   style="display: inline-block; background: #4949FF; color: #fff; text-decoration: none; padding: 14px 32px; border-radius: 9999px; font-size: 16px; font-weight: 600;">
                   Go to Dashboard →
                </a>
              </div>
              <p style="font-size: 13px; color: #888; line-height: 1.5;">
                Did not request this? Just ignore this message. This link only works once.
              </p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
              <p style="font-size: 12px; color: #aaa; text-align: center;">
                © Audora — AI 3D Isometric Icon Generator
              </p>
            </div>
          `,
        });
      },
      expiresIn: 300, // 5 minutes
      disableSignUp: false, // New users can sign up via magic link
    }),
  ],

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Refresh session every 24 hours
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 minute cookie cache
    },
  },

  baseURL: process.env.BETTER_AUTH_URL,
  trustedOrigins: [
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    "https://*.vercel.app",
    "http://localhost:3000",
  ],
});
