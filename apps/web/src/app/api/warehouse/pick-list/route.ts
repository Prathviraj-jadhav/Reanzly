import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';
import { warehouseCreateMappers } from '@/lib/warehouse/create-fields';

export async function GET(req: Request) {
  try {
    const auth = await getSessionUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await prisma.warehousePickList.findMany({
      where: { companyId: auth.companyId },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await getSessionUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const row = await prisma.warehousePickList.create({
      data: warehouseCreateMappers.pickList(body, auth.companyId),
    });
    return NextResponse.json(row);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
