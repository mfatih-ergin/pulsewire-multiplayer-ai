import { Store, schema } from 'modelence/server';

// A single step in an agent session's live timeline.
const stepSchema = schema.object({
  id: schema.string(),
  // plan: initial breakdown: action/output: agent work; redirect: human steer;
  // system: ownership/status events; summary: final wrap-up; error: failure; fork: forked branch notice.
  type: schema.enum(['plan', 'action', 'output', 'redirect', 'system', 'summary', 'error', 'fork']),
  content: schema.string(),
  authorId: schema.string().optional(),
  authorHandle: schema.string().optional(),
  createdAt: schema.date(),
});

const redirectSchema = schema.object({
  id: schema.string(),
  content: schema.string(),
  authorId: schema.string(),
  authorHandle: schema.string(),
  createdAt: schema.date(),
  consumed: schema.boolean(),
});

const viewerSchema = schema.object({
  userId: schema.string(),
  handle: schema.string(),
  lastSeenAt: schema.date(),
});

export const dbAgentSessions = new Store('agentSessions', {
  schema: {
    projectId: schema.string(),
    title: schema.string(),
    task: schema.string(),
    status: schema.enum(['planning', 'running', 'needs_input', 'completed', 'failed']),
    ownerId: schema.string(),
    ownerHandle: schema.string(),
    createdById: schema.string(),
    createdByHandle: schema.string(),
    parentSessionId: schema.string().optional(),
    forkedFromStepId: schema.string().optional(),
    steps: schema.array(stepSchema),
    redirects: schema.array(redirectSchema),
    viewers: schema.array(viewerSchema),
    createdAt: schema.date(),
    updatedAt: schema.date(),
  },
  indexes: [
    { key: { createdAt: -1 } },
    { key: { projectId: 1, createdAt: -1 } },
  ],
});
