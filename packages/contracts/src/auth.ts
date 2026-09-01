import { z } from "zod";

/** Public session user — never includes passwordHash, salt, or raw token. */
export const SessionUserSchema = z.object({
  id: z.string(),
  companyId: z.string(),
  email: z.string().email(),
  name: z.string(),
  role: z.string(),
});

export type SessionUserDto = z.infer<typeof SessionUserSchema>;

export const LoginRequestSchema = z.object({
  email: z.string().min(1).max(200),
  password: z.string().min(1),
});

export const LoginResponseSchema = z.object({
  user: SessionUserSchema,
});

export type LoginRequest = z.infer<typeof LoginRequestSchema>;
export type LoginResponse = z.infer<typeof LoginResponseSchema>;

export const MeResponseSchema = z.object({
  user: SessionUserSchema.nullable(),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;

export const LogoutResponseSchema = z.object({
  ok: z.literal(true),
});

export const ProfileSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  altEmail: z.string(),
  phone: z.string(),
  altPhone: z.string(),
  dob: z.string(),
  gender: z.string(),
  address: z.string(),
  jobTitle: z.string(),
  department: z.string(),
  reportingManager: z.string(),
  language: z.string(),
  timezone: z.string(),
});

export const ProfileResponseSchema = z.object({
  profile: ProfileSchema,
});

export const ProfilePatchSchema = z
  .object({
    name: z.string().optional(),
    phone: z.string().optional(),
    altEmail: z.string().optional(),
    altPhone: z.string().optional(),
    dob: z.string().optional(),
    gender: z.string().optional(),
    address: z.string().optional(),
    jobTitle: z.string().optional(),
    department: z.string().optional(),
    reportingManager: z.string().optional(),
    language: z.string().optional(),
    timezone: z.string().optional(),
  })
  .strict();

export const SignupRequestSchema = z.object({
  workEmail: z.string().min(1).max(200),
  password: z.string().min(1),
  companyName: z.string().min(1).max(200),
  contactName: z.string().min(1).max(200),
  phone: z.string().max(20).optional(),
  roleChoice: z.string().max(50).optional(),
  gstin: z.string().max(15).optional(),
  registeredState: z.string().max(100).optional(),
  legalEntity: z.string().max(100).optional(),
  businessType: z.string().max(100).optional(),
  subscriptionModel: z.string().max(50).optional(),
});

export const SignupDriverRequestSchema = z.object({
  email: z.string().min(1).max(200),
  password: z.string().min(1),
  name: z.string().min(1).max(200),
  phone: z.string().min(1).max(20),
  vehicleType: z.string().max(100).optional(),
  vehiclePlate: z.string().min(1).max(50),
});

export const SignupBrokerRequestSchema = z.object({
  email: z.string().min(1).max(200),
  password: z.string().min(1),
  companyName: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  phone: z.string().min(1).max(20),
  gstin: z.string().min(1).max(15),
});

export const SignupShipperRequestSchema = z.object({
  email: z.string().min(1).max(200),
  password: z.string().min(1),
  companyName: z.string().min(1).max(200),
  name: z.string().min(1).max(200),
  phone: z.string().min(1).max(20),
});

export const SwitchRoleRequestSchema = z.object({
  roleId: z.string().min(1),
});

export const ForgotPasswordRequestSchema = z.object({
  email: z.string().min(1).max(200),
  newPassword: z.string().optional(),
});

export const AuthSignupResponseSchema = z.object({
  user: SessionUserSchema,
});
