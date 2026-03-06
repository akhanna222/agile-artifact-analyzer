import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3,
  Zap,
  Users,
  FileText,
  TrendingUp,
  Clock,
  Loader2,
  BookOpen,
  Layers,
  ListChecks,
  CheckSquare,
} from "lucide-react";

interface UsageStats {
  totalAnalyses: number;
  totalUsers: number;
  tokens: {
    totalPromptTokens: number;
    totalCompletionTokens: number;
    totalTokens: number;
  };
  byType: { type: string; count: number; tokens: number }[];
  byUser: { email: string; count: number; tokens: number }[];
  byStatus: { status: string; count: number }[];
  recentAnalyses: {
    id: number;
    title: string;
    type: string;
    status: string;
    overallScore: number | null;
    userEmail: string;
    promptTokens: number | null;
    completionTokens: number | null;
    totalTokens: number | null;
    model: string | null;
    createdAt: string;
  }[];
  dailyUsage: { date: string; count: number; tokens: number }[];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

const typeIcons: Record<string, typeof FileText> = {
  epic: Layers,
  feature: BookOpen,
  story: ListChecks,
  task: CheckSquare,
};

const typeColors: Record<string, string> = {
  epic: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  feature: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  story: "bg-green-500/10 text-green-700 dark:text-green-400",
  task: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

const statusColors: Record<string, string> = {
  completed: "bg-green-500/10 text-green-700 dark:text-green-400",
  failed: "bg-red-500/10 text-red-700 dark:text-red-400",
  pending: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
};

function BarVisualization({ items, maxValue, labelKey, valueKey, colorFn }: {
  items: any[];
  maxValue: number;
  labelKey: string;
  valueKey: string;
  colorFn: (item: any) => string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between text-xs">
            <span className="capitalize font-medium">{item[labelKey]}</span>
            <span className="text-muted-foreground">{item[valueKey]}</span>
          </div>
          <div className="h-2 rounded-full bg-muted overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${colorFn(item)}`}
              style={{ width: `${maxValue > 0 ? (Number(item[valueKey]) / maxValue) * 100 : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export function UsageDashboard() {
  const { data: stats, isLoading } = useQuery<UsageStats>({
    queryKey: ["/api/admin/usage"],
    refetchInterval: 30000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!stats) return null;

  const maxTypeCount = Math.max(...(stats.byType.map((t) => Number(t.count))), 1);
  const maxUserCount = Math.max(...(stats.byUser.map((u) => Number(u.count))), 1);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4 text-center">
            <FileText className="w-5 h-5 mx-auto mb-2 text-[hsl(22,100%,50%)]" />
            <p className="text-2xl font-bold" data-testid="stat-total-analyses">{stats.totalAnalyses}</p>
            <p className="text-xs text-muted-foreground">Total Analyses</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-5 h-5 mx-auto mb-2 text-[hsl(22,100%,50%)]" />
            <p className="text-2xl font-bold" data-testid="stat-total-users">{stats.totalUsers}</p>
            <p className="text-xs text-muted-foreground">Total Users</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Zap className="w-5 h-5 mx-auto mb-2 text-[hsl(22,100%,50%)]" />
            <p className="text-2xl font-bold" data-testid="stat-total-tokens">{formatTokens(Number(stats.tokens.totalTokens))}</p>
            <p className="text-xs text-muted-foreground">Total Tokens</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-5 h-5 mx-auto mb-2 text-[hsl(22,100%,50%)]" />
            <p className="text-2xl font-bold" data-testid="stat-avg-tokens">
              {stats.totalAnalyses > 0 ? formatTokens(Math.round(Number(stats.tokens.totalTokens) / stats.totalAnalyses)) : "0"}
            </p>
            <p className="text-xs text-muted-foreground">Avg Tokens/Analysis</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Token Breakdown</h3>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Prompt Tokens</span>
                <span className="text-sm font-mono font-medium" data-testid="stat-prompt-tokens">
                  {formatTokens(Number(stats.tokens.totalPromptTokens))}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-500"
                  style={{
                    width: `${Number(stats.tokens.totalTokens) > 0 ? (Number(stats.tokens.totalPromptTokens) / Number(stats.tokens.totalTokens)) * 100 : 0}%`,
                  }}
                />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Completion Tokens</span>
                <span className="text-sm font-mono font-medium" data-testid="stat-completion-tokens">
                  {formatTokens(Number(stats.tokens.totalCompletionTokens))}
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-[hsl(22,100%,50%)]"
                  style={{
                    width: `${Number(stats.tokens.totalTokens) > 0 ? (Number(stats.tokens.totalCompletionTokens) / Number(stats.tokens.totalTokens)) * 100 : 0}%`,
                  }}
                />
              </div>
              <Separator />
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Total</span>
                <span className="text-sm font-mono font-bold">{formatTokens(Number(stats.tokens.totalTokens))}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">By Artifact Type</h3>
            </div>
          </CardHeader>
          <CardContent>
            {stats.byType.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            ) : (
              <div className="space-y-3">
                {stats.byType.map((t, i) => {
                  const TypeIcon = typeIcons[t.type] || FileText;
                  return (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <TypeIcon className="w-3.5 h-3.5" />
                          <span className="capitalize font-medium">{t.type}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground">{t.count} analyses</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                            {formatTokens(Number(t.tokens))} tokens
                          </Badge>
                        </div>
                      </div>
                      <div className="h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[hsl(22,100%,50%)]"
                          style={{ width: `${(Number(t.count) / maxTypeCount) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Usage by User</h3>
            </div>
          </CardHeader>
          <CardContent>
            {stats.byUser.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            ) : (
              <div className="space-y-3">
                {stats.byUser.map((u, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-medium truncate max-w-[150px]">{u.email}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">{u.count} analyses</span>
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          {formatTokens(Number(u.tokens))} tokens
                        </Badge>
                      </div>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-500"
                        style={{ width: `${(Number(u.count) / maxUserCount) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold">Daily Activity</h3>
            </div>
          </CardHeader>
          <CardContent>
            {stats.dailyUsage.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No data yet</p>
            ) : (
              <div className="space-y-2">
                {stats.dailyUsage.slice(-7).map((d, i) => (
                  <div key={i} className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground w-20">
                      {new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <div className="flex-1 mx-3 h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-[hsl(22,100%,50%)]"
                        style={{
                          width: `${(Number(d.count) / Math.max(...stats.dailyUsage.map((x) => Number(x.count)), 1)) * 100}%`,
                        }}
                      />
                    </div>
                    <div className="flex items-center gap-2 w-28 justify-end">
                      <span className="font-medium">{d.count}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {formatTokens(Number(d.tokens))}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Recent Analyses</h3>
          </div>
        </CardHeader>
        <CardContent>
          {stats.recentAnalyses.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">No analyses yet</p>
          ) : (
            <div className="space-y-2">
              {stats.recentAnalyses.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between p-2.5 rounded-md bg-accent/50 gap-2"
                  data-testid={`row-recent-${a.id}`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium capitalize ${typeColors[a.type] || ""}`}>
                      {a.type}
                    </span>
                    <span className="text-sm truncate font-medium">{a.title}</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 text-xs">
                    <span className="text-muted-foreground truncate max-w-[100px] hidden sm:inline">{a.userEmail}</span>
                    {a.overallScore !== null && (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                        {a.overallScore}/100
                      </Badge>
                    )}
                    {a.totalTokens !== null && (
                      <span className="text-muted-foreground font-mono text-[10px]">
                        {formatTokens(a.totalTokens)} tok
                      </span>
                    )}
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColors[a.status] || ""}`}>
                      {a.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
