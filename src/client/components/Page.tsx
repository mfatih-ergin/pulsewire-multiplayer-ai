/**
 * Page wrapper template to be used as a base for all pages.
 */

import React from 'react';
import { Link, useLocation } from 'react-router';
import { useSession } from 'modelence/client';
import { Radio, User, FolderGit2, LogOut, ChevronDown, Star } from 'lucide-react';
import LoadingSpinner from '@/client/components/LoadingSpinner';
import { Seo, type SeoProps } from '@/client/components/Seo';
import { Button } from '@/client/components/ui/Button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/client/components/ui/DropdownMenu';
import { cn } from '@/client/lib/utils';

interface PageProps {
  children?: React.ReactNode;
  isLoading?: boolean;
  className?: string;
  /** Per-page <head> overrides (title, description, OG image, etc). */
  seo?: SeoProps;
}

function Header() {
  const { user } = useSession();
  const location = useLocation();

  const searchTab = new URLSearchParams(location.search).get('tab');
  const isProfileActive = user ? location.pathname === `/u/${user.handle}` && searchTab !== 'stars' : false;
  const isStarsActive = user ? location.pathname === `/u/${user.handle}` && searchTab === 'stars' : false;
  const isProjectsActive = location.pathname === '/' || location.pathname.startsWith('/projects/');

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 py-3 border-b border-border bg-surface/80 backdrop-blur-sm sticky top-0 z-10">
      <Link to="/" className="flex items-center gap-2 group">
        <span className="flex items-center justify-center size-7 rounded-md bg-signal-muted text-signal">
          <Radio className="size-4" />
        </span>
        <span className="font-display font-semibold text-foreground tracking-tight group-hover:text-signal transition-colors">
          Pulsewire
        </span>
      </Link>

      {user ? (
        <div className="flex items-center gap-3">
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg border border-border bg-surface-elevated hover:bg-surface-hover hover:border-signal/50 transition-all cursor-pointer group outline-none">
              <div className="size-6 rounded-full bg-signal-muted text-signal border border-signal/40 flex items-center justify-center font-mono font-bold text-[11px] uppercase">
                {user.handle.slice(0, 2)}
              </div>
              <span className="text-xs font-mono font-medium text-foreground group-hover:text-signal">
                @{user.handle}
              </span>
              <ChevronDown className="size-3.5 text-muted-foreground group-hover:text-signal transition-transform" />
            </DropdownMenuTrigger>

            <DropdownMenuContent className="w-56">
              <DropdownMenuLabel className="border-b border-border/60 pb-2 mb-1">
                <div className="text-xs font-bold text-foreground font-mono">@{user.handle}</div>
                <div className="text-[10px] font-normal text-muted-foreground lowercase">Pulsewire Geliştiricisi</div>
              </DropdownMenuLabel>

              {/* Profilim Item */}
              <DropdownMenuItem
                className={cn(
                  'transition-all',
                  isProfileActive ? 'bg-surface-hover text-foreground font-semibold' : ''
                )}
              >
                <Link to={`/u/${user.handle}`} className="flex items-center gap-2.5 w-full py-0.5">
                  <User className="size-4 text-signal" />
                  <span>Profilim</span>
                </Link>
              </DropdownMenuItem>

              {/* Projeler & Repolar Item */}
              <DropdownMenuItem
                className={cn(
                  'transition-all',
                  isProjectsActive ? 'bg-surface-hover text-foreground font-semibold' : ''
                )}
              >
                <Link to="/" className="flex items-center gap-2.5 w-full py-0.5">
                  <FolderGit2 className="size-4 text-steer" />
                  <span>Projeler & Repolar</span>
                </Link>
              </DropdownMenuItem>

              {/* Yıldızlananlar Item */}
              <DropdownMenuItem
                className={cn(
                  'transition-all',
                  isStarsActive ? 'bg-surface-hover text-foreground font-semibold' : ''
                )}
              >
                <Link to={`/u/${user.handle}?tab=stars`} className="flex items-center gap-2.5 w-full py-0.5">
                  <Star className="size-4 text-amber-400 fill-amber-400" />
                  <span>Yıldızlananlar</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Logout Item */}
              <DropdownMenuItem className="text-destructive data-[highlighted]:text-destructive data-[highlighted]:bg-destructive/10">
                <Link to="/logout" className="flex items-center gap-2.5 w-full py-0.5 text-destructive">
                  <LogOut className="size-4 text-destructive" />
                  <span>Çıkış Yap</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : (
        <Link to="/login">
          <Button variant="outline" size="sm">
            Giriş Yap
          </Button>
        </Link>
      )}
    </header>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col min-h-screen max-w-full overflow-x-hidden bg-background text-foreground">{children}</div>;
}

function PageBody({ children, className, isLoading = false }: PageProps) {
  return (
    <div className="flex flex-1 w-full min-h-0">
      <main className={cn("flex flex-col flex-1 p-4 space-y-4 overflow-x-hidden", className)}>
        {isLoading ? (
          <div className="flex items-center justify-center w-full h-full">
            <LoadingSpinner />
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}

export default function Page({ children, className, isLoading = false, seo }: PageProps) {
  return (
    <PageWrapper>
      <Seo {...seo} />
      <Header />
      <PageBody className={className} isLoading={isLoading}>{children}</PageBody>
    </PageWrapper>
  );
}
