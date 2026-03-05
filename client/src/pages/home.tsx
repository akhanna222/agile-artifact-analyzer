import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Analysis, AnalysisResult } from "@shared/schema";
import { AnalysisForm } from "@/components/analysis-form";
import { AnalysisResults } from "@/components/analysis-results";
import { AnalysisHistory } from "@/components/analysis-history";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, History, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Home() {
  const { toast } = useToast();
  const [selectedAnalysis, setSelectedAnalysis] = useState<Analysis | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const { data: analyses = [], isLoading: loadingHistory } = useQuery<Analysis[]>({
    queryKey: ["/api/analyses"],
  });

  const analyzeMutation = useMutation({
    mutationFn: async (data: { title: string; type: string; content: string }) => {
      const res = await apiRequest("POST", "/api/analyses", data);
      return res.json();
    },
    onSuccess: (data: Analysis) => {
      setSelectedAnalysis(data);
      queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
      toast({
        title: "Analysis Complete",
        description: `Quality score: ${data.overallScore}/100`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Analysis Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/analyses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/analyses"] });
      if (selectedAnalysis) {
        setSelectedAnalysis(null);
      }
      toast({ title: "Analysis deleted" });
    },
  });

  const handleSelectAnalysis = (analysis: Analysis) => {
    setSelectedAnalysis(analysis);
    setShowHistory(false);
  };

  const handleNewAnalysis = () => {
    setSelectedAnalysis(null);
    setShowHistory(false);
  };

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden lg:flex lg:flex-col lg:w-80 border-r bg-sidebar">
        <div className="p-4 border-b border-sidebar-border">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 rounded-md bg-primary flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-lg font-semibold text-sidebar-foreground" data-testid="text-app-title">
              Agile Artifact Analyzer
            </h1>
          </div>
          <p className="text-xs text-muted-foreground ml-10">
            AI-Powered Quality Analysis
          </p>
        </div>
        <AnalysisHistory
          analyses={analyses}
          selectedId={selectedAnalysis?.id}
          onSelect={handleSelectAnalysis}
          onDelete={(id) => deleteMutation.mutate(id)}
          onNewAnalysis={handleNewAnalysis}
          isLoading={loadingHistory}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between gap-1 p-3 border-b lg:hidden">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-primary flex items-center justify-center">
              <FileText className="w-3.5 h-3.5 text-primary-foreground" />
            </div>
            <h1 className="text-base font-semibold" data-testid="text-app-title-mobile">Agile Artifact Analyzer</h1>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => setShowHistory(!showHistory)}
            data-testid="button-toggle-history"
          >
            <History className="w-4 h-4" />
          </Button>
        </header>

        {showHistory && (
          <div className="lg:hidden border-b bg-sidebar">
            <div className="p-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowHistory(false)}
                className="mb-2"
                data-testid="button-close-history"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </div>
            <div className="max-h-64 overflow-y-auto">
              <AnalysisHistory
                analyses={analyses}
                selectedId={selectedAnalysis?.id}
                onSelect={handleSelectAnalysis}
                onDelete={(id) => deleteMutation.mutate(id)}
                onNewAnalysis={handleNewAnalysis}
                isLoading={loadingHistory}
              />
            </div>
          </div>
        )}

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-4xl mx-auto p-4 md:p-6 lg:p-8">
            <AnimatePresence mode="wait">
              {selectedAnalysis && selectedAnalysis.status === "completed" && selectedAnalysis.results ? (
                <motion.div
                  key="results"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <AnalysisResults
                    analysis={selectedAnalysis}
                    results={selectedAnalysis.results as AnalysisResult}
                    onBack={handleNewAnalysis}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  <AnalysisForm
                    onSubmit={(data) => analyzeMutation.mutate(data)}
                    isLoading={analyzeMutation.isPending}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </main>
      </div>
    </div>
  );
}
