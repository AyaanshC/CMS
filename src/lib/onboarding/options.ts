import {z} from "zod";
export const intakeOptions=z.object({
 property_types:z.array(z.string().trim().min(1).max(60)).min(1).max(20),
 rooms:z.array(z.string().trim().min(1).max(60)).min(1).max(20),
 styles:z.array(z.object({id:z.string().trim().min(1).max(60),name:z.string().trim().min(1).max(60),desc:z.string().max(300),image:z.union([z.literal(""),z.url().refine(s=>s.startsWith("https://"))])})).min(1).max(12),
 budget_tiers:z.array(z.object({tier:z.string().trim().min(1).max(60),desc:z.string().max(300),estimate:z.number().finite().nonnegative().max(1e10)})).min(1).max(10)
});
export type IntakeOptions=z.infer<typeof intakeOptions>;
