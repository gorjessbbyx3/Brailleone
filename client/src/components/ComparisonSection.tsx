import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertCircle, FileText, BookOpen } from "lucide-react";
import type { Conversion } from "@shared/schema";

interface ComparisonSectionProps {
  conversion: Conversion;
  originalText?: string;
  brailleText?: string;
  lineValidation?: Array<{
    lineNumber: number;
    originalLine: string;
    brailleLine: string;
    accuracy: number;
    issues?: string[];
  }>;
}

export default function ComparisonSection({ 
  conversion, 
  originalText = "", 
  brailleText = "", 
  lineValidation = [] 
}: ComparisonSectionProps) {
  const originalLines = originalText.split('\n');
  const brailleLines = brailleText.split('\n');
  const maxLines = Math.max(originalLines.length, brailleLines.length);

  const getValidationForLine = (lineIndex: number) => {
    return lineValidation.find(v => v.lineNumber === lineIndex + 1);
  };

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 95) return "text-success";
    if (accuracy >= 85) return "text-warning";
    return "text-destructive";
  };

  const getAccuracyBadge = (accuracy: number) => {
    if (accuracy >= 95) return "default";
    if (accuracy >= 85) return "secondary";
    return "destructive";
  };

  return (
    <Card className="mb-8" data-testid="comparison-section">
      <CardContent className="p-6">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <CheckCircle className="w-4 h-4 text-primary-foreground" />
          </div>
          <h3 className="text-xl font-semibold text-card-foreground">
            Side-by-Side Comparison & AI Validation
          </h3>
        </div>

        {/* Summary Statistics */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-foreground" data-testid="text-total-lines">
              {maxLines}
            </div>
            <div className="text-sm text-muted-foreground">Lines Processed</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-success" data-testid="text-validated-lines">
              {lineValidation.filter(v => v.accuracy >= 95).length}
            </div>
            <div className="text-sm text-muted-foreground">High Accuracy</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-destructive" data-testid="text-flagged-lines">
              {lineValidation.filter(v => v.accuracy < 85).length}
            </div>
            <div className="text-sm text-muted-foreground">Needs Review</div>
          </div>
        </div>

        {/* Header Row */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex items-center space-x-2">
            <FileText className="w-5 h-5 text-destructive" />
            <h4 className="font-semibold text-foreground">Original Text</h4>
          </div>
          <div className="flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <h4 className="font-semibold text-foreground">Braille Translation</h4>
          </div>
        </div>

        {/* Side-by-Side Comparison */}
        <div className="border border-border rounded-lg overflow-hidden">
          <div className="max-h-96 overflow-y-auto">
            {Array.from({ length: maxLines }).map((_, index) => {
              const validation = getValidationForLine(index);
              const originalLine = originalLines[index] || "";
              const brailleLine = brailleLines[index] || "";
              
              return (
                <div 
                  key={index} 
                  className={`grid grid-cols-2 gap-4 p-3 border-b border-border ${
                    validation && validation.accuracy < 85 ? 'bg-destructive/5' : ''
                  }`}
                  data-testid={`comparison-line-${index + 1}`}
                >
                  {/* Original Text Column */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-mono">
                        Line {index + 1}
                      </span>
                      {validation && (
                        <Badge 
                          variant={getAccuracyBadge(validation.accuracy)}
                          className="text-xs"
                        >
                          {validation.accuracy}%
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm font-mono text-foreground leading-relaxed">
                      {originalLine || <span className="text-muted-foreground italic">Empty line</span>}
                    </div>
                  </div>

                  {/* Braille Text Column */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground font-mono">
                        Braille {index + 1}
                      </span>
                      {validation && validation.issues && validation.issues.length > 0 && (
                        <AlertCircle className="w-4 h-4 text-warning" />
                      )}
                    </div>
                    <div className="text-sm font-mono text-foreground leading-relaxed">
                      {brailleLine || <span className="text-muted-foreground italic">Empty line</span>}
                    </div>
                    {validation && validation.issues && validation.issues.length > 0 && (
                      <div className="text-xs text-warning">
                        Issues: {validation.issues.join(", ")}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Overall Quality Assessment */}
        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h5 className="font-medium text-foreground mb-2">AI Quality Assessment</h5>
          <div className="text-sm text-muted-foreground">
            <p>Overall Accuracy: <span className="font-semibold text-success">{conversion.accuracyScore || 0}%</span></p>
            <p>Lines with High Accuracy (95%+): {lineValidation.filter(v => v.accuracy >= 95).length} of {lineValidation.length}</p>
            <p>Lines Requiring Review (&lt;85%): {lineValidation.filter(v => v.accuracy < 85).length} of {lineValidation.length}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}