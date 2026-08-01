// app/dashboard/status/actions.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { slugSchema } from "@/lib/status-page";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(100),
  slug: slugSchema,
  monitorIds: z.array(z.string()).min(1, "Select at least one monitor"),
});

type ActionState = { error?: string; fieldErrors?: Record<string, string> };

export async function createStatusPage(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const raw = {
    title: formData.get("title"),
    slug: formData.get("slug"),
    monitorIds: formData.getAll("monitorIds"),
  };

  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const p = issue.path[0];
      if (typeof p === "string" && !fieldErrors[p]) fieldErrors[p] = issue.message;
    }
    return { error: "Please fix the errors below", fieldErrors };
  }

  const existing = await prisma.statusPage.findUnique({
    where: { slug: parsed.data.slug },
  });
  if (existing) {
    return { error: "This slug is already taken", fieldErrors: { slug: "Slug already in use" } };
  }

  await prisma.statusPage.create({
    data: {
      userId: user.id,
      title: parsed.data.title,
      slug: parsed.data.slug,
      monitorIds: parsed.data.monitorIds,
    },
  });

  revalidatePath("/dashboard/status");
  return {};
}

export async function deleteStatusPage(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await prisma.statusPage.deleteMany({
    where: { id, userId: user.id },
  });

  revalidatePath("/dashboard/status");
}