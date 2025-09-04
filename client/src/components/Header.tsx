import { BookOpen } from "lucide-react";

export default function Header() {
  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">BrailleConvert</h1>
            <p className="text-sm text-muted-foreground">AI-Powered PDF to Braille Converter</p>
          </div>
        </div>
      </div>
    </header>
  );
}
