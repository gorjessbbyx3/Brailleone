import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Zap, Check, Circle, FileText, Eye } from "lucide-react";
import LiveProcessingModal from "./LiveProcessingModal";
import type { Conversion } from "@shared/schema";

interface ProcessingSectionProps {
  conversion: Conversion;
}

export default function ProcessingSection({ conversion }: ProcessingSectionProps) {
  const [showLiveModal, setShowLiveModal] = useState(false);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const stages = [
    {
      name: "Text Extraction",
      description: "Extracting text from PDF pages",
      threshold: 25,
      icon: FileText,
    },
    {
      name: "AI Text Review & Cleanup",
      description: "Groq AI is fixing OCR errors and optimizing formatting",
      threshold: 70,
      icon: Zap,
    },
    {
      name: "Braille Conversion",
      description: "Converting cleaned text to Grade 1 Braille",
      threshold: 90,
      icon: Circle,
    },
    {
      name: "AI Quality Validation",
      description: "Final accuracy check and optimization",
      threshold: 100,
      icon: Check,
    },
  ];

  return (
    <Card className="mb-8" data-testid="processing-section">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center">
              <Zap className="w-4 h-4 text-secondary-foreground pulse-gentle" />
            </div>
            <h3 className="text-xl font-semibold text-card-foreground">
              {conversion.currentStage}
            </h3>
          </div>
          
          <Button
            onClick={() => setShowLiveModal(true)}
            variant="outline"
            size="sm"
            className="text-primary hover:text-primary/80 border-primary/20"
            data-testid="button-watch-live"
          >
            <Eye className="w-4 h-4 mr-2" />
            Watch Live
          </Button>
        </div>

        {/* File Info */}
        <div className="bg-muted rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <FileText className="w-8 h-8 text-destructive" />
              <div>
                <h4 className="font-medium text-foreground" data-testid="text-file-name">
                  {conversion.fileName}
                </h4>
                <p className="text-sm text-muted-foreground">
                  <span data-testid="text-file-size">{formatBytes(conversion.fileSize)}</span>
                  {conversion.totalPages && (
                    <>
                      {" • "}
                      <span data-testid="text-page-count">{conversion.totalPages} pages</span>
                    </>
                  )}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-foreground" data-testid="text-progress">
                {conversion.progress}%
              </div>
              <div className="text-xs text-muted-foreground">Complete</div>
            </div>
          </div>
        </div>

        {/* Progress Stages */}
        <div className="space-y-4 mb-6">
          {stages.map((stage, index) => {
            const isCompleted = conversion.progress >= stage.threshold;
            const isCurrent = conversion.progress < stage.threshold && 
              (index === 0 || conversion.progress >= stages[index - 1].threshold);
            const isPending = conversion.progress < stage.threshold && !isCurrent;

            const Icon = stage.icon;

            return (
              <div
                key={stage.name}
                className={`flex items-center space-x-3 p-3 rounded-lg border ${
                  isCompleted
                    ? "bg-success/10 border-success/20"
                    : isCurrent
                    ? "bg-secondary/10 border-secondary/20"
                    : "bg-muted/50 border-border"
                }`}
                data-testid={`stage-${stage.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                    isCompleted
                      ? "bg-success"
                      : isCurrent
                      ? "bg-secondary"
                      : "bg-muted"
                  }`}
                >
                  {isCompleted ? (
                    <Check className="w-3 h-3 text-white" />
                  ) : isCurrent ? (
                    <Icon className="w-3 h-3 text-secondary-foreground pulse-gentle" />
                  ) : (
                    <Circle className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h4 className={`font-medium ${isPending ? "text-muted-foreground" : "text-foreground"}`}>
                    {stage.name}
                  </h4>
                  <p className="text-sm text-muted-foreground">{stage.description}</p>
                  {isCurrent && stage.threshold > 25 && (
                    <div className="mt-2 bg-muted rounded-full h-2">
                      <div 
                        className="progress-bar bg-secondary h-2 rounded-full" 
                        style={{ 
                          width: `${Math.max(0, (conversion.progress - (stages[index - 1]?.threshold || 0)) / (stage.threshold - (stages[index - 1]?.threshold || 0)) * 100)}%` 
                        }}
                      />
                    </div>
                  )}
                </div>
                <span
                  className={`text-sm font-medium ${
                    isCompleted
                      ? "text-success"
                      : isCurrent
                      ? "text-secondary"
                      : "text-muted-foreground"
                  }`}
                >
                  {isCompleted ? "Completed" : isCurrent ? `${conversion.progress}%` : "Pending"}
                </span>
              </div>
            );
          })}
        </div>

        {/* Current Processing Details */}
        <div className="bg-muted/50 rounded-lg p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">Current Progress</span>
            {conversion.totalPages && (
              <span className="text-sm text-muted-foreground" data-testid="text-current-page">
                Processing {conversion.totalPages} pages
              </span>
            )}
          </div>
          <Progress value={conversion.progress} className="mb-2" />
          <p className="text-xs text-muted-foreground" data-testid="text-processing-detail">
            {conversion.currentStage} in progress...
          </p>
        </div>
      </CardContent>

      <LiveProcessingModal
        isOpen={showLiveModal}
        onClose={() => setShowLiveModal(false)}
        conversionId={conversion.id}
      />
    </Card>
  );
}
