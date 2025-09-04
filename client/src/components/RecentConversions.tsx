import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Link, Download } from "lucide-react";
import type { Conversion } from "@shared/schema";

interface RecentConversionsProps {
  conversions: Conversion[];
}

export default function RecentConversions({ conversions }: RecentConversionsProps) {
  const handleDownload = (conversionId: string) => {
    window.open(`/api/conversions/${conversionId}/download/braille`, '_blank');
  };

  const formatTimeAgo = (date: Date | string) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else {
      return 'Recently';
    }
  };

  if (conversions.length === 0) {
    return (
      <Card className="mb-8">
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4">Recent Conversions</h3>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No conversions yet. Upload a PDF or enter a URL to get started!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <h3 className="text-lg font-semibold text-card-foreground mb-4">Recent Conversions</h3>
        
        <div className="space-y-3">
          {conversions.map((conversion) => {
            const isCompleted = conversion.status === 'completed';
            const Icon = conversion.sourceType === 'url' ? Link : FileText;
            
            return (
              <div 
                key={conversion.id} 
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                data-testid={`conversion-item-${conversion.id}`}
              >
                <div className="flex items-center space-x-3">
                  <Icon className={`w-5 h-5 ${conversion.sourceType === 'url' ? 'text-primary' : 'text-destructive'}`} />
                  <div>
                    <h4 className="font-medium text-foreground" data-testid="text-conversion-filename">
                      {conversion.fileName}
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      {isCompleted ? (
                        <>
                          Converted {conversion.createdAt ? formatTimeAgo(conversion.createdAt) : 'recently'}
                          {conversion.sourceType === 'url' && ' • URL source'}
                          {conversion.totalPages && ` • ${conversion.totalPages} pages`}
                        </>
                      ) : (
                        <>
                          {conversion.status === 'failed' ? 'Failed' : 'Processing...'}
                          {conversion.progress > 0 && ` • ${conversion.progress}%`}
                        </>
                      )}
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => handleDownload(conversion.id)}
                  disabled={!isCompleted}
                  variant="ghost"
                  size="sm"
                  className="text-primary hover:text-primary/80 focus-ring"
                  data-testid={`button-download-${conversion.id}`}
                >
                  {isCompleted ? 'Download' : 'Processing...'}
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
