import { z } from 'zod';
import { AuthError } from 'modelence';
import { Module, LiveData, ObjectId, UserInfo } from 'modelence/server';
import { dbAgentSessions } from './db';
import { runAgentSession } from './runner';
import { requireProjectRole, getMemberRole } from '../workspace/access';
import { dbProjects } from '../workspace/db';

const VIEWER_STALE_MS = 15_000;

function pruneViewers(viewers: any[]) {
  const cutoff = Date.now() - VIEWER_STALE_MS;
  return (viewers || []).filter((v) => new Date(v.lastSeenAt).getTime() >= cutoff);
}

// Loads a session and verifies the caller holds at least `min` role in its project.
async function requireSessionAccess(sessionId: string, user: UserInfo | null, min: 'viewer' | 'editor' | 'admin') {
  if (!user) {
    throw new AuthError('Not authenticated');
  }
  const session = await dbAgentSessions.findById(sessionId);
  if (!session) {
    throw new Error('Session not found');
  }
  const project = await requireProjectRole(session.projectId, user, min);
  return { session, project };
}

export default new Module('agent', {
  configSchema: {
    provider: {
      type: 'string',
      default: 'openai',
      isPublic: false,
    },
    model: {
      type: 'string',
      default: 'gpt-4o-mini',
      isPublic: false,
    },
  },

  stores: [dbAgentSessions],

  queries: {
    getSession: async (args: unknown, { user }: { user: UserInfo | null }) => {
      const { sessionId } = z.object({ sessionId: z.string() }).parse(args);
      const { session: initial } = await requireSessionAccess(sessionId, user, 'viewer');
      const projectId = initial.projectId;

      return new LiveData({
        fetch: async () => {
          const session = await dbAgentSessions.findById(sessionId);
          if (!session) {
            return null;
          }
          const project = await dbProjects.findById(projectId);
          return {
            _id: session._id.toString(),
            projectId,
            projectName: project?.name ?? '',
            role: project ? getMemberRole(project, user!.id) : null,
            title: session.title,
            task: session.task,
            status: session.status,
            ownerId: session.ownerId,
            ownerHandle: session.ownerHandle,
            createdById: session.createdById,
            createdByHandle: session.createdByHandle,
            parentSessionId: session.parentSessionId || null,
            forkedFromStepId: session.forkedFromStepId || null,
            steps: session.steps || [],
            redirects: session.redirects || [],
            viewers: pruneViewers(session.viewers),
            createdAt: session.createdAt,
            updatedAt: session.updatedAt,
          };
        },
        watch: ({ publish }) => {
          const pipeline = [{ $match: { 'documentKey._id': new ObjectId(sessionId) } }];
          const sessionStream = dbAgentSessions.watch(pipeline);
          const projectStream = dbProjects.watch([{ $match: { 'documentKey._id': new ObjectId(projectId) } }]);
          sessionStream.on('change', () => publish());
          projectStream.on('change', () => publish());
          return () => {
            sessionStream.close();
            projectStream.close();
          };
        },
      });
    },
  },

  mutations: {
    createSession: async (args: unknown, { user }: { user: UserInfo | null }) => {
      const { projectId, title, task } = z.object({
        projectId: z.string(),
        title: z.string().min(1).max(140),
        task: z.string().min(1).max(4000),
      }).parse(args);
      await requireProjectRole(projectId, user, 'editor');

      const now = new Date();
      const { insertedId } = await dbAgentSessions.insertOne({
        projectId,
        title,
        task,
        status: 'planning',
        ownerId: user!.id,
        ownerHandle: user!.handle,
        createdById: user!.id,
        createdByHandle: user!.handle,
        steps: [],
        redirects: [],
        viewers: [{ userId: user!.id, handle: user!.handle, lastSeenAt: now }],
        createdAt: now,
        updatedAt: now,
      });
      await dbProjects.updateOne(projectId, { $set: { updatedAt: now } });

      const sessionId = insertedId.toString();
      // Fire-and-forget: the agent runs in the background, the mutation returns immediately.
      runAgentSession(sessionId);

      return { sessionId };
    },

    forkSession: async (args: unknown, { user }: { user: UserInfo | null }) => {
      const { sessionId, stepId, newTaskInstruction } = z.object({
        sessionId: z.string(),
        stepId: z.string().optional(),
        newTaskInstruction: z.string().optional(),
      }).parse(args);

      const { session } = await requireSessionAccess(sessionId, user, 'editor');

      let initialSteps = session.steps || [];
      if (stepId) {
        const stepIdx = initialSteps.findIndex((s: any) => s.id === stepId);
        if (stepIdx !== -1) {
          initialSteps = initialSteps.slice(0, stepIdx + 1);
        }
      }

      const now = new Date();
      const cleanTitle = session.title.replace(/^🔀\s*\[Fork\]\s*/i, '');
      const newTitle = `🔀 [Fork] ${cleanTitle}`;
      const updatedTask = newTaskInstruction && newTaskInstruction.trim()
        ? `${session.task}\n\n[Çatallanma Yönlendirmesi / Fork Instruction]: ${newTaskInstruction.trim()}`
        : session.task;

      const forkNoticeStep = {
        id: new ObjectId().toString(),
        type: 'fork' as const,
        content: `🔀 Bu oturum, @${user!.handle} tarafından "${session.title}" oturumundan çatallandı.`,
        authorId: user!.id,
        authorHandle: user!.handle,
        createdAt: now,
      };

      const { insertedId } = await dbAgentSessions.insertOne({
        projectId: session.projectId,
        title: newTitle,
        task: updatedTask,
        status: 'planning',
        ownerId: user!.id,
        ownerHandle: user!.handle,
        createdById: user!.id,
        createdByHandle: user!.handle,
        parentSessionId: sessionId,
        forkedFromStepId: stepId,
        steps: [...initialSteps, forkNoticeStep],
        redirects: [],
        viewers: [{ userId: user!.id, handle: user!.handle, lastSeenAt: now }],
        createdAt: now,
        updatedAt: now,
      });

      await dbProjects.updateOne(session.projectId, { $set: { updatedAt: now } });

      const newSessionId = insertedId.toString();
      runAgentSession(newSessionId);

      return { sessionId: newSessionId };
    },

    addRedirect: async (args: unknown, { user }: { user: UserInfo | null }) => {
      const { sessionId, content } = z.object({
        sessionId: z.string(),
        content: z.string().min(1).max(2000),
      }).parse(args);
      const { session } = await requireSessionAccess(sessionId, user, 'editor');

      const redirectId = new ObjectId().toString();
      const now = new Date();

      await dbAgentSessions.updateOne(sessionId, {
        $push: {
          redirects: {
            id: redirectId,
            content,
            authorId: user!.id,
            authorHandle: user!.handle,
            createdAt: now,
            consumed: false,
          },
          steps: {
            id: redirectId,
            type: 'redirect',
            content: `${user!.handle}: ${content}`,
            authorId: user!.id,
            authorHandle: user!.handle,
            createdAt: now,
          },
        },
        $set: { updatedAt: now },
      });

      if (session.status === 'completed' || session.status === 'failed') {
        runAgentSession(sessionId);
      }
    },

    claimOwnership: async (args: unknown, { user }: { user: UserInfo | null }) => {
      const { sessionId } = z.object({ sessionId: z.string() }).parse(args);
      const { session } = await requireSessionAccess(sessionId, user, 'editor');

      if (session.ownerId === user!.id) {
        return;
      }

      await dbAgentSessions.updateOne(sessionId, {
        $set: { ownerId: user!.id, ownerHandle: user!.handle, updatedAt: new Date() },
        $push: {
          steps: {
            id: new ObjectId().toString(),
            type: 'system',
            content: `${user!.handle} took over from ${session.ownerHandle}`,
            authorId: user!.id,
            authorHandle: user!.handle,
            createdAt: new Date(),
          },
        },
      });
    },

    pingPresence: async (args: unknown, { user }: { user: UserInfo | null }) => {
      const { sessionId } = z.object({ sessionId: z.string() }).parse(args);
      const { session } = await requireSessionAccess(sessionId, user, 'viewer');

      const others = (session.viewers || []).filter((v: any) => v.userId !== user!.id);
      const viewers = pruneViewers([...others, { userId: user!.id, handle: user!.handle, lastSeenAt: new Date() }]);

      await dbAgentSessions.updateOne(sessionId, { $set: { viewers } });
    },
  },
});
