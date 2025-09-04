import { useState } from "react";
import Header from "@/components/Header";
import FileUploadSection from "@/components/FileUploadSection";
import UrlInputSection from "@/components/UrlInputSection";
import ProcessingSection from "@/components/ProcessingSection";
import ResultsSection from "@/components/ResultsSection";
import FeaturesSection from "@/components/FeaturesSection";
import RecentConversions from "@/components/RecentConversions";
import TechnicalInfo from "@/components/TechnicalInfo";
import { useQuery } from "@tanstack/react-query";
import type { Conversion } from "@shared/schema";

export default function Home() {
  const [currentConversionId, setCurrentConversionId] = useState<string | null>(null);

  // Poll for conversion status if we have an active conversion
  const { data: currentConversion } = useQuery<Conversion>({
    queryKey: ['/api/conversions', currentConversionId],
    enabled: !!currentConversionId,
    refetchInterval: currentConversionId && currentConversionId !== null ? 2000 : false,
  });

  const { data: recentConversions = [] } = useQuery<Conversion[]>({
    queryKey: ['/api/conversions'],
  });

  const handleConversionStart = (conversionId: string) => {
    setCurrentConversionId(conversionId);
  };

  const isProcessing = currentConversion && 
    ['pending', 'extracting', 'ai_reviewing', 'converting'].includes(currentConversion.status);
  const isCompleted = currentConversion?.status === 'completed';

  return (
    <div className="bg-background text-foreground font-sans min-h-screen">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 py-8">
        {/* Intro Section */}
        <div className="mb-8 text-center">
          <h2 className="text-3xl font-bold text-foreground mb-4">
            Convert Books to Accessible Braille
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            Upload PDF books or provide digital book URLs to convert them into Grade 1 Braille format. 
            Our AI-powered system ensures accurate text extraction and high-quality Braille conversion.
          </p>
        </div>

        {/* Input Methods */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <FileUploadSection onConversionStart={handleConversionStart} />
          <UrlInputSection onConversionStart={handleConversionStart} />
        </div>

        {/* Processing Section */}
        {isProcessing && currentConversion && (
          <ProcessingSection conversion={currentConversion} />
        )}

        {/* Results Section */}
        {isCompleted && currentConversion && (
          <ResultsSection conversion={currentConversion} />
        )}

        {/* Features Section */}
        <FeaturesSection />

        {/* Recent Conversions */}
        <RecentConversions conversions={recentConversions} />

        {/* Technical Info */}
        <TechnicalInfo />
      </main>

      {/* Footer */}
      <footer className="bg-muted/30 border-t border-border mt-12">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">
              Powered by Groq AI • Built for accessibility • Free to use
            </p>
            <div className="flex justify-center space-x-6 text-sm">
              <button className="text-primary hover:text-primary/80 focus-ring p-1 rounded">
                Privacy Policy
              </button>
              <button className="text-primary hover:text-primary/80 focus-ring p-1 rounded">
                Accessibility Statement
              </button>
              <button className="text-primary hover:text-primary/80 focus-ring p-1 rounded">
                Support
              </button>
              <button className="text-primary hover:text-primary/80 focus-ring p-1 rounded">
                API Documentation
              </button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
