import { createAuthClient } from "better-auth/react";
import { adminClient } from "better-auth/client/plugins";
import { magicLinkClient } from "better-auth/client/plugins";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_BETTER_AUTH_URL || "",
  plugins: [
    adminClient(),
    magicLinkClient(),
  ]
});

export const { signIn, signUp, useSession, signOut } = authClient;
