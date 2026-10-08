import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modelenceLiveQuery, modelenceMutation } from '@modelence/react-query';
import { useSession } from 'modelence/client';
import toast from 'react-hot-toast';
import { Radio, Users, FolderKanban, ArrowRight, Plus, Trash2, Star, Lock, Globe } from 'lucide-react';
import Page from '@/client/components/Page';
import { Button } from '@/client/components/ui/Button';
import { IconButton } from '@/client/components/ui/IconButton';
import { Card, CardContent } from '@/client/components/ui/Card';
import { Input } from '@/client/components/ui/Input';
import { Badge } from '@/client/components/ui/Badge';
import { Checkbox } from '@/client/components/ui/Checkbox';
import { Skeleton } from '@/client/components/ui/Skeleton';

type ProjectSummary = {
  _id: string;
  name: string;
  description: string;
  role: 'admin' | 'editor' | 'viewer';
  isPrivate: boolean;
  isStarred: boolean;
  starCount: number;
  memberCount: number;
  sessionCount: number;
  liveCount: number;
  updatedAt: string;
};

function ProjectCard({
  project,
  animationDelay,
  onDelete,
}: {
  project: ProjectSummary;
  animationDelay: number;
  onDelete: (id: string, name: string) => void;
}) {
  const queryClient = useQueryClient();
  const [isStarred, setIsStarred] = useState(project.isStarred);
  const [starCount, setStarCount] = useState(project.starCount);

  useEffect(() => {
    setIsStarred(project.isStarred);
    setStarCount(project.starCount);
  }, [project.isStarred, project.starCount]);

  const { mutate: starProject } = useMutation({
    ...modelenceMutation('workspace.starProject'),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (err: Error) => {
      setIsStarred(project.isStarred);
      setStarCount(project.starCount);
      toast.error(err.message);
    },
  });

  const { mutate: unstarProject } = useMutation({
    ...modelenceMutation('workspace.unstarProject'),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (err: Error) => {
      setIsStarred(project.isStarred);
      setStarCount(project.starCount);
      toast.error(err.message);
    },
  });

  function handleToggleStar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();

    const nextState = !isStarred;
    setIsStarred(nextState);
    setStarCount((prev) => (nextState ? prev + 1 : Math.max(0, prev - 1)));

    if (nextState) {
      starProject({ projectId: project._id });
    } else {
      unstarProject({ projectId: project._id });
    }
  }

  return (
    <Link
      to={`/projects/${project._id}`}
      className="block animate-fade-in-up"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <Card className="hover:border-border-strong hover:bg-surface-hover transition-all cursor-pointer">
        <CardContent className="p-4 flex items-center gap-4">
          {/* Instant Optimistic Star Button */}
          <button
            onClick={handleToggleStar}
            className="p-1.5 rounded-md hover:bg-surface-hover active:scale-95 transition-all group/star cursor-pointer"
            title={isStarred ? 'Yıldızı Kaldır' : 'Yıldızla'}
          >
            <Star
              className={`size-5 transition-transform group-hover/star:scale-125 ${
                isStarred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground group-hover/star:text-amber-400'
              }`}
            />
          </button>

          <span className="flex items-center justify-center size-9 rounded-md bg-surface-elevated text-steer shrink-0">
            <FolderKanban className="size-4" />
          </span>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-foreground truncate">{project.name}</span>

              {/* Role Badge */}
              <Badge variant="outline" className="font-mono text-[10px] uppercase">
                {project.role}
              </Badge>

              {/* Visibility Badge */}
              {project.isPrivate ? (
                <Badge variant="outline" className="gap-1 border-warning/50 text-warning text-[10px]">
                  <Lock className="size-3" /> Gizli
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 border-border text-muted-foreground text-[10px]">
                  <Globe className="size-3" /> Açık
                </Badge>
              )}

              {project.liveCount > 0 && (
                <Badge variant="soft" className="gap-1.5">
                  <span className="size-1.5 rounded-full bg-signal animate-pulse-glow" />
                  {project.liveCount} canlı
                </Badge>
              )}
            </div>

            {project.description && (
              <p className="text-sm text-muted-foreground truncate mt-0.5">{project.description}</p>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-faint-foreground shrink-0 font-mono">
            {starCount > 0 && (
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Star className="size-3.5 fill-amber-400" />
                {starCount}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Users className="size-3.5" />
              {project.memberCount}
            </span>
            <span>{project.sessionCount} oturum</span>
          </div>

          {project.role === 'admin' && (
            <IconButton
              aria-label={`Sil ${project.name}`}
              size="sm"
              variant="ghost"
              color="destructive"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(project._id, project.name);
              }}
            >
              <Trash2 className="size-4" />
            </IconButton>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useSession();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const { data: projects, isLoading } = useQuery({
    ...modelenceLiveQuery<ProjectSummary[]>('workspace.listProjects', {}),
    enabled: !!user,
  });

  const { mutate: createProject, isPending } = useMutation({
    ...modelenceMutation('workspace.createProject'),
    onSuccess: (result: any) => navigate(`/projects/${result.projectId}`),
    onError: (err: Error) => toast.error(err.message),
  });

  const { mutate: deleteProject } = useMutation({
    ...modelenceMutation('workspace.deleteProject'),
    onSuccess: () => {
      toast.success('Proje silindi');
      queryClient.invalidateQueries();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    createProject({ name: name.trim(), description: description.trim(), isPrivate });
  }

  function handleDelete(id: string, projectName: string) {
    if (confirm(`"${projectName}" projesini silmek istediğinize emin misiniz?`)) {
      deleteProject({ projectId: id });
    }
  }

  return (
    <Page seo={{ title: 'Pulsewire — Takım Çalışmalı AI Workspace' }}>
      <div className="max-w-3xl mx-auto w-full flex-1 flex flex-col gap-10 py-6">
        <div className="text-center animate-fade-in-up">
          <span className="inline-flex items-center justify-center size-12 rounded-xl bg-signal-muted text-signal mb-4">
            <Radio className="size-6" />
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-foreground">
            İzle. Yönlendir. Devral.
          </h1>
          <p className="mt-3 text-muted-foreground max-w-md mx-auto">
            Yapay zeka ajan oturumları proje içinde çalışır. Projedeki herkes canlı izleyebilir;
            editörler yönlendirebilir ve yöneticiler davetleri yönetebilir.
          </p>
        </div>

        {!user ? (
          <Card className="animate-fade-in-up [animation-delay:80ms]">
            <CardContent className="p-5 sm:p-6 text-center text-muted-foreground">
              Projelerinizi görmek için <Link to="/login" className="text-steer hover:underline">giriş yapın</Link>.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3 animate-fade-in-up [animation-delay:80ms]">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Projeleriniz
              </h2>
              <Button size="sm" variant={showForm ? 'outline' : 'solid'} onClick={() => setShowForm((v) => !v)}>
                <Plus className="size-4" />
                Yeni Proje
              </Button>
            </div>

            {showForm && (
              <Card className="animate-fade-in">
                <CardContent className="p-4">
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <Input
                      placeholder="Proje adı, Örn: E-ticaret Ödeme Modülü"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      maxLength={80}
                      autoFocus
                    />
                    <Input
                      placeholder="Proje açıklaması (isteğe bağlı)"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      maxLength={500}
                    />

                    {/* Gizli Proje / Açık Proje Seçeneği */}
                    <div className="flex items-center gap-3 pt-1">
                      <Checkbox
                        id="isPrivate"
                        checked={isPrivate}
                        onCheckedChange={(checked) => setIsPrivate(Boolean(checked))}
                      />
                      <label
                        htmlFor="isPrivate"
                        className="text-xs font-medium text-foreground cursor-pointer flex items-center gap-1.5 select-none"
                      >
                        <Lock className="size-3.5 text-warning" />
                        <span>Gizli Proje Yap (Sadece eklenen üyeler görebilir)</span>
                      </label>
                    </div>

                    <div className="flex justify-end">
                      <Button type="submit" disabled={!name.trim()} loading={isPending}>
                        Proje Oluştur
                        <ArrowRight className="size-4" />
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            {isLoading && (
              <div className="space-y-2">
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
                <Skeleton className="h-20 w-full rounded-xl" />
              </div>
            )}

            {!isLoading && (!projects || projects.length === 0) && !showForm && (
              <div className="text-sm text-faint-foreground border border-dashed border-border rounded-lg p-8 text-center">
                <FolderKanban className="size-6 mx-auto mb-2 text-faint-foreground" />
                Henüz dahil olduğunuz bir proje yok. Yeni bir tane oluşturun veya bir ekip arkadaşınızdan sizi eklemesini isteyin.
              </div>
            )}

            <div className="space-y-2">
              {projects?.map((project, i) => (
                <ProjectCard
                  key={project._id}
                  project={project}
                  animationDelay={i * 40}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </Page>
  );
}
