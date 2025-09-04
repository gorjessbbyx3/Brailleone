import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  X, 
  FileText, 
  Download, 
  Search,
  Copy,
  BookOpen,
  Eye,
  Loader2
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversion: {
    id: string;
    fileName: string;
    brailleFilePath?: string;
    cleanedTextPath?: string;
    originalTextPath?: string;
    wordCount?: number;
    braillePages?: number;
    accuracyScore?: number;
  };
  onDownload?: () => void;
}

export default function PreviewModal({ 
  isOpen, 
  onClose, 
  conversion, 
  onDownload 
}: PreviewModalProps) {
  const [brailleText, setBrailleText] = useState<string>("");
  const [originalText, setOriginalText] = useState<string>("");
  const [cleanedText, setCleanedText] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("braille");
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && conversion.id) {
      loadTextContent();
    }
  }, [isOpen, conversion.id]);

  const loadTextContent = async () => {
    setLoading(true);
    try {
      // Load Braille text
      if (conversion.brailleFilePath) {
        const brailleResponse = await fetch(`/api/conversions/${conversion.id}/files/braille`);
        if (brailleResponse.ok) {
          const brailleContent = await brailleResponse.text();
          setBrailleText(brailleContent);
        }
      }

      // Load cleaned text 
      if (conversion.cleanedTextPath) {
        const cleanedResponse = await fetch(`/api/conversions/${conversion.id}/files/cleaned`);
        if (cleanedResponse.ok) {
          const cleanedContent = await cleanedResponse.text();
          setCleanedText(cleanedContent);
        }
      }

      // Load original text
      if (conversion.originalTextPath) {
        const originalResponse = await fetch(`/api/conversions/${conversion.id}/files/original`);
        if (originalResponse.ok) {
          const originalContent = await originalResponse.text();
          setOriginalText(originalContent);
        }
      }

    } catch (error) {
      console.error('Error loading text content:', error);
      toast({
        title: "Preview Error",
        description: "Failed to load text content for preview",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: "Copied!",
        description: `${type} text copied to clipboard`,
      });
    });
  };

  const highlightSearchTerm = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-800">$1</mark>');
  };

  const getDisplayText = (text: string) => {
    const highlighted = highlightSearchTerm(text, searchTerm);
    return { __html: highlighted };
  };

  const getWordCount = (text: string) => {
    return text.split(/\s+/).filter(word => word.length > 0).length;
  };

  const getLineCount = (text: string) => {
    return text.split('\n').length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Eye className="w-5 h-5 text-primary" />
              <DialogTitle>Preview - {conversion.fileName}</DialogTitle>
            </div>
            <div className="flex items-center space-x-2">
              {onDownload && (
                <Button onClick={onDownload} size="sm" data-testid="button-download-from-preview">
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">Loading preview content...</p>
            </div>
          </div>
        ) : (
          <>
            {/* Search Bar */}
            <div className="flex items-center space-x-4 pb-4 border-b">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search in text..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-preview"
                />
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                {conversion.wordCount && (
                  <Badge variant="outline">
                    {conversion.wordCount.toLocaleString()} words
                  </Badge>
                )}
                {conversion.braillePages && (
                  <Badge variant="outline">
                    {conversion.braillePages} Braille pages
                  </Badge>
                )}
                {conversion.accuracyScore && (
                  <Badge variant={conversion.accuracyScore >= 95 ? "default" : "secondary"}>
                    {conversion.accuracyScore}% accuracy
                  </Badge>
                )}
              </div>
            </div>

            {/* Content Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="braille" className="flex items-center space-x-2">
                  <BookOpen className="w-4 h-4" />
                  <span>Braille Text</span>
                </TabsTrigger>
                <TabsTrigger value="cleaned" className="flex items-center space-x-2">
                  <FileText className="w-4 h-4" />
                  <span>Cleaned Text</span>
                </TabsTrigger>
                <TabsTrigger value="compare" className="flex items-center space-x-2">
                  <Eye className="w-4 h-4" />
                  <span>Side by Side</span>
                </TabsTrigger>
              </TabsList>

              <TabsContent value="braille" className="flex-1 mt-4">
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Braille Conversion</CardTitle>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          {getLineCount(brailleText).toLocaleString()} lines
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(brailleText, "Braille")}
                          data-testid="button-copy-braille"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 h-full">
                    <ScrollArea className="h-[500px] p-6">
                      <pre 
                        className="text-sm font-mono whitespace-pre-wrap leading-relaxed"
                        dangerouslySetInnerHTML={getDisplayText(brailleText)}
                      />
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cleaned" className="flex-1 mt-4">
                <Card className="h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">AI-Cleaned Text</CardTitle>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">
                          {getWordCount(cleanedText).toLocaleString()} words
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyToClipboard(cleanedText, "Cleaned")}
                          data-testid="button-copy-cleaned"
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0 h-full">
                    <ScrollArea className="h-[500px] p-6">
                      <div 
                        className="text-sm leading-relaxed"
                        dangerouslySetInnerHTML={getDisplayText(cleanedText)}
                      />
                    </ScrollArea>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="compare" className="flex-1 mt-4">
                <div className="grid grid-cols-2 gap-4 h-full">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Original Text</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[500px] p-4">
                        <div 
                          className="text-sm leading-relaxed"
                          dangerouslySetInnerHTML={getDisplayText(cleanedText)}
                        />
                      </ScrollArea>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Braille Text</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                      <ScrollArea className="h-[500px] p-4">
                        <pre 
                          className="text-sm font-mono whitespace-pre-wrap leading-relaxed"
                          dangerouslySetInnerHTML={getDisplayText(brailleText)}
                        />
                      </ScrollArea>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}