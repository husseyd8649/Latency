// app/dashboard/account/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { signOut } from "@/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { passwordSchema } from "@/lib/validation/password";

const nameSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name cannot be empty")
    .max(80, "Name is too long"),
});

type ActionState = { error?: string; success?: string };

/** Update the display name. */
export async function updateName(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const parsed = nameSchema.safeParse({
    name: formData.get("name"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid name" };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { name: parsed.data.name },
  });

  revalidatePath("/dashboard/account");
  return { success: "Name updated." };
}

/**
 * Delete the current user's account.
 * Prisma cascades will remove monitors, checks, incidents, status pages, webhooks.
 * Signs the user out before redirecting home.
 */
export async function deleteAccount(formData: FormData): Promise<void> {
  const user = await requireUser();

  const confirmation = String(formData.get("confirm") ?? "").trim();
  if (confirmation.toLowerCase() !== "delete") {
    // Silent no-op if confirmation not matched. UI will still show the value.
    return;
  }

  await prisma.user.delete({ where: { id: user.id } });

  await signOut({ redirect: false });
  redirect("/");
}

const setPasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type PasswordActionState = {
  error?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
};

export async function setOrChangePassword(
  _prev: PasswordActionState,
  formData: FormData
): Promise<PasswordActionState> {
  const user = await requireUser();

  const raw = {
    currentPassword: formData.get("currentPassword") ?? "",
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  };

  const parsed = setPasswordSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const p = issue.path[0];
      if (typeof p === "string" && !fieldErrors[p]) fieldErrors[p] = issue.message;
    }
    return { error: "Please fix the errors below", fieldErrors };
  }

  const existing = await prisma.user.findUnique({
    where: { id: user.id },
    select: { passwordHash: true },
  });
  if (!existing) return { error: "User not found." };

  // If a password already exists, require the current one
  if (existing.passwordHash) {
    const current = String(parsed.data.currentPassword ?? "");
    if (!current) {
      return {
        error: "Enter your current password.",
        fieldErrors: { currentPassword: "Required" },
      };
    }
    const ok = await bcrypt.compare(current, existing.passwordHash);
    if (!ok) {
      return {
        error: "Current password is incorrect.",
        fieldErrors: { currentPassword: "Incorrect" },
      };
    }
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });

  revalidatePath("/dashboard/account");
  return {
    success: existing.passwordHash ? "Password updated." : "Password set. You can now sign in with your email and password.",
  };
}