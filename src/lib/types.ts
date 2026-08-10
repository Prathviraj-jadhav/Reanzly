// ===== GARAGE PLUS DOMAIN TYPES =====
// Comprehensive type system for the logistics operating system.

export type ID = string;
export type ISODate = string;

// ---- Status unions (monochrome - rendered via labels, never color) ----
export type TripStatus =
  | "Planned"
  | "Active"
  | "In Transit"
  | "Delivered"
  | "Cancelled"
  | "Breakdown";

export type VehicleStatus =
  | "Active"
  | "Idle"
  | "In Maintenance"
  | "Offline";

export type PaymentStatus =
  | "Unpaid"
  | "Partially Paid"
  | "Paid"
  | "Overdue";

export type InvoiceStatus =
  | "Draft"
  | "Sent"
  | "Partially Paid"
  | "Paid"
  | "Overdue"
  | "Cancelled"
  | "Credit Note";

export type IssueSeverity = "Critical" | "High" | "Medium" | "Low";
export type IssueStatus = "Open" | "In Progress" | "Pending Parts" | "Resolved" | "Closed";

export type Priority = "Urgent" | "High" | "Medium" | "Low";

export type OrderMode = "FTL" | "LTL" | "Part Load";
export type RateType = "Per Ton" | "Per KM" | "Per Trip" | "Fixed";

export type FreightTerm = "Paid" | "To Be Billed" | "To Pay";

export type VoucherType =
  | "Advance"
  | "Add Money"
  | "Withdrawal"
  | "Movement"
  | "Truck Forwarding"
  | "Settlement"
  | "Recovery";

// ---- Core entity interfaces ----
export interface Trip {
  id: ID;
  tripId: string;
  lrNumber: string;
  consignor: string;
  consignee: string;
  origin: string;
  destination: string;
  vehicleId: ID;
  vehicleName: string;
  driverId: ID;
  driverName: string;
  status: TripStatus;
  createdDate: ISODate;
  expectedDelivery: ISODate;
  freightAmount: number;
  paymentStatus: PaymentStatus;
  orderMode: OrderMode;
  eWayBill?: string;
  distanceKm: number;
  customer: string;
}

export interface Vehicle {
  id: ID;
  name: string;
  year: number;
  make: string;
  model: string;
  vin: string;
  status: VehicleStatus;
  type: string;
  group: string;
  currentMeter: number;
  licensePlate: string;
  watchers: string[];
  operator: string;
  fuelType: string;
  ownership: "Owned" | "Leased" | "Attached";
  location?: string;
  distanceThisPeriod: number;
  gpsSpeed?: number;
  lastGpsUpdate?: ISODate;
  assignedTripId?: string;
}

export interface Driver {
  id: ID;
  name: string;
  role: "Driver" | "Staff";
  department: string;
  status: "Active" | "On Leave" | "Inactive";
  contact: string;
  assignedVehicle?: string;
  licenseNumber: string;
  licenseExpiry: ISODate;
  lastActive: ISODate;
  email: string;
  rating: number;
  tripsCompleted: number;
  onTimeRate: number;
  avatar?: string;
  city: string;
}

export interface Customer {
  id: ID;
  companyName: string;
  contactPerson: string;
  phone: string;
  gstin: string;
  city: string;
  billingAddress?: string;
  activeTrips: number;
  outstandingBalance: number;
  status: "Active" | "Inactive";
  email: string;
  paymentTerms: string;
  creditLimit: number;
  accountManager: string;
  totalRevenue: number;
}

export interface Vendor {
  id: ID;
  companyName: string;
  contactPerson: string;
  phone: string;
  gstin: string;
  city: string;
  type: "Fuel Supplier" | "Maintenance Workshop" | "Spare Parts Supplier" | "Third-Party Operator" | "Tyre Supplier";
  status: "Active" | "Inactive";
  email: string;
  paymentTerms: string;
  rating: number;
}

export interface Invoice {
  id: ID;
  invoiceNumber: string;
  customer: string;
  invoiceDate: ISODate;
  dueDate: ISODate;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  status: InvoiceStatus;
  paymentStatus: PaymentStatus;
  tripRef?: string;
  igst?: number;
  cgst?: number;
  sgst?: number;
}

export interface Expense {
  id: ID;
  date: ISODate;
  category: string;
  description: string;
  vehicle?: string;
  trip?: string;
  amount: number;
  paymentMode: string;
  submittedBy: string;
  receiptStatus: "Attached" | "Missing";
}

export interface Payment {
  id: ID;
  voucherType: VoucherType;
  referenceNumber: string;
  date: ISODate;
  party: string;
  amount: number;
  mode: string;
  status: "Pending" | "Completed" | "Approved";
  linkedInvoice?: string;
  linkedTrip?: string;
}

export interface Issue {
  id: ID;
  issueId: string;
  title: string;
  severity: IssueSeverity;
  vehicle?: string;
  reporter: string;
  assignee: string;
  status: IssueStatus;
  createdDate: ISODate;
  resolutionDate?: ISODate;
  source: "Manual" | "Inspection" | "Rean" | "Fault Code";
  description: string;
}

export interface Inspection {
  id: ID;
  inspectionId: string;
  type: string;
  vehicle: string;
  driver?: string;
  inspector: string;
  date: ISODate;
  result: "Pass" | "Fail" | "Conditional";
  odometer: number;
  linkedIssues: number;
}

export interface WorkOrder {
  id: ID;
  workOrderId: string;
  title: string;
  vehicle: string;
  type: "Scheduled" | "Unscheduled" | "Recall" | "Warranty";
  priority: Priority;
  vendor?: string;
  technician?: string;
  status: "Open" | "In Progress" | "Completed" | "Cancelled";
  createdDate: ISODate;
  estimatedCompletion?: ISODate;
  actualCost?: number;
  estimatedCost: number;
}

export interface FuelEntry {
  id: ID;
  date: ISODate;
  vehicle: string;
  driver?: string;
  station: string;
  fuelType: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  odometer: number;
  efficiency: number;
  anomaly: boolean;
  anomalyNote?: string;
}

export interface LorryReceipt {
  id: ID;
  lrNumber: string;
  tripId: string;
  consignor: string;
  consignee: string;
  origin: string;
  destination: string;
  date: ISODate;
  status: "Generated" | "Printed" | "Sent" | "Archived";
  eWayBill?: string;
  eWayBillExpiry?: ISODate;
  freightAmount: number;
  freightTerm: FreightTerm;
}

export interface DocumentRecord {
  id: ID;
  name: string;
  type: string;
  entityType: "Vehicle" | "Driver" | "Customer" | "Vendor" | "Company";
  entityName: string;
  issueDate: ISODate;
  expiryDate?: ISODate;
  status: "Valid" | "Expiring Soon" | "Expired";
  uploadedBy: string;
  uploadDate: ISODate;
}

export interface Reminder {
  id: ID;
  type: "Service" | "Renewal";
  entity: string;
  entityType: "Vehicle" | "Driver";
  name: string;
  dueDate: ISODate;
  daysRemaining: number;
  status: "Upcoming" | "Due Soon" | "Overdue";
}

export interface Task {
  id: ID;
  title: string;
  description: string;
  assignee: string;
  dueDate?: ISODate;
  priority: Priority;
  department: string;
  status: "Backlog" | "Planned" | "In Progress" | "Blocked" | "Under Review" | "Completed";
  isRean: boolean;
  linkedEntity?: { type: string; name: string };
  checklist?: { text: string; done: boolean }[];
  subtasks?: { text: string; done: boolean }[];
  comments?: { user: string; text: string; date: ISODate }[];
  attachments?: { name: string; size: string; type: string; url?: string }[];
  sprint?: string;
  createdDate: ISODate;
  completedDate?: ISODate;
}

export interface Automation {
  id: ID;
  name: string;
  description: string;
  trigger: string;
  triggerCategory: string;
  conditions: { field: string; operator: string; value: string }[];
  actions: { type: string; config: string }[];
  status: "Active" | "Paused";
  lastRun?: ISODate;
  runCount: number;
  createdBy: string;
  scheduleEnabled: boolean;
  scheduleIntervalMinutes?: number;
  nextRunAt?: ISODate;
}

export interface Notification {
  id: ID;
  category: string;
  title: string;
  description: string;
  timestamp: ISODate;
  read: boolean;
  link?: { module: string; id?: string };
  severity: "info" | "warning" | "critical";
}

// ---- Chat attachment ----
export interface ChatAttachment {
  id: ID;
  type: "image" | "file";
  name: string;
  size: number;
  mime: string;
  url?: string; // real HTTP URL from server-side object storage, e.g. "/api/storage/chat-attachments/xyz" (preferred)
  data?: string; // base64 data URL (client-side mock / legacy) - fall back to this if `url` is absent
}

// ---- Chat mention / channel-ref tokens ----
// Stored inline in `text` as `@[Name](entityId)` and `#[Name](channelId)`.
// Rendered as styled chips on display.
export type PresenceState = "online" | "idle" | "offline";

export interface MessageReaction {
  emoji: string;
  users: string[]; // entity ids
}

export interface ChatMessage {
  id: ID;
  conversationId: ID;
  sender: string;        // display name
  senderId?: string;     // entity id (for non-rean senders)
  senderRole: string;
  text: string;
  timestamp: ISODate;
  read: boolean;
  readBy?: string[];     // entity ids that have "read" the message (DMs only)
  isRean?: boolean;
  attachment?: ChatAttachment;
  reactions?: MessageReaction[];
  parentId?: ID;         // for threaded replies
  pinned?: boolean;
  deleted?: boolean;     // soft-delete tombstone - text is cleared, "This message was deleted" renders in its place
  edited?: boolean;
  editedAt?: ISODate;
  forwardedFrom?: { conversationId: ID; conversationName: string; sender: string };
  isPoll?: { question: string; options: { id: string; text: string; votes: string[] }[] };
  isCommandResult?: boolean;
}

export interface Conversation {
  id: ID;
  name: string;
  type: "direct" | "group" | "channel";
  participants: string[];
  lastMessage?: string;
  lastTimestamp?: ISODate;
  unread: number;
  description?: string;
  isMember?: boolean;
  private?: boolean;
  topic?: string;
  pinnedMessageIds?: ID[];
}

export interface ChatEntity {
  id: ID;
  name: string;
  email: string;
  role: string;
  avatar: string;
  branch: string;
  initials: string;
  presence?: PresenceState;
}

export interface ChatDraft {
  text: string;
  attachment?: ChatAttachment;
  replyToId?: ID;
  updatedAt: ISODate;
}

export interface TypingState {
  conversationId: ID;
  userId: string;
  name: string;
  until: ISODate; // when the typing indicator expires
}

// ---- Role archetypes for demo switching ----
export interface RoleArchetype {
  id: string;
  name: string;
  description: string;
  branch: string;
  permissions: string[];
  avatar: string;
  initials: string;
}

// ---- Widget types ----
export interface Widget {
  id: string;
  title: string;
  module: string;
  cols: 3 | 4 | 6 | 8 | 12;
  type: "stat" | "chart" | "list" | "alert" | "rean";
}
