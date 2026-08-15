import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const subscribeSchema = z.object({
  email: z.string().email(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  
  try {
    const body = await req.json();
    const { email } = subscribeSchema.parse(body);

    const statusPage = await prisma.statusPage.findUnique({
      where: { slug },
    });

    if (!statusPage) {
      return NextResponse.json({ error: "Status page not found" }, { status: 404 });
    }

    await prisma.statusPageSubscription.create({
      data: {
        statusPageId: statusPage.id,
        email,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid email" }, { status: 400 });
    }
    
    // Handle Prisma unique constraint violation (already subscribed)
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        return NextResponse.json({ error: "Already subscribed" }, { status: 409 });
      }
    }
    
    return NextResponse.json({ error: "Failed to subscribe" }, { status: 500 });
  }
}