// Seeds real per-employee documents (Employee.documentsJson), real
// HrDocumentRequest / HrIssuance / HrInterview / HrOfferLetter rows.
//
// The old mock data in _data.ts (DOC_REQUESTS/ISSUANCES/INTERVIEWS/
// OFFER_LETTERS) references mock Employee/Position/Candidate ids
// ("emp-1", "pos-3"...) that don't exist in the real DB - the real roster
// was seeded independently by seed-hr-full.ts with real cuids. So this
// script re-derives realistic records against the REAL Employee/HrPosition/
// Candidate rows instead of blindly importing the mock ids.
//
// Idempotent: skips each slice if rows already exist for this company.
// Run with: bunx tsx src/scripts/seed-hr-docs-recruitment.ts
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();
const COMPANY_ID = "default-tenant";

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86_400_000);
}
function daysFromNow(n: number): Date {
  return new Date(Date.now() + n * 86_400_000);
}
function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

const STANDARD_KYC: { type: string; refPrefix: string }[] = [
  { type: "Aadhaar", refPrefix: "XXXX-XXXX-" },
  { type: "PAN", refPrefix: "ABCDE" },
  { type: "Photo", refPrefix: "PHOTO-" },
  { type: "Bank Passbook", refPrefix: "ACC-" },
];

async function seedEmployeeDocuments() {
  const employees = await db.employee.findMany({ where: { companyId: COMPANY_ID } });
  const withoutDocs = employees.filter((e) => !e.documentsJson || e.documentsJson === "[]");
  if (withoutDocs.length === 0) {
    console.log("[seed-hr-docs] all employees already have documents, skipping.");
    return;
  }

  let count = 0;
  for (let i = 0; i < withoutDocs.length; i++) {
    const emp = withoutDocs[i];
    const seed = i + 501;
    const docs: { type: string; verified: boolean; expiry?: string; refNo?: string }[] = [];

    for (const kyc of STANDARD_KYC) {
      docs.push({
        type: kyc.type,
        verified: seed % 11 !== 0, // most verified, a few pending
        refNo: `${kyc.refPrefix}${(1000 + seed * 7) % 9000}`,
      });
    }

    if (emp.esiEnrolled) {
      docs.push({ type: "ESI Card", verified: true, refNo: `ESI-${(200000 + seed * 13) % 800000}` });
    }
    if (emp.pfEnrolled) {
      docs.push({ type: "PF Nomination", verified: seed % 5 !== 0 });
    }

    if (emp.designation === "Driver") {
      const dlExpiryDays = (seed % 5 === 0) ? -1 * (seed % 30) : 90 + (seed % 900); // some expired
      docs.push({
        type: "Driving Licence",
        verified: true,
        refNo: `MH${String(1 + (seed % 20)).padStart(2, "0")}-${(20100000 + seed * 37) % 899999}`,
        expiry: daysFromNow(dlExpiryDays).toISOString().slice(0, 10),
      });
      docs.push({
        type: "Police Verification",
        verified: seed % 7 !== 0,
        expiry: daysFromNow(180 + (seed % 500)).toISOString().slice(0, 10),
      });
      docs.push({
        type: "Medical Fitness",
        verified: true,
        expiry: daysFromNow((seed % 9 === 0) ? (seed % 20) : 30 + (seed % 400)).toISOString().slice(0, 10),
      });
      docs.push({ type: "RC", verified: true, refNo: `MH${String(1 + (seed % 20)).padStart(2, "0")} AB ${1000 + (seed % 9000)}` });
    } else {
      docs.push({
        type: "Education Certificate",
        verified: seed % 4 !== 0,
        refNo: `EDU-${(300000 + seed * 19) % 700000}`,
      });
      if (seed % 3 === 0) {
        docs.push({ type: "Previous Employment", verified: true, refNo: `EXP-${(400000 + seed * 23) % 600000}` });
      }
    }

    await db.employee.update({ where: { id: emp.id }, data: { documentsJson: JSON.stringify(docs) } });
    count++;
  }
  console.log(`[seed-hr-docs] seeded documents for ${count} employees.`);
}

async function seedDocRequests() {
  const existing = await db.hrDocumentRequest.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-hr-docs] ${existing} doc requests already exist, skipping.`);
    return;
  }
  const employees = await db.employee.findMany({ where: { companyId: COMPANY_ID, status: "Active" } });
  if (employees.length === 0) {
    console.log("[seed-hr-docs] no active employees found, skipping doc requests.");
    return;
  }
  const types = ["Aadhaar", "PAN", "Driving Licence", "Medical Fitness", "Education Certificate", "Bank Passbook"];
  let count = 0;
  for (let i = 0; i < 6; i++) {
    const seed = i + 601;
    const emp = pick(employees, seed);
    const status = i < 2 ? "Pending" : i === 2 ? "Overdue" : "Received";
    await db.hrDocumentRequest.create({
      data: {
        companyId: COMPANY_ID,
        empId: emp.id,
        empCode: emp.code,
        empName: emp.name,
        docType: pick(types, seed),
        reason: "Annual KYC re-verification required.",
        requestedOn: daysAgo(5 + (seed % 10)),
        dueDate: daysFromNow(seed % 14),
        status,
        receivedOn: status === "Received" ? daysAgo(seed % 5) : null,
      },
    });
    count++;
  }
  console.log(`[seed-hr-docs] seeded ${count} document requests.`);
}

async function seedIssuances() {
  const existing = await db.hrIssuance.count({ where: { companyId: COMPANY_ID } });
  if (existing > 0) {
    console.log(`[seed-hr-docs] ${existing} issuances already exist, skipping.`);
    return;
  }
  const employees = await db.employee.findMany({ where: { companyId: COMPANY_ID } });
  if (employees.length === 0) {
    console.log("[seed-hr-docs] no employees found, skipping issuances.");
    return;
  }
  const templates: { type: string; category: string; fields: Record<string, string> }[] = [
    { type: "appointment-letter", category: "Onboarding", fields: { ctc: "", joiningDate: "" } },
    { type: "salary-certificate", category: "Certificate", fields: {} },
    { type: "experience-letter", category: "Offboarding", fields: {} },
    { type: "increment-letter", category: "Performance", fields: {} },
    { type: "id-card-request", category: "Onboarding", fields: {} },
    { type: "address-proof", category: "Certificate", fields: {} },
    { type: "promotion-letter", category: "Performance", fields: {} },
    { type: "warning-letter", category: "Other", fields: {} },
  ];
  const statuses = ["Draft", "Sent", "Accepted", "E-Signed", "Sent", "Draft", "Accepted", "Sent"];
  let count = 0;
  const year = new Date().getFullYear();
  for (let i = 0; i < 8; i++) {
    const seed = i + 701;
    const emp = pick(employees, seed);
    const tmpl = templates[i];
    await db.hrIssuance.create({
      data: {
        companyId: COMPANY_ID,
        documentId: `ISS-${year}-${String(i + 1).padStart(4, "0")}`,
        type: tmpl.type,
        category: tmpl.category,
        employeeId: emp.id,
        employeeName: emp.name,
        designation: emp.designation,
        branch: emp.branchName ?? "",
        status: statuses[i],
        issuedBy: "Kavita Nair",
        issuedOn: daysAgo(2 + seed % 60),
        format: "A4",
        letterhead: true,
        watermark: false,
        branded: "reanzly",
        theme: "monochrome",
        font: "sans",
        ccManager: seed % 3 === 0,
        bccHrHead: seed % 4 === 0,
        fieldsJson: JSON.stringify(tmpl.fields),
        eSignPending: statuses[i] === "Sent",
      },
    });
    count++;
  }
  console.log(`[seed-hr-docs] seeded ${count} issuances.`);
}

async function seedInterviewsAndOffers() {
  const existingInterviews = await db.hrInterview.count({ where: { companyId: COMPANY_ID } });
  const existingOffers = await db.hrOfferLetter.count({ where: { companyId: COMPANY_ID } });
  if (existingInterviews > 0 && existingOffers > 0) {
    console.log(`[seed-hr-docs] interviews/offers already exist, skipping.`);
    return;
  }

  const positions = await db.hrPosition.findMany({ where: { companyId: COMPANY_ID } });
  const candidates = await db.candidate.findMany({ where: { companyId: COMPANY_ID } });
  if (positions.length === 0 || candidates.length === 0) {
    console.log("[seed-hr-docs] no positions/candidates found, skipping interviews/offers.");
    return;
  }

  if (existingInterviews === 0) {
    const rounds = ["Telephonic", "Technical", "HR", "Final"];
    const interviewers = ["Vikram Deshmukh", "Kavita Nair", "Anil Reddy"];
    let count = 0;
    for (let i = 0; i < Math.min(10, candidates.length * 2); i++) {
      const seed = i + 801;
      const cand = pick(candidates, seed);
      const isCompleted = i % 3 !== 0;
      await db.hrInterview.create({
        data: {
          companyId: COMPANY_ID,
          positionId: cand.positionId,
          candidateId: cand.id,
          candidateName: cand.name,
          role: pick(positions, seed).title,
          round: pick(rounds, seed),
          scheduledOn: isCompleted ? daysAgo(2 + seed % 20) : daysFromNow(1 + seed % 10),
          duration: pick([30, 45, 60], seed),
          interviewer: pick(interviewers, seed),
          status: isCompleted ? "Completed" : "Scheduled",
          feedback: isCompleted ? pick(["Strong technical fundamentals, good fit.", "Communication could be better.", "Excellent culture fit, recommend hire."], seed) : null,
          rating: isCompleted ? 3 + (seed % 3) : null,
        },
      });
      count++;
    }
    console.log(`[seed-hr-docs] seeded ${count} interviews.`);
  } else {
    console.log(`[seed-hr-docs] ${existingInterviews} interviews already exist, skipping.`);
  }

  if (existingOffers === 0) {
    const offerCandidates = candidates.filter((c) => c.stage === "Offer" || c.stage === "Joined");
    const source = offerCandidates.length > 0 ? offerCandidates : candidates.slice(0, 3);
    const statuses = ["Drafted", "Sent", "Accepted", "Declined"];
    let count = 0;
    for (let i = 0; i < source.length; i++) {
      const seed = i + 901;
      const cand = source[i];
      const pos = positions.find((p) => p.id === cand.positionId) ?? pick(positions, seed);
      const status = pick(statuses, seed);
      await db.hrOfferLetter.create({
        data: {
          companyId: COMPANY_ID,
          positionId: cand.positionId,
          candidateId: cand.id,
          candidateName: cand.name,
          role: pos.title,
          branch: pos.branchId ?? "",
          offeredCTC: Math.round((cand.expectedCtc ?? 0) / 100), // Candidate.expectedCtc is paise; HrOfferLetter.offeredCTC is rupees (matches formatINRCompact's expected scale)
          joiningDate: daysFromNow(14 + seed % 30),
          status,
          issuedOn: daysAgo(1 + seed % 15),
          acceptedOn: status === "Accepted" ? daysAgo(seed % 5) : null,
          declinedOn: status === "Declined" ? daysAgo(seed % 5) : null,
          declinedReason: status === "Declined" ? "Accepted another offer with higher CTC." : null,
        },
      });
      count++;
    }
    console.log(`[seed-hr-docs] seeded ${count} offer letters.`);
  } else {
    console.log(`[seed-hr-docs] ${existingOffers} offers already exist, skipping.`);
  }
}

async function main() {
  await seedEmployeeDocuments();
  await seedDocRequests();
  await seedIssuances();
  await seedInterviewsAndOffers();
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
