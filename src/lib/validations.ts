import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[a-zA-Z]/, "Must contain at least one letter")
    .regex(/[0-9]/, "Must contain at least one number"),
});

export const partSchema = z.object({
  mpn: z.string().min(1, "MPN is required"),
  manufacturer: z.string().min(1, "Manufacturer is required"),
  description: z.string().min(1, "Description is required"),
  footprint: z.string().min(1, "Footprint is required"),
  defaultUnitCost: z.coerce.number().min(0, "Cost must be >= 0"),
});

export const bomSchema = z.object({
  name: z.string().min(1, "BOM name is required"),
});

export const bomEntrySchema = z.object({
  partId: z.string().min(1, "Part is required"),
  unitCost: z.coerce.number().min(0, "Cost must be >= 0"),
  designators: z.array(z.string()).min(1, "At least one designator is required"),
});

export const uploadRowSchema = z.object({
  mpn: z.string().min(1),
  manufacturer: z.string().optional().default(""),
  description: z.string().optional().default(""),
  footprint: z.string().optional().default(""),
  unitCost: z.coerce.number().optional().default(0),
  designators: z.string().min(1, "Designators are required"),
});

export const uploadSchema = z.array(uploadRowSchema);

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type PartInput = z.infer<typeof partSchema>;
export type BomInput = z.infer<typeof bomSchema>;
export type BomEntryInput = z.infer<typeof bomEntrySchema>;
export type UploadRowInput = z.infer<typeof uploadRowSchema>;
