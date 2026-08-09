"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

/* ---- Types ---- */

type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  ok?: boolean;
};

/* ---- Validation ---- */

const regionSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(50, "Name must be 50 characters or fewer"),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Invalid hex color"),
});

/* ---- Helpers ---- */

function slugify(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* ---- Actions ---- */

export async function getRegions() {
  const user = await requireUser();

  return prisma.region.findMany({
    where: { userId: user.id },
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { monitors: true },
      },
    },
  });
}

export async function createRegion(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const raw = {
    name: formData.get("name") as string,
    color: formData.get("color") as string,
  };

  const parsed = regionSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (typeof path === "string" && !fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }
    return { error: "Please fix the errors below", fieldErrors };
  }

  const slug = slugify(parsed.data.name);

  if (!slug) {
    return { error: "Name must contain at least one alphanumeric character" };
  }

  // Check for duplicate slug
  const existing = await prisma.region.findUnique({
    where: { userId_slug: { userId: user.id, slug } },
  });

  if (existing) {
    return {
      error: "Please fix the errors below",
      fieldErrors: { name: `A region named "${existing.name}" already exists with the same slug` },
    };
  }

  await prisma.region.create({
    data: {
      userId: user.id,
      name: parsed.data.name,
      slug,
      color: parsed.data.color,
    },
  });

  revalidatePath("/dashboard/regions");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function editRegion(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const id = formData.get("id") as string;
  if (!id) return { error: "Region not found" };

  const raw = {
    name: formData.get("name") as string,
    color: formData.get("color") as string,
  };

  const parsed = regionSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const path = issue.path[0];
      if (typeof path === "string" && !fieldErrors[path]) {
        fieldErrors[path] = issue.message;
      }
    }
    return { error: "Please fix the errors below", fieldErrors };
  }

  const slug = slugify(parsed.data.name);

  if (!slug) {
    return { error: "Name must contain at least one alphanumeric character" };
  }

  // Check for duplicate slug (exclude self)
  const existing = await prisma.region.findUnique({
    where: { userId_slug: { userId: user.id, slug } },
  });

  if (existing && existing.id !== id) {
    return {
      error: "Please fix the errors below",
      fieldErrors: { name: `A region named "${existing.name}" already exists with the same slug` },
    };
  }

  // Verify ownership
  const region = await prisma.region.findFirst({
    where: { id, userId: user.id },
  });

  if (!region) return { error: "Region not found" };

  await prisma.region.update({
    where: { id },
    data: {
      name: parsed.data.name,
      slug,
      color: parsed.data.color,
    },
  });

  revalidatePath("/dashboard/regions");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteRegion(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const user = await requireUser();

  const id = formData.get("id") as string;
  if (!id) return { error: "Region not found" };

  const region = await prisma.region.findFirst({
    where: { id, userId: user.id },
    include: { _count: { select: { monitors: true } } },
  });

  if (!region) return { error: "Region not found" };

  if (region._count.monitors > 0) {
    return {
      error: `Cannot delete "${region.name}" — it still has ${region._count.monitors} monitor${region._count.monitors === 1 ? "" : "s"}. Reassign them first.`,
    };
  }

  await prisma.region.delete({
    where: { id },
  });

  revalidatePath("/dashboard/regions");
  revalidatePath("/dashboard");
  return { ok: true };
}