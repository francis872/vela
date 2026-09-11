import { z } from "zod";

export const waitlistSignupSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  ventureName: z.string().trim().min(2).max(160),
  sector: z.string().trim().max(120).optional().or(z.literal("")),
  stage: z.enum(["idea", "validation", "traction", "growth"]).default("validation"),
  monthlyRevenue: z.union([z.string(), z.number()]).optional().nullable(),
  mainNeed: z.string().trim().max(2000).optional().or(z.literal("")),
  interestedInBeta: z.boolean().optional().default(false),
});

export type WaitlistSignupInput = z.infer<typeof waitlistSignupSchema>;

function parseRevenue(value: WaitlistSignupInput["monthlyRevenue"]): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numericValue) || numericValue < 0) {
    return null;
  }

  return numericValue;
}

export function normalizeWaitlistSignup(input: WaitlistSignupInput) {
  return {
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    phone: input.phone?.trim() || null,
    city: input.city?.trim() || null,
    ventureName: input.ventureName.trim(),
    sector: input.sector?.trim() || null,
    stage: input.stage,
    monthlyRevenue: parseRevenue(input.monthlyRevenue),
    mainNeed: input.mainNeed?.trim() || null,
    interestedInBeta: input.interestedInBeta ?? false,
  };
}