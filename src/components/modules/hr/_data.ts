"use client";

// ============================================================
// Reanzly - HR module domain types & mock data.
// Self-contained: types live here (not in /lib/types.ts).
// Indian logistics context: drivers/helpers/mechanics/office
// staff, ₹/PF/ESI/PT/TDS, Aadhaar/PAN/DL.
// ============================================================

// ===== TYPES =====
export type Designation =
  | "Driver"
  | "Helper"
  | "Cleaner"
  | "Mechanic"
  | "Dispatcher"
  | "Accountant"
  | "Branch Manager"
  | "Fleet Executive"
  | "Fleet Supervisor"
  | "Operations Executive"
  | "HR Executive"
  | "Warehouse Lead"
  | "Loaders";

export type Department =
  | "Operations"
  | "Fleet"
  | "Maintenance"
  | "Finance"
  | "HR"
  | "Dispatch"
  | "Warehouse"
  | "Administration";

export type EmploymentType = "Permanent" | "Contract" | "Daily";

export type EmployeeStatus = "Active" | "On Leave" | "Notice" | "Exited";

export type AttendanceMark = "P" | "A" | "H" | "L" | "W" | "T";
// P=Present, A=Absent, H=Half-day, L=Leave, W=Weekoff, T=Trip-linked

export type LeaveType = "CL" | "SL" | "PL" | "ML" | "CO";
// CL=Casual, SL=Sick, PL=Privilege, ML=Maternity, CO=Compensatory
export type LeaveStatus =
  | "Pending"
  | "Manager Approved"
  | "Approved"
  | "Rejected"
  | "Cancelled";

// Performance review cycle
export type ReviewCycle = "Q1" | "Q2" | "Q3" | "Q4" | "Half-Yearly" | "Annual";
export type ReviewStatus = "Draft" | "Self-Review" | "Manager Review" | "HR Review" | "Completed";
export type Rating = 1 | 2 | 3 | 4 | 5; // 1=Needs Improvement, 5=Outstanding

// Onboarding task progress
export type OnboardingStatus =
  | "Pending"
  | "In Progress"
  | "Completed"
  | "Skipped"
  | "Overdue"
  | "Pre-boarding"
  | "Delayed";

// Exit management
export type ExitStatus =
  | "Resignation Submitted"
  | "Manager Reviewed"
  | "HR Reviewed"
  | "Notice Period"
  | "No-Dues Pending"
  | "No-Dues Cleared"
  | "F&F Pending"
  | "F&F Settled"
  | "Exited";

// Attendance regularization request
export type RegStatus = "Pending" | "Approved" | "Rejected";
export type RegType = "Late Punch" | "Missed Punch" | "Wrong Shift" | "Half-day to Full" | "Full to Half-day";

// Job posting + interview
export type InterviewStage = "Scheduled" | "Completed" | "Cancelled" | "No-Show";
export type OfferStatus = "Drafted" | "Sent" | "Accepted" | "Declined" | "Expired";

// Document category (for Documents tab)
export type DocCategory = "KYC" | "Education" | "Employment" | "Health" | "Legal" | "Statutory" | "Asset";

// Audit entry shape
export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "approve"
  | "reject"
  | "status_change"
  | "note";

export type PayrollStatus = "Draft" | "Approved" | "Paid";

export type PositionStatus = "Open" | "On Hold" | "Closed";
export type CandidateStage =
  | "Applied"
  | "Screening"
  | "Interview"
  | "Offer"
  | "Joined"
  | "Rejected";

export type DocType =
  | "Aadhaar"
  | "PAN"
  | "Driving Licence"
  | "RC"
  | "Police Verification"
  | "Medical Fitness"
  | "Education Certificate"
  | "Previous Employment"
  | "Bank Passbook"
  | "Photo"
  | "ESI Card"
  | "PF Nomination";

export interface Employee {
  id: string;
  empCode: string;
  name: string;
  designation: Designation;
  department: Department;
  branch: string;
  employmentType: EmploymentType;
  status: EmployeeStatus;
  doj: string; // date of joining
  phone: string;
  email: string;
  city: string;
  gender: "Male" | "Female";
  dob: string;
  bloodGroup: string;
  address: string;
  emergencyContact: string;
  // Statutory
  esiEnrolled: boolean;
  pfEnrolled: boolean;
  uan?: string;
  esiNo?: string;
  aadhaar: string;
  pan: string;
  // Bank
  bankName: string;
  bankAccount: string;
  bankIfsc: string;
  // Compensation
  ctcAnnual: number;
  basicMonthly: number;
  hraMonthly: number;
  // Documents summary
  documents: { type: DocType; verified: boolean; expiry?: string; refNo?: string }[];
  // Leave balance
  leaveBalance: { cl: number; sl: number; pl: number; ml: number };
  // Reporting
  reportingTo: string;
  // New - HR enhancement
  managerId?: string; // direct manager empId (for org chart)
  buddy?: string; // buddy name (onboarding)
  probationEndDate?: string;
  confirmDate?: string;
  lastIncrementDate?: string;
  lastIncrementPct?: number;
  lastRating?: Rating;
  skills?: string[];
  assetsAssigned?: { name: string; refNo: string; issuedOn: string }[];
}

export interface AttendanceRecord {
  id: string;
  empId: string;
  empCode: string;
  empName: string;
  designation: Designation;
  date: string; // YYYY-MM-DD
  mark: AttendanceMark;
  inTime?: string;
  outTime?: string;
  lateIn?: boolean;
  earlyOut?: boolean;
  otHours?: number;
  tripId?: string;
}

export interface MonthlyAttendanceSummary {
  empId: string;
  empCode: string;
  empName: string;
  designation: Designation;
  present: number;
  absent: number;
  halfDay: number;
  leave: number;
  weekoff: number;
  tripLinked: number;
  otHours: number;
  lateCount: number;
}

export interface LeaveRequest {
  id: string;
  empId: string;
  empName: string;
  empCode: string;
  designation: Designation;
  leaveType: LeaveType;
  from: string;
  to: string;
  days: number;
  reason: string;
  approver: string;
  status: LeaveStatus;
  appliedOn: string;
  reviewedOn?: string;
}

export interface Holiday {
  id: string;
  name: string;
  date: string;
  type: "National" | "Religious" | "Company" | "Restricted";
  branches: string[];
}

export interface Payslip {
  id: string;
  empId: string;
  empCode: string;
  empName: string;
  designation: Designation;
  month: string; // YYYY-MM
  // Earnings (monthly)
  basic: number;
  hra: number;
  conveyance: number;
  ot: number;
  allowances: number;
  incentive?: number;
  // Deductions
  pf: number;
  esi: number;
  pt: number;
  tds: number;
  advance: number;
  otherDeductions: number;
  // Final
  gross: number;
  totalDeductions: number;
  netPay: number;
  status: PayrollStatus;
  // Driver-specific
  tripsCount?: number;
  incentiveRate?: number;
  performanceBonus?: number;
}

export interface PayrollRun {
  id: string;
  month: string;
  generatedOn: string;
  approvedOn?: string;
  disbursedOn?: string;
  status: PayrollStatus;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
}

export interface Position {
  id: string;
  positionId: string;
  role: Designation;
  branch: string;
  openings: number;
  budget: number;
  hiringManager: string;
  status: PositionStatus;
  postedOn: string;
  description: string;
  candidates: Candidate[];
}

export interface Candidate {
  id: string;
  name: string;
  phone: string;
  email: string;
  experience: number;
  currentCTC: number;
  expectedCTC: number;
  stage: CandidateStage;
  appliedOn: string;
  rating: number; // 0-5
  source: string;
  notes: string;
}

export interface ComplianceItem {
  id: string;
  type: "PF Filing" | "ESI Filing" | "PT Return" | "TDS Return" | "Form 16" | "Bonus Act";
  month: string;
  dueDate: string;
  status: "Filed" | "Pending" | "Overdue" | "In Progress";
  amount?: number;
  filedOn?: string;
}

// ===== CONSTANTS =====
export const HR_BRANCHES = [
  "Mumbai HQ",
  "Pune Branch",
  "Delhi Branch",
  "Bengaluru Branch",
  "Chennai Branch",
  "Nagpur Branch",
];

export const HR_CITIES = [
  "Mumbai", "Pune", "Delhi", "Bengaluru", "Nagpur",
  "Nashik", "Thane", "Navi Mumbai",
];

export const DESIGNATIONS: Designation[] = [
  "Driver",
  "Helper",
  "Cleaner",
  "Mechanic",
  "Dispatcher",
  "Accountant",
  "Branch Manager",
  "Fleet Executive",
  "Fleet Supervisor",
  "Operations Executive",
  "HR Executive",
  "Warehouse Lead",
  "Loaders",
];

export const DEPARTMENTS: Department[] = [
  "Operations",
  "Fleet",
  "Maintenance",
  "Finance",
  "HR",
  "Dispatch",
  "Warehouse",
  "Administration",
];

export const EMPLOYMENT_TYPES: EmploymentType[] = ["Permanent", "Contract", "Daily"];
export const EMPLOYEE_STATUSES: EmployeeStatus[] = ["Active", "On Leave", "Notice", "Exited"];
export const LEAVE_TYPES: LeaveType[] = ["CL", "SL", "PL", "ML", "CO"];
export const LEAVE_TYPE_FULL: Record<LeaveType, string> = {
  CL: "Casual Leave",
  SL: "Sick Leave",
  PL: "Privilege Leave",
  ML: "Maternity Leave",
  CO: "Compensatory Off",
};
export const LEAVE_CREDIT: Record<LeaveType, number> = {
  CL: 12,
  SL: 12,
  PL: 15,
  ML: 84,
  CO: 0,
};

export const DOC_TYPES: DocType[] = [
  "Aadhaar",
  "PAN",
  "Driving Licence",
  "RC",
  "Police Verification",
  "Medical Fitness",
  "Education Certificate",
  "Previous Employment",
  "Bank Passbook",
  "Photo",
  "ESI Card",
  "PF Nomination",
];

// ===== Helper - deterministic PRNG =====
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
const rnd = seeded(7);
function pick<T>(arr: T[]): T {
  return arr[Math.floor(rnd() * arr.length)];
}
function randomPhone(): string {
  const p = () => Math.floor(1000 + rnd() * 9000);
  return `+91 ${Math.floor(70 + rnd() * 29)}${p()} ${p()}`;
}
function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}
function isoDaysAhead(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
function dateOnly(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

// Name pools - Indian
const FIRST_M = [
  "Rajesh", "Suresh", "Anil", "Vijay", "Rakesh", "Sunil", "Sanjay", "Deepak",
  "Manoj", "Pradeep", "Arun", "Ashok", "Naresh", "Mahesh", "Dinesh", "Vinod",
  "Ramesh", "Mukesh", "Kamlesh", "Rajiv", "Vikram", "Amit", "Rohit", "Karan",
  "Arjun", "Karthik", "Sai", "Naveen", "Prakash", "Ganesh", "Mohan", "Vinay",
  "Sandeep", "Ravi", "Anand", "Gopal", "Harish", "Krishna", "Lokesh", "Murali",
];
const FIRST_F = [
  "Priya", "Sneha", "Anjali", "Pooja", "Kavita", "Nisha", "Meera", "Divya",
  "Shreya", "Anita", "Lakshmi", "Sunita", "Sarika", "Reshma", "Geeta",
];
const LAST = [
  "Sharma", "Verma", "Gupta", "Mehta", "Patel", "Reddy", "Nair", "Iyer",
  "Kapoor", "Singh", "Joshi", "Desai", "Rao", "Menon", "Pillai", "Das",
  "Bose", "Banerjee", "Mukherjee", "Chatterjee", "Khan", "Agarwal",
  "Malhotra", "Saxena", "Mishra", "Tiwari", "Pandey", "Yadav", "Chauhan",
];

const DESIGNATION_BY_DEPT: Record<Department, Designation[]> = {
  Operations: ["Driver", "Helper", "Loaders", "Operations Executive", "Fleet Supervisor", "Branch Manager"],
  Fleet: ["Driver", "Fleet Executive", "Fleet Supervisor", "Mechanic"],
  Maintenance: ["Mechanic", "Cleaner"],
  Finance: ["Accountant"],
  HR: ["HR Executive"],
  Dispatch: ["Dispatcher", "Operations Executive"],
  Warehouse: ["Warehouse Lead", "Loaders", "Cleaner"],
  Administration: ["Accountant", "HR Executive", "Branch Manager", "Operations Executive"],
};

const BRANCH_CITY: Record<string, string> = {
  "Mumbai HQ": "Mumbai",
  "Pune Branch": "Pune",
  "Delhi Branch": "Delhi",
  "Bengaluru Branch": "Bengaluru",
  "Chennai Branch": "Chennai",
  "Nagpur Branch": "Nagpur",
};

const CTC_BY_DESIGNATION: Record<Designation, number> = {
  Driver: 420000,
  Helper: 240000,
  Cleaner: 180000,
  Mechanic: 360000,
  Dispatcher: 480000,
  Accountant: 600000,
  "Branch Manager": 1200000,
  "Fleet Executive": 480000,
  "Fleet Supervisor": 540000,
  "Operations Executive": 420000,
  "HR Executive": 480000,
  "Warehouse Lead": 360000,
  Loaders: 180000,
};

const BANKS = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Punjab National Bank", "Bank of Baroda"];
const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];

function genAadhaar(): string {
  return "XXXX-XXXX-" + Math.floor(1000 + rnd() * 9000);
}
function genPAN(): string {
  const chars = "ABCDEFGHJKLMNPRSTUVWXYZ";
  return (
    Array.from({ length: 5 }, () => chars[Math.floor(rnd() * chars.length)]).join("") +
    Math.floor(1000 + rnd() * 9000) +
    chars[Math.floor(rnd() * chars.length)]
  );
}
function genUAN(): string {
  return "10" + Math.floor(10000000 + rnd() * 89999999).toString();
}

// ===== Generate Employees (50+) =====
export const EMPLOYEES: Employee[] = Array.from({ length: 54 }, (_, i) => {
  const isFemale = rnd() > 0.85;
  const first = isFemale ? pick(FIRST_F) : pick(FIRST_M);
  const last = pick(LAST);
  const name = `${first} ${last}`;
  const dept = pick(DEPARTMENTS);
  const designation = pick(DESIGNATION_BY_DEPT[dept]);
  const branch = pick(HR_BRANCHES);
  const city = BRANCH_CITY[branch] || pick(HR_CITIES);
  const employmentType: EmploymentType =
    designation === "Driver" || designation === "Helper" || designation === "Loaders"
      ? pick(["Permanent", "Contract", "Daily"] as EmploymentType[])
      : "Permanent";
  const status: EmployeeStatus =
    i % 11 === 0 ? "On Leave" : i % 17 === 0 ? "Notice" : i % 23 === 0 ? "Exited" : "Active";
  const dojDaysAgo = Math.floor(60 + rnd() * 2500);
  const ctcAnnual = CTC_BY_DESIGNATION[designation] + Math.floor(rnd() * 200000 - 100000);
  const basicMonthly = Math.round((ctcAnnual * 0.4) / 12);
  const hraMonthly = Math.round(basicMonthly * 0.4);
  const isDriver = designation === "Driver";

  // Documents - drivers need DL + Medical + PV; others need standard set
  const docs: Employee["documents"] = [];
  const docSet: DocType[] = isDriver
    ? ["Aadhaar", "PAN", "Driving Licence", "Police Verification", "Medical Fitness", "Photo", "Bank Passbook"]
    : ["Aadhaar", "PAN", "Photo", "Bank Passbook", "Education Certificate"];
  for (const t of docSet) {
    const verified = rnd() > 0.18;
    const hasExpiry = t === "Driving Licence" || t === "Medical Fitness" || t === "Police Verification";
    const expiry = hasExpiry
      ? (rnd() > 0.5 ? isoDaysAhead(Math.floor(rnd() * 540)) : isoDaysAgo(Math.floor(rnd() * 120)))
      : undefined;
    docs.push({
      type: t,
      verified,
      expiry,
      refNo: t === "Driving Licence" ? `MH${Math.floor(10 + rnd() * 89)} ${Math.floor(10000000 + rnd() * 89999999)}` : t === "PAN" ? genPAN() : t === "Aadhaar" ? genAadhaar() : undefined,
    });
  }

  return {
    id: `emp-${i + 1}`,
    empCode: `GP${String(i + 1).padStart(4, "0")}`,
    name,
    designation,
    department: dept,
    branch,
    employmentType,
    status,
    doj: isoDaysAgo(dojDaysAgo),
    phone: randomPhone(),
    email: `${first.toLowerCase()}.${last.toLowerCase()}@reanzly.in`,
    city,
    gender: isFemale ? "Female" : "Male",
    dob: isoDaysAgo(Math.floor(8000 + rnd() * 8000)),
    bloodGroup: pick(BLOOD_GROUPS),
    address: `${1 + Math.floor(rnd() * 200)}, ${pick(["Industrial Area", "Sector", "Lane", "Road"])}, ${city}`,
    emergencyContact: randomPhone(),
    esiEnrolled: ctcAnnual < 750000,
    pfEnrolled: true,
    uan: genUAN(),
    esiNo: ctcAnnual < 750000 ? `ESI/${Math.floor(10000000 + rnd() * 89999999)}` : undefined,
    aadhaar: genAadhaar(),
    pan: genPAN(),
    bankName: pick(BANKS),
    bankAccount: String(Math.floor(10000000000 + rnd() * 89999999999)),
    bankIfsc: `${pick(["HDFC", "ICIC", "SBIN", "AXIS", "PNB", "BARB"])}0000${Math.floor(rnd() * 9)}`,
    ctcAnnual,
    basicMonthly,
    hraMonthly,
    documents: docs,
    leaveBalance: {
      cl: Math.floor(rnd() * 12),
      sl: Math.floor(rnd() * 12),
      pl: Math.floor(rnd() * 15),
      ml: isFemale ? Math.floor(rnd() * 84) : 0,
    },
    reportingTo: i % 5 === 0 ? "Kuldeep Singh (Branch Mgr)" : pick(["Anil Sharma", "Vikram Deshmukh", "Sunil Iyer"]),
    managerId: designation === "Branch Manager" ? undefined : `emp-${(i % 5) + 1}`,
    buddy: dojDaysAgo < 90 ? pick(["Anil Sharma", "Vikram Deshmukh", "Sunil Iyer", "Sneha Iyer"]) : undefined,
    probationEndDate: employmentType === "Permanent" && dojDaysAgo < 240 ? isoDaysAhead(Math.max(0, 180 - dojDaysAgo)) : undefined,
    confirmDate: dojDaysAgo > 180 ? isoDaysAgo(dojDaysAgo - 180) : undefined,
    lastIncrementDate: isoDaysAgo(Math.floor(rnd() * 365)),
    lastIncrementPct: pick([5, 8, 10, 12, 15]),
    lastRating: pick([2, 3, 3, 3, 4, 4, 5] as Rating[]),
    skills: designation === "Driver" ? ["HMV License", "Trip Logging", "Route Knowledge"] : designation === "Mechanic" ? ["Diesel Engine", "Tata/Leyland Trucks", "ITI Certified"] : designation === "Accountant" ? ["Tally", "GST", "TDS", "Excel"] : ["MS Office", "Email", "Coordination"],
    assetsAssigned: designation === "Driver" ? [{ name: "Sim Card", refNo: `SIM-${1000 + i}`, issuedOn: isoDaysAgo(dojDaysAgo) }] : designation === "Branch Manager" || designation === "Fleet Executive" ? [{ name: "Laptop", refNo: `LAP-${100 + i}`, issuedOn: isoDaysAgo(dojDaysAgo) }] : undefined,
  };
});

// ===== Generate 3 months of Attendance (Monthly summaries) =====
const MONTHS_BACK = 3;
export const ATTENDANCE_SUMMARIES: MonthlyAttendanceSummary[] = (() => {
  const out: MonthlyAttendanceSummary[] = [];
  for (const emp of EMPLOYEES.filter((e) => e.status !== "Exited")) {
    for (let m = 0; m < MONTHS_BACK; m++) {
      const present = 22 + Math.floor(rnd() * 4) - Math.floor(rnd() * 2);
      const absent = Math.floor(rnd() * 3);
      const halfDay = Math.floor(rnd() * 3);
      const leave = Math.floor(rnd() * 3);
      const weekoff = 4;
      const tripLinked = emp.designation === "Driver" ? 12 + Math.floor(rnd() * 8) : 0;
      const otHours = emp.designation === "Driver" || emp.designation === "Mechanic" ? Math.floor(rnd() * 40) : Math.floor(rnd() * 8);
      const lateCount = Math.floor(rnd() * 4);
      out.push({
        empId: emp.id,
        empCode: emp.empCode,
        empName: emp.name,
        designation: emp.designation,
        present,
        absent,
        halfDay,
        leave,
        weekoff,
        tripLinked,
        otHours,
        lateCount,
      });
    }
  }
  return out;
})();

// ===== Generate Daily Attendance for current month (date × employee) =====
export const DAILY_ATTENDANCE: AttendanceRecord[] = (() => {
  const out: AttendanceRecord[] = [];
  const today = new Date().getDate();
  const days = Math.min(today, 30);
  for (const emp of EMPLOYEES.filter((e) => e.status === "Active")) {
    for (let d = 1; d <= days; d++) {
      const date = new Date();
      date.setDate(d);
      date.setMonth(new Date().getMonth());
      const dow = date.getDay();
      let mark: AttendanceMark;
      if (dow === 0) {
        mark = "W";
      } else {
        const r = rnd();
        if (r > 0.92) mark = "L";
        else if (r > 0.86) mark = "A";
        else if (r > 0.8) mark = "H";
        else if (emp.designation === "Driver" && r > 0.4) mark = "T";
        else mark = "P";
      }
      const inTime = mark === "P" || mark === "T" ? `0${6 + Math.floor(rnd() * 3)}:${String(Math.floor(rnd() * 60)).padStart(2, "0")}` : undefined;
      const outTime = mark === "P" || mark === "T" ? `${18 + Math.floor(rnd() * 3)}:${String(Math.floor(rnd() * 60)).padStart(2, "0")}` : undefined;
      const lateIn = mark === "P" && rnd() > 0.85;
      const earlyOut = mark === "P" && rnd() > 0.92;
      out.push({
        id: `att-${emp.id}-${d}`,
        empId: emp.id,
        empCode: emp.empCode,
        empName: emp.name,
        designation: emp.designation,
        date: date.toISOString().slice(0, 10),
        mark,
        inTime,
        outTime,
        lateIn,
        earlyOut,
        otHours: mark === "P" && (emp.designation === "Driver" || emp.designation === "Mechanic") ? Math.floor(rnd() * 3) : 0,
        tripId: mark === "T" ? `TRP-${Math.floor(1000 + rnd() * 9000)}` : undefined,
      });
    }
  }
  return out;
})();

// ===== Leave Requests =====
export const LEAVE_REQUESTS: LeaveRequest[] = Array.from({ length: 14 }, (_, i) => {
  const emp = pick(EMPLOYEES.filter((e) => e.status === "Active"));
  const leaveType = pick(["CL", "SL", "PL", "ML", "CO"] as LeaveType[]);
  const days = leaveType === "ML" ? 30 + Math.floor(rnd() * 60) : 1 + Math.floor(rnd() * 4);
  const from = isoDaysAhead(Math.floor(rnd() * 20));
  const to = new Date(new Date(from).getTime() + days * 86400000).toISOString();
  const statuses: LeaveStatus[] = ["Pending", "Pending", "Approved", "Approved", "Rejected"];
  const status = i < 5 ? "Pending" : statuses[i % statuses.length];
  return {
    id: `lr-${i + 1}`,
    empId: emp.id,
    empName: emp.name,
    empCode: emp.empCode,
    designation: emp.designation,
    leaveType,
    from,
    to,
    days,
    reason:
      leaveType === "SL"
        ? "Fever and body ache. Doctor advised rest."
        : leaveType === "PL"
          ? "Family function out of station."
          : leaveType === "ML"
            ? "Maternity leave as per policy."
            : leaveType === "CO"
              ? "Compensatory off for last Sunday duty."
              : "Personal urgent work.",
    approver: emp.reportingTo,
    status,
    appliedOn: isoDaysAgo(Math.floor(rnd() * 10)),
    reviewedOn: status !== "Pending" ? isoDaysAgo(Math.floor(rnd() * 5)) : undefined,
  };
});

// ===== Holiday Calendar =====
export const HOLIDAYS: Holiday[] = [
  { id: "h1", name: "Republic Day", date: "2025-01-26", type: "National", branches: HR_BRANCHES },
  { id: "h2", name: "Holi", date: "2025-03-14", type: "Religious", branches: HR_BRANCHES },
  { id: "h3", name: "Maharashtra Day", date: "2025-05-01", type: "National", branches: ["Mumbai HQ", "Pune Branch", "Nagpur Branch"] },
  { id: "h4", name: "Independence Day", date: "2025-08-15", type: "National", branches: HR_BRANCHES },
  { id: "h5", name: "Ganesh Chaturthi", date: "2025-08-27", type: "Religious", branches: ["Mumbai HQ", "Pune Branch"] },
  { id: "h6", name: "Gandhi Jayanti", date: "2025-10-02", type: "National", branches: HR_BRANCHES },
  { id: "h7", name: "Dussehra", date: "2025-10-02", type: "Religious", branches: HR_BRANCHES },
  { id: "h8", name: "Diwali", date: "2025-10-21", type: "Religious", branches: HR_BRANCHES },
  { id: "h9", name: "Christmas", date: "2025-12-25", type: "Religious", branches: HR_BRANCHES },
  { id: "h10", name: "Company Foundation Day", date: "2025-04-12", type: "Company", branches: HR_BRANCHES },
  { id: "h11", name: "Bhai Dooj (Restricted)", date: "2025-10-23", type: "Restricted", branches: HR_BRANCHES },
];

// ===== Payroll Runs (last 2 months) =====
function monthLabel(offset: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - offset);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const PAYROLL_RUNS: PayrollRun[] = [1, 2].map((offset) => {
  const month = monthLabel(offset);
  const eligibleEmployees = EMPLOYEES.filter((e) => e.status === "Active" || e.status === "On Leave");
  const totalGross = eligibleEmployees.reduce((s, e) => s + (e.ctcAnnual / 12), 0);
  const totalDeductions = totalGross * 0.16;
  return {
    id: `prun-${month}`,
    month,
    generatedOn: isoDaysAgo(offset * 30 + 5),
    approvedOn: offset === 1 ? isoDaysAgo(offset * 30 + 2) : undefined,
    disbursedOn: offset === 1 ? isoDaysAgo(offset * 30) : undefined,
    status: offset === 1 ? "Paid" : offset === 2 ? "Approved" : "Draft",
    totalGross,
    totalDeductions,
    totalNet: totalGross - totalDeductions,
    employeeCount: eligibleEmployees.length,
  };
});

// ===== Payslips for current + previous month =====
export const PAYSLIPS: Payslip[] = (() => {
  const out: Payslip[] = [];
  for (let m = 1; m <= 2; m++) {
    const month = monthLabel(m);
    const eligible = EMPLOYEES.filter((e) => e.status === "Active" || e.status === "On Leave");
    for (const emp of eligible) {
      const basic = emp.basicMonthly;
      const hra = emp.hraMonthly;
      const conveyance = 1600;
      const ot = emp.designation === "Driver" || emp.designation === "Mechanic" ? Math.floor(rnd() * 6000) : 0;
      const allowances = Math.floor(2000 + rnd() * 3000);
      const isDriver = emp.designation === "Driver";
      const tripsCount = isDriver ? 12 + Math.floor(rnd() * 10) : undefined;
      const incentiveRate = isDriver ? 250 : undefined;
      const incentive = isDriver && tripsCount ? tripsCount * (incentiveRate as number) : undefined;
      const performanceBonus = isDriver && rnd() > 0.6 ? Math.floor(rnd() * 5000) : undefined;
      const gross = basic + hra + conveyance + ot + allowances + (incentive || 0) + (performanceBonus || 0);
      const pf = emp.pfEnrolled ? Math.round(basic * 0.12) : 0;
      const esi = emp.esiEnrolled ? Math.round(gross * 0.0075) : 0;
      const pt = 200;
      const tds = emp.ctcAnnual > 800000 ? Math.floor(rnd() * 8000) : 0;
      const advance = rnd() > 0.7 ? Math.floor(rnd() * 5000) : 0;
      const otherDeductions = Math.floor(rnd() * 1000);
      const totalDeductions = pf + esi + pt + tds + advance + otherDeductions;
      const netPay = gross - totalDeductions;
      const run = PAYROLL_RUNS.find((r) => r.month === month);
      out.push({
        id: `ps-${emp.id}-${month}`,
        empId: emp.id,
        empCode: emp.empCode,
        empName: emp.name,
        designation: emp.designation,
        month,
        basic,
        hra,
        conveyance,
        ot,
        allowances,
        incentive,
        pf,
        esi,
        pt,
        tds,
        advance,
        otherDeductions,
        gross,
        totalDeductions,
        netPay,
        status: run?.status || "Draft",
        tripsCount,
        incentiveRate,
        performanceBonus,
      });
    }
  }
  return out;
})();

// ===== Compliance dashboard =====
export const COMPLIANCE_ITEMS: ComplianceItem[] = [
  { id: "c1", type: "PF Filing", month: monthLabel(1), dueDate: isoDaysAhead(5), status: "Pending" },
  { id: "c2", type: "ESI Filing", month: monthLabel(1), dueDate: isoDaysAhead(5), status: "Pending" },
  { id: "c3", type: "PT Return", month: monthLabel(1), dueDate: isoDaysAhead(15), status: "In Progress" },
  { id: "c4", type: "TDS Return", month: "Q2", dueDate: isoDaysAhead(20), status: "Pending" },
  { id: "c5", type: "Form 16", month: "FY 2024-25", dueDate: isoDaysAhead(45), status: "In Progress" },
  { id: "c6", type: "Bonus Act", month: "Annual", dueDate: isoDaysAhead(60), status: "Filed", filedOn: isoDaysAgo(2) },
  { id: "c7", type: "PF Filing", month: monthLabel(2), dueDate: isoDaysAgo(25), status: "Filed", filedOn: isoDaysAgo(28) },
  { id: "c8", type: "ESI Filing", month: monthLabel(2), dueDate: isoDaysAgo(25), status: "Filed", filedOn: isoDaysAgo(28) },
];

// ===== Recruitment positions =====
const CANDIDATE_NAMES = [
  "Sachin Patil", "Ramesh Kumar", "Imran Khan", "Lokesh Reddy", "Vivek Joshi",
  "Ankit Agarwal", "Saurabh Gupta", "Mohit Singh", "Nikhil Desai", "Rahul Verma",
  "Anand Rao", "Pankaj Yadav", "Gaurav Mishra", "Tushar Pandey", "Siddharth Nair",
  "Deepak Menon", "Santosh Pillai", "Vivek Das", "Suresh Bose", "Pratik Banerjee",
];

export const POSITIONS: Position[] = [
  {
    id: "pos-1",
    positionId: "REQ-001",
    role: "Driver",
    branch: "Mumbai HQ",
    openings: 4,
    budget: 480000,
    hiringManager: "Kuldeep Singh",
    status: "Open",
    postedOn: isoDaysAgo(15),
    description: "HMV license with 3+ years experience. Mumbai-Delhi lane. ESI/PF enrolled.",
    candidates: Array.from({ length: 8 }, (_, i) => ({
      id: `cand-1-${i + 1}`,
      name: pick(CANDIDATE_NAMES),
      phone: randomPhone(),
      email: `candidate${i + 1}@mail.com`,
      experience: 2 + Math.floor(rnd() * 8),
      currentCTC: 300000 + Math.floor(rnd() * 200000),
      expectedCTC: 400000 + Math.floor(rnd() * 200000),
      stage: pick(["Applied", "Screening", "Interview", "Offer", "Joined", "Rejected"] as CandidateStage[]),
      appliedOn: isoDaysAgo(Math.floor(rnd() * 14)),
      rating: Math.floor(rnd() * 6),
      source: pick(["Referral", "Naukri", "Walk-in", "LinkedIn"]),
      notes: i % 2 === 0 ? "HMV license valid. Local candidate." : "Experienced in container movement.",
    })),
  },
  {
    id: "pos-2",
    positionId: "REQ-002",
    role: "Mechanic",
    branch: "Pune Branch",
    openings: 2,
    budget: 420000,
    hiringManager: "Anil Sharma",
    status: "Open",
    postedOn: isoDaysAgo(8),
    description: "Diesel mechanic for truck fleet. ITI certificate preferred.",
    candidates: Array.from({ length: 5 }, (_, i) => ({
      id: `cand-2-${i + 1}`,
      name: pick(CANDIDATE_NAMES),
      phone: randomPhone(),
      email: `mech${i + 1}@mail.com`,
      experience: 3 + Math.floor(rnd() * 10),
      currentCTC: 280000 + Math.floor(rnd() * 150000),
      expectedCTC: 380000 + Math.floor(rnd() * 120000),
      stage: pick(["Applied", "Screening", "Interview", "Offer", "Rejected"] as CandidateStage[]),
      appliedOn: isoDaysAgo(Math.floor(rnd() * 7)),
      rating: Math.floor(rnd() * 6),
      source: pick(["Referral", "Naukri", "Walk-in"]),
      notes: "ITI certified. Worked on Tata/Leyland trucks.",
    })),
  },
  {
    id: "pos-3",
    positionId: "REQ-003",
    role: "Dispatcher",
    branch: "Delhi Branch",
    openings: 1,
    budget: 540000,
    hiringManager: "Vikram Deshmukh",
    status: "On Hold",
    postedOn: isoDaysAgo(22),
    description: "Trip planning + driver coordination. Hindi + English. Logistics experience.",
    candidates: Array.from({ length: 4 }, (_, i) => ({
      id: `cand-3-${i + 1}`,
      name: pick(CANDIDATE_NAMES),
      phone: randomPhone(),
      email: `disp${i + 1}@mail.com`,
      experience: 2 + Math.floor(rnd() * 6),
      currentCTC: 360000 + Math.floor(rnd() * 180000),
      expectedCTC: 480000 + Math.floor(rnd() * 100000),
      stage: pick(["Applied", "Screening", "Rejected"] as CandidateStage[]),
      appliedOn: isoDaysAgo(Math.floor(rnd() * 20)),
      rating: Math.floor(rnd() * 6),
      source: pick(["Naukri", "LinkedIn"]),
      notes: "On hold due to budget approval pending.",
    })),
  },
  {
    id: "pos-4",
    positionId: "REQ-004",
    role: "Helper",
    branch: "Bengaluru Branch",
    openings: 6,
    budget: 240000,
    hiringManager: "Sunil Iyer",
    status: "Open",
    postedOn: isoDaysAgo(5),
    description: "Loading/unloading at warehouse. Daily wage → permanent conversion.",
    candidates: Array.from({ length: 7 }, (_, i) => ({
      id: `cand-4-${i + 1}`,
      name: pick(CANDIDATE_NAMES),
      phone: randomPhone(),
      email: `helper${i + 1}@mail.com`,
      experience: 1 + Math.floor(rnd() * 4),
      currentCTC: 150000 + Math.floor(rnd() * 100000),
      expectedCTC: 220000 + Math.floor(rnd() * 80000),
      stage: pick(["Applied", "Screening", "Interview", "Joined"] as CandidateStage[]),
      appliedOn: isoDaysAgo(Math.floor(rnd() * 5)),
      rating: Math.floor(rnd() * 6),
      source: pick(["Walk-in", "Referral"]),
      notes: "Local Bengaluru candidates preferred.",
    })),
  },
  {
    id: "pos-5",
    positionId: "REQ-005",
    role: "Accountant",
    branch: "Mumbai HQ",
    openings: 1,
    budget: 600000,
    hiringManager: "Kuldeep Singh",
    status: "Closed",
    postedOn: isoDaysAgo(45),
    description: "GST + TDS + vendor reconciliation. Tally/Excel proficiency.",
    candidates: Array.from({ length: 6 }, (_, i) => ({
      id: `cand-5-${i + 1}`,
      name: pick(CANDIDATE_NAMES),
      phone: randomPhone(),
      email: `acc${i + 1}@mail.com`,
      experience: 3 + Math.floor(rnd() * 8),
      currentCTC: 450000 + Math.floor(rnd() * 200000),
      expectedCTC: 580000 + Math.floor(rnd() * 120000),
      stage: i === 0 ? "Joined" : pick(["Rejected"] as CandidateStage[]),
      appliedOn: isoDaysAgo(Math.floor(rnd() * 40)),
      rating: i === 0 ? 5 : Math.floor(rnd() * 4),
      source: pick(["Naukri", "Referral", "LinkedIn"]),
      notes: i === 0 ? "Offer accepted. Joined last week." : "Not a fit.",
    })),
  },
];

// ============================================================
// HR Enhancement - Task 6: Performance, Onboarding, Exit, etc.
// ============================================================

// ===== Performance Review =====
export interface Kra {
  id: string;
  name: string;
  weight: number; // percentage
  target: string;
  measurement: string;
}

export interface PerformanceReview {
  id: string;
  empId: string;
  empCode: string;
  empName: string;
  designation: Designation;
  department: Department;
  cycle: ReviewCycle;
  period: string; // e.g. "2024-Q1"
  status: ReviewStatus;
  selfRating?: Rating;
  managerRating?: Rating;
  finalRating?: Rating;
  selfComments?: string;
  managerComments?: string;
  hrComments?: string;
  initiatedOn: string;
  selfSubmittedOn?: string;
  managerReviewedOn?: string;
  hrReviewedOn?: string;
  kras: { name: string; weight: number; target: string; achievement: number; score: Rating }[];
  goals: { name: string; due: string; status: "On Track" | "At Risk" | "Off Track" | "Completed" }[];
}

export interface PIP {
  id: string;
  empId: string;
  empCode: string;
  empName: string;
  designation: Designation;
  reason: string;
  startDate: string;
  endDate: string;
  reviewCycle: "30d" | "60d" | "90d";
  status: "Active" | "Completed" | "Closed" | "Cancelled";
  milestones: { name: string; due: string; completed: boolean }[];
  mentor: string;
  outcome?: "Improved" | "No Change" | "Extended" | "Exit";
}

export const KRA_TEMPLATES: Record<Designation, Kra[]> = {
  Driver: [
    { id: "k1", name: "Trip Completion Rate", weight: 30, target: "≥ 95% on-time delivery", measurement: "Trips completed / assigned" },
    { id: "k2", name: "Fuel Efficiency", weight: 20, target: "≤ 4.5 kmpl highway", measurement: "kmpl averaged monthly" },
    { id: "k3", name: "Safety Incidents", weight: 25, target: "Zero accidents/quarter", measurement: "Incident count" },
    { id: "k4", name: "Vehicle Care", weight: 15, target: "Daily check-list 100%", measurement: "Checklist completion" },
    { id: "k5", name: "POD Submission", weight: 10, target: "< 24h delivery", measurement: "Avg submission time" },
  ],
  Helper: [
    { id: "k1", name: "Loading/Unloading", weight: 35, target: "≤ 25 min per truck", measurement: "Avg turnaround" },
    { id: "k2", name: "Attendance", weight: 30, target: "≥ 95% present", measurement: "Present days" },
    { id: "k3", name: "Safety Compliance", weight: 25, target: "Zero violations", measurement: "Violation count" },
    { id: "k4", name: "Driver Feedback", weight: 10, target: "≥ 4/5 rating", measurement: "Driver survey" },
  ],
  Cleaner: [
    { id: "k1", name: "Vehicle Cleanliness", weight: 40, target: "Daily wash", measurement: "Inspection score" },
    { id: "k2", name: "Attendance", weight: 30, target: "≥ 95% present", measurement: "Present days" },
    { id: "k3", name: "Equipment Care", weight: 30, target: "Weekly inventory", measurement: "Loss/damage count" },
  ],
  Mechanic: [
    { id: "k1", name: "Truck Turnaround", weight: 30, target: "≤ 4h for minor service", measurement: "Avg repair time" },
    { id: "k2", name: "Repeat Repairs", weight: 25, target: "< 5% repeat", measurement: "Repeat repair rate" },
    { id: "k3", name: "Safety Compliance", weight: 25, target: "Zero LOTO violations", measurement: "Audit count" },
    { id: "k4", name: "Parts Inventory Accuracy", weight: 20, target: "≥ 98%", measurement: "Cycle count variance" },
  ],
  Dispatcher: [
    { id: "k1", name: "Trip Assignment Time", weight: 30, target: "< 30 min from LR", measurement: "Avg assignment time" },
    { id: "k2", name: "Driver Utilisation", weight: 25, target: "≥ 80% on-duty", measurement: "Active drivers / total" },
    { id: "k3", name: "Customer Response", weight: 20, target: "< 5 min ack", measurement: "Avg response time" },
    { id: "k4", name: "Error Rate", weight: 25, target: "< 2% mis-routing", measurement: "Error count" },
  ],
  Accountant: [
    { id: "k1", name: "GST Filing", weight: 25, target: "100% on-time", measurement: "Filing delay count" },
    { id: "k2", name: "TDS Compliance", weight: 25, target: "Zero late filings", measurement: "Late filings" },
    { id: "k3", name: "Reconciliation", weight: 25, target: "Monthly close < 5 days", measurement: "Close cycle days" },
    { id: "k4", name: "Vendor Payments", weight: 25, target: "On-time payment ≥ 95%", measurement: "On-time rate" },
  ],
  "Branch Manager": [
    { id: "k1", name: "Branch Revenue", weight: 30, target: "+15% YoY", measurement: "Revenue growth" },
    { id: "k2", name: "Margin %", weight: 20, target: "≥ 12% EBITDA", measurement: "Operating margin" },
    { id: "k3", name: "Customer Retention", weight: 20, target: "≥ 90%", measurement: "Retained accounts" },
    { id: "k4", name: "Attrition Control", weight: 15, target: "< 12% annual", measurement: "Attrition rate" },
    { id: "k5", name: "Safety & Compliance", weight: 15, target: "Zero major incidents", measurement: "Incident count" },
  ],
  "Fleet Executive": [
    { id: "k1", name: "Fleet Utilisation", weight: 30, target: "≥ 85%", measurement: "Active truck days" },
    { id: "k2", name: "Maintenance SLA", weight: 25, target: "< 4h response", measurement: "Avg response time" },
    { id: "k3", name: "Vehicle Downtime", weight: 25, target: "< 5% monthly", measurement: "Off-road days" },
    { id: "k4", name: "Insurance & Permits", weight: 20, target: "100% renewed on time", measurement: "Lapsed count" },
  ],
  "Fleet Supervisor": [
    { id: "k1", name: "Driver Performance", weight: 30, target: "Avg rating ≥ 4/5", measurement: "Quarterly rating" },
    { id: "k2", name: "On-time Trip Start", weight: 25, target: "≥ 90%", measurement: "On-time departures" },
    { id: "k3", name: "Vehicle Health Score", weight: 25, target: "≥ 85/100", measurement: "Inspection score" },
    { id: "k4", name: "Document Compliance", weight: 20, target: "100% DL/RC valid", measurement: "Expiry gaps" },
  ],
  "Operations Executive": [
    { id: "k1", name: "Order Processing", weight: 30, target: "< 2h per LR", measurement: "Avg processing time" },
    { id: "k2", name: "Customer Response", weight: 25, target: "< 30 min ack", measurement: "Response time" },
    { id: "k3", name: "POD Collection", weight: 25, target: "≥ 95% within 48h", measurement: "POD collection rate" },
    { id: "k4", name: "Exception Resolution", weight: 20, target: "< 4h TAT", measurement: "Avg resolution time" },
  ],
  "HR Executive": [
    { id: "k1", name: "Joining TAT", weight: 25, target: "< 7 days offer-to-onboard", measurement: "Avg TAT" },
    { id: "k2", name: "Compliance Filing", weight: 25, target: "100% on-time PF/ESI", measurement: "Late filings" },
    { id: "k3", name: "Payroll Accuracy", weight: 25, target: "Zero re-runs", measurement: "Correction count" },
    { id: "k4", name: "Attrition %", weight: 25, target: "< 12%", measurement: "Annualised attrition" },
  ],
  "Warehouse Lead": [
    { id: "k1", name: "Inventory Accuracy", weight: 30, target: "≥ 99%", measurement: "Cycle count variance" },
    { id: "k2", name: "Inbound/Outbound TAT", weight: 25, target: "≤ 4h per truck", measurement: "Avg TAT" },
    { id: "k3", name: "Safety Incidents", weight: 25, target: "Zero", measurement: "Incident count" },
    { id: "k4", name: "Space Utilisation", weight: 20, target: "≥ 75%", measurement: "Storage used" },
  ],
  Loaders: [
    { id: "k1", name: "Loading Time", weight: 40, target: "≤ 25 min per truck", measurement: "Avg loading time" },
    { id: "k2", name: "Attendance", weight: 30, target: "≥ 95% present", measurement: "Present days" },
    { id: "k3", name: "Damage Rate", weight: 30, target: "< 0.5%", measurement: "Damage incidents" },
  ],
};

const REVIEW_COMMENTS_SELF = [
  "Achieved all KRA targets this cycle. Improved fuel efficiency by 8%.",
  "Met most targets, fell short on safety incident count due to one mishap.",
  "Exceeded customer satisfaction metrics. Steady improvement quarter over quarter.",
  "Trip completion improved. Need to work on documentation turnaround.",
  "Strong on operational metrics. Need to develop leadership for next role.",
];

const REVIEW_COMMENTS_MGR = [
  "Consistent performer. Ready for next role in 6-12 months.",
  "Solid execution. Needs to mentor junior team members.",
  "Improvement visible since last review. Continue current trajectory.",
  "Missed SLA on few occasions but overall good. Recommend training.",
  "Top performer. Suggest fast-track promotion.",
];

export const PERFORMANCE_REVIEWS: PerformanceReview[] = (() => {
  const out: PerformanceReview[] = [];
  const eligible = EMPLOYEES.filter((e) => e.status !== "Exited" && e.status !== "Notice");
  for (const emp of eligible) {
    const kras = (KRA_TEMPLATES[emp.designation] || KRA_TEMPLATES.Driver).map((k, i) => ({
      name: k.name,
      weight: k.weight,
      target: k.target,
      achievement: 60 + Math.floor(rnd() * 40),
      score: pick([2, 3, 3, 3, 4, 4, 5] as Rating[]),
    }));
    const statuses: ReviewStatus[] = ["Draft", "Self-Review", "Manager Review", "HR Review", "Completed"];
    const statusIdx = Math.floor(rnd() * statuses.length);
    const status = statuses[statusIdx];
    out.push({
      id: `pr-${emp.id}-q1`,
      empId: emp.id,
      empCode: emp.empCode,
      empName: emp.name,
      designation: emp.designation,
      department: emp.department,
      cycle: "Q1",
      period: `${new Date().getFullYear()}-Q1`,
      status,
      selfRating: statusIdx >= 1 ? pick([2, 3, 3, 4, 4, 5] as Rating[]) : undefined,
      managerRating: statusIdx >= 2 ? pick([2, 3, 3, 4, 4, 5] as Rating[]) : undefined,
      finalRating: statusIdx >= 4 ? pick([2, 3, 3, 4, 4, 5] as Rating[]) : undefined,
      selfComments: statusIdx >= 1 ? pick(REVIEW_COMMENTS_SELF) : undefined,
      managerComments: statusIdx >= 2 ? pick(REVIEW_COMMENTS_MGR) : undefined,
      hrComments: statusIdx >= 3 ? "Review aligned with company guidelines. Approved." : undefined,
      initiatedOn: isoDaysAgo(30 + Math.floor(rnd() * 20)),
      selfSubmittedOn: statusIdx >= 1 ? isoDaysAgo(25 - Math.floor(rnd() * 10)) : undefined,
      managerReviewedOn: statusIdx >= 2 ? isoDaysAgo(15 - Math.floor(rnd() * 8)) : undefined,
      hrReviewedOn: statusIdx >= 3 ? isoDaysAgo(7 - Math.floor(rnd() * 5)) : undefined,
      kras,
      goals: [
        { name: "Reduce trip delays by 10%", due: isoDaysAhead(60), status: pick(["On Track", "At Risk", "Completed", "Off Track"]) },
        { name: "Complete safety certification", due: isoDaysAhead(30), status: pick(["On Track", "Completed"]) },
        { name: "Mentor 2 junior team members", due: isoDaysAhead(90), status: pick(["On Track", "At Risk"]) },
      ],
    });
  }
  return out;
})();

export const PIPS: PIP[] = (() => {
  const candidates = EMPLOYEES.filter((e) => e.status === "Active" && (e.lastRating === 1 || e.lastRating === 2)).slice(0, 3);
  return candidates.map((emp, i) => ({
    id: `pip-${i + 1}`,
    empId: emp.id,
    empCode: emp.empCode,
    empName: emp.name,
    designation: emp.designation,
    reason: "Below target on KRAs for 2 consecutive quarters. Last rating: " + emp.lastRating + "/5.",
    startDate: isoDaysAgo(30 + Math.floor(rnd() * 20)),
    endDate: isoDaysAhead(60 + Math.floor(rnd() * 30)),
    reviewCycle: "60d",
    status: "Active",
    milestones: [
      { name: "Daily standup with mentor", due: isoDaysAgo(20), completed: true },
      { name: "Complete safety refresher", due: isoDaysAgo(10), completed: true },
      { name: "Achieve 90% trip completion", due: isoDaysAhead(15), completed: false },
      { name: "Final review", due: isoDaysAhead(50), completed: false },
    ],
    mentor: pick(["Anil Sharma", "Vikram Deshmukh", "Sunil Iyer"]),
  }));
})();

// ===== Onboarding =====
export interface OnboardingTask {
  id: string;
  category: "Documentation" | "Orientation" | "Setup" | "Training" | "Social" | "Statutory";
  name: string;
  owner: string; // HR / IT / Reporting Manager / Buddy
  status: OnboardingStatus;
  dueOffsetDays: number; // days from DOJ
  completedOn?: string;
  notes?: string;
}

export interface OnboardingPlan {
  id: string;
  empId: string;
  empCode: string;
  empName: string;
  designation: Designation;
  branch: string;
  doj: string;
  buddy: string;
  status: "Pre-boarding" | "In Progress" | "Completed" | "Delayed";
  progress: number; // 0-100
  tasks: OnboardingTask[];
  inductionSchedule: { day: number; title: string; time: string }[];
}

export const ONBOARDING_TASK_TEMPLATE: Omit<OnboardingTask, "id" | "status" | "completedOn">[] = [
  { category: "Documentation", name: "Collect Aadhaar + PAN copies", owner: "HR", dueOffsetDays: 0 },
  { category: "Documentation", name: "Verify Driving Licence (if driver)", owner: "HR", dueOffsetDays: 0 },
  { category: "Documentation", name: "Collect education certificates", owner: "HR", dueOffsetDays: 1 },
  { category: "Documentation", name: "Previous employment relieving letter", owner: "HR", dueOffsetDays: 1 },
  { category: "Documentation", name: "Bank account details + cancelled cheque", owner: "HR", dueOffsetDays: 1 },
  { category: "Documentation", name: "Photo for ID card", owner: "HR", dueOffsetDays: 0 },
  { category: "Setup", name: "Create official email", owner: "IT", dueOffsetDays: 0 },
  { category: "Setup", name: "Issue ID card + uniform", owner: "Admin", dueOffsetDays: 1 },
  { category: "Setup", name: "ERP access setup", owner: "IT", dueOffsetDays: 2 },
  { category: "Setup", name: "Sim card + mobile (if driver)", owner: "IT", dueOffsetDays: 1 },
  { category: "Statutory", name: "PF/ESI enrollment", owner: "HR", dueOffsetDays: 3 },
  { category: "Statutory", name: "Police verification (if driver)", owner: "HR", dueOffsetDays: 7 },
  { category: "Orientation", name: "Company induction session", owner: "HR", dueOffsetDays: 1 },
  { category: "Orientation", name: "HR policies walkthrough", owner: "HR", dueOffsetDays: 2 },
  { category: "Orientation", name: "Branch tour + introductions", owner: "Buddy", dueOffsetDays: 0 },
  { category: "Training", name: "Safety training module", owner: "Safety", dueOffsetDays: 3 },
  { category: "Training", name: "ERP / system hands-on", owner: "IT", dueOffsetDays: 5 },
  { category: "Training", name: "On-the-job shadowing", owner: "Reporting Manager", dueOffsetDays: 7 },
  { category: "Social", name: "Coffee with buddy", owner: "Buddy", dueOffsetDays: 1 },
  { category: "Social", name: "Team lunch with department", owner: "Reporting Manager", dueOffsetDays: 5 },
];

export const ONBOARDING_PLANS: OnboardingPlan[] = (() => {
  // Take employees who joined in last 90 days + 2 mock new joiners
  const recent = EMPLOYEES.filter((e) => {
    const dojDays = (Date.now() - new Date(e.doj).getTime()) / 86400000;
    return dojDays < 90 && e.status === "Active";
  }).slice(0, 6);
  return recent.map((emp, i) => {
    const dojDays = Math.floor((Date.now() - new Date(emp.doj).getTime()) / 86400000);
    const tasks: OnboardingTask[] = ONBOARDING_TASK_TEMPLATE.map((t, idx) => {
      const dueDay = dojDays - t.dueOffsetDays;
      const completed = dueDay > 0 && rnd() > 0.15;
      const overdue = dueDay > 0 && !completed;
      const status: OnboardingStatus = completed ? "Completed" : overdue ? "Overdue" : dueDay > -3 ? "In Progress" : "Pending";
      return {
        id: `ob-task-${emp.id}-${idx}`,
        ...t,
        status,
        completedOn: completed ? isoDaysAgo(Math.floor(rnd() * Math.max(1, dueDay))) : undefined,
      };
    });
    const done = tasks.filter((t) => t.status === "Completed").length;
    const pct = Math.round((done / tasks.length) * 100);
    return {
      id: `ob-${emp.id}`,
      empId: emp.id,
      empCode: emp.empCode,
      empName: emp.name,
      designation: emp.designation,
      branch: emp.branch,
      doj: emp.doj,
      buddy: emp.buddy || pick(["Anil Sharma", "Sneha Iyer", "Vikram Deshmukh"]),
      status: pct === 100 ? "Completed" : pct > 50 ? "In Progress" : dojDays > 14 ? "Delayed" : "Pre-boarding",
      progress: pct,
      tasks,
      inductionSchedule: [
        { day: 1, title: "Welcome + HR induction", time: "10:00 - 11:30" },
        { day: 1, title: "Branch tour + team intro", time: "12:00 - 13:00" },
        { day: 2, title: "IT setup + ERP walk-through", time: "10:00 - 12:00" },
        { day: 2, title: "Safety training", time: "14:00 - 16:00" },
        { day: 3, title: "Buddy pairing + on-job shadow", time: "10:00 - 17:00" },
      ],
    };
    void i;
  });
})();

// ===== Exit Management =====
export interface ExitRequest {
  id: string;
  empId: string;
  empCode: string;
  empName: string;
  designation: Designation;
  branch: string;
  doj: string;
  resignationDate: string;
  lastWorkingDay: string;
  reason: string;
  reasonCategory: "Better Opportunity" | "Personal" | "Health" | "Relocation" | "Career Growth" | "Compensation" | "Work Environment" | "Other";
  status: ExitStatus;
  managerApprovedOn?: string;
  hrApprovedOn?: string;
  interviewScheduled?: string;
  interviewCompleted?: boolean;
  exitInterviewNotes?: string;
  noDues: { item: string; owner: string; cleared: boolean; clearedOn?: string }[];
  fnfAmount?: number;
  fnfSettledOn?: string;
  assetsReturned: { name: string; refNo: string; returned: boolean }[];
  rehireEligible?: boolean;
}

export const EXIT_REQUESTS: ExitRequest[] = (() => {
  const exiting = EMPLOYEES.filter((e) => e.status === "Notice" || e.status === "Exited");
  const reasons: ExitRequest["reasonCategory"][] = ["Better Opportunity", "Personal", "Health", "Relocation", "Career Growth", "Compensation", "Work Environment"];
  const reasonTexts: Record<string, string> = {
    "Better Opportunity": "Got better package + role at competitor.",
    "Personal": "Family commitments require relocation to home town.",
    "Health": "Doctor advised reduced workload; pursuing less stressful role.",
    "Relocation": "Moving to different city due to spouse transfer.",
    "Career Growth": "Want to move into larger fleet operations role.",
    "Compensation": "Salary growth stagnant; seeking 25%+ increment.",
    "Work Environment": "Shift timing no longer feasible.",
  };
  return exiting.slice(0, 6).map((emp, i) => {
    const submittedDaysAgo = Math.floor(rnd() * 30);
    const noticeDays = 30;
    const lastWorkingDay = isoDaysAhead(Math.max(0, noticeDays - submittedDaysAgo));
    const statuses: ExitStatus[] = [
      "Resignation Submitted",
      "Manager Reviewed",
      "HR Reviewed",
      "Notice Period",
      "No-Dues Pending",
      "No-Dues Cleared",
      "F&F Pending",
      "F&F Settled",
      "Exited",
    ];
    const statusIdx = Math.min(statuses.length - 1, Math.floor(rnd() * 8));
    const status = emp.status === "Exited" ? "Exited" : statuses[statusIdx];
    const reasonCat = pick(reasons);
    return {
      id: `ex-${i + 1}`,
      empId: emp.id,
      empCode: emp.empCode,
      empName: emp.name,
      designation: emp.designation,
      branch: emp.branch,
      doj: emp.doj,
      resignationDate: isoDaysAgo(submittedDaysAgo),
      lastWorkingDay,
      reason: reasonTexts[reasonCat],
      reasonCategory: reasonCat,
      status,
      managerApprovedOn: statusIdx >= 1 ? isoDaysAgo(submittedDaysAgo - 2) : undefined,
      hrApprovedOn: statusIdx >= 2 ? isoDaysAgo(submittedDaysAgo - 5) : undefined,
      interviewScheduled: statusIdx >= 3 ? isoDaysAhead(Math.floor(rnd() * 10)) : undefined,
      interviewCompleted: statusIdx >= 6,
      exitInterviewNotes: statusIdx >= 6 ? "Cited better compensation and growth. Open to re-hire if pay parity improves." : undefined,
      noDues: [
        { item: "Laptop / Device return", owner: "IT", cleared: statusIdx >= 5, clearedOn: statusIdx >= 5 ? isoDaysAgo(2) : undefined },
        { item: "Sim card / Mobile", owner: "IT", cleared: statusIdx >= 5, clearedOn: statusIdx >= 5 ? isoDaysAgo(2) : undefined },
        { item: "ID card + Uniform", owner: "Admin", cleared: statusIdx >= 5, clearedOn: statusIdx >= 5 ? isoDaysAgo(2) : undefined },
        { item: "Outstanding dues / Advance", owner: "Finance", cleared: statusIdx >= 5, clearedOn: statusIdx >= 5 ? isoDaysAgo(1) : undefined },
        { item: "Documents handover", owner: "Reporting Manager", cleared: statusIdx >= 5, clearedOn: statusIdx >= 5 ? isoDaysAgo(1) : undefined },
      ],
      fnfAmount: statusIdx >= 6 ? 25000 + Math.floor(rnd() * 80000) : undefined,
      fnfSettledOn: statusIdx >= 7 ? isoDaysAgo(2) : undefined,
      assetsReturned: (emp.assetsAssigned || []).map((a) => ({ name: a.name, refNo: a.refNo, returned: statusIdx >= 5 })),
      rehireEligible: statusIdx >= 6 ? rnd() > 0.4 : undefined,
    };
  });
})();

// ===== Attendance Regularization Requests =====
export interface AttendanceReg {
  id: string;
  empId: string;
  empCode: string;
  empName: string;
  designation: Designation;
  date: string;
  type: RegType;
  reason: string;
  status: RegStatus;
  appliedOn: string;
  reviewedOn?: string;
  reviewedBy?: string;
  reviewerComments?: string;
}

export const ATTENDANCE_REGS: AttendanceReg[] = Array.from({ length: 8 }, (_, i) => {
  const emp = pick(EMPLOYEES.filter((e) => e.status === "Active"));
  const types: RegType[] = ["Late Punch", "Missed Punch", "Wrong Shift", "Half-day to Full", "Full to Half-day"];
  const t = pick(types);
  const statuses: RegStatus[] = ["Pending", "Pending", "Approved", "Rejected"];
  const status = statuses[i % statuses.length];
  return {
    id: `reg-${i + 1}`,
    empId: emp.id,
    empCode: emp.empCode,
    empName: emp.name,
    designation: emp.designation,
    date: isoDaysAgo(Math.floor(rnd() * 7)),
    type: t,
    reason:
      t === "Late Punch"
        ? "Reached late due to train delay on Central line."
        : t === "Missed Punch"
          ? "Biometric device was down; punch missed."
          : t === "Wrong Shift"
            ? "Was assigned morning shift but worked night due to trip."
            : "Half-day marked but worked full day - completed trip load/unload.",
    status,
    appliedOn: isoDaysAgo(Math.floor(rnd() * 5)),
    reviewedOn: status !== "Pending" ? isoDaysAgo(Math.floor(rnd() * 3)) : undefined,
    reviewedBy: status !== "Pending" ? emp.reportingTo : undefined,
    reviewerComments: status === "Approved" ? "Approved - verified with shift supervisor." : status === "Rejected" ? "Rejected - insufficient justification." : undefined,
  };
});

// ===== Job Postings (extends Positions) =====
export interface Interview {
  id: string;
  positionId: string;
  candidateId: string;
  candidateName: string;
  role: Designation;
  round: "Telephonic" | "Technical" | "HR" | "Final";
  scheduledOn: string;
  duration: number; // minutes
  interviewer: string;
  status: InterviewStage;
  feedback?: string;
  rating?: Rating;
}

export const INTERVIEWS: Interview[] = (() => {
  const out: Interview[] = [];
  const interviewers = ["Kuldeep Singh", "Anil Sharma", "Vikram Deshmukh", "Sunil Iyer", "Sneha Iyer"];
  const feedbackTexts = [
    "Strong technical fit. Recommend next round.",
    "Good communication. Needs more domain exposure.",
    "Excellent candidate. Move to offer.",
    "Below expectations on safety knowledge.",
    "Average fit. Hold for backup.",
  ];
  for (const pos of POSITIONS) {
    const inPipeline = pos.candidates.filter((c) => c.stage === "Screening" || c.stage === "Interview");
    for (const c of inPipeline.slice(0, 2)) {
      const isCompleted = c.stage === "Interview";
      out.push({
        id: `iv-${pos.id}-${c.id}`,
        positionId: pos.id,
        candidateId: c.id,
        candidateName: c.name,
        role: pos.role,
        round: pick(["Telephonic", "Technical", "HR"] as Interview["round"][]),
        scheduledOn: isCompleted ? isoDaysAgo(Math.floor(rnd() * 5)) : isoDaysAhead(Math.floor(rnd() * 7)),
        duration: pick([30, 45, 60]),
        interviewer: pick(interviewers),
        status: isCompleted ? "Completed" : "Scheduled",
        feedback: isCompleted ? pick(feedbackTexts) : undefined,
        rating: isCompleted ? pick([3, 3, 4, 4, 5] as Rating[]) : undefined,
      });
    }
  }
  return out;
})();

export interface OfferLetter {
  id: string;
  positionId: string;
  candidateId: string;
  candidateName: string;
  role: Designation;
  branch: string;
  offeredCTC: number;
  joiningDate: string;
  status: OfferStatus;
  issuedOn: string;
  acceptedOn?: string;
  declinedOn?: string;
  declinedReason?: string;
}

export const OFFER_LETTERS: OfferLetter[] = (() => {
  const out: OfferLetter[] = [];
  for (const pos of POSITIONS) {
    const offered = pos.candidates.filter((c) => c.stage === "Offer" || c.stage === "Joined");
    for (const c of offered) {
      const status: OfferStatus = c.stage === "Joined" ? "Accepted" : pick(["Sent", "Accepted", "Declined"] as OfferStatus[]);
      out.push({
        id: `off-${pos.id}-${c.id}`,
        positionId: pos.id,
        candidateId: c.id,
        candidateName: c.name,
        role: pos.role,
        branch: pos.branch,
        offeredCTC: c.expectedCTC - Math.floor(rnd() * 50000),
        joiningDate: isoDaysAhead(Math.floor(rnd() * 30)),
        status,
        issuedOn: isoDaysAgo(Math.floor(rnd() * 14)),
        acceptedOn: status === "Accepted" ? isoDaysAgo(Math.floor(rnd() * 7)) : undefined,
        declinedOn: status === "Declined" ? isoDaysAgo(Math.floor(rnd() * 5)) : undefined,
        declinedReason: status === "Declined" ? "Got better offer with higher CTC." : undefined,
      });
    }
  }
  return out;
})();

// ===== Document Categories =====
export const DOC_CATEGORIES: Record<DocType, DocCategory> = {
  Aadhaar: "KYC",
  PAN: "KYC",
  "Driving Licence": "Legal",
  RC: "Legal",
  "Police Verification": "Legal",
  "Medical Fitness": "Health",
  "Education Certificate": "Education",
  "Previous Employment": "Employment",
  "Bank Passbook": "KYC",
  Photo: "KYC",
  "ESI Card": "Statutory",
  "PF Nomination": "Statutory",
};

export const DOC_CATEGORY_LIST: DocCategory[] = ["KYC", "Education", "Employment", "Health", "Legal", "Statutory", "Asset"];

// ===== Document Requests =====
export interface DocumentRequest {
  id: string;
  empId: string;
  empCode: string;
  empName: string;
  docType: DocType;
  reason: string;
  requestedOn: string;
  dueDate: string;
  status: "Pending" | "Received" | "Overdue" | "Cancelled";
  receivedOn?: string;
}

export const DOC_REQUESTS: DocumentRequest[] = Array.from({ length: 6 }, (_, i) => {
  const emp = pick(EMPLOYEES.filter((e) => e.status === "Active"));
  const types: DocType[] = ["Aadhaar", "PAN", "Driving Licence", "Medical Fitness", "Education Certificate", "Bank Passbook"];
  return {
    id: `dr-${i + 1}`,
    empId: emp.id,
    empCode: emp.empCode,
    empName: emp.name,
    docType: pick(types),
    reason: "Annual KYC re-verification required.",
    requestedOn: isoDaysAgo(5 + Math.floor(rnd() * 10)),
    dueDate: isoDaysAhead(Math.floor(rnd() * 14)),
    status: i < 2 ? "Pending" : i === 2 ? "Overdue" : "Received",
    receivedOn: i >= 3 ? isoDaysAgo(Math.floor(rnd() * 5)) : undefined,
  };
});

// ===== Audit Log =====
export interface AuditEntry {
  id: string;
  action: AuditAction;
  entity: string;
  entityId: string;
  description: string;
  user: string;
  timestamp: string;
  metadata?: Record<string, string>;
}

export const AUDIT_LOG: AuditEntry[] = [
  { id: "a1", action: "create", entity: "Employee", entityId: "GP0054", description: "Added new employee record", user: "hr@reanzly.in", timestamp: isoDaysAgo(2) },
  { id: "a2", action: "approve", entity: "LeaveRequest", entityId: "LR-0012", description: "Approved casual leave for 2 days", user: "kuldeep@reanzly.in", timestamp: isoDaysAgo(1) },
  { id: "a3", action: "status_change", entity: "PayrollRun", entityId: "PRUN-2024-10", description: "Payroll run approved for October 2024", user: "hr@reanzly.in", timestamp: isoDaysAgo(1) },
  { id: "a4", action: "reject", entity: "LeaveRequest", entityId: "LR-0014", description: "Rejected privilege leave (insufficient balance)", user: "anil@reanzly.in", timestamp: isoDaysAgo(3) },
  { id: "a5", action: "update", entity: "Employee", entityId: "GP0023", description: "Updated bank account details", user: "hr@reanzly.in", timestamp: isoDaysAgo(4) },
  { id: "a6", action: "create", entity: "Position", entityId: "REQ-001", description: "New position opened for Driver (4 openings)", user: "kuldeep@reanzly.in", timestamp: isoDaysAgo(15) },
  { id: "a7", action: "approve", entity: "AttendanceReg", entityId: "REG-0003", description: "Regularization approved (missed punch)", user: "anil@reanzly.in", timestamp: isoDaysAgo(2) },
];

// ===== Leave workflow steps =====
export const LEAVE_WORKFLOW_STEPS = [
  { id: 1, label: "Apply", owner: "Employee", desc: "Employee submits leave request" },
  { id: 2, label: "Manager Approval", owner: "Reporting Manager", desc: "Direct manager reviews and approves" },
  { id: 3, label: "HR Approval", owner: "HR", desc: "HR verifies leave balance and finalises" },
  { id: 4, label: "Notify", owner: "System", desc: "Employee + team notified; calendar updated" },
] as const;

// ===== Comp-off requests =====
export interface CompOffRequest {
  id: string;
  empId: string;
  empCode: string;
  empName: string;
  workedOn: string; // holiday/weekend worked
  reason: string;
  compOffOn: string; // requested date to take off
  status: "Pending" | "Approved" | "Rejected" | "Utilised" | "Expired";
  appliedOn: string;
  approvedOn?: string;
}

export const COMPOFF_REQUESTS: CompOffRequest[] = Array.from({ length: 5 }, (_, i) => {
  const emp = pick(EMPLOYEES.filter((e) => e.status === "Active"));
  const statuses: CompOffRequest["status"][] = ["Pending", "Approved", "Utilised", "Expired"];
  return {
    id: `co-${i + 1}`,
    empId: emp.id,
    empCode: emp.empCode,
    empName: emp.name,
    workedOn: isoDaysAgo(10 + Math.floor(rnd() * 15)),
    reason: "Worked on Sunday for Diwali dispatch rush.",
    compOffOn: isoDaysAhead(Math.floor(rnd() * 30)),
    status: statuses[i % statuses.length],
    appliedOn: isoDaysAgo(Math.floor(rnd() * 8)),
    approvedOn: i > 0 ? isoDaysAgo(Math.floor(rnd() * 5)) : undefined,
  };
});

// ===== Org structure - branch → manager =====
export const BRANCH_HEADS: Record<string, string> = {
  "Mumbai HQ": "Kuldeep Singh",
  "Pune Branch": "Anil Sharma",
  "Delhi Branch": "Vikram Deshmukh",
  "Bengaluru Branch": "Sunil Iyer",
  "Chennai Branch": "Rajesh Nair",
  "Nagpur Branch": "Mahesh Patil",
};

// ===== Shift management =====
export interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  branch: string;
  graceLateMin: number;
  otEligible: boolean;
  weekOff: string; // e.g. "Sunday"
  assignedCount: number;
}

export const SHIFTS: Shift[] = [
  { id: "s1", name: "General (Office)", startTime: "09:30", endTime: "18:30", branch: "All", graceLateMin: 15, otEligible: false, weekOff: "Sunday", assignedCount: 18 },
  { id: "s2", name: "Morning (Warehouse)", startTime: "06:00", endTime: "14:00", branch: "All", graceLateMin: 10, otEligible: true, weekOff: "Sunday", assignedCount: 12 },
  { id: "s3", name: "Evening (Warehouse)", startTime: "14:00", endTime: "22:00", branch: "All", graceLateMin: 10, otEligible: true, weekOff: "Sunday", assignedCount: 10 },
  { id: "s4", name: "Driver - Long Haul", startTime: "05:00", endTime: "22:00", branch: "All", graceLateMin: 30, otEligible: true, weekOff: "Rotational", assignedCount: 22 },
  { id: "s5", name: "Night (Workshop)", startTime: "22:00", endTime: "06:00", branch: "All", graceLateMin: 10, otEligible: true, weekOff: "Rotational", assignedCount: 6 },
];

// ===== Helper - birth month / anniversary lookup =====
export function upcomingBirthdays(employees: Employee[], withinDays = 30): { emp: Employee; dob: string; daysUntil: number }[] {
  const today = new Date();
  return employees
    .filter((e) => e.status !== "Exited")
    .map((e) => {
      const dob = new Date(e.dob);
      const next = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      if (next < today) next.setFullYear(today.getFullYear() + 1);
      const days = Math.ceil((next.getTime() - today.getTime()) / 86400000);
      return { emp: e, dob: e.dob, daysUntil: days };
    })
    .filter((x) => x.daysUntil <= withinDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

export function upcomingAnniversaries(employees: Employee[], withinDays = 30): { emp: Employee; doj: string; years: number; daysUntil: number }[] {
  const today = new Date();
  return employees
    .filter((e) => e.status !== "Exited")
    .map((e) => {
      const doj = new Date(e.doj);
      const next = new Date(today.getFullYear(), doj.getMonth(), doj.getDate());
      if (next < today) next.setFullYear(today.getFullYear() + 1);
      const days = Math.ceil((next.getTime() - today.getTime()) / 86400000);
      const years = today.getFullYear() - doj.getFullYear();
      return { emp: e, doj: e.doj, years, daysUntil: days };
    })
    .filter((x) => x.daysUntil <= withinDays)
    .sort((a, b) => a.daysUntil - b.daysUntil);
}

// ============================================================
// HR Enhancement - Task 15-c: Issuances (document issuance)
// Comprehensive document issuance system for HR:
//   Onboarding · Offboarding · Certificates · Performance · Other
// Each Issuance binds an employee + a template (offer/appointment/
// relieving/experience/internship/salary/etc.) with format and
// delivery options, persisted in the HR store.
// ============================================================

export type IssuanceType =
  // Onboarding
  | "appointment-letter"
  | "offer-letter"
  | "joining-report"
  | "nda"
  | "id-card-request"
  | "payroll-enrollment"
  // Offboarding
  | "relieving-letter"
  | "experience-letter"
  | "clearance-certificate"
  | "fnf-statement"
  | "exit-interview-form"
  // Certificates
  | "internship-certificate"
  | "stipend-certificate"
  | "character-certificate"
  | "salary-certificate"
  | "address-proof"
  | "employment-verification"
  // Performance
  | "appraisal-letter"
  | "promotion-letter"
  | "bonus-letter"
  | "increment-letter"
  // Other
  | "warning-letter"
  | "show-cause-notice"
  | "suspension-letter"
  | "recognition-letter";

export type IssuanceCategory =
  | "Onboarding"
  | "Offboarding"
  | "Certificate"
  | "Performance"
  | "Other";

export type IssuanceStatus =
  | "Draft"
  | "Sent"
  | "Accepted"
  | "E-Signed"
  | "Expired"
  | "Revoked";

export type IssuanceFormat = "A4" | "Letter" | "Legal";
export type IssuanceBranded = "reanzly" | "company";
export type IssuanceTheme = "monochrome" | "classic" | "modern";
export type IssuanceFont = "sans" | "serif";

// Field keys surfaced in the Issue Document drawer. The drawer renders
// the matching input for each entry in template.fields.
export type IssuanceFieldKey =
  | "subject"
  | "body"
  | "effectiveDate"
  | "joiningDate"
  | "lastWorkingDay"
  | "noticePeriod"
  | "ctc"
  | "designation"
  | "department"
  | "branch"
  | "reason"
  | "amount"
  | "period"
  | "rating"
  | "validityDays"
  | "remarks";

export interface IssuanceTemplate {
  id: IssuanceType;
  label: string;
  category: IssuanceCategory;
  description: string;
  fields: IssuanceFieldKey[];
  defaultSubject: string;
  defaultBody: string;
  defaultValidityDays?: number;
}

export interface Issuance {
  id: string;
  documentId: string; // human-readable like ISS-2025-0001
  type: IssuanceType;
  category: IssuanceCategory;
  employeeId: string;
  employeeName: string;
  designation: string;
  branch: string;
  status: IssuanceStatus;
  issuedBy: string;
  issuedOn: string;
  validUntil?: string;
  format: IssuanceFormat;
  letterhead: boolean;
  watermark: boolean;
  branded: IssuanceBranded;
  theme: IssuanceTheme;
  font: IssuanceFont;
  ccManager: boolean;
  bccHrHead: boolean;
  fields: Record<string, string>;
  eSignPending?: boolean;
}

// ===== Template catalog =====
export const ISSUANCE_TEMPLATES: IssuanceTemplate[] = [
  // ----- Onboarding -----
  {
    id: "appointment-letter",
    label: "Appointment Letter",
    category: "Onboarding",
    description: "Formal employment offer with designation, CTC, DOJ, and probation terms.",
    fields: ["subject", "body", "designation", "department", "branch", "ctc", "joiningDate", "noticePeriod", "effectiveDate"],
    defaultSubject: "Letter of Appointment — Reanzly Logistics",
    defaultBody:
      "We are pleased to confirm your appointment as {designation} at Reanzly Logistics, {branch}, with effect from {joiningDate}. " +
      "Your annual CTC will be {ctc}, payable monthly subject to PF/ESI/TDS deductions. " +
      "You will be on probation for 6 months, after which your confirmation will be reviewed. " +
      "A notice period of {noticePeriod} applies from either side. Please sign and return the enclosed copy as acceptance.",
  },
  {
    id: "offer-letter",
    label: "Offer Letter",
    category: "Onboarding",
    description: "Pre-joining offer issued to a candidate with offered CTC and joining date.",
    fields: ["subject", "body", "designation", "branch", "ctc", "joiningDate", "validityDays"],
    defaultSubject: "Offer of Employment — Reanzly Logistics",
    defaultBody:
      "Following your interviews, we are delighted to extend an offer for the position of {designation} at our {branch}. " +
      "Your offered annual CTC is {ctc}, with joining on {joiningDate}. " +
      "This offer is valid for {validityDays} days. Kindly indicate your acceptance by signing below.",
  },
  {
    id: "joining-report",
    label: "Joining Report",
    category: "Onboarding",
    description: "On-day-one report acknowledging the new joiner has reported and documents are collected.",
    fields: ["subject", "body", "designation", "branch", "joiningDate", "remarks"],
    defaultSubject: "Joining Report — New Employee",
    defaultBody:
      "This is to certify that {employeeName} joined Reanzly Logistics, {branch}, as {designation} on {joiningDate}. " +
      "KYC documents (Aadhaar, PAN, photo, bank proof) have been collected and verified. " +
      "PF/ESI nomination forms have been initiated. {remarks}",
  },
  {
    id: "nda",
    label: "Non-Disclosure Agreement",
    category: "Onboarding",
    description: "Confidentiality and non-disclosure undertaking to be signed by the employee.",
    fields: ["subject", "body", "effectiveDate", "validityDays"],
    defaultSubject: "Non-Disclosure Agreement",
    defaultBody:
      "{employeeName} agrees to keep confidential all proprietary information of Reanzly Logistics — including customer lists, " +
      "rate cards, fleet data, financials, and operational processes — both during and for {validityDays} days after the termination of employment. " +
      "Breach of this undertaking entitles the company to legal recourse.",
  },
  {
    id: "id-card-request",
    label: "ID Card Request",
    category: "Onboarding",
    description: "Internal requisition to Admin for issuing a new employee ID card.",
    fields: ["subject", "body", "designation", "branch", "joiningDate", "remarks"],
    defaultSubject: "ID Card Issuance — New Joiner",
    defaultBody:
      "Please issue a new employee ID card for {employeeName}, {designation}, {branch}. " +
      "DOJ: {joiningDate}. Photo and KYC verified. {remarks}",
  },
  {
    id: "payroll-enrollment",
    label: "Payroll Enrollment Form",
    category: "Onboarding",
    description: "PF/ESI/PT enrollment form for the new employee.",
    fields: ["subject", "body", "designation", "branch", "joiningDate", "ctc", "remarks"],
    defaultSubject: "Payroll & Statutory Enrollment",
    defaultBody:
      "Enroll {employeeName} ({designation}, {branch}) into the monthly payroll with effect from {joiningDate}. " +
      "Annual CTC: {ctc}. PF/ESI/TDS/PT applicability to be configured as per the standard slab. " +
      "Bank account details and PAN have been verified. {remarks}",
  },
  // ----- Offboarding -----
  {
    id: "relieving-letter",
    label: "Relieving Letter",
    category: "Offboarding",
    description: "Official letter relieving the employee from duties on the last working day.",
    fields: ["subject", "body", "designation", "branch", "lastWorkingDay", "remarks"],
    defaultSubject: "Relieving Letter",
    defaultBody:
      "This is to certify that {employeeName} was relieved from the duties of {designation} at Reanzly Logistics, {branch}, " +
      "with effect from {lastWorkingDay}. All company assets have been returned and no-dues have been cleared. {remarks}",
  },
  {
    id: "experience-letter",
    label: "Experience Letter",
    category: "Offboarding",
    description: "Employment experience certificate stating designation and tenure.",
    fields: ["subject", "body", "designation", "branch", "joiningDate", "lastWorkingDay", "remarks"],
    defaultSubject: "Experience Certificate",
    defaultBody:
      "This is to certify that {employeeName} was employed with Reanzly Logistics, {branch}, as {designation} " +
      "from {joiningDate} to {lastWorkingDay}. During this period, we found {employeeName} to be sincere, hardworking, and professional. " +
      "We wish {employeeName} success in future endeavours. {remarks}",
  },
  {
    id: "clearance-certificate",
    label: "Clearance Certificate",
    category: "Offboarding",
    description: "Confirms no-dues cleared across IT, Admin, Finance, and Reporting Manager.",
    fields: ["subject", "body", "designation", "branch", "lastWorkingDay", "remarks"],
    defaultSubject: "No-Dues Clearance Certificate",
    defaultBody:
      "This is to confirm that {employeeName} ({designation}, {branch}) has obtained no-dues clearance from IT, Admin, Finance, " +
      "and the Reporting Manager as on {lastWorkingDay}. No outstanding dues or assets remain pending. {remarks}",
  },
  {
    id: "fnf-statement",
    label: "Full & Final Statement",
    category: "Offboarding",
    description: "Itemised F&F settlement showing earnings, deductions, and net payable.",
    fields: ["subject", "body", "designation", "branch", "lastWorkingDay", "amount", "remarks"],
    defaultSubject: "Full & Final Settlement Statement",
    defaultBody:
      "The Full & Final settlement of {employeeName} ({designation}, {branch}) as on {lastWorkingDay} is enclosed. " +
      "Net payable: {amount}. The settlement includes leave encashment, notice pay adjustment, bonus/incentive dues, " +
      "outstanding advance recovery, and asset deductions. {remarks}",
  },
  {
    id: "exit-interview-form",
    label: "Exit Interview Form",
    category: "Offboarding",
    description: "Structured exit interview capture with reason, feedback, and rehire eligibility.",
    fields: ["subject", "body", "designation", "branch", "lastWorkingDay", "reason", "remarks"],
    defaultSubject: "Exit Interview Record",
    defaultBody:
      "Exit interview conducted with {employeeName} ({designation}, {branch}) prior to {lastWorkingDay}. " +
      "Primary reason for leaving: {reason}. The discussion captured feedback on work environment, manager effectiveness, " +
      "compensation, and growth opportunities. {remarks}",
  },
  // ----- Certificates -----
  {
    id: "internship-certificate",
    label: "Internship Completion Certificate",
    category: "Certificate",
    description: "Certificate confirming an intern has completed the internship period.",
    fields: ["subject", "body", "designation", "branch", "joiningDate", "lastWorkingDay", "period", "remarks"],
    defaultSubject: "Internship Completion Certificate",
    defaultBody:
      "This is to certify that {employeeName} successfully completed an internship of {period} at Reanzly Logistics, {branch}, " +
      "from {joiningDate} to {lastWorkingDay}. During the internship, {employeeName} worked on {designation}-related assignments " +
      "and demonstrated dedication, learning agility, and professionalism. {remarks}",
    defaultValidityDays: 365,
  },
  {
    id: "stipend-certificate",
    label: "Stipend Certificate",
    category: "Certificate",
    description: "Certificate stating the stipend paid to an intern during the internship.",
    fields: ["subject", "body", "designation", "branch", "joiningDate", "lastWorkingDay", "amount", "remarks"],
    defaultSubject: "Stipend Certificate",
    defaultBody:
      "This is to certify that {employeeName} received a monthly stipend of {amount} during the internship at Reanzly Logistics, " +
      "{branch}, from {joiningDate} to {lastWorkingDay} as {designation}. {remarks}",
  },
  {
    id: "character-certificate",
    label: "Character Certificate",
    category: "Certificate",
    description: "Character certificate issued to an employee or ex-employee.",
    fields: ["subject", "body", "designation", "branch", "joiningDate", "lastWorkingDay", "remarks"],
    defaultSubject: "Character Certificate",
    defaultBody:
      "This is to certify that to the best of our knowledge and belief, {employeeName} bears a good moral character. " +
      "{employeeName} was employed with Reanzly Logistics, {branch}, as {designation} from {joiningDate} to {lastWorkingDay}. " +
      "We found {employeeName} to be honest, disciplined, and of good conduct during this period. {remarks}",
  },
  {
    id: "salary-certificate",
    label: "Salary Certificate",
    category: "Certificate",
    description: "Salary certificate stating CTC and monthly gross — typically for loans/visas.",
    fields: ["subject", "body", "designation", "branch", "joiningDate", "ctc", "remarks"],
    defaultSubject: "Salary Certificate",
    defaultBody:
      "This is to certify that {employeeName} is employed with Reanzly Logistics, {branch}, as {designation} since {joiningDate}. " +
      "The current annual CTC is {ctc}, payable monthly subject to statutory deductions. This certificate is issued on the " +
      "employee's request and is valid for 30 days from the date of issue. {remarks}",
    defaultValidityDays: 30,
  },
  {
    id: "address-proof",
    label: "Address Proof Letter",
    category: "Certificate",
    description: "Company letter confirming the employee's residential address for verification.",
    fields: ["subject", "body", "designation", "branch", "remarks"],
    defaultSubject: "Address Proof Letter",
    defaultBody:
      "This is to certify that {employeeName}, {designation} at Reanzly Logistics ({branch}), resides at the address mentioned " +
      "in the employee's KYC records. This letter is issued on the employee's request for address verification purposes. {remarks}",
    defaultValidityDays: 30,
  },
  {
    id: "employment-verification",
    label: "Employment Verification Letter",
    category: "Certificate",
    description: "Verification of employment for background checks by external agencies.",
    fields: ["subject", "body", "designation", "branch", "joiningDate", "ctc", "remarks"],
    defaultSubject: "Employment Verification Letter",
    defaultBody:
      "This is in response to a background verification request for {employeeName}. We confirm that {employeeName} is employed " +
      "with Reanzly Logistics, {branch}, as {designation} since {joiningDate}, with an annual CTC of {ctc}. {remarks}",
  },
  // ----- Performance -----
  {
    id: "appraisal-letter",
    label: "Appraisal Letter",
    category: "Performance",
    description: "Annual/bi-annual appraisal outcome letter with rating and revised CTC.",
    fields: ["subject", "body", "designation", "ctc", "amount", "rating", "effectiveDate", "remarks"],
    defaultSubject: "Appraisal Outcome — Review Cycle",
    defaultBody:
      "We are pleased to share your appraisal outcome. Based on the review cycle, your rating is {rating}/5 and your revised " +
      "annual CTC is {ctc}, with an increment of {amount} effective {effectiveDate}. We appreciate your contributions and look " +
      "forward to your continued growth with Reanzly. {remarks}",
  },
  {
    id: "promotion-letter",
    label: "Promotion Letter",
    category: "Performance",
    description: "Letter announcing a promotion to a new designation with revised CTC.",
    fields: ["subject", "body", "designation", "ctc", "effectiveDate", "remarks"],
    defaultSubject: "Promotion — Revised Designation",
    defaultBody:
      "We are delighted to inform you that you have been promoted to the role of {designation} with effect from {effectiveDate}. " +
      "Your revised annual CTC will be {ctc}. We are confident that you will continue to excel in this new role. {remarks}",
  },
  {
    id: "bonus-letter",
    label: "Bonus Letter",
    category: "Performance",
    description: "Letter announcing a performance or festival bonus payout.",
    fields: ["subject", "body", "amount", "effectiveDate", "remarks"],
    defaultSubject: "Performance Bonus",
    defaultBody:
      "In recognition of your contribution this year, the management is pleased to award you a bonus of {amount}, payable with " +
      "the {effectiveDate} payroll cycle. This bonus is subject to applicable statutory deductions. {remarks}",
  },
  {
    id: "increment-letter",
    label: "Increment Letter",
    category: "Performance",
    description: "Letter communicating a salary increment with revised CTC and effective date.",
    fields: ["subject", "body", "designation", "ctc", "amount", "effectiveDate", "remarks"],
    defaultSubject: "Salary Increment Letter",
    defaultBody:
      "We are pleased to inform you that your annual CTC has been revised to {ctc}, an increment of {amount}, effective {effectiveDate}. " +
      "The revised structure will reflect in the {effectiveDate} payroll. {remarks}",
  },
  // ----- Other -----
  {
    id: "warning-letter",
    label: "Warning Letter",
    category: "Other",
    description: "Formal warning for misconduct, performance, or attendance issues.",
    fields: ["subject", "body", "designation", "branch", "effectiveDate", "reason", "remarks"],
    defaultSubject: "Warning Letter — Disciplinary Action",
    defaultBody:
      "This letter serves as a formal warning to {employeeName} ({designation}, {branch}) on account of {reason}, observed on " +
      "{effectiveDate}. We expect immediate correction. Further lapses may lead to stricter disciplinary action. {remarks}",
  },
  {
    id: "show-cause-notice",
    label: "Show Cause Notice",
    category: "Other",
    description: "Notice asking the employee to show cause for an alleged misconduct.",
    fields: ["subject", "body", "designation", "branch", "effectiveDate", "reason", "remarks"],
    defaultSubject: "Show Cause Notice",
    defaultBody:
      "You are hereby directed to show cause within 3 working days as to why disciplinary action should not be initiated against " +
      "you for {reason}, reported on {effectiveDate}. Failure to respond will be treated as admission and action will be taken " +
      "ex-parte. {remarks}",
  },
  {
    id: "suspension-letter",
    label: "Suspension Letter",
    category: "Other",
    description: "Letter suspending an employee pending enquiry.",
    fields: ["subject", "body", "designation", "branch", "effectiveDate", "reason", "remarks"],
    defaultSubject: "Suspension Pending Enquiry",
    defaultBody:
      "Pending enquiry into {reason} reported on {effectiveDate}, {employeeName} ({designation}, {branch}) is suspended from duty " +
      "with effect from {effectiveDate}. A subsistence allowance as per policy will be paid during the suspension period. {remarks}",
  },
  {
    id: "recognition-letter",
    label: "Recognition Letter",
    category: "Other",
    description: "Letter recognising outstanding contribution or going beyond the call of duty.",
    fields: ["subject", "body", "designation", "branch", "effectiveDate", "remarks"],
    defaultSubject: "Letter of Recognition",
    defaultBody:
      "We would like to place on record our appreciation for {employeeName} ({designation}, {branch}) for an outstanding " +
      "contribution on {effectiveDate}. Your commitment reflects the values we hold dear at Reanzly Logistics. {remarks}",
  },
];

// Quick lookup helper
export const TEMPLATE_BY_ID: Record<IssuanceType, IssuanceTemplate> = ISSUANCE_TEMPLATES.reduce(
  (acc, t) => {
    acc[t.id] = t;
    return acc;
  },
  {} as Record<IssuanceType, IssuanceTemplate>,
);

export const ISSUANCE_CATEGORIES: IssuanceCategory[] = [
  "Onboarding",
  "Offboarding",
  "Certificate",
  "Performance",
  "Other",
];

// ===== Seed: issued documents =====
const ISSUANCE_HR_USERS = ["hr@reanzly.in", "kuldeep@reanzly.in", "anil@reanzly.in"];

function genIssuanceDocId(seq: number): string {
  return `ISS-${new Date().getFullYear()}-${String(seq).padStart(4, "0")}`;
}

function genIssuances(): Issuance[] {
  const out: Issuance[] = [];
  const picks = EMPLOYEES.filter((e) => e.status === "Active" || e.status === "Notice" || e.status === "Exited");
  // Hand-picked selection across categories
  const defs: Array<{
    type: IssuanceType;
    empIdx: number;
    status: IssuanceStatus;
    issuedDaysAgo: number;
    validUntilDays?: number;
    eSignPending?: boolean;
    extraFields?: Record<string, string>;
  }> = [
    { type: "appointment-letter", empIdx: 0, status: "E-Signed", issuedDaysAgo: 12, validUntilDays: 365, extraFields: { designation: "Driver", ctc: "₹4,80,000", joiningDate: dateOnly(11), noticePeriod: "30 days" } },
    { type: "offer-letter", empIdx: 4, status: "Accepted", issuedDaysAgo: 18, validUntilDays: 30, extraFields: { designation: "Mechanic", ctc: "₹4,20,000", joiningDate: dateOnly(2) } },
    { type: "joining-report", empIdx: 1, status: "Sent", issuedDaysAgo: 9, extraFields: { designation: "Helper", branch: "Mumbai HQ" } },
    { type: "nda", empIdx: 2, status: "E-Signed", issuedDaysAgo: 30, validUntilDays: 3650 },
    { type: "id-card-request", empIdx: 3, status: "Sent", issuedDaysAgo: 7, extraFields: { designation: "Dispatcher", branch: "Delhi Branch" } },
    { type: "payroll-enrollment", empIdx: 5, status: "Sent", issuedDaysAgo: 6, extraFields: { designation: "Fleet Executive", ctc: "₹5,40,000" } },
    { type: "appointment-letter", empIdx: 6, status: "Draft", issuedDaysAgo: 1, extraFields: { designation: "Accountant", ctc: "₹6,50,000", joiningDate: dateOnly(-7) } },
    { type: "offer-letter", empIdx: 7, status: "Sent", issuedDaysAgo: 3, validUntilDays: 21, eSignPending: true, extraFields: { designation: "Driver", ctc: "₹4,80,000", joiningDate: dateOnly(-10) } },
    // Offboarding
    { type: "relieving-letter", empIdx: 50, status: "E-Signed", issuedDaysAgo: 14, extraFields: { designation: "Driver", branch: "Mumbai HQ", lastWorkingDay: dateOnly(15) } },
    { type: "experience-letter", empIdx: 50, status: "Sent", issuedDaysAgo: 13, extraFields: { designation: "Driver", branch: "Mumbai HQ", joiningDate: dateOnly(800), lastWorkingDay: dateOnly(15) } },
    { type: "clearance-certificate", empIdx: 51, status: "Accepted", issuedDaysAgo: 5, extraFields: { designation: "Helper", branch: "Pune Branch", lastWorkingDay: dateOnly(6) } },
    { type: "fnf-statement", empIdx: 51, status: "Sent", issuedDaysAgo: 5, extraFields: { designation: "Helper", branch: "Pune Branch", lastWorkingDay: dateOnly(6), amount: "₹38,500" } },
    { type: "exit-interview-form", empIdx: 52, status: "Draft", issuedDaysAgo: 2, extraFields: { designation: "Mechanic", branch: "Bengaluru Branch", reason: "Better Opportunity" } },
    // Certificates
    { type: "internship-certificate", empIdx: 10, status: "Sent", issuedDaysAgo: 4, validUntilDays: 365, extraFields: { designation: "Operations Intern", branch: "Mumbai HQ", joiningDate: dateOnly(180), lastWorkingDay: dateOnly(4), period: "6 months" } },
    { type: "stipend-certificate", empIdx: 10, status: "Sent", issuedDaysAgo: 4, extraFields: { designation: "Operations Intern", branch: "Mumbai HQ", joiningDate: dateOnly(180), lastWorkingDay: dateOnly(4), amount: "₹8,000/month" } },
    { type: "salary-certificate", empIdx: 8, status: "Sent", issuedDaysAgo: 1, validUntilDays: 30, extraFields: { designation: "Accountant", ctc: "₹6,80,000", joiningDate: dateOnly(420) } },
    { type: "character-certificate", empIdx: 50, status: "Sent", issuedDaysAgo: 12, extraFields: { designation: "Driver", branch: "Mumbai HQ", joiningDate: dateOnly(800), lastWorkingDay: dateOnly(15) } },
    { type: "address-proof", empIdx: 9, status: "Sent", issuedDaysAgo: 2, validUntilDays: 30, extraFields: { designation: "Dispatcher", branch: "Delhi Branch" } },
    { type: "employment-verification", empIdx: 11, status: "Sent", issuedDaysAgo: 3, extraFields: { designation: "Fleet Supervisor", ctc: "₹5,80,000", joiningDate: dateOnly(900) } },
    // Performance
    { type: "appraisal-letter", empIdx: 12, status: "Accepted", issuedDaysAgo: 20, extraFields: { designation: "Branch Manager", ctc: "₹14,00,000", amount: "+12%", rating: "4", effectiveDate: dateOnly(1) } },
    { type: "increment-letter", empIdx: 13, status: "Sent", issuedDaysAgo: 18, eSignPending: true, extraFields: { designation: "Operations Executive", ctc: "₹4,80,000", amount: "+8%", effectiveDate: dateOnly(1) } },
    { type: "bonus-letter", empIdx: 14, status: "Sent", issuedDaysAgo: 6, extraFields: { amount: "₹15,000", effectiveDate: dateOnly(-5) } },
    { type: "promotion-letter", empIdx: 15, status: "E-Signed", issuedDaysAgo: 25, extraFields: { designation: "Fleet Supervisor", ctc: "₹6,40,000", effectiveDate: dateOnly(2) } },
    // Other
    { type: "warning-letter", empIdx: 16, status: "Sent", issuedDaysAgo: 4, extraFields: { designation: "Driver", branch: "Mumbai HQ", reason: "Repeat late reporting" } },
    { type: "show-cause-notice", empIdx: 17, status: "Sent", issuedDaysAgo: 2, extraFields: { designation: "Helper", branch: "Pune Branch", reason: "Misconduct with co-worker" } },
    { type: "recognition-letter", empIdx: 18, status: "Sent", issuedDaysAgo: 8, extraFields: { designation: "Driver", branch: "Mumbai HQ" } },
  ];

  for (let i = 0; i < defs.length; i++) {
    const d = defs[i];
    const emp = picks[d.empIdx % picks.length] || EMPLOYEES[0];
    const tpl = TEMPLATE_BY_ID[d.type];
    const issuedOn = isoDaysAgo(d.issuedDaysAgo);
    const validUntil = d.validUntilDays !== undefined ? isoDaysAhead(d.validUntilDays) : undefined;
    out.push({
      id: `iss-${i + 1}`,
      documentId: genIssuanceDocId(i + 1),
      type: d.type,
      category: tpl.category,
      employeeId: emp.id,
      employeeName: emp.name,
      designation: emp.designation,
      branch: emp.branch,
      status: d.status,
      issuedBy: pick(ISSUANCE_HR_USERS),
      issuedOn,
      validUntil,
      format: "A4",
      letterhead: true,
      watermark: d.type === "warning-letter" || d.type === "show-cause-notice" || d.type === "suspension-letter",
      branded: "company",
      theme: "monochrome",
      font: "sans",
      ccManager: true,
      bccHrHead: true,
      fields: {
        employeeName: emp.name,
        designation: emp.designation,
        branch: emp.branch,
        ...d.extraFields,
      },
      eSignPending: d.eSignPending,
    });
  }
  return out;
}

export const ISSUANCES: Issuance[] = genIssuances();

// ===== Helpers =====
export function nextIssuanceDocId(existing: Issuance[]): string {
  const year = new Date().getFullYear();
  const sameYear = existing.filter((i) => i.documentId.startsWith(`ISS-${year}-`));
  const seq = sameYear.length + 1;
  return `ISS-${year}-${String(seq).padStart(4, "0")}`;
}

// Replace {tokens} in a template body with values from a fields map.
export function interpolateIssuanceBody(body: string, fields: Record<string, string>): string {
  return body.replace(/\{(\w+)\}/g, (_, key: string) => fields[key] || `{${key}}`);
}
