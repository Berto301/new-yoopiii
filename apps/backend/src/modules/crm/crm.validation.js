import { z } from "zod";
import { CRM_PIPELINE_STAGES } from "./crm-metadata.model.js";

const objectId = z.string().regex(/^[a-f\d]{24}$/i, "Invalid id");

export const listCrmMetadataSchema = z.object({
  body: z.object({}).default({}),
  params: z.object({}).default({}),
  query: z.object({
    stage: z.enum(["all", ...CRM_PIPELINE_STAGES]).default("all"),
    search: z.string().trim().max(120).optional().or(z.literal(""))
  }).default({})
});

export const updateCrmPipelineSchema = z.object({
  body: z.object({
    pipelineStage: z.enum(CRM_PIPELINE_STAGES),
    nextAction: z.string().trim().max(240).optional().or(z.literal("")),
    priority: z.enum(["low", "medium", "high"]).optional()
  }),
  params: z.object({
    metadataId: objectId
  }),
  query: z.object({}).default({})
});
