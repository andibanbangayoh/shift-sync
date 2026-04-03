import { AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip';

type ConflictTooltipProps = {
  reason: string;
  suggestions?: string[];
};

export function ConflictTooltip({ reason, suggestions = [] }: ConflictTooltipProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex items-center gap-1 text-destructive cursor-help">
            <AlertCircle className="size-4" />
            <span className="text-xs">Conflict</span>
          </div>
        </TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="text-sm">{reason}</p>
            {suggestions.length > 0 && (
              <div className="space-y-1 pt-2 border-t border-border">
                <p className="text-xs text-muted-foreground">Suggestions:</p>
                {suggestions.map((suggestion, i) => (
                  <p key={i} className="text-xs">• {suggestion}</p>
                ))}
              </div>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
