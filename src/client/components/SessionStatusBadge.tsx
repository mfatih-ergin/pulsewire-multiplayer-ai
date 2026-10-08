import { Badge } from '@/client/components/ui/Badge';

export type SessionStatus = 'planning' | 'running' | 'needs_input' | 'completed' | 'failed';

export const STATUS_LABEL: Record<SessionStatus, string> = {
  planning: 'Planning',
  running: 'Live',
  needs_input: 'Needs input',
  completed: 'Completed',
  failed: 'Failed',
};

export function isLiveStatus(status: SessionStatus) {
  return status === 'running' || status === 'planning';
}

export default function SessionStatusBadge({ status, className }: { status: SessionStatus; className?: string }) {
  if (isLiveStatus(status)) {
    return (
      <Badge color="neutral" variant="soft" className={`gap-1.5 ${className ?? ''}`}>
        <span className="size-1.5 rounded-full bg-signal animate-pulse-glow" />
        {STATUS_LABEL[status]}
      </Badge>
    );
  }
  if (status === 'needs_input') {
    return <Badge color="primary" variant="soft" className={className}>{STATUS_LABEL[status]}</Badge>;
  }
  if (status === 'failed') {
    return <Badge color="destructive" variant="soft" className={className}>{STATUS_LABEL[status]}</Badge>;
  }
  return <Badge color="neutral" variant="outline" className={className}>{STATUS_LABEL[status]}</Badge>;
}
