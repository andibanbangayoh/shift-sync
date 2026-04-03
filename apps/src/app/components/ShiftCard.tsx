import { Clock, User, AlertCircle, Star } from 'lucide-react';
import { Card } from '../components/ui/card';
import { getStaffById, getSkillById, type Shift } from '../data/mockData';
import { SkillBadge } from './SkillBadge';
import { ConflictTooltip } from './ConflictTooltip';
import { cn } from '../components/ui/utils';

type ShiftCardProps = {
  shift: Shift;
  className?: string;
  onClick?: () => void;
  draggable?: boolean;
};

export function ShiftCard({ shift, className, onClick, draggable }: ShiftCardProps) {
  const staff = shift.staffId ? getStaffById(shift.staffId) : null;
  const skill = getSkillById(shift.skillRequired);
  
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  };

  const duration = (shift.endTime.getTime() - shift.startTime.getTime()) / (1000 * 60 * 60);

  return (
    <Card
      className={cn(
        'p-3 space-y-2 cursor-pointer transition-all hover:shadow-md border-l-4',
        shift.status === 'conflict' && 'border-l-destructive bg-destructive/5',
        shift.status === 'unassigned' && 'border-l-muted-foreground/30 bg-muted/30',
        shift.status === 'assigned' && skill && `border-l-[${skill.color}]`,
        className
      )}
      onClick={onClick}
      draggable={draggable}
      style={{
        borderLeftColor: shift.status === 'assigned' && skill ? skill.color : undefined,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          {staff ? (
            <div className="flex items-center gap-2">
              <div className="size-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="size-3 text-primary" />
              </div>
              <span className="text-sm truncate">{staff.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-muted-foreground">
              <User className="size-4" />
              <span className="text-sm">Unassigned</span>
            </div>
          )}
        </div>
        {shift.isPremium && (
          <Star className="size-4 text-amber-500 fill-amber-500 flex-shrink-0" />
        )}
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="size-3" />
          <span>
            {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
          </span>
          <span className="text-muted-foreground/60">({duration}h)</span>
        </div>

        <div className="flex items-center gap-2">
          <SkillBadge skillId={shift.skillRequired} />
          {shift.headcount > 1 && (
            <span className="text-xs text-muted-foreground">×{shift.headcount}</span>
          )}
        </div>
      </div>

      {shift.status === 'conflict' && shift.conflictReason && (
        <ConflictTooltip
          reason={shift.conflictReason}
          suggestions={['Try assigning to Emily Johnson', 'Split into two shorter shifts']}
        />
      )}
    </Card>
  );
}
