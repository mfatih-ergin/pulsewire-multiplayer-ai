import { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modelenceLiveQuery, modelenceMutation } from '@modelence/react-query';
import { useSession } from 'modelence/client';
import toast from 'react-hot-toast';
import { ArrowLeft, ArrowRight, Users, Clock, UserPlus, X, Eye, Star, Lock, Globe } from 'lucide-react';
import Page from '@/client/components/Page';
import SessionStatusBadge, { type SessionStatus } from '@/client/components/SessionStatusBadge';
import { Button } from '@/client/components/ui/Button';
import { IconButton } from '@/client/components/ui/IconButton';
import { Card, CardContent } from '@/client/components/ui/Card';
import { Input } from '@/client/components/ui/Input';
import { Textarea } from '@/client/components/ui/Textarea';
import { Badge } from '@/client/components/ui/Badge';
import { Select } from '@/client/components/ui/Select';
import { Avatar, AvatarFallback } from '@/client/components/ui/Avatar';
import { Skeleton } from '@/client/components/ui/Skeleton';

function ProjectSkeleton() {
  return (
    <div className="max-w-5xl mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Skeleton className="size-9 rounded-md" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-60 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}

type Role = 'admin' | 'editor' | 'viewer';

type ProjectDetail = {
  _id: string;
  name: string;
  description: string;
  role: Role;
  isPrivate: boolean;
  isStarred: boolean;
  starCount: number;
  members: { userId: string; handle: string; role: Role; addedAt: string }[];
  sessions: {
    _id: string;
    title: string;
    task: string;
    status: SessionStatus;
    ownerHandle: string;
    viewerCount: number;
    updatedAt: string;
  }[];
} | null;

const ROLE_OPTIONS = [
  { label: 'Admin', value: 'admin' },
  { label: 'Editor', value: 'editor' },
  { label: 'Viewer', value: 'viewer' },
];

const ROLE_HINT: Record<Role, string> = {
  admin: 'üyeleri yönetir, oturum başlatır ve devralır',
  editor: 'oturum başlatır ve devralır',
  viewer: 'sadece izler',
};

function initials(handle: string) {
  return handle.slice(0, 2).toUpperCase();
}

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();

  const [title, setTitle] = useState('');
  const [task, setTask] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [newRole, setNewRole] = useState<Role>('editor');

  const { data: project, isLoading, error } = useQuery({
    ...modelenceLiveQuery<ProjectDetail>('workspace.getProject', { projectId }),
    enabled: !!projectId,
  });

  const [isStarred, setIsStarred] = useState(false);
  const [starCount, setStarCount] = useState(0);

  useEffect(() => {
    if (project) {
      setIsStarred(project.isStarred);
      setStarCount(project.starCount);
    }
  }, [project?.isStarred, project?.starCount]);

  const onError = (err: Error) => toast.error(err.message);

  const { mutate: createSession, isPending: isCreating } = useMutation({
    ...modelenceMutation('agent.createSession'),
    onSuccess: (result: any) => navigate(`/sessions/${result.sessionId}`),
    onError,
  });

  const { mutate: addMember, isPending: isAdding } = useMutation({
    ...modelenceMutation('workspace.addMember'),
    onSuccess: () => { setIdentifier(''); toast.success('Üye eklendi'); },
    onError,
  });

  const { mutate: updateMemberRole } = useMutation({ ...modelenceMutation('workspace.updateMemberRole'), onError });
  const { mutate: removeMember } = useMutation({ ...modelenceMutation('workspace.removeMember'), onError });

  const { mutate: starProject } = useMutation({
    ...modelenceMutation('workspace.starProject'),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (err: Error) => {
      if (project) {
        setIsStarred(project.isStarred);
        setStarCount(project.starCount);
      }
      toast.error(err.message);
    },
  });

  const { mutate: unstarProject } = useMutation({
    ...modelenceMutation('workspace.unstarProject'),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (err: Error) => {
      if (project) {
        setIsStarred(project.isStarred);
        setStarCount(project.starCount);
      }
      toast.error(err.message);
    },
  });

  const { mutate: updateProjectVisibility } = useMutation({
    ...modelenceMutation('workspace.updateProjectVisibility'),
    onSuccess: () => {
      toast.success('Proje görünürlüğü güncellendi');
      queryClient.invalidateQueries();
    },
    onError,
  });

  if (isLoading) {
    return (
      <Page>
        <ProjectSkeleton />
      </Page>
    );
  }

  if (error || !project) {
    return (
      <Page>
        <div className="max-w-2xl mx-auto text-center py-16 text-muted-foreground">
          {error ? (error as Error).message : 'Proje bulunamadı.'}
          <div className="mt-4">
            <Link to="/"><Button variant="outline" size="sm">Ana Sayfaya Dön</Button></Link>
          </div>
        </div>
      </Page>
    );
  }

  const canEdit = project.role === 'admin' || project.role === 'editor';
  const isAdmin = project.role === 'admin';

  function handleCreateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!task.trim() || !projectId) return;
    createSession({ projectId, title: title.trim() || task.trim().slice(0, 60), task: task.trim() });
  }

  function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    if (!identifier.trim() || !projectId) return;
    addMember({ projectId, identifier: identifier.trim(), role: newRole });
  }

  function handleToggleStar() {
    if (!projectId) return;
    const nextState = !isStarred;
    setIsStarred(nextState);
    setStarCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));
    if (nextState) {
      starProject({ projectId });
    } else {
      unstarProject({ projectId });
    }
  }

  function handleToggleVisibility() {
    if (!projectId || !isAdmin) return;
    updateProjectVisibility({ projectId, isPrivate: !project?.isPrivate });
  }

  return (
    <Page seo={{ title: `${project.name} — Pulsewire` }}>
      <div className="max-w-5xl mx-auto w-full flex flex-col gap-6 animate-fade-in-up">
        
        {/* Header Bar */}
        <div className="flex items-center gap-3 flex-wrap">
          <Link to="/">
            <Button variant="ghost" size="sm"><ArrowLeft className="size-4" /></Button>
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="font-display text-xl font-semibold text-foreground truncate">{project.name}</h1>
              
              {/* Role Badge */}
              <Badge variant="outline" className="font-mono text-[10px] uppercase shrink-0">{project.role}</Badge>
              
              {/* Visibility Badge & Toggle */}
              {isAdmin ? (
                <button
                  onClick={handleToggleVisibility}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                  title="Görünürlüğü değiştirmek için tıklayın"
                >
                  {project.isPrivate ? (
                    <Badge variant="outline" className="gap-1 border-warning/60 text-warning text-[10px]">
                      <Lock className="size-3" /> Gizli Proje (Değiştir)
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 border-border text-muted-foreground text-[10px]">
                      <Globe className="size-3" /> Açık Proje (Değiştir)
                    </Badge>
                  )}
                </button>
              ) : (
                project.isPrivate ? (
                  <Badge variant="outline" className="gap-1 border-warning/60 text-warning text-[10px]">
                    <Lock className="size-3" /> Gizli Proje
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 border-border text-muted-foreground text-[10px]">
                    <Globe className="size-3" /> Açık Proje
                  </Badge>
                )
              )}
            </div>
            {project.description && <p className="text-sm text-muted-foreground truncate mt-0.5">{project.description}</p>}
          </div>

          {/* Star Action Button */}
          {user && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleStar}
              className={`gap-1.5 transition-all ${isStarred ? 'border-amber-500/50 bg-amber-950/20 text-amber-400' : ''}`}
            >
              <Star className={`size-4 ${isStarred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground'}`} />
              <span>{isStarred ? 'Yıldızlandı' : 'Yıldızla'}</span>
              <span className="font-mono text-xs opacity-80">({starCount})</span>
            </Button>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 min-w-0">
          <div className="space-y-4 min-w-0">
            {canEdit ? (
              <Card>
                <CardContent className="p-4 sm:p-5">
                  <form onSubmit={handleCreateSession} className="space-y-3">
                    <Input
                      placeholder="Oturum başlığı (isteğe bağlı — Örn: Flutter vs React Native)"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      maxLength={140}
                    />
                    <Textarea
                      placeholder="Yapay zeka ajanının neyi araştırmasını veya yapmasını istiyorsunuz?"
                      value={task}
                      onChange={(e) => setTask(e.target.value)}
                      rows={3}
                      maxLength={4000}
                    />
                    <div className="flex justify-end">
                      <Button type="submit" disabled={!task.trim()} loading={isCreating}>
                        Ajan Oturumunu Başlat
                        <ArrowRight className="size-4" />
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground border border-dashed border-border rounded-lg p-4">
                <Eye className="size-4 shrink-0" />
                Bu projede izleyici (viewer) rolündesiniz. Oturum başlatmak için yönetici veya editör olmanız gerekir.
              </div>
            )}

            <h2 className="font-display text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Ajan Oturumları (Gelişmiş Görevler)
            </h2>

            {project.sessions.length === 0 && (
              <div className="text-sm text-faint-foreground border border-dashed border-border rounded-lg p-6 text-center">
                Bu projede henüz aktif veya geçmiş bir ajan oturumu yok.
              </div>
            )}

            <div className="space-y-2">
              {project.sessions.map((session, i) => (
                <Link key={session._id} to={`/sessions/${session._id}`} className="block animate-fade-in-up" style={{ animationDelay: `${i * 30}ms` }}>
                  <Card className="hover:border-border-strong hover:bg-surface-hover transition-colors cursor-pointer">
                    <CardContent className="p-4 flex items-center gap-4 flex-wrap sm:flex-nowrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-foreground truncate">{session.title}</span>
                          <SessionStatusBadge status={session.status} />
                        </div>
                        <p className="text-sm text-muted-foreground truncate mt-0.5">{session.task}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-faint-foreground shrink-0 font-mono">
                        <Link
                          to={`/u/${session.ownerHandle}`}
                          onClick={(e) => e.stopPropagation()}
                          className="hover:text-signal hover:underline"
                        >
                          @{session.ownerHandle}
                        </Link>
                        <span className="flex items-center gap-1">
                          <Users className="size-3.5" />
                          {session.viewerCount}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="size-3.5" />
                          {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>

          <aside className="space-y-3">
            <h2 className="font-display text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Üyeler <span className="text-faint-foreground font-mono">({project.members.length})</span>
            </h2>

            <Card>
              <CardContent className="p-3 space-y-1">
                {project.members.map((m) => {
                  const isSelf = m.userId === user?.id;
                  return (
                    <div key={m.userId} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-hover transition-colors">
                      <Link to={`/u/${m.handle}`} className="shrink-0 group">
                        <Avatar className="size-7 ring-1 ring-border group-hover:ring-signal transition-all">
                          <AvatarFallback className="text-[10px] font-bold">{initials(m.handle)}</AvatarFallback>
                        </Avatar>
                      </Link>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-foreground truncate font-mono">
                          <Link to={`/u/${m.handle}`} className="font-semibold hover:text-signal hover:underline transition-colors">
                            {m.handle}
                          </Link>
                          {isSelf && <span className="text-faint-foreground"> (sen)</span>}
                        </div>
                        <div className="text-[11px] text-faint-foreground truncate">{ROLE_HINT[m.role]}</div>
                      </div>
                      {isAdmin ? (
                        <>
                          <Select
                            size="sm"
                            options={ROLE_OPTIONS}
                            value={m.role}
                            onValueChange={(role) => projectId && updateMemberRole({ projectId, userId: m.userId, role: role as Role })}
                          />
                          {!isSelf && (
                            <IconButton
                              aria-label={`Çıkar ${m.handle}`}
                              size="sm"
                              variant="ghost"
                              color="destructive"
                              onClick={() => projectId && removeMember({ projectId, userId: m.userId })}
                            >
                              <X className="size-4" />
                            </IconButton>
                          )}
                        </>
                      ) : (
                        <Badge variant="outline" className="font-mono text-[10px] uppercase">{m.role}</Badge>
                      )}
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {isAdmin && (
              <Card>
                <CardContent className="p-3">
                  <form onSubmit={handleAddMember} className="space-y-2">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium">
                      <UserPlus className="size-3.5" />
                      Ekip arkadaşı ekle
                    </div>
                    <Input
                      size="sm"
                      placeholder="kullanıcı adı veya e-posta"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Select
                        size="sm"
                        options={ROLE_OPTIONS}
                        value={newRole}
                        onValueChange={(v) => setNewRole(v as Role)}
                      />
                      <Button type="submit" size="sm" color="primary" className="flex-1" disabled={!identifier.trim()} loading={isAdding}>
                        Ekle
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </aside>
        </div>
      </div>
    </Page>
  );
}
