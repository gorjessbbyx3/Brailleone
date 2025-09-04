import { ObjectUploader } from "./ObjectUploader";
import { FileText, Upload } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UploadResult } from "@uppy/core";

interface FileUploadSectionProps {
  onConversionStart: (conversionId: string) => void;
}

export default function FileUploadSection({ onConversionStart }: FileUploadSectionProps) {
  const { toast } = useToast();

  const handleGetUploadParameters = async () => {
    try {
      const response = await apiRequest("POST", "/api/objects/upload");
      const data = await response.json();
      return {
        method: "PUT" as const,
        url: data.uploadURL,
      };
    } catch (error) {
      toast({
        title: "Upload Error",
        description: "Failed to get upload parameters",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleComplete = async (result: UploadResult<Record<string, unknown>, Record<string, unknown>>) => {
    try {
      if (!result.successful || result.successful.length === 0) {
        throw new Error("No files uploaded successfully");
      }

      const uploadedFile = result.successful[0];
      const fileName = uploadedFile.name;
      const fileSize = uploadedFile.size;
      const uploadUrl = uploadedFile.uploadURL;

      // Create conversion job
      const response = await apiRequest("POST", "/api/conversions/upload", {
        fileName,
        fileSize,
        uploadUrl,
      });

      const { conversionId } = await response.json();
      
      toast({
        title: "Upload Successful",
        description: "Your file has been uploaded and conversion has started.",
      });

      onConversionStart(conversionId);

    } catch (error) {
      console.error("Upload completion error:", error);
      toast({
        title: "Conversion Error",
        description: "Failed to start conversion process",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="bg-card rounded-lg border border-border p-6 shadow-sm">
      <div className="flex items-center space-x-2 mb-4">
        <FileText className="w-5 h-5 text-destructive" />
        <h3 className="text-lg font-semibold text-card-foreground">Upload PDF Book</h3>
      </div>
      
      <ObjectUploader
        maxNumberOfFiles={1}
        maxFileSize={524288000} // 500MB
        onGetUploadParameters={handleGetUploadParameters}
        onComplete={handleComplete}
        buttonClassName="w-full p-8 border-2 border-dashed border-border rounded-lg text-center hover:border-primary hover:bg-muted focus-ring"
      >
        <div className="flex flex-col items-center space-y-4">
          <Upload className="w-12 h-12 text-muted-foreground" />
          <div>
            <p className="text-foreground font-medium mb-2">Drop your PDF here or click to browse</p>
            <p className="text-sm text-muted-foreground mb-4">Supports files up to 500MB • PDF format only</p>
          </div>
        </div>
      </ObjectUploader>
      
      <div className="mt-4 text-xs text-muted-foreground">
        <p>✓ Large file support (100+ pages)</p>
        <p>✓ AI-powered text extraction</p>
        <p>✓ OCR error correction</p>
      </div>
    </div>
  );
}
