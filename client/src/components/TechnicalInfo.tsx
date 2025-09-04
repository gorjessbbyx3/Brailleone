import { Card, CardContent } from "@/components/ui/card";
import { FileText, BookOpen } from "lucide-react";

export default function TechnicalInfo() {
  const supportedSources = [
    "PDF files up to 500MB",
    "Direct PDF URLs", 
    "Academic publications",
    "Digital library books",
    "Textbooks and manuals"
  ];

  const brailleFeatures = [
    "Grade 1 Braille standard",
    "Preserved chapter structure",
    "Optimized page breaks", 
    "Mathematical notation support",
    "Table and list formatting"
  ];

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Supported Formats */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-primary" />
            Supported Sources
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {supportedSources.map((source, index) => (
              <li key={index} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full" />
                <span>{source}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* Braille Output Info */}
      <Card>
        <CardContent className="p-6">
          <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
            <BookOpen className="w-5 h-5 mr-2 text-secondary" />
            Braille Output
          </h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            {brailleFeatures.map((feature, index) => (
              <li key={index} className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-success rounded-full" />
                <span>{feature}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
