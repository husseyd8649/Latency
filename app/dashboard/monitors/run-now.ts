// app/dashboard/monitors/run-now.ts
"use server";

import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth-helpers";
import { runMonitorCheck } from "@/lib/checkers/runner";
import { revalidatePath } from "next/cache";

export async function runNow(formData: FormData) {
  const user = await requireUser();
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  const monitor = await prisma.monitor.findFirst({
    where: { id, userId: user.id },
  });
  if (!monitor) return;

  await runMonitorCheck(monitor);

  revalidatePath("/dashboard/monitors");
  revalidatePath("/dashboard");
}