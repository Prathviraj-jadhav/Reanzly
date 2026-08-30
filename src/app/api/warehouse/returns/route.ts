import { NextResponse } from 'next/server';
import { db as prisma } from '@/lib/db';
import { getSessionUser } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const auth = await getSessionUser();
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await prisma.warehouseReturn.findMany({
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

    const data = await req.json();
    const row = await prisma.warehouseReturn.create({
      data: {
        ...data,
        companyId: auth.companyId,
      },
    });
    return NextResponse.json(row);
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
