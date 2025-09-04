import { Card, CardContent } from "@/components/ui/card";
import { Zap, FileText, Database } from "lucide-react";

export default function FeaturesSection() {
  const features = [
    {
      icon: Zap,
      title: "Groq AI Processing",
      description: "Advanced AI reviews and cleans extracted text for optimal Braille conversion accuracy",
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      icon: FileText,
      title: "Smart Text Cleanup",
      description: "Automatically fixes OCR errors, formatting issues, and preserves document structure",
      color: "text-secondary",
      bgColor: "bg-secondary/10",
    },
    {
      icon: Database,
      title: "Large File Support",
      description: "Efficiently processes textbooks and academic materials with streaming extraction",
      color: "text-accent-foreground",
      bgColor: "bg-accent/30",
    },
  ];

  return (
    <Card className="mb-8">
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold text-card-foreground mb-6">
          AI-Enhanced Conversion Features
        </h3>
        
        <div className="grid md:grid-cols-3 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="text-center">
                <div className={`w-12 h-12 ${feature.bgColor} rounded-lg flex items-center justify-center mx-auto mb-3`}>
                  <Icon className={`w-6 h-6 ${feature.color}`} />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{feature.title}</h4>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
