// app/signin/actions.ts
"use server";

import { signIn } from "@/auth";
import { AuthError } from "next-auth";

type ActionState = { error?: string };

export async function signInWithPassword(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
    });
    return {};
  } catch (err) {
    if (err instanceof AuthError) {
      // NextAuth v5 uses "CredentialsSignin" for bad credentials
      if (err.type === "CredentialsSignin") {
        return { error: "Invalid email or password." };
      }
      return { error: "Sign-in failed. Please try again." };
    }
    // signIn success throws NEXT_REDIRECT — rethrow so Next.js handles it
    throw err;
  }
}

export async function signInWithMagicLink(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!email) return { error: "Email is required." };

  await signIn("resend", { email, redirectTo: "/dashboard" });
  return {};
}