import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, Download, FileText, BarChart3, Zap, Eye, Navigation } from "lucide-react";
import PreviewModal from "./PreviewModal";
import ChapterNavigationPanel from "./ChapterNavigationPanel";
import { useQuery } from "@tanstack/react-query";
import ComparisonSection from "./ComparisonSection";
import type { Conversion } from "@shared/schema";

interface ResultsSectionProps {
  conversion: Conversion;
}

export default function ResultsSection({ conversion }: ResultsSectionProps) {
  const [activeTab, setActiveTab] = useState("summary");
  const [showPreview, setShowPreview] = useState(false);

  // Fetch text content for comparison
  const { data: originalText } = useQuery({
    queryKey: ['/api/conversions', conversion.id, 'text', 'cleaned'],
    enabled: activeTab === "comparison" && !!conversion.cleanedTextPath,
  });

  const { data: brailleText } = useQuery({
    queryKey: ['/api/conversions', conversion.id, 'text', 'braille'],
    enabled: activeTab === "comparison" && !!conversion.brailleFilePath,
  });

  const handleDownload = async (type: 'braille' | 'text' | 'report') => {
    try {
      window.open(`/api/conversions/${conversion.id}/download/${type}`, '_blank');
    } catch (error) {
      console.error("Download error:", error);
    }
  };

  return (
    <Card className="mb-8" data-testid="results-section">
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-success rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-white" />
          </div>
          <h3 className="text-xl font-semibold text-card-foreground">Conversion Complete</h3>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="summary" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Summary & Downloads</span>
            </TabsTrigger>
            <TabsTrigger value="comparison" className="flex items-center space-x-2">
              <Eye className="w-4 h-4" />
              <span>Side-by-Side Comparison</span>
            </TabsTrigger>
            <TabsTrigger value="chapters" className="flex items-center space-x-2">
              <Navigation className="w-4 h-4" />
              <span>Chapter Navigation</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="summary" className="mt-6">

        {/* Conversion Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-foreground" data-testid="text-total-pages">
              {conversion.totalPages || 0}
            </div>
            <div className="text-sm text-muted-foreground">Pages Processed</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-foreground" data-testid="text-word-count">
              {conversion.wordCount?.toLocaleString() || 0}
            </div>
            <div className="text-sm text-muted-foreground">Words Converted</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-foreground" data-testid="text-braille-pages">
              {conversion.braillePages || 0}
            </div>
            <div className="text-sm text-muted-foreground">Braille Pages</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-success" data-testid="text-accuracy-score">
              {conversion.accuracyScore || 0}%
            </div>
            <div className="text-sm text-muted-foreground">AI Accuracy</div>
          </div>
        </div>

        {/* AI Processing Summary */}
        {conversion.aiEnhancements && conversion.aiEnhancements.length > 0 && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-foreground mb-2 flex items-center">
              <Zap className="w-4 h-4 mr-2 text-primary" />
              AI Enhancement Summary
            </h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {conversion.aiEnhancements.map((enhancement, index) => (
                <li key={index} data-testid={`text-enhancement-${index}`}>
                  • {enhancement}
                </li>
              ))}
            </ul>
          </div>
        )}

            {/* Download Options */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 mb-3">
                <Button 
                  onClick={() => setShowPreview(true)}
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                  data-testid="button-preview"
                >
                  <Eye className="w-5 h-5" />
                  <span>Preview</span>
                </Button>
                <Button 
                  onClick={() => handleDownload('braille')}
                  className="flex items-center justify-center space-x-2"
                  data-testid="button-download-braille"
                >
                  <Download className="w-5 h-5" />
                  <span>Download</span>
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <Button 
                  onClick={() => handleDownload('text')}
                  variant="secondary"
                  className="flex items-center justify-center space-x-2"
                  data-testid="button-download-text"
                >
                  <FileText className="w-4 h-4" />
                  <span>Clean Text</span>
                </Button>
                <Button 
                  onClick={() => handleDownload('report')}
                  variant="outline"
                  className="flex items-center justify-center space-x-2"
                  data-testid="button-download-report"
                >
                  <BarChart3 className="w-4 h-4" />
                  <span>AI Report</span>
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="comparison" className="mt-6">
            <ComparisonSection
              conversion={conversion}
              originalText={(originalText as any)?.content || ""}
              brailleText={(brailleText as any)?.content || ""}
              lineValidation={conversion.lineValidations || []}
            />
          </TabsContent>

          <TabsContent value="chapters" className="mt-6">
            <ChapterNavigationPanel
              chapters={conversion.chapters || []}
              documentSummary={conversion.documentSummary}
              keyTopics={conversion.keyTopics || []}
              onChapterClick={(chapter) => {
                // TODO: Scroll to chapter in preview or comparison view
                console.log('Navigate to chapter:', chapter.title);
              }}
            />
          </TabsContent>
        </Tabs>
      </CardContent>

      <PreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        conversion={conversion}
        onDownload={() => handleDownload('braille')}
      />
    </Card>
  );
}
