import { useState, useEffect } from 'react';
import { useParams, Link, useSearchParams } from 'react-router';
import { useSession } from 'modelence/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { modelenceLiveQuery, modelenceMutation } from '@modelence/react-query';
import toast from 'react-hot-toast';
import {
  Users,
  FolderGit2,
  Calendar,
  UserCheck,
  UserPlus,
  Activity,
  Layers,
  GitCommit,
  Star,
  Lock,
  Globe,
} from 'lucide-react';
import Page from '@/client/components/Page';
import { Button } from '@/client/components/ui/Button';
import { Card, CardHeader, CardTitle, CardContent } from '@/client/components/ui/Card';
import { Badge } from '@/client/components/ui/Badge';
import { Skeleton } from '@/client/components/ui/Skeleton';
import { cn } from '@/client/lib/utils';

interface ProjectItem {
  _id: string;
  name: string;
  description: string;
  isPrivate: boolean;
  isStarred: boolean;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
}

interface FollowUser {
  handle: string;
  id: string;
}

interface UserProfileData {
  user: { id: string; handle: string; name: string; createdAt: string };
  followersCount: number;
  followingCount: number;
  followers: FollowUser[];
  following: FollowUser[];
  isFollowing: boolean;
  isSelf: boolean;
  projects: ProjectItem[];
  sessionsCount: number;
  activityMap: Record<string, number>;
  totalContributions: number;
}

function formatTurkishDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMonthYear(date: Date) {
  return date.toLocaleDateString('tr-TR', { month: 'short', year: 'numeric' });
}

function ProfileSkeleton() {
  return (
    <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 py-4 space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
        {/* Left Sidebar Skeleton */}
        <div className="lg:col-span-1 flex flex-col gap-5 p-5 bg-card/80 border border-border rounded-xl backdrop-blur-sm">
          <div className="flex flex-col items-center lg:items-start gap-4">
            <Skeleton className="size-28 sm:size-32 rounded-full" />
            <div className="space-y-2 w-full text-center lg:text-left">
              <Skeleton className="h-6 w-3/4 mx-auto lg:mx-0" />
              <Skeleton className="h-4 w-1/2 mx-auto lg:mx-0" />
            </div>
          </div>
          <Skeleton className="h-9 w-full rounded-md" />
          <div className="flex items-center gap-4 py-2 border-y border-border/60">
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-24" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
          </div>
        </div>

        {/* Right Main Content Skeleton */}
        <div className="lg:col-span-3 space-y-6">
          <div className="flex gap-4 border-b border-border pb-2">
            <Skeleton className="h-8 w-28 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
          {/* Heatmap skeleton */}
          <Skeleton className="h-48 w-full rounded-xl" />
          {/* Projects grid skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
            <Skeleton className="h-36 w-full rounded-xl" />
          </div>
        </div>
      </div>
    </div>
  );
}

function ProfileProjectCard({ p, currentUser }: { p: ProjectItem; currentUser: any }) {
  const queryClient = useQueryClient();
  const [isStarred, setIsStarred] = useState(p.isStarred);

  useEffect(() => {
    setIsStarred(p.isStarred);
  }, [p.isStarred]);

  const { mutate: starProject } = useMutation({
    ...modelenceMutation('workspace.starProject'),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (err: any) => {
      setIsStarred(p.isStarred);
      toast.error(err.message);
    },
  });

  const { mutate: unstarProject } = useMutation({
    ...modelenceMutation('workspace.unstarProject'),
    onSuccess: () => queryClient.invalidateQueries(),
    onError: (err: any) => {
      setIsStarred(p.isStarred);
      toast.error(err.message);
    },
  });

  function handleToggleStar(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
      toast.error('Proje yıldızlamak için giriş yapmalısınız');
      return;
    }
    const nextState = !isStarred;
    setIsStarred(nextState);
    if (nextState) {
      starProject({ projectId: p._id });
    } else {
      unstarProject({ projectId: p._id });
    }
  }

  return (
    <Link to={`/projects/${p._id}`} className="group block">
      <Card className="h-full border-border hover:border-signal/50 bg-card/80 hover:bg-card transition-all p-4 flex flex-col justify-between gap-3">
        <div>
          <div className="flex items-center justify-between gap-2">
            <span className="font-semibold text-foreground group-hover:text-signal transition-colors flex items-center gap-2">
              <FolderGit2 className="size-4 text-signal" />
              {p.name}
            </span>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleStar}
                className="p-1 rounded hover:bg-surface-hover transition-all cursor-pointer group/star"
                title={isStarred ? 'Yıldızı Kaldır' : 'Yıldızla'}
              >
                <Star
                  className={`size-4 transition-transform group-hover/star:scale-125 ${
                    isStarred ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground group-hover/star:text-amber-400'
                  }`}
                />
              </button>

              {p.isPrivate ? (
                <Badge variant="outline" className="text-[10px] border-warning/60 text-warning gap-1">
                  <Lock className="size-2.5" /> Gizli
                </Badge>
              ) : (
                <Badge variant="outline" className="text-[10px] text-muted-foreground gap-1">
                  <Globe className="size-2.5" /> Açık
                </Badge>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
            {p.description || 'Açıklama belirtilmedi.'}
          </p>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/40 font-mono">
          <span className="flex items-center gap-1">
            <Users className="size-3" />
            {p.memberCount} üye
          </span>
          <span>{formatTurkishDate(p.updatedAt)}</span>
        </div>
      </Card>
    </Link>
  );
}

export default function ProfilePage() {
  const { handle } = useParams<{ handle: string }>();
  const { user: currentUser } = useSession();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState<'overview' | 'projects' | 'stars' | 'followers' | 'following'>(
    tabParam === 'stars' ? 'stars' : 'overview'
  );

  useEffect(() => {
    if (tabParam === 'stars') {
      setActiveTab('stars');
    } else if (!tabParam) {
      setActiveTab('overview');
    }
  }, [tabParam]);

  const handleTabChange = (tab: 'overview' | 'projects' | 'stars' | 'followers' | 'following') => {
    setActiveTab(tab);
    if (tab === 'stars') {
      setSearchParams({ tab: 'stars' });
    } else {
      setSearchParams({});
    }
  };

  const { data: profile, isLoading, error } = useQuery({
    ...modelenceLiveQuery<UserProfileData>('workspace.getUserProfile', { handle: handle || '' }),
    enabled: !!handle,
  });

  const followMutation = useMutation({
    ...modelenceMutation('workspace.followUser'),
    onSuccess: () => {
      toast.success(`@${handle} takip ediliyor`);
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Takip etme başarısız oldu');
    },
  });

  const unfollowMutation = useMutation({
    ...modelenceMutation('workspace.unfollowUser'),
    onSuccess: () => {
      toast.success(`@${handle} takipten çıkarıldı`);
      queryClient.invalidateQueries();
    },
    onError: (err: any) => {
      toast.error(err.message || 'Takipten çıkarma başarısız oldu');
    },
  });

  if (isLoading) {
    return (
      <Page seo={{ title: `@${handle} | Pulsewire` }}>
        <ProfileSkeleton />
      </Page>
    );
  }

  if (error || !profile) {
    return (
      <Page seo={{ title: 'Kullanıcı Bulunamadı | Pulsewire' }}>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <h1 className="text-2xl font-bold text-destructive">Kullanıcı Bulunamadı</h1>
          <p className="text-muted-foreground">"@{handle}" kullanıcı adına sahip bir hesap mevcut değil.</p>
          <Link to="/">
            <Button variant="outline">Ana Sayfaya Dön</Button>
          </Link>
        </div>
      </Page>
    );
  }

  const { user, followersCount, followingCount, isFollowing, isSelf, projects, activityMap, totalContributions } = profile;
  const starredProjects = projects.filter((p) => p.isStarred);

  // Build GitHub-style 365-day contribution calendar data
  const today = new Date();
  const days: { dateStr: string; date: Date; count: number }[] = [];
  
  for (let i = 363; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    days.push({
      dateStr,
      date: d,
      count: activityMap[dateStr] || 0,
    });
  }

  const monthsHeader: { month: string; colIndex: number }[] = [];
  let lastMonth = -1;
  days.forEach((dayObj, index) => {
    const m = dayObj.date.getMonth();
    if (m !== lastMonth && index % 7 === 0) {
      monthsHeader.push({
        month: dayObj.date.toLocaleDateString('tr-TR', { month: 'short' }),
        colIndex: Math.floor(index / 7),
      });
      lastMonth = m;
    }
  });

  return (
    <Page seo={{ title: `${user.name} (@${user.handle}) | Pulsewire` }}>
      <div className="max-w-7xl mx-auto w-full px-2 sm:px-4 py-4 space-y-6">
        
        {/* Layout: Sidebar + Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          
          {/* Left Sidebar */}
          <div className="lg:col-span-1 flex flex-col gap-5 p-5 bg-card/80 border border-border rounded-xl backdrop-blur-sm">
            <div className="flex flex-col items-center lg:items-start gap-4">
              <div className="relative group">
                <div className="size-28 sm:size-32 rounded-full bg-gradient-to-br from-signal/40 via-signal-muted/30 to-card border-2 border-signal/60 flex items-center justify-center text-4xl font-bold font-mono text-signal uppercase shadow-lg shadow-signal/10">
                  {user.handle.slice(0, 2)}
                </div>
                <div className="absolute bottom-1 right-1 size-4 rounded-full bg-emerald-500 ring-4 ring-background" title="Çevrimiçi" />
              </div>

              <div className="text-center lg:text-left space-y-1">
                <h1 className="text-2xl font-bold font-display text-foreground tracking-tight">
                  {user.name}
                </h1>
                <p className="text-base text-muted-foreground font-mono">
                  @{user.handle}
                </p>
              </div>
            </div>

            {/* Follow / Unfollow Button */}
            {!isSelf && currentUser && (
              <div className="w-full pt-1">
                {isFollowing ? (
                  <Button
                    variant="outline"
                    className="w-full flex items-center justify-center gap-2 border-border hover:bg-destructive/10 hover:text-destructive hover:border-destructive transition-colors"
                    onClick={() => unfollowMutation.mutate({ targetHandle: user.handle })}
                    loading={unfollowMutation.isPending}
                  >
                    <UserCheck className="size-4 text-emerald-500" />
                    <span>Takip Ediliyor</span>
                  </Button>
                ) : (
                  <Button
                    variant="solid"
                    color="primary"
                    className="w-full flex items-center justify-center gap-2 bg-signal text-black font-semibold hover:bg-signal/90 shadow-md shadow-signal/20"
                    onClick={() => followMutation.mutate({ targetHandle: user.handle })}
                    loading={followMutation.isPending}
                  >
                    <UserPlus className="size-4" />
                    <span>Takip Et</span>
                  </Button>
                )}
              </div>
            )}

            {!currentUser && !isSelf && (
              <Link to="/login" className="w-full">
                <Button variant="outline" className="w-full">
                  Takip Etmek İçin Giriş Yap
                </Button>
              </Link>
            )}

            {/* Social Stats */}
            <div className="flex items-center gap-4 text-sm text-foreground py-2 border-y border-border/60">
              <button
                onClick={() => handleTabChange('followers')}
                className="flex items-center gap-1.5 hover:text-signal transition-colors group cursor-pointer"
              >
                <Users className="size-4 text-muted-foreground group-hover:text-signal" />
                <span className="font-bold">{followersCount}</span>
                <span className="text-muted-foreground">takipçi</span>
              </button>
              <span>·</span>
              <button
                onClick={() => handleTabChange('following')}
                className="flex items-center gap-1.5 hover:text-signal transition-colors group cursor-pointer"
              >
                <span className="font-bold">{followingCount}</span>
                <span className="text-muted-foreground">takip edilen</span>
              </button>
            </div>

            {/* User Meta Info */}
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <Calendar className="size-3.5 text-signal" />
                <span>{formatMonthYear(new Date(user.createdAt))} tarihinde katıldı</span>
              </div>
              <div className="flex items-center gap-2">
                <FolderGit2 className="size-3.5 text-signal" />
                <span>{projects.length} açık proje</span>
              </div>
            </div>
          </div>

          {/* Right Main Content */}
          <div className="lg:col-span-3 space-y-6">
            
            {/* Tabs Header */}
            <div className="flex items-center gap-2 border-b border-border overflow-x-auto pb-1">
              <button
                onClick={() => handleTabChange('overview')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer',
                  activeTab === 'overview'
                    ? 'border-signal text-signal font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Activity className="size-4" />
                Genel Bakış
              </button>
              
              <button
                onClick={() => handleTabChange('projects')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer',
                  activeTab === 'projects'
                    ? 'border-signal text-signal font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <FolderGit2 className="size-4" />
                Projeler
                <Badge variant="soft" className="ml-1 px-1.5 py-0.2 text-xs">
                  {projects.length}
                </Badge>
              </button>

              <button
                onClick={() => handleTabChange('stars')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer',
                  activeTab === 'stars'
                    ? 'border-signal text-signal font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Star className="size-4 text-amber-400 fill-amber-400" />
                Yıldızlananlar
                <Badge variant="soft" className="ml-1 px-1.5 py-0.2 text-xs">
                  {starredProjects.length}
                </Badge>
              </button>

              <button
                onClick={() => handleTabChange('followers')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer',
                  activeTab === 'followers'
                    ? 'border-signal text-signal font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Users className="size-4" />
                Takipçiler
                <Badge variant="soft" className="ml-1 px-1.5 py-0.2 text-xs">
                  {followersCount}
                </Badge>
              </button>

              <button
                onClick={() => handleTabChange('following')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer',
                  activeTab === 'following'
                    ? 'border-signal text-signal font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <UserCheck className="size-4" />
                Takip Edilenler
                <Badge variant="soft" className="ml-1 px-1.5 py-0.2 text-xs">
                  {followingCount}
                </Badge>
              </button>
            </div>

            {/* TAB CONTENT: OVERVIEW */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                
                {/* 365-Day Activity Heatmap Grid */}
                <Card className="border-border bg-card/60 backdrop-blur-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <GitCommit className="size-4 text-emerald-400" />
                        Son 1 yılda {totalContributions} aktivite & katkı
                      </span>
                      <span className="text-xs font-normal text-muted-foreground font-mono">
                        365 Günlük Takvim
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-zinc-700">
                      <div className="inline-block min-w-[700px] p-2 rounded-lg bg-zinc-950/80 border border-zinc-800">
                        <div className="flex text-[10px] text-muted-foreground font-mono mb-1 pl-6">
                          {monthsHeader.map((m, idx) => (
                            <span key={idx} className="flex-1 text-left">
                              {m.month}
                            </span>
                          ))}
                        </div>

                        <div className="flex gap-1">
                          <div className="flex flex-col justify-between text-[9px] font-mono text-muted-foreground pr-1 py-0.5 select-none">
                            <span>Pzt</span>
                            <span>Çar</span>
                            <span>Cum</span>
                          </div>

                          <div className="grid grid-flow-col grid-rows-7 gap-1">
                            {days.map((d, index) => {
                              let bgClass = 'bg-zinc-900 border-zinc-800/40';
                              if (d.count === 1 || d.count === 2) {
                                bgClass = 'bg-emerald-950 border-emerald-800/60 text-emerald-200';
                              } else if (d.count >= 3 && d.count <= 5) {
                                bgClass = 'bg-emerald-700 border-emerald-600 text-white';
                              } else if (d.count >= 6) {
                                bgClass = 'bg-emerald-400 border-emerald-300 text-black shadow-sm shadow-emerald-400/30';
                              }

                              return (
                                <div
                                  key={index}
                                  title={`${formatTurkishDate(d.dateStr)}: ${d.count} katkı`}
                                  className={cn(
                                    'size-3.5 rounded-[2px] border transition-transform hover:scale-125 hover:z-10 cursor-pointer',
                                    bgClass
                                  )}
                                />
                              );
                            })}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono mt-3 pt-2 border-t border-zinc-800/60 px-1">
                          <span>Modelence Agent & Ajan Aktivite Çalışmaları</span>
                          <div className="flex items-center gap-1.5">
                            <span>Az</span>
                            <div className="size-2.5 rounded-[2px] bg-zinc-900 border border-zinc-800" />
                            <div className="size-2.5 rounded-[2px] bg-emerald-950 border border-emerald-800/60" />
                            <div className="size-2.5 rounded-[2px] bg-emerald-700 border border-emerald-600" />
                            <div className="size-2.5 rounded-[2px] bg-emerald-400 border border-emerald-300" />
                            <span>Çok</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pinned Projects */}
                <div className="space-y-3">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Layers className="size-4 text-signal" />
                    Öne Çıkan Projeler ({projects.length})
                  </h3>

                  {projects.length === 0 ? (
                    <Card className="p-8 text-center border-dashed border-border bg-card/30">
                      <p className="text-muted-foreground text-sm">Henüz oluşturulmuş bir proje bulunmuyor.</p>
                    </Card>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projects.map((p: ProjectItem) => (
                        <ProfileProjectCard key={p._id} p={p} currentUser={currentUser} />
                      ))}
                    </div>
                  )}
                </div>

              </div>
            )}

            {/* TAB CONTENT: PROJECTS */}
            {activeTab === 'projects' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-foreground">Kullanıcı Projeleri</h3>
                  <span className="text-xs font-mono text-muted-foreground">Toplam {projects.length} proje</span>
                </div>

                {projects.length === 0 ? (
                  <Card className="p-8 text-center border-dashed border-border bg-card/30">
                    <p className="text-muted-foreground text-sm">Bu kullanıcıya ait herhangi bir proje yok.</p>
                  </Card>
                ) : (
                  <div className="space-y-3">
                    {projects.map((p: ProjectItem) => (
                      <ProfileProjectCard key={p._id} p={p} currentUser={currentUser} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: STARS */}
            {activeTab === 'stars' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-foreground flex items-center gap-2">
                    <Star className="size-4 text-amber-400 fill-amber-400" />
                    Yıldızlanan Projeler
                  </h3>
                  <span className="text-xs font-mono text-muted-foreground">Toplam {starredProjects.length} proje</span>
                </div>

                {starredProjects.length === 0 ? (
                  <Card className="p-10 text-center border-dashed border-border bg-card/30 flex flex-col items-center justify-center gap-3">
                    <div className="size-12 rounded-full bg-amber-950/40 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                      <Star className="size-6 fill-amber-400" />
                    </div>
                    <div className="space-y-1 max-w-sm">
                      <h4 className="font-semibold text-foreground text-base">Henüz yıldızlanan bir proje yok</h4>
                      <p className="text-xs text-muted-foreground">
                        Beğendiğiniz veya takip etmek istediğiniz projelerin yanındaki yıldız simgesine tıklayarak buraya ekleyebilirsiniz.
                      </p>
                    </div>
                    <Link to="/" className="mt-2">
                      <Button variant="outline" size="sm">Projeleri Keşfet</Button>
                    </Link>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {starredProjects.map((p: ProjectItem) => (
                      <ProfileProjectCard key={p._id} p={p} currentUser={currentUser} />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: FOLLOWERS */}
            {activeTab === 'followers' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-foreground">Takipçiler ({profile.followers.length})</h3>

                {profile.followers.length === 0 ? (
                  <Card className="p-8 text-center border-dashed border-border bg-card/30">
                    <p className="text-muted-foreground text-sm">Henüz takipçisi bulunmuyor.</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile.followers.map((f: FollowUser) => (
                      <Link key={f.id} to={`/u/${f.handle}`} className="group">
                        <Card className="p-3 border-border hover:border-signal/50 bg-card/80 hover:bg-card transition-all flex items-center gap-3">
                          <div className="size-9 rounded-full bg-signal-muted/40 text-signal border border-signal/40 flex items-center justify-center font-bold text-sm uppercase font-mono">
                            {f.handle.slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-medium text-foreground group-hover:text-signal transition-colors block text-sm">
                              @{f.handle}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">Pulsewire Geliştiricisi</span>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: FOLLOWING */}
            {activeTab === 'following' && (
              <div className="space-y-4">
                <h3 className="text-base font-semibold text-foreground">Takip Edilenler ({profile.following.length})</h3>

                {profile.following.length === 0 ? (
                  <Card className="p-8 text-center border-dashed border-border bg-card/30">
                    <p className="text-muted-foreground text-sm">Henüz kimseyi takip etmiyor.</p>
                  </Card>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {profile.following.map((f: FollowUser) => (
                      <Link key={f.id} to={`/u/${f.handle}`} className="group">
                        <Card className="p-3 border-border hover:border-signal/50 bg-card/80 hover:bg-card transition-all flex items-center gap-3">
                          <div className="size-9 rounded-full bg-signal-muted/40 text-signal border border-signal/40 flex items-center justify-center font-bold text-sm uppercase font-mono">
                            {f.handle.slice(0, 2)}
                          </div>
                          <div>
                            <span className="font-medium text-foreground group-hover:text-signal transition-colors block text-sm">
                              @{f.handle}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">Pulsewire Geliştiricisi</span>
                          </div>
                        </Card>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

      </div>
    </Page>
  );
}
