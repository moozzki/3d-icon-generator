import { redirect } from "next/navigation";

// Passwordless auth: sign-up is handled automatically through sign-in.
// New users are created on first Social Login or Magic Link usage.
export default function SignUpPage() {
  redirect("/sign-in");
}
