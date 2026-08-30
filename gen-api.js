const fs = require('fs');
const path = require('path');

const models = [
  { dir: 'skus', modelName: 'warehouseSku', key: 'skus' },
  { dir: 'inbound', modelName: 'warehouseInbound', key: 'shipments' },
  { dir: 'outbound', modelName: 'warehouseOutbound', key: 'shipments' },
  { dir: 'storage', modelName: 'warehouseStorageLocation', key: 'locations' },
  { dir: 'pod-receive', modelName: 'warehousePodReceive', key: 'receives' },
  { dir: 'pick-pack', modelName: 'warehousePickList', key: 'pickLists' },
  { dir: 'cycle-count', modelName: 'warehouseCycleCount', key: 'counts' },
  { dir: 'cross-dock', modelName: 'warehouseCrossDock', key: 'crossDocks' }
];

const basePath = path.join('d:', 'Reanzo', 'reanzly', 'src', 'app', 'api', 'warehouse');

if (!fs.existsSync(basePath)) {
  fs.mkdirSync(basePath, { recursive: true });
}

models.forEach(({ dir, modelName, key }) => {
  const dirPath = path.join(basePath, dir);
  if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
  
  const content = 'import { NextRequest, NextResponse } from "next/server";\n' +
'import { db } from "@/lib/db";\n' +
'import { getSessionUser } from "@/lib/auth";\n' +
'import { requireModuleAccess } from "@/lib/permissions";\n' +
'\n' +
'export async function GET() {\n' +
'  const sessionUser = await getSessionUser();\n' +
'  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });\n' +
'  const denied = requireModuleAccess(sessionUser, "warehouse");\n' +
'  if (denied) return denied;\n' +
'\n' +
'  const data = await db.' + modelName + '.findMany({\n' +
'    where: { companyId: sessionUser.companyId },\n' +
'    orderBy: { createdAt: "desc" },\n' +
'  });\n' +
'  return NextResponse.json({ ' + key + ': data });\n' +
'}\n' +
'\n' +
'export async function POST(req: NextRequest) {\n' +
'  const sessionUser = await getSessionUser();\n' +
'  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });\n' +
'  const denied = requireModuleAccess(sessionUser, "warehouse");\n' +
'  if (denied) return denied;\n' +
'\n' +
'  const body = await req.json();\n' +
'  try {\n' +
'    const created = await db.' + modelName + '.create({\n' +
'      data: {\n' +
'        companyId: sessionUser.companyId,\n' +
'        ...body,\n' +
'      }\n' +
'    });\n' +
'    return NextResponse.json({ ' + key.slice(0, -1) + ': created }, { status: 201 });\n' +
'  } catch (e: any) {\n' +
'    console.error("POST error:", e);\n' +
'    return NextResponse.json({ error: "Could not create record." }, { status: 500 });\n' +
'  }\n' +
'}\n';

  fs.writeFileSync(path.join(dirPath, 'route.ts'), content);

  const idDirPath = path.join(dirPath, '[id]');
  if (!fs.existsSync(idDirPath)) fs.mkdirSync(idDirPath, { recursive: true });

  const idContent = 'import { NextRequest, NextResponse } from "next/server";\n' +
'import { db } from "@/lib/db";\n' +
'import { getSessionUser } from "@/lib/auth";\n' +
'import { requireModuleAccess } from "@/lib/permissions";\n' +
'\n' +
'export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {\n' +
'  const sessionUser = await getSessionUser();\n' +
'  if (!sessionUser) return NextResponse.json({ error: "Not signed in." }, { status: 401 });\n' +
'  const denied = requireModuleAccess(sessionUser, "warehouse");\n' +
'  if (denied) return denied;\n' +
'\n' +
'  const { id } = params;\n' +
'  const body = await req.json();\n' +
'  try {\n' +
'    const record = await db.' + modelName + '.findUnique({ where: { id } });\n' +
'    if (!record || record.companyId !== sessionUser.companyId) {\n' +
'        return NextResponse.json({ error: "Not found or access denied." }, { status: 404 });\n' +
'    }\n' +
'    const updated = await db.' + modelName + '.update({\n' +
'        where: { id },\n' +
'        data: body,\n' +
'    });\n' +
'    return NextResponse.json({ ' + key.slice(0, -1) + ': updated });\n' +
'  } catch (e: any) {\n' +
'    console.error("PATCH error:", e);\n' +
'    return NextResponse.json({ error: "Could not update record." }, { status: 500 });\n' +
'  }\n' +
'}\n';

  fs.writeFileSync(path.join(idDirPath, 'route.ts'), idContent);
});

console.log("Generated all warehouse API routes!");
