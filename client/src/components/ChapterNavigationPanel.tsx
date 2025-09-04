import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { 
  BookOpen, 
  ChevronDown, 
  ChevronRight, 
  FileText, 
  Hash,
  Navigation
} from "lucide-react";

interface Chapter {
  id: string;
  title: string;
  startPage?: number;
  endPage?: number;
  summary: string;
  keyTopics: string[];
  brailleStartLine?: number;
  brailleEndLine?: number;
}

interface ChapterNavigationPanelProps {
  chapters: Chapter[];
  documentSummary?: string;
  keyTopics?: string[];
  onChapterClick?: (chapter: Chapter) => void;
  className?: string;
}

export default function ChapterNavigationPanel({
  chapters,
  documentSummary,
  keyTopics = [],
  onChapterClick,
  className
}: ChapterNavigationPanelProps) {
  const [expandedChapters, setExpandedChapters] = useState<Set<string>>(new Set());
  const [showDocumentSummary, setShowDocumentSummary] = useState(false);

  const toggleChapter = (chapterId: string) => {
    const newExpanded = new Set(expandedChapters);
    if (newExpanded.has(chapterId)) {
      newExpanded.delete(chapterId);
    } else {
      newExpanded.add(chapterId);
    }
    setExpandedChapters(newExpanded);
  };

  const handleChapterClick = (chapter: Chapter) => {
    onChapterClick?.(chapter);
  };

  if (chapters.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Navigation className="w-5 h-5" />
            <span>Chapter Navigation</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No chapters detected in this document
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Navigation className="w-5 h-5" />
          <span>Chapter Navigation</span>
          <Badge variant="secondary" className="ml-2">
            {chapters.length} chapters
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <div className="p-6 space-y-4">
            {/* Document Summary Section */}
            {documentSummary && (
              <Collapsible open={showDocumentSummary} onOpenChange={setShowDocumentSummary}>
                <CollapsibleTrigger className="flex items-center justify-between w-full p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors">
                  <div className="flex items-center space-x-3">
                    <FileText className="w-4 h-4" />
                    <span className="font-medium">Document Overview</span>
                  </div>
                  {showDocumentSummary ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-2 p-3 bg-background border rounded-lg">
                  <p className="text-sm text-foreground mb-3">{documentSummary}</p>
                  
                  {keyTopics.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Key Topics:</p>
                      <div className="flex flex-wrap gap-1">
                        {keyTopics.map((topic, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
            )}

            {/* Chapters List */}
            <div className="space-y-3">
              {chapters.map((chapter, index) => (
                <div key={chapter.id} className="border rounded-lg overflow-hidden">
                  <Collapsible
                    open={expandedChapters.has(chapter.id)}
                    onOpenChange={() => toggleChapter(chapter.id)}
                  >
                    <CollapsibleTrigger className="w-full p-4 hover:bg-muted/50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex items-start space-x-3 text-left">
                          <div className="flex-shrink-0 w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mt-1">
                            <span className="text-sm font-semibold text-primary">
                              {index + 1}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-foreground line-clamp-2 mb-1">
                              {chapter.title}
                            </h3>
                            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
                              {chapter.startPage && chapter.endPage && (
                                <span className="flex items-center space-x-1">
                                  <FileText className="w-3 h-3" />
                                  <span>Pages {chapter.startPage}-{chapter.endPage}</span>
                                </span>
                              )}
                              {chapter.brailleStartLine && chapter.brailleEndLine && (
                                <span className="flex items-center space-x-1">
                                  <Hash className="w-3 h-3" />
                                  <span>Lines {chapter.brailleStartLine}-{chapter.brailleEndLine}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex-shrink-0 ml-2">
                          {expandedChapters.has(chapter.id) ? (
                            <ChevronDown className="w-4 h-4" />
                          ) : (
                            <ChevronRight className="w-4 h-4" />
                          )}
                        </div>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="px-4 pb-4 border-t bg-muted/20">
                        {/* Chapter Summary */}
                        {chapter.summary && (
                          <div className="pt-4 mb-4">
                            <p className="text-sm text-foreground leading-relaxed">
                              {chapter.summary}
                            </p>
                          </div>
                        )}

                        {/* Key Topics */}
                        {chapter.keyTopics.length > 0 && (
                          <div className="mb-4">
                            <p className="text-xs font-medium text-muted-foreground mb-2">
                              Key Topics:
                            </p>
                            <div className="flex flex-wrap gap-1">
                              {chapter.keyTopics.map((topic, topicIndex) => (
                                <Badge
                                  key={topicIndex}
                                  variant="secondary"
                                  className="text-xs"
                                >
                                  {topic}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Jump to Chapter Button */}
                        <Button
                          onClick={() => handleChapterClick(chapter)}
                          variant="outline"
                          size="sm"
                          className="w-full"
                          data-testid={`button-jump-to-chapter-${chapter.id}`}
                        >
                          <BookOpen className="w-4 h-4 mr-2" />
                          Jump to Chapter
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}