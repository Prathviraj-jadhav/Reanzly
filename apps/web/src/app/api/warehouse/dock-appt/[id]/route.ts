/** @deprecated Use /api/v1/warehouse/* (Fastify). Rollback via NEXT_PUBLIC_WAREHOUSE_API_VERSION=legacy. */

import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = await getSessionUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    const row = await prisma.warehouseDockAppt.update({
      where: { id: id, companyId: auth.companyId },
      data,
    });
    return NextResponse.json(row);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const auth = await getSessionUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.warehouseDockAppt.delete({
      where: { id: id, companyId: auth.companyId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
