// app/signup/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { signIn } from "@/auth";
import { emailSchema, passwordSchema } from "@/lib/validation/password";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { redirect } from "next/navigation";

const signupSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirmPassword: z.string(),
    name: z.string().trim().max(80).optional().or(z.literal("")),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ActionState = { error?: string; fieldErrors?: Record<string, string> };

export async function signup(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const raw = {
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    name: formData.get("name") ?? "",
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const p = issue.path[0];
      if (typeof p === "string" && !fieldErrors[p]) fieldErrors[p] = issue.message;
    }
    return { error: "Please fix the errors below", fieldErrors };
  }

  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    // If a magic-link user already exists without password, offer to set one via account page
    if (!existing.passwordHash) {
      return {
        error:
          "This email is already registered via magic link. Sign in that way and set a password from your Account page.",
      };
    }
    return { error: "This email is already registered. Try signing in instead." };
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      email,
      name: name ? String(name) : null,
      passwordHash,
    },
  });

  // Auto sign-in
  await signIn("credentials", {
    email,
    password,
    redirectTo: "/dashboard",
  });

  // signIn throws NEXT_REDIRECT; this line is unreachable but keeps types happy
  redirect("/dashboard");
}