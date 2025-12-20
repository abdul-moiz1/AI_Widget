import { useState } from "react";
import { Volume2 } from "lucide-react";

export interface WidgetVoiceSettings {
  language: string;
  gender: "female" | "male";
  style: "calm" | "friendly" | "professional";
}

interface WidgetVoiceSelectorProps {
  value: WidgetVoiceSettings;
  onChange: (settings: WidgetVoiceSettings) => void;
}

export function WidgetVoiceSelector({ 
  value, 
  onChange
}: WidgetVoiceSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"language" | "gender" | "style">("language");

  const languages = ["en", "es", "ar", "fr", "de"];
  const genders: Array<"female" | "male"> = ["female", "male"];
  const styles: Array<"calm" | "friendly" | "professional"> = ["calm", "friendly", "professional"];

  const getLabel = (value: string) => {
    const labels: Record<string, string> = {
      en: "English", es: "Spanish", ar: "Arabic", fr: "French", de: "German",
      female: "Female", male: "Male",
      calm: "Calm", friendly: "Friendly", professional: "Pro"
    };
    return labels[value] || value;
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2 hover:bg-accent rounded-lg transition-colors cursor-pointer"
        title="Voice Settings"
        data-testid="button-voice-settings"
      >
        <Volume2 className="w-5 h-5 text-foreground" />
      </button>

      {isOpen && (
        <div className="absolute bottom-20 right-0 bg-gradient-to-br from-background/95 to-background/90 border border-white/20 rounded-xl shadow-2xl backdrop-blur-md p-4 w-72 z-50 animate-in fade-in slide-in-from-bottom-2 duration-300">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              <h3 className="font-semibold text-sm">Voice</h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              data-testid="button-close-voice-settings"
            >
              ✕
            </button>
          </div>

          {/* Tabs */}
          <div className="grid grid-cols-3 gap-2 mb-4">
            {(["language", "gender", "style"] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  activeTab === tab
                    ? "bg-primary text-primary-foreground"
                    : "bg-white/10 text-muted-foreground hover:bg-white/20"
                }`}
                data-testid={`tab-${tab}`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Language Options */}
          {activeTab === "language" && (
            <div className="space-y-2">
              {languages.map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => onChange({ ...value, language: lang })}
                  className={`w-full py-2 px-3 rounded-lg text-sm transition-all cursor-pointer ${
                    value.language === lang
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-white/10 text-foreground hover:bg-white/20"
                  }`}
                  data-testid={`option-language-${lang}`}
                >
                  {getLabel(lang)}
                </button>
              ))}
            </div>
          )}

          {/* Gender Options */}
          {activeTab === "gender" && (
            <div className="space-y-2">
              {genders.map((gen) => (
                <button
                  key={gen}
                  type="button"
                  onClick={() => onChange({ ...value, gender: gen })}
                  className={`w-full py-2 px-3 rounded-lg text-sm transition-all cursor-pointer ${
                    value.gender === gen
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-white/10 text-foreground hover:bg-white/20"
                  }`}
                  data-testid={`option-gender-${gen}`}
                >
                  {getLabel(gen)}
                </button>
              ))}
            </div>
          )}

          {/* Style Options */}
          {activeTab === "style" && (
            <div className="space-y-2">
              {styles.map((sty) => (
                <button
                  key={sty}
                  type="button"
                  onClick={() => onChange({ ...value, style: sty })}
                  className={`w-full py-2 px-3 rounded-lg text-sm transition-all cursor-pointer ${
                    value.style === sty
                      ? "bg-primary text-primary-foreground font-medium"
                      : "bg-white/10 text-foreground hover:bg-white/20"
                  }`}
                  data-testid={`option-style-${sty}`}
                >
                  {getLabel(sty)}
                </button>
              ))}
            </div>
          )}

          {/* Current Selection Summary */}
          <div className="mt-4 pt-4 border-t border-white/10 flex gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Current:</span>
            <span className="text-xs bg-white/10 px-2 py-1 rounded">{getLabel(value.language)}</span>
            <span className="text-xs bg-white/10 px-2 py-1 rounded">{getLabel(value.gender)}</span>
            <span className="text-xs bg-white/10 px-2 py-1 rounded">{getLabel(value.style)}</span>
          </div>
        </div>
      )}
    </>
  );
}
