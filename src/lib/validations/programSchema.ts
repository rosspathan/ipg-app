import { z } from "zod";

export const programOverviewSchema = z.object({
  name: z.string()
    .min(3, "Program name must be at least 3 characters")
    .max(100, "Program name must be less than 100 characters"),
  key: z.string()
    .min(3, "Program key must be at least 3 characters")
    .max(50, "Program key must be less than 50 characters")
    .regex(/^[a-z0-9-]+$/, "Program key must only contain lowercase letters, numbers, and hyphens"),
  description: z.string()
    .max(500, "Description must be less than 500 characters")
    .optional(),
  enabled_regions: z.array(z.string())
    .min(1, "Select at least one region"),
  enabled_roles: z.array(z.string())
    .min(1, "Select at least one role"),
});

export const programAccessSchema = z.object({
  kycLevel: z.enum(['any', 'L0', 'L1', 'L2']),
  badgeRequired: z.enum(['any', 'bronze', 'silver', 'gold', 'platinum']),
  minBalance: z.number().min(0, "Balance must be positive").max(100000, "Balance too high"),
  selectedRegions: z.array(z.string()).min(1, "Select at least one region"),
});

export type ProgramOverviewFormData = z.infer<typeof programOverviewSchema>;
export type ProgramAccessFormData = z.infer<typeof programAccessSchema>;
