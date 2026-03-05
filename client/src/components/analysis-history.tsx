import type { Analysis } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Trash2,
  Target,
  Layers,
  BookOpen,
  CheckSquare,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface AnalysisHistoryProps {
  analyses: Analysis[];
  selectedId?: number;
  onSelect: (analysis: Analysis) => void;
  onDelete: (id: number) => void;
  onNewAnalysis: () => void;
  isLoading: boolean;
}

const typeIcons: Record<string, typeof Target> = {
  epic: Target,
  feature: Layers,
  story: BookOpen,
  task: CheckSquare,
};

function ScoreIndicator({ score, status }: { score: number | null; status: string }) {
  if (status === "pending") return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
  if (status === "failed") return <XCircle className="w-3.5 h-3.5 text-red-500" />;
  if (!score) return null;
  if (score >= 80) return <CheckCircle2 className="w-3.5 h-3.5 text-green-500 dark:text-green-400" />;
  if (score >= 50) return <AlertTriangle className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />;
  return <XCircle className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />;
}

export function AnalysisHistory({
  analyses,
  selectedId,
  onSelect,
  onDelete,
  onNewAnalysis,
  isLoading,
}: AnalysisHistoryProps) {
  if (isLoading) {
    return (
      <div className="p-3 space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="p-3 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-3">
        <Button
          onClick={onNewAnalysis}
          className="w-full bg-[hsl(22,100%,50%)] hover:bg-[hsl(22,100%,45%)] text-white"
          data-testid="button-new-analysis"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Analysis
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {analyses.length === 0 ? (
            <div className="text-center py-8 px-4">
              <p className="text-sm text-sidebar-foreground/60">No analyses yet</p>
              <p className="text-xs text-sidebar-foreground/50 mt-1">
                Create your first analysis above
              </p>
            </div>
          ) : (
            analyses.map((analysis) => {
              const TypeIcon = typeIcons[analysis.type] || BookOpen;
              const isSelected = analysis.id === selectedId;
              return (
                <div
                  key={analysis.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelect(analysis)}
                  onKeyDown={(e) => { if (e.key === "Enter") onSelect(analysis); }}
                  className={`w-full text-left rounded-md p-3 transition-colors group relative cursor-pointer ${
                    isSelected
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "hover-elevate"
                  }`}
                  data-testid={`button-history-${analysis.id}`}
                >
                  <div className="flex items-start gap-2">
                    <TypeIcon className="w-4 h-4 mt-0.5 shrink-0 text-sidebar-foreground/50" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-sm font-medium truncate block text-sidebar-foreground">{analysis.title}</span>
                        <ScoreIndicator score={analysis.overallScore} status={analysis.status} />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-sidebar-foreground/60 capitalize">{analysis.type}</span>
                        {analysis.overallScore !== null && analysis.overallScore !== undefined && (
                          <span className="text-xs text-sidebar-foreground/60">{analysis.overallScore}/100</span>
                        )}
                      </div>
                      <span className="text-xs text-sidebar-foreground/45 block mt-0.5">
                        {formatDistanceToNow(new Date(analysis.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(analysis.id);
                      }}
                      className="invisible group-hover:visible p-1 rounded-md text-sidebar-foreground/50"
                      data-testid={`button-delete-${analysis.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
