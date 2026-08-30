const fs = require('fs');
const path = require('path');

const models = [
  { name: 'return', plural: 'returns', model: 'warehouseReturn' },
  { name: 'yard', plural: 'yard', model: 'warehouseYard' },
  { name: 'dockAppt', plural: 'dock-appt', model: 'warehouseDockAppt' },
  { name: 'pickList', plural: 'pick-list', model: 'warehousePickList' },
];

models.forEach(({ plural, model }) => {
  const dir = path.join('d:/Reanzo/reanzly/src/app/api/warehouse', plural);
  const idDir = path.join(dir, '[id]');
  fs.mkdirSync(idDir, { recursive: true });

  const routeContent = `import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function GET(req: Request) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const rows = await prisma.${model}.findMany({
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
    const auth = await verifyAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    const row = await prisma.${model}.create({
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
`;

  const idRouteContent = `import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyAuth } from '@/lib/auth';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await verifyAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const data = await req.json();
    const row = await prisma.${model}.update({
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
    const auth = await verifyAuth(req);
    if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await prisma.${model}.delete({
      where: { id: params.id, companyId: auth.companyId },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
`;

  fs.writeFileSync(path.join(dir, 'route.ts'), routeContent);
  fs.writeFileSync(path.join(idDir, 'route.ts'), idRouteContent);
});
console.log('Routes created successfully.');
