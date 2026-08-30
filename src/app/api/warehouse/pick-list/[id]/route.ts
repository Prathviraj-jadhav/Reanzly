import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getSessionUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    const row = await prisma.warehousePickList.update({
      where: { id: params.id, companyId: auth.companyId },
      data,
    });
    return NextResponse.json(row);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await getSessionUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.warehousePickList.delete({
      where: { id: params.id, companyId: auth.companyId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
