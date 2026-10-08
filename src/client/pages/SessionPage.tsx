import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router';
import { useQuery, useMutation } from '@tanstack/react-query';
import { modelenceLiveQuery, modelenceMutation } from '@modelence/react-query';
import { useSession } from 'modelence/client';
import {
  ArrowLeft, Send, Crown, Users, Sparkles, Terminal, FileText,
  MessageSquareWarning, AlertTriangle, CheckCircle2, GitFork,
} from 'lucide-react';
import Page from '@/client/components/Page';
import { Button } from '@/client/components/ui/Button';
import { Card, CardContent } from '@/client/components/ui/Card';
import { Textarea } from '@/client/components/ui/Textarea';
import { Badge } from '@/client/components/ui/Badge';
import { Avatar, AvatarFallback } from '@/client/components/ui/Avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/client/components/ui/Dialog';

type Step = {
  id: string;
  type: 'plan' | 'action' | 'output' | 'redirect' | 'system' | 'summary' | 'error' | 'fork';
  content: string;
  authorId?: string;
  authorHandle?: string;
  createdAt: string;
};

type Viewer = { userId: string; handle: string; lastSeenAt: string };

type SessionDetail = {
  _id: string;
  title: string;
  task: string;
  status: 'planning' | 'running' | 'needs_input' | 'completed' | 'failed';
  ownerId: string;
  ownerHandle: string;
  createdById: string;
  createdByHandle: string;
  parentSessionId?: string | null;
  forkedFromStepId?: string | null;
  steps: Step[];
  redirects: { id: string; content: string; authorHandle: string; createdAt: string; consumed: boolean }[];
  viewers: Viewer[];
  createdAt: string;
  updatedAt: string;
} | null;

const STATUS_LABEL: Record<NonNullable<SessionDetail>['status'], string> = {
  planning: 'Düşünüyor / Planlıyor',
  running: 'Canlı İşlem Yapıyor',
  needs_input: 'Girdi Bekleniyor',
  completed: 'Tamamlandı',
  failed: 'Hata Oluştu',
};

const STEP_META: Record<Step['type'], {
  badge: string;
  icon: React.ReactNode;
  cardClass: string;
  badgeClass: string;
  title?: string;
}> = {
  plan: {
    badge: '🧠 DÜŞÜNME VE PLANLAMA AŞAMASI',
    icon: <Sparkles className="size-4 text-purple-400" />,
    cardClass: 'border-purple-900/40 bg-purple-950/20',
    badgeClass: 'bg-purple-950/70 text-purple-300 border-purple-800/60',
    title: 'Ajan Görev Çalışma Planını Hazırladı:',
  },
  action: {
    badge: '⚙️ İŞLEM ADIMI',
    icon: <Terminal className="size-4 text-cyan-400" />,
    cardClass: 'border-cyan-900/40 bg-cyan-950/20',
    badgeClass: 'bg-cyan-950/60 text-cyan-300 border-cyan-800/50',
  },
  output: {
    badge: '📊 ADIM ÇIKTISI VE İNCELEME BULGUSU',
    icon: <FileText className="size-4 text-emerald-400" />,
    cardClass: 'border-emerald-700/50 bg-emerald-950/30 ring-1 ring-emerald-500/20',
    badgeClass: 'bg-emerald-950/80 text-emerald-300 border-emerald-600/60 font-semibold',
    title: 'İnceleme Sonucu / Adım Çıktısı:',
  },
  redirect: {
    badge: '🎯 CANLI EKİP YÖNLENDİRMESİ',
    icon: <MessageSquareWarning className="size-4 text-sky-400" />,
    cardClass: 'border-sky-800/40 bg-sky-950/20',
    badgeClass: 'bg-sky-950/60 text-sky-300 border-sky-800/50',
  },
  system: {
    badge: '⚙️ SİSTEM YÖNLENDİRMESİ',
    icon: <Crown className="size-4 text-warning" />,
    cardClass: 'border-border bg-surface/50',
    badgeClass: 'bg-surface-elevated text-muted-foreground border-border',
  },
  summary: {
    badge: '✅ NİHAİ RAPOR VE SONUÇ ÇIKTISI',
    icon: <CheckCircle2 className="size-5 text-signal" />,
    cardClass: 'border-signal/60 bg-signal-muted/20 shadow-lg shadow-signal/5 ring-2 ring-signal/40',
    badgeClass: 'bg-signal-muted text-signal border-signal/50 font-bold',
    title: '🎯 Görev Başarıyla Tamamlandı — Nihai Rapor Çıktısı:',
  },
  error: {
    badge: '❌ HATA',
    icon: <AlertTriangle className="size-4 text-destructive" />,
    cardClass: 'border-destructive/40 bg-destructive-muted/20',
    badgeClass: 'bg-destructive-muted text-destructive border-destructive/40',
  },
  fork: {
    badge: '🔀 ÇATALLANMIŞ OTURUM (FORK)',
    icon: <GitFork className="size-4 text-amber-400" />,
    cardClass: 'border-amber-700/50 bg-amber-950/20 ring-1 ring-amber-500/20',
    badgeClass: 'bg-amber-950/70 text-amber-300 border-amber-800/60 font-semibold',
  },
};

function initials(handle: string) {
  return handle.slice(0, 2).toUpperCase();
}

export default function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { user } = useSession();
  const navigate = useNavigate();

  const [redirectText, setRedirectText] = useState('');
  const [forkModalOpen, setForkModalOpen] = useState(false);
  const [targetForkStepId, setTargetForkStepId] = useState<string | undefined>();
  const [forkInstruction, setForkInstruction] = useState('');

  const feedEndRef = useRef<HTMLDivElement>(null);

  const { data: session, isLoading } = useQuery({
    ...modelenceLiveQuery<SessionDetail>('agent.getSession', { sessionId }),
    enabled: !!user && !!sessionId,
  });

  const { mutate: addRedirect, isPending: isSending } = useMutation({
    ...modelenceMutation('agent.addRedirect'),
    onSuccess: () => setRedirectText(''),
  });

  const { mutate: claimOwnership } = useMutation({
    ...modelenceMutation('agent.claimOwnership'),
  });

  const { mutate: pingPresence } = useMutation({
    ...modelenceMutation('agent.pingPresence'),
  });

  const { mutate: forkSession, isPending: isForking } = useMutation({
    ...modelenceMutation('agent.forkSession'),
    onSuccess: (res: any) => {
      setForkModalOpen(false);
      setForkInstruction('');
      setTargetForkStepId(undefined);
      if (res?.sessionId) {
        navigate(`/sessions/${res.sessionId}`);
      }
    },
  });

  useEffect(() => {
    if (!sessionId || !user) return;
    pingPresence({ sessionId });
    const interval = setInterval(() => pingPresence({ sessionId }), 5000);
    return () => clearInterval(interval);
  }, [sessionId, user, pingPresence]);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session?.steps.length]);

  function handleRedirect(e: React.FormEvent) {
    e.preventDefault();
    if (!redirectText.trim() || !sessionId) return;
    addRedirect({ sessionId, content: redirectText.trim() });
  }

  function handleOpenFork(stepId?: string) {
    setTargetForkStepId(stepId);
    setForkModalOpen(true);
  }

  function handleExecuteFork(e: React.FormEvent) {
    e.preventDefault();
    if (!sessionId) return;
    forkSession({
      sessionId,
      stepId: targetForkStepId,
      newTaskInstruction: forkInstruction,
    });
  }

  if (isLoading) {
    return <Page isLoading />;
  }

  if (!session) {
    return (
      <Page>
        <div className="max-w-2xl mx-auto text-center py-16 text-muted-foreground">
          Session not found.
          <div className="mt-4">
            <Link to="/"><Button variant="outline" size="sm">Back home</Button></Link>
          </div>
        </div>
      </Page>
    );
  }

  const isOwner = user?.id === session.ownerId;
  const isLive = session.status === 'running' || session.status === 'planning';

  return (
    <Page className="max-w-4xl mx-auto w-full h-[calc(100vh-70px)] p-2 sm:p-4 flex flex-col overflow-hidden">
      <div className="flex flex-col h-full min-h-0 bg-surface/30 rounded-xl border border-border/70 shadow-2xl overflow-hidden animate-fade-in-up">
        {/* Fixed Top Session Header (ChatGPT / Claude style) */}
        <div className="shrink-0 px-4 py-3 bg-surface-elevated/90 backdrop-blur-md border-b border-border/80 space-y-2.5">
          <div className="flex items-center gap-2">
            <Link to="/">
              <Button variant="ghost" size="sm"><ArrowLeft className="size-4" /></Button>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-lg font-semibold text-foreground truncate">{session.title}</h1>
                {session.parentSessionId && (
                  <Link to={`/sessions/${session.parentSessionId}`}>
                    <Badge variant="outline" className="gap-1 text-[10px] text-amber-400 border-amber-500/40 hover:bg-amber-950/40 transition-colors">
                      <GitFork className="size-3" />
                      Ana Oturum
                    </Badge>
                  </Link>
                )}
                {isLive ? (
                  <Badge color="neutral" variant="soft" className="gap-1.5 shrink-0">
                    <span className="size-1.5 rounded-full bg-signal animate-pulse-glow" />
                    {STATUS_LABEL[session.status]}
                  </Badge>
                ) : (
                  <Badge
                    color={session.status === 'failed' ? 'destructive' : 'neutral'}
                    variant="outline"
                    className="shrink-0"
                  >
                    {STATUS_LABEL[session.status]}
                  </Badge>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate mt-0.5">{session.task}</p>
            </div>

            {/* Fork Button in Header */}
            {user && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs text-amber-300 border-amber-500/40 hover:bg-amber-950/40 hover:border-amber-400 shrink-0"
                onClick={() => handleOpenFork()}
              >
                <GitFork className="size-3.5 text-amber-400" />
                <span>Çatalla (Fork)</span>
              </Button>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-faint-foreground font-mono pt-2 border-t border-border/40">
            <div className="flex items-center gap-2">
              <Crown className="size-3.5 text-warning" />
              owner: <Link to={`/u/${session.ownerHandle}`} className="font-semibold text-foreground hover:text-signal hover:underline">@{session.ownerHandle}</Link>
              {!isOwner && user && (
                <Button
                  variant="link"
                  color="primary"
                  size="sm"
                  className="h-auto p-0 text-xs"
                  onClick={() => sessionId && claimOwnership({ sessionId })}
                >
                  take over
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Users className="size-3.5" />
              <div className="flex -space-x-2">
                {session.viewers.map((v) => (
                  <Link key={v.userId} to={`/u/${v.handle}`} title={`@${v.handle}`}>
                    <Avatar className="size-6 border-2 border-background hover:scale-110 hover:border-signal transition-all">
                      <AvatarFallback className="text-[10px]">{initials(v.handle)}</AvatarFallback>
                    </Avatar>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Conversation Feed (ChatGPT style internal scrolling) */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3.5 min-h-0 scroll-smooth">
          {session.steps.map((step) => {
            const meta = STEP_META[step.type] || STEP_META.output;
            return (
              <Card key={step.id} className={`group relative animate-slide-in-right ${meta.cardClass}`}>
                <CardContent className="p-4 flex gap-3">
                  <div className="shrink-0 mt-0.5">{meta.icon}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <Badge variant="outline" className={`text-[10px] tracking-wider uppercase font-mono ${meta.badgeClass}`}>
                        {meta.badge}
                      </Badge>
                      {step.authorHandle && (
                        <Link to={`/u/${step.authorHandle}`} className="font-mono text-xs text-faint-foreground hover:text-signal hover:underline transition-colors">
                          @{step.authorHandle}
                        </Link>
                      )}
                      
                      <div className="ml-auto flex items-center gap-2">
                        {/* Fork from this step button */}
                        {user && (
                          <button
                            type="button"
                            onClick={() => handleOpenFork(step.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-[11px] font-mono text-amber-300 hover:text-amber-200 bg-amber-950/60 hover:bg-amber-900/80 px-2 py-0.5 rounded border border-amber-500/40"
                            title="Bu adımdan itibaren görevi çatalla (Fork)"
                          >
                            <GitFork className="size-3 text-amber-400" />
                            <span>Buradan Çatalla</span>
                          </button>
                        )}
                        <span className="text-xs text-faint-foreground font-mono">
                          {new Date(step.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                    {meta.title && (
                      <div className="text-xs font-semibold text-foreground/80 mb-1.5 font-mono">
                        {meta.title}
                      </div>
                    )}
                    <div className="text-sm text-foreground whitespace-pre-wrap leading-relaxed font-sans">
                      {step.content}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {isLive && (
            <Card className="border-signal/40 bg-signal-muted/10 animate-pulse-glow">
              <CardContent className="p-3 flex items-center gap-3">
                <Sparkles className="size-4 text-signal animate-spin" />
                <span className="text-xs font-mono text-signal">
                  🧠 Yapay Zeka Düşünüyor ve İnceleme Yapıyor...
                </span>
              </CardContent>
            </Card>
          )}

          <div ref={feedEndRef} />
        </div>

        {/* Fixed Bottom Steering Input Area */}
        <div className="shrink-0 p-3.5 border-t border-border/80 bg-surface-elevated/90 backdrop-blur-md">
          {user ? (
            <form onSubmit={handleRedirect}>
              <Card className="shadow-lg border-steer/40 bg-surface">
                <CardContent className="p-2.5 flex gap-2 items-end">
                  <Textarea
                    placeholder="Ajana canlı yönlendirme yapın — Örn: 'Sadece Tailwind CSS kütüphanelerine odaklan'"
                    value={redirectText}
                    onChange={(e) => setRedirectText(e.target.value)}
                    rows={1}
                    className="resize-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleRedirect(e);
                      }
                    }}
                  />
                  <Button type="submit" color="primary" disabled={!redirectText.trim()} loading={isSending}>
                    <Send className="size-4" />
                  </Button>
                </CardContent>
              </Card>
            </form>
          ) : (
            <div className="text-center text-sm text-muted-foreground py-2">
              <Link to="/login" className="text-steer hover:underline">Sign in</Link> to steer this session.
            </div>
          )}
        </div>
      </div>

      {/* Fork & Branch Dialog Modal */}
      <Dialog open={forkModalOpen} onOpenChange={setForkModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-300 font-display">
              <GitFork className="size-5 text-amber-400" />
              Görevi Çatalla (Fork & Branch Session)
            </DialogTitle>
            <DialogDescription>
              {targetForkStepId
                ? 'Bu adımdan itibaren geçmişi devralarak yeni ve bağımsız bir alternatif ajan dalı (branch) oluşturun.'
                : 'Mevcut ajan oturumunu kopyalayarak yeni ve bağımsız bir alternatif dal (branch) başlatın.'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleExecuteFork} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-mono font-medium text-foreground mb-1.5">
                Çatallanma Yönlendirmesi / Alternatif Talimat (İsteğe Bağlı):
              </label>
              <Textarea
                placeholder="Örn: 'Farklı bir yaklaşım dene — React yerine Vue.js kullanarak tekrar analiz et'"
                value={forkInstruction}
                onChange={(e) => setForkInstruction(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>

            <DialogFooter className="gap-2">
              <DialogClose render={<Button variant="ghost" size="sm" type="button">İptal</Button>} />
              <Button type="submit" color="primary" size="sm" loading={isForking} className="gap-1.5 bg-amber-600 hover:bg-amber-500 text-white">
                <GitFork className="size-4" />
                <span>Çatalla ve Başlat</span>
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
