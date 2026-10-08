import { z } from 'zod';
import { AuthError } from 'modelence';
import { Module, LiveData, UserInfo, dbUsers } from 'modelence/server';
import { dbProjects, dbFollows, dbProjectStars } from './db';
import { dbAgentSessions } from '../agent/db';
import { getMemberRole, requireProjectRole } from './access';

const roleSchema = z.enum(['admin', 'editor', 'viewer']);

export default new Module('workspace', {
  stores: [dbProjects, dbFollows, dbProjectStars],

  queries: {
    listProjects: async (_args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) {
        throw new AuthError('Not authenticated');
      }
      return new LiveData({
        fetch: async () => {
          const projects = await dbProjects.fetch(
            { $or: [{ 'members.userId': user.id }, { isPrivate: { $ne: true } }] },
            { sort: { updatedAt: -1 } }
          );

          const projectIds = projects.map((p) => p._id.toString());
          const sessions = projectIds.length
            ? await dbAgentSessions.fetch({ projectId: { $in: projectIds } })
            : [];

          const userStars = await dbProjectStars.fetch({ userId: user.id });
          const starredIds = new Set(userStars.map((s) => s.projectId));

          const allStars = projectIds.length
            ? await dbProjectStars.fetch({ projectId: { $in: projectIds } })
            : [];
          const starCountMap: Record<string, number> = {};
          for (const s of allStars) {
            starCountMap[s.projectId] = (starCountMap[s.projectId] || 0) + 1;
          }

          const result = projects.map((p) => {
            const id = p._id.toString();
            const own = sessions.filter((s) => s.projectId === id);
            return {
              _id: id,
              name: p.name,
              description: p.description,
              role: getMemberRole(p, user.id),
              isPrivate: Boolean(p.isPrivate),
              isStarred: starredIds.has(id),
              starCount: starCountMap[id] || 0,
              memberCount: p.members.length,
              sessionCount: own.length,
              liveCount: own.filter((s) => s.status === 'planning' || s.status === 'running').length,
              updatedAt: p.updatedAt,
            };
          });

          return result.sort((a, b) => {
            if (a.isStarred !== b.isStarred) {
              return a.isStarred ? -1 : 1;
            }
            return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
          });
        },
        watch: ({ publish }) => {
          const projectStream = dbProjects.watch();
          const sessionStream = dbAgentSessions.watch();
          const starStream = dbProjectStars.watch();
          projectStream.on('change', () => publish());
          sessionStream.on('change', () => publish());
          starStream.on('change', () => publish());
          return () => {
            projectStream.close();
            sessionStream.close();
            starStream.close();
          };
        },
      });
    },

    getProject: async (args: unknown, { user }: { user: UserInfo | null }) => {
      const { projectId } = z.object({ projectId: z.string() }).parse(args);
      await requireProjectRole(projectId, user, 'viewer');

      return new LiveData({
        fetch: async () => {
          const project = await dbProjects.findById(projectId);
          if (!project) return null;
          const sessions = await dbAgentSessions.fetch(
            { projectId },
            { sort: { createdAt: -1 }, limit: 50 }
          );

          const isStarred = user
            ? (await dbProjectStars.fetch({ userId: user.id, projectId })).length > 0
            : false;
          const starCount = (await dbProjectStars.fetch({ projectId })).length;

          return {
            _id: project._id.toString(),
            name: project.name,
            description: project.description,
            isPrivate: Boolean(project.isPrivate),
            isStarred,
            starCount,
            role: user ? getMemberRole(project, user.id) : ('viewer' as const),
            members: project.members,
            sessions: sessions.map((s) => ({
              _id: s._id.toString(),
              title: s.title,
              task: s.task,
              status: s.status,
              ownerHandle: s.ownerHandle,
              viewerCount: (s.viewers || []).filter(
                (v: any) => Date.now() - new Date(v.lastSeenAt).getTime() < 15_000
              ).length,
              updatedAt: s.updatedAt,
            })),
          };
        },
        watch: ({ publish }) => {
          const projectStream = dbProjects.watch();
          const sessionStream = dbAgentSessions.watch([{ $match: { 'fullDocument.projectId': projectId } }], {
            fullDocument: 'updateLookup',
          });
          const starStream = dbProjectStars.watch();
          projectStream.on('change', () => publish());
          sessionStream.on('change', () => publish());
          starStream.on('change', () => publish());
          return () => {
            projectStream.close();
            sessionStream.close();
            starStream.close();
          };
        },
      });
    },

    getUserProfile: async (args: unknown, { user }: { user: UserInfo | null }) => {
      const { handle } = z.object({ handle: z.string() }).parse(args);

      return new LiveData({
        fetch: async () => {
          const targetUser = await dbUsers.findOne({ handle });
          if (!targetUser) return null;

          const targetUserId = targetUser._id.toString();

          const followers = await dbFollows.fetch({ followingId: targetUserId }, { sort: { createdAt: -1 } });
          const following = await dbFollows.fetch({ followerId: targetUserId }, { sort: { createdAt: -1 } });
          const followersCount = followers.length;
          const followingCount = following.length;

          const isFollowing = user
            ? (await dbFollows.fetch({ followerId: user.id, followingId: targetUserId })).length > 0
            : false;
          const isSelf = user ? user.id === targetUserId : false;

          const queryFilter = isSelf
            ? { 'members.userId': targetUserId }
            : { 'members.userId': targetUserId, isPrivate: { $ne: true } };

          const userProjects = await dbProjects.fetch(queryFilter, { sort: { updatedAt: -1 } });

          const sessions = await dbAgentSessions.fetch(
            { $or: [{ createdById: targetUserId }, { ownerId: targetUserId }] },
            { sort: { createdAt: -1 } }
          );

          const userStars = user ? await dbProjectStars.fetch({ userId: user.id }) : [];
          const starredIds = new Set(userStars.map((s) => s.projectId));

          const activityMap: Record<string, number> = {};

          for (const proj of userProjects) {
            if (proj.createdById === targetUserId && proj.createdAt) {
              const dStr = new Date(proj.createdAt).toISOString().split('T')[0];
              activityMap[dStr] = (activityMap[dStr] || 0) + 1;
            }
          }

          for (const sess of sessions) {
            if (sess.createdById === targetUserId && sess.createdAt) {
              const dStr = new Date(sess.createdAt).toISOString().split('T')[0];
              activityMap[dStr] = (activityMap[dStr] || 0) + 1;
            }
            if (sess.steps) {
              for (const step of sess.steps) {
                if (step.authorId === targetUserId && step.createdAt) {
                  const dStr = new Date(step.createdAt).toISOString().split('T')[0];
                  activityMap[dStr] = (activityMap[dStr] || 0) + 1;
                }
              }
            }
            if (sess.redirects) {
              for (const red of sess.redirects) {
                if (red.authorId === targetUserId && red.createdAt) {
                  const dStr = new Date(red.createdAt).toISOString().split('T')[0];
                  activityMap[dStr] = (activityMap[dStr] || 0) + 1;
                }
              }
            }
          }

          let totalContributions = 0;
          for (const count of Object.values(activityMap)) {
            totalContributions += count;
          }

          return {
            user: {
              id: targetUserId,
              handle: targetUser.handle,
              name: targetUser.name || targetUser.handle,
              createdAt: targetUser.createdAt || new Date(),
            },
            followersCount,
            followingCount,
            followers: followers.map((f) => ({ handle: f.followerHandle, id: f.followerId })),
            following: following.map((f) => ({ handle: f.followingHandle, id: f.followingId })),
            isFollowing,
            isSelf,
            projects: userProjects.map((p) => ({
              _id: p._id.toString(),
              name: p.name,
              description: p.description,
              isPrivate: Boolean(p.isPrivate),
              isStarred: starredIds.has(p._id.toString()),
              createdAt: p.createdAt,
              updatedAt: p.updatedAt,
              memberCount: p.members.length,
            })),
            sessionsCount: sessions.length,
            activityMap,
            totalContributions,
          };
        },
        watch: ({ publish }) => {
          const followStream = dbFollows.watch();
          const projectStream = dbProjects.watch();
          const sessionStream = dbAgentSessions.watch();
          const starStream = dbProjectStars.watch();
          followStream.on('change', () => publish());
          projectStream.on('change', () => publish());
          sessionStream.on('change', () => publish());
          starStream.on('change', () => publish());
          return () => {
            followStream.close();
            projectStream.close();
            sessionStream.close();
            starStream.close();
          };
        },
      });
    },
  },

  mutations: {
    createProject: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) {
        throw new AuthError('Not authenticated');
      }
      const { name, description, isPrivate } = z.object({
        name: z.string().min(1).max(80),
        description: z.string().max(500).default(''),
        isPrivate: z.boolean().default(false),
      }).parse(args);

      const now = new Date();
      const { insertedId } = await dbProjects.insertOne({
        name,
        description,
        isPrivate,
        createdById: user.id,
        createdByHandle: user.handle,
        members: [{ userId: user.id, handle: user.handle, role: 'admin', addedAt: now }],
        createdAt: now,
        updatedAt: now,
      });
      return { projectId: insertedId.toString() };
    },

    updateProjectVisibility: async (args: unknown, { user }: { user: UserInfo | null }) => {
      const { projectId, isPrivate } = z.object({ projectId: z.string(), isPrivate: z.boolean() }).parse(args);
      await requireProjectRole(projectId, user, 'admin');

      await dbProjects.updateOne(projectId, {
        $set: { isPrivate, updatedAt: new Date() },
      });
      return { success: true };
    },

    starProject: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');
      const { projectId } = z.object({ projectId: z.string() }).parse(args);

      const existing = await dbProjectStars.findOne({ userId: user.id, projectId });
      if (!existing) {
        await dbProjectStars.insertOne({
          userId: user.id,
          projectId,
          createdAt: new Date(),
        });
      }
      return { success: true };
    },

    unstarProject: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');
      const { projectId } = z.object({ projectId: z.string() }).parse(args);

      await dbProjectStars.deleteMany({ userId: user.id, projectId });
      return { success: true };
    },

    addMember: async (args: unknown, { user }: { user: UserInfo | null }) => {
      const { projectId, identifier, role } = z.object({
        projectId: z.string(),
        identifier: z.string().min(1).max(200),
        role: roleSchema,
      }).parse(args);
      const project = await requireProjectRole(projectId, user, 'admin');

      const needle = identifier.trim().toLowerCase();
      const target = await dbUsers.findOne({
        $or: [{ handle: identifier.trim() }, { 'emails.address': needle }],
      });
      if (!target) {
        throw new Error(`No user found for "${identifier}"`);
      }
      const targetId = target._id.toString();
      if (project.members.some((m) => m.userId === targetId)) {
        throw new Error(`${target.handle} is already a member`);
      }

      await dbProjects.updateOne(projectId, {
        $push: { members: { userId: targetId, handle: target.handle, role, addedAt: new Date() } },
        $set: { updatedAt: new Date() },
      });
    },

    updateMemberRole: async (args: unknown, { user }: { user: UserInfo | null }) => {
      const { projectId, userId, role } = z.object({
        projectId: z.string(),
        userId: z.string(),
        role: roleSchema,
      }).parse(args);
      const project = await requireProjectRole(projectId, user, 'admin');

      const admins = project.members.filter((m) => m.role === 'admin');
      if (admins.length === 1 && admins[0].userId === userId && role !== 'admin') {
        throw new Error('A project needs at least one admin');
      }

      const members = project.members.map((m) => (m.userId === userId ? { ...m, role } : m));
      await dbProjects.updateOne(projectId, { $set: { members, updatedAt: new Date() } });
    },

    removeMember: async (args: unknown, { user }: { user: UserInfo | null }) => {
      const { projectId, userId } = z.object({ projectId: z.string(), userId: z.string() }).parse(args);
      const project = await requireProjectRole(projectId, user, 'admin');

      const admins = project.members.filter((m) => m.role === 'admin');
      if (admins.length === 1 && admins[0].userId === userId) {
        throw new Error('A project needs at least one admin');
      }

      const members = project.members.filter((m) => m.userId !== userId);
      await dbProjects.updateOne(projectId, { $set: { members, updatedAt: new Date() } });
    },

    deleteProject: async (args: unknown, { user }: { user: UserInfo | null }) => {
      const { projectId } = z.object({ projectId: z.string() }).parse(args);
      await requireProjectRole(projectId, user, 'admin');

      await dbProjects.deleteOne(projectId);
      await dbAgentSessions.deleteMany({ projectId });
      await dbProjectStars.deleteMany({ projectId });
      return { success: true };
    },

    followUser: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');
      const { targetHandle } = z.object({ targetHandle: z.string() }).parse(args);

      const target = await dbUsers.findOne({ handle: targetHandle });
      if (!target) throw new Error('Kullanıcı bulunamadı');

      const targetId = target._id.toString();
      if (targetId === user.id) throw new Error('Kendinizi takip edemezsiniz');

      const existing = await dbFollows.findOne({ followerId: user.id, followingId: targetId });
      if (!existing) {
        await dbFollows.insertOne({
          followerId: user.id,
          followerHandle: user.handle,
          followingId: targetId,
          followingHandle: target.handle,
          createdAt: new Date(),
        });
      }
      return { success: true };
    },

    unfollowUser: async (args: unknown, { user }: { user: UserInfo | null }) => {
      if (!user) throw new AuthError('Not authenticated');
      const { targetHandle } = z.object({ targetHandle: z.string() }).parse(args);

      const target = await dbUsers.findOne({ handle: targetHandle });
      if (!target) throw new Error('Kullanıcı bulunamadı');

      await dbFollows.deleteMany({ followerId: user.id, followingId: target._id.toString() });
      return { success: true };
    },
  },
});
