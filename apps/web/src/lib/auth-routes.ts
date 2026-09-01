import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  AuthServiceError,
  legacyAuthErrorBody,
  loginUser,
  signupOwner,
  signupDriver,
  signupBroker,
  signupShipper,
  getProfile,
  patchProfile,
  switchRole,
  forgotPassword,
} from "@reanzly/auth";
import { createSession, destroySession, getSessionUser } from "@/lib/auth";
import type { NextRequest } from "next/server";

export function handleAuthRouteError(
  error: unknown,
  fallback = "Internal Server Error. Please contact your administrator.",
): NextResponse {
  if (error instanceof AuthServiceError) {
    return NextResponse.json(legacyAuthErrorBody(error), { status: error.status });
  }
  console.error("Auth route error:", error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}

export async function handleLogin(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const result = await loginUser(db, {
    email: String(body?.email || ""),
    password: String(body?.password || ""),
  });
  await createSession(result.userId);
  return NextResponse.json({ user: result.user });
}

export async function handleLogout() {
  await destroySession();
  return NextResponse.json({ ok: true });
}

export async function handleMe() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });
  return NextResponse.json({ user });
}

export async function handleProfileGet() {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const profile = await getProfile(db, sessionUser.id);
  return NextResponse.json({ profile });
}

export async function handleProfilePatch(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const body = await req.json();
  const profile = await patchProfile(db, sessionUser.id, body);
  return NextResponse.json({ profile });
}

export async function handleSignup(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    throw new AuthServiceError("VALIDATION_ERROR", "Invalid request payload.", 400);
  }
  const result = await signupOwner(db, {
    workEmail: String(body.workEmail || ""),
    password: String(body.password || ""),
    companyName: String(body.companyName || ""),
    contactName: String(body.contactName || ""),
    phone: String(body.phone || ""),
    roleChoice: String(body.roleChoice || "owner"),
    gstin: String(body.gstin || ""),
    registeredState: String(body.registeredState || ""),
  });
  await createSession(result.userId);
  return NextResponse.json({ user: result.user });
}

export async function handleSignupDriver(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    throw new AuthServiceError("VALIDATION_ERROR", "Invalid request payload.", 400);
  }
  const result = await signupDriver(db, {
    email: String(body.email || ""),
    password: String(body.password || ""),
    name: String(body.name || ""),
    phone: String(body.phone || ""),
    vehicleType: String(body.vehicleType || "FTL Truck"),
    vehiclePlate: String(body.vehiclePlate || ""),
  });
  await createSession(result.userId);
  return NextResponse.json({ user: result.user });
}

export async function handleSignupBroker(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    throw new AuthServiceError("VALIDATION_ERROR", "Invalid request payload.", 400);
  }
  const result = await signupBroker(db, {
    email: String(body.email || ""),
    password: String(body.password || ""),
    companyName: String(body.companyName || ""),
    name: String(body.name || ""),
    phone: String(body.phone || ""),
    gstin: String(body.gstin || ""),
  });
  await createSession(result.userId);
  return NextResponse.json({ user: result.user });
}

export async function handleSignupShipper(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    throw new AuthServiceError("VALIDATION_ERROR", "Invalid request payload.", 400);
  }
  const result = await signupShipper(db, {
    email: String(body.email || ""),
    password: String(body.password || ""),
    companyName: String(body.companyName || ""),
    name: String(body.name || ""),
    phone: String(body.phone || ""),
  });
  await createSession(result.userId);
  return NextResponse.json({ user: result.user });
}

export async function handleSwitchRole(req: NextRequest) {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const result = await switchRole(db, sessionUser, String(body?.roleId || ""));
  await destroySession();
  await createSession(result.userId);
  return NextResponse.json({ user: result.user });
}

export async function handleForgotPassword(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || !body.email) {
    throw new AuthServiceError("VALIDATION_ERROR", "Work email is required.", 400);
  }
  const result = await forgotPassword(db, {
    email: String(body.email),
    newPassword: body.newPassword ? String(body.newPassword) : undefined,
  });
  return NextResponse.json(result);
}
