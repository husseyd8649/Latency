// app/dashboard/monitors/edit-target.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const schema = z.object({
  id: z.string().min(1),
  target: z.string().min(1).max(500),
});

export async function editTarget(formData: FormData): Promise<void> {
  const user = await requireUser();
  const parsed = schema.safeParse({
    id: formData.get("id"),
    target: formData.get("target"),
  });
  if (!parsed.success) return;

  // Verify ownership
  const monitor = await prisma.monitor.findFirst({
    where: { id: parsed.data.id, userId: user.id },
    select: { id: true },
  });
  if (!monitor) return;

  await prisma.monitor.update({
    where: { id: parsed.data.id },
    data: { target: parsed.data.target },
  });

  revalidatePath("/dashboard/monitors");
}