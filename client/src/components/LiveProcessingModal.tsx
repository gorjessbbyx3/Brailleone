import { useState, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { X, Activity, CheckCircle, AlertCircle } from "lucide-react";

interface LiveUpdate {
  stage: string;
  message: string;
  details?: string;
  timestamp: string;
}

interface LiveProcessingModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversionId: string;
}

export default function LiveProcessingModal({ isOpen, onClose, conversionId }: LiveProcessingModalProps) {
  const [updates, setUpdates] = useState<LiveUpdate[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen && conversionId) {
      connectWebSocket();
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [isOpen, conversionId]);

  // Auto-scroll to bottom when new updates arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [updates]);

  const connectWebSocket = () => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/ws`;
      
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        console.log("WebSocket connected for live processing");
        setIsConnected(true);
        setError(null);
        
        // Subscribe to this conversion's updates
        wsRef.current?.send(JSON.stringify({
          type: 'subscribe',
          conversionId
        }));

        // Add connection confirmation
        setUpdates([{
          stage: 'connection',
          message: 'Connected to live processing feed',
          details: 'You will see real-time updates as Groq AI processes your document',
          timestamp: new Date().toISOString()
        }]);
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'liveUpdate' && data.conversionId === conversionId) {
            const update: LiveUpdate = {
              stage: data.stage,
              message: data.message,
              details: data.details,
              timestamp: data.timestamp
            };
            
            setUpdates(prev => [...prev, update]);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      wsRef.current.onclose = () => {
        console.log("WebSocket disconnected");
        setIsConnected(false);
      };

      wsRef.current.onerror = (error) => {
        console.error("WebSocket error:", error);
        setError("Connection error - live updates may not be available");
        setIsConnected(false);
      };

    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      setError("Failed to connect to live processing feed");
    }
  };

  const getStageIcon = (stage: string) => {
    switch (stage) {
      case 'connection':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'ai_review':
        return <Activity className="w-4 h-4 text-blue-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-primary" />;
    }
  };

  const getStageColor = (stage: string) => {
    switch (stage) {
      case 'connection':
        return 'bg-green-100 text-green-800';
      case 'ai_review':
        return 'bg-blue-100 text-blue-800';
      case 'error':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (timestamp: string) => {
    try {
      const date = new Date(timestamp);
      return date.toLocaleTimeString('en-US', { 
        hour12: false, 
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit' 
      });
    } catch {
      return new Date().toLocaleTimeString();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DialogTitle>Live Processing View</DialogTitle>
              <div className="flex items-center space-x-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="text-sm text-muted-foreground">
                  {isConnected ? 'Live' : 'Disconnected'}
                </span>
              </div>
            </div>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        {error && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 text-yellow-600" />
              <span className="text-sm text-yellow-800">{error}</span>
            </div>
          </div>
        )}

        <ScrollArea ref={scrollRef} className="flex-1 border rounded-lg p-4 bg-slate-50">
          <div className="space-y-3">
            {updates.length === 0 ? (
              <div className="text-center py-8">
                <Activity className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Waiting for live updates...</p>
                <p className="text-sm text-muted-foreground">Processing will appear here in real-time</p>
              </div>
            ) : (
              updates.map((update, index) => (
                <div key={index} className="flex items-start space-x-3 p-3 bg-white rounded-lg border">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStageIcon(update.stage)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center space-x-2">
                        <Badge variant="secondary" className={getStageColor(update.stage)}>
                          {update.stage.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <span className="text-xs text-muted-foreground font-mono">
                          {formatTime(update.timestamp)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm font-medium text-foreground mb-1">
                      {update.message}
                    </p>
                    
                    {update.details && (
                      <p className="text-xs text-muted-foreground">
                        {update.details}
                      </p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>

        <div className="flex justify-end pt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}