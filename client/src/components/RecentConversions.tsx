import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Link, Download, Trash2 } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Conversion } from "@shared/schema";

interface RecentConversionsProps {
  conversions: Conversion[];
}

export default function RecentConversions({ conversions }: RecentConversionsProps) {
  const { toast } = useToast();
  
  const handleDownload = (conversionId: string) => {
    window.open(`/api/conversions/${conversionId}/download/braille`, '_blank');
  };

  const handleClearFailed = async () => {
    try {
      await apiRequest("DELETE", "/api/conversions/failed");
      
      // Refresh the conversions list
      queryClient.invalidateQueries({ queryKey: ['/api/conversions'] });
      
      toast({
        title: "Cleared Successfully", 
        description: "All failed conversions have been removed.",
      });
    } catch (error) {
      console.error("Error clearing failed conversions:", error);
      toast({
        title: "Clear Failed",
        description: "Could not clear failed conversions. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleClearAll = async () => {
    try {
      await apiRequest("DELETE", "/api/conversions/all");
      
      // Refresh the conversions list
      queryClient.invalidateQueries({ queryKey: ['/api/conversions'] });
      
      toast({
        title: "History Cleared", 
        description: "All conversion history has been removed.",
      });
    } catch (error) {
      console.error("Error clearing all conversions:", error);
      toast({
        title: "Clear Failed",
        description: "Could not clear conversion history. Please try again.",
        variant: "destructive",
      });
    }
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

  const failedCount = conversions.filter(c => c.status === 'failed' || c.status === 'error').length;

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-card-foreground">Recent Conversions</h3>
          <div className="flex items-center space-x-2">
            {failedCount > 0 && (
              <Button
                onClick={handleClearFailed}
                variant="outline"
                size="sm"
                className="text-destructive hover:text-destructive/80 border-destructive/20"
                data-testid="button-clear-failed"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Failed ({failedCount})
              </Button>
            )}
            <Button
              onClick={handleClearAll}
              variant="outline"
              size="sm"
              className="text-muted-foreground hover:text-foreground border-border"
              data-testid="button-clear-all"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear History
            </Button>
          </div>
        </div>
        
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
