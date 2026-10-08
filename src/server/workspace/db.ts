import { Store, schema } from 'modelence/server';

export type ProjectRole = 'admin' | 'editor' | 'viewer';

// admin: manage members + everything below
// editor: start sessions, steer, take over
// viewer: watch only
const memberSchema = schema.object({
  userId: schema.string(),
  handle: schema.string(),
  role: schema.enum(['admin', 'editor', 'viewer']),
  addedAt: schema.date(),
});

export const dbProjects = new Store('projects', {
  schema: {
    name: schema.string(),
    description: schema.string(),
    createdById: schema.string(),
    createdByHandle: schema.string(),
    members: schema.array(memberSchema),
    isPrivate: schema.boolean().optional(),
    createdAt: schema.date(),
    updatedAt: schema.date(),
  },
  indexes: [
    { key: { 'members.userId': 1 } },
    { key: { createdAt: -1 } },
  ],
});

export const dbFollows = new Store('follows', {
  schema: {
    followerId: schema.string(),
    followerHandle: schema.string(),
    followingId: schema.string(),
    followingHandle: schema.string(),
    createdAt: schema.date(),
  },
  indexes: [
    { key: { followerId: 1, followingId: 1 } },
    { key: { followerHandle: 1 } },
    { key: { followingHandle: 1 } },
  ],
});

export const dbProjectStars = new Store('projectStars', {
  schema: {
    userId: schema.string(),
    projectId: schema.string(),
    createdAt: schema.date(),
  },
  indexes: [
    { key: { userId: 1, projectId: 1 } },
    { key: { projectId: 1 } },
  ],
});

