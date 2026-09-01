import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "../password";
import { sanitize } from "../sanitize";
import { AuthServiceError } from "../errors";
import type { SessionUser } from "../types";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface SignupDriverInput {
  email: string;
  password: string;
  name: string;
  phone: string;
  vehicleType?: string;
  vehiclePlate: string;
}

export async function signupDriver(
  db: PrismaClient,
  raw: SignupDriverInput,
): Promise<{ user: SessionUser; userId: string }> {
  const email = sanitize(raw.email, 200).toLowerCase().trim();
  const password = raw.password;
  const name = sanitize(raw.name, 200).trim();
  const phone = sanitize(raw.phone, 20).trim();
  const vehicleType = sanitize(raw.vehicleType ?? "FTL Truck", 100);
  const vehiclePlate = sanitize(raw.vehiclePlate, 50).toUpperCase().replace(/\s+/g, "").trim();

  if (!email || !password || !name || !phone || !vehiclePlate) {
    throw new AuthServiceError("VALIDATION_ERROR", "Missing required driver onboarding fields.", 400);
  }

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AuthServiceError("CONFLICT", "An account with this email already exists.", 409);
  }

  const existingVehicle = await db.vehicle.findUnique({ where: { licensePlate: vehiclePlate } });
  if (existingVehicle) {
    throw new AuthServiceError(
      "CONFLICT",
      "A vehicle with this license plate is already registered.",
      409,
    );
  }

  const company = await db.company.create({
    data: {
      legalName: `Driver: ${name}`,
      tradeName: `Driver: ${name}`,
      gstin: `DRV-${Date.now().toString(36).toUpperCase()}`,
      phone,
      email,
      status: "Active",
    },
  });

  const { hash, salt } = hashPassword(password);
  const user = await db.user.create({
    data: {
      companyId: company.id,
      email,
      name,
      role: "driver",
      status: "Active",
      phone,
      passwordHash: hash,
      salt,
    },
  });

  await db.driver.create({
    data: {
      companyId: company.id,
      name,
      email,
      phone,
      status: "Active",
      assignedVehicle: vehiclePlate,
    },
  });

  await db.vehicle.create({
    data: {
      companyId: company.id,
      name: vehicleType,
      licensePlate: vehiclePlate,
      type: vehicleType,
      status: "Idle",
      operator: name,
    },
  });

  return {
    userId: user.id,
    user: {
      id: user.id,
      companyId: user.companyId,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

export interface SignupBrokerInput {
  email: string;
  password: string;
  companyName: string;
  name: string;
  phone: string;
  gstin: string;
}

export async function signupBroker(
  db: PrismaClient,
  raw: SignupBrokerInput,
): Promise<{ user: SessionUser; userId: string }> {
  const email = sanitize(raw.email, 200).toLowerCase().trim();
  const password = raw.password;
  const companyName = sanitize(raw.companyName, 200).trim();
  const name = sanitize(raw.name, 200).trim();
  const phone = sanitize(raw.phone, 20).trim();
  const gstin = sanitize(raw.gstin, 15).toUpperCase().trim();

  if (!email || !password || !companyName || !name || !phone || !gstin) {
    throw new AuthServiceError("VALIDATION_ERROR", "Missing required broker registration fields.", 400);
  }
  if (!EMAIL_REGEX.test(email)) {
    throw new AuthServiceError("VALIDATION_ERROR", "Invalid email address format.", 400);
  }
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length < 10) {
    throw new AuthServiceError("VALIDATION_ERROR", "Phone number must be a valid 10-digit number.", 400);
  }
  if (password.length < 4) {
    throw new AuthServiceError("VALIDATION_ERROR", "Password must be at least 4 characters long.", 400);
  }

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AuthServiceError("CONFLICT", "An account with this email already exists.", 409);
  }

  const user = await db.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        legalName: companyName,
        tradeName: companyName,
        gstin,
        phone: cleanPhone.slice(-10),
        email,
        status: "Active",
      },
    });

    const { hash, salt } = hashPassword(password);
    const created = await tx.user.create({
      data: {
        companyId: company.id,
        email,
        name,
        role: "broker",
        status: "Active",
        phone: cleanPhone.slice(-10),
        passwordHash: hash,
        salt,
      },
    });

    const brokerCode = `RZB-${Math.floor(100000 + Math.random() * 900000)}`;
    await tx.brokerProfile.create({
      data: {
        userId: created.id,
        brokerCode,
        companyName,
        contactName: name,
        email,
        phone: cleanPhone.slice(-10),
        gstin,
        status: "Active",
      },
    });

    return created;
  });

  return {
    userId: user.id,
    user: {
      id: user.id,
      companyId: user.companyId,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}

export interface SignupShipperInput {
  email: string;
  password: string;
  companyName: string;
  name: string;
  phone: string;
}

export async function signupShipper(
  db: PrismaClient,
  raw: SignupShipperInput,
): Promise<{ user: SessionUser; userId: string }> {
  const email = sanitize(raw.email, 200).toLowerCase().trim();
  const password = raw.password;
  const companyName = sanitize(raw.companyName, 200).trim();
  const name = sanitize(raw.name, 200).trim();
  const phone = sanitize(raw.phone, 20).trim();

  if (!email || !password || !companyName || !name || !phone) {
    throw new AuthServiceError("VALIDATION_ERROR", "Missing required shipper registration fields.", 400);
  }
  if (!EMAIL_REGEX.test(email)) {
    throw new AuthServiceError("VALIDATION_ERROR", "Invalid email address format.", 400);
  }
  const cleanPhone = phone.replace(/\D/g, "");
  if (cleanPhone.length < 10) {
    throw new AuthServiceError("VALIDATION_ERROR", "Phone number must be a valid 10-digit number.", 400);
  }
  if (password.length < 4) {
    throw new AuthServiceError("VALIDATION_ERROR", "Password must be at least 4 characters long.", 400);
  }

  const existingUser = await db.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new AuthServiceError("CONFLICT", "An account with this email already exists.", 409);
  }

  const user = await db.$transaction(async (tx) => {
    const company = await tx.company.create({
      data: {
        legalName: companyName,
        tradeName: companyName,
        gstin: `GST-TEMP-${Date.now().toString(36).toUpperCase()}`,
        phone: cleanPhone.slice(-10),
        email,
        status: "Active",
      },
    });

    const { hash, salt } = hashPassword(password);
    const created = await tx.user.create({
      data: {
        companyId: company.id,
        email,
        name,
        role: "customer",
        status: "Active",
        phone: cleanPhone.slice(-10),
        passwordHash: hash,
        salt,
      },
    });

    await tx.customer.create({
      data: {
        companyId: company.id,
        companyName,
        contactPerson: name,
        phone: cleanPhone.slice(-10),
        email,
        userId: created.id,
        status: "Active",
      },
    });

    return created;
  });

  return {
    userId: user.id,
    user: {
      id: user.id,
      companyId: user.companyId,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  };
}
