import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface UrlInputSectionProps {
  onConversionStart: (conversionId: string) => void;
}

export default function UrlInputSection({ onConversionStart }: UrlInputSectionProps) {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL",
        variant: "destructive",
      });
      return;
    }

    try {
      new URL(url); // Validate URL format
    } catch {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL format",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);

    try {
      const response = await apiRequest("POST", "/api/conversions/url", { url });
      const { conversionId } = await response.json();
      
      toast({
        title: "Processing Started",
        description: "URL processing has begun. This may take a few minutes.",
      });

      onConversionStart(conversionId);
      setUrl("");

    } catch (error) {
      console.error("URL processing error:", error);
      toast({
        title: "Processing Error",
        description: "Failed to start URL processing",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
      <div className="flex items-center space-x-2 mb-4">
        <Link className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold text-card-foreground">Enter Book URL</h3>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <Label htmlFor="book-url" className="block text-sm font-medium text-foreground mb-2">
            Digital Book URL
          </Label>
          <Input 
            type="url" 
            id="book-url" 
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/book.pdf"
            className="w-full"
            data-testid="input-book-url"
            aria-describedby="url-help"
          />
          <p id="url-help" className="text-xs text-muted-foreground mt-2">
            Enter a direct link to a PDF or digital book
          </p>
        </div>
        
        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading}
          data-testid="button-process-url"
        >
          {isLoading ? "Processing..." : "Process URL"}
        </Button>
      </form>

      <div className="mt-4 text-xs text-muted-foreground">
        <p>✓ Direct PDF links</p>
        <p>✓ Academic publications</p>
        <p>✓ Digital libraries</p>
      </div>
    </div>
  );
}
