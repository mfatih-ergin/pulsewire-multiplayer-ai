import { AuthError } from 'modelence';
import { UserInfo } from 'modelence/server';
import { dbProjects, ProjectRole } from './db';

const ROLE_RANK: Record<ProjectRole, number> = { viewer: 0, editor: 1, admin: 2 };

export function getMemberRole(project: { members: any[]; isPrivate?: boolean }, userId: string | null): ProjectRole | null {
  if (!userId) {
    return project.isPrivate ? null : 'viewer';
  }
  const member = (project.members || []).find((m) => m.userId === userId);
  if (member) return member.role as ProjectRole;
  return project.isPrivate ? null : 'viewer';
}

export function hasRole(project: { members: any[]; isPrivate?: boolean }, userId: string, min: ProjectRole) {
  const role = getMemberRole(project, userId);
  return role !== null && ROLE_RANK[role] >= ROLE_RANK[min];
}

// Loads the project and throws unless `user` is a member with at least `min` role,
// or the project is public for viewer access.
export async function requireProjectRole(projectId: string, user: UserInfo | null, min: ProjectRole) {
  const project = await dbProjects.findById(projectId);
  if (!project) {
    throw new Error('Project not found');
  }
  if (min === 'viewer' && !project.isPrivate) {
    return project;
  }
  if (!user) {
    throw new AuthError('Not authenticated');
  }
  if (!hasRole(project, user.id, min)) {
    throw new AuthError(
      min === 'viewer' ? 'You are not a member of this private project' : `This action requires the ${min} role`
    );
  }
  return project;
}
