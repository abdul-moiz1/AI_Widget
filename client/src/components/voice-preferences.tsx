import { Volume2 } from "lucide-react";
import { Card } from "@/components/ui/card";

export interface VoiceSettings {
  language: string;
  gender: "female" | "male";
  style: "calm" | "friendly" | "professional";
}

interface VoicePreferencesProps {
  value: VoiceSettings;
  onChange: (settings: VoiceSettings) => void;
}

export function VoicePreferences({ value, onChange }: VoicePreferencesProps) {
  return (
    <Card className="p-6 bg-white/5 border-white/10">
      <div className="flex items-center gap-2 mb-6">
        <Volume2 className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-lg">Voice Settings</h3>
      </div>

      <div className="space-y-5">
        {/* Language */}
        <div className="space-y-2">
          <label htmlFor="language" className="text-sm font-medium text-muted-foreground block">
            Language
          </label>
          <select
            id="language"
            value={value.language}
            onChange={(e) => onChange({ ...value, language: e.target.value })}
            data-testid="select-language"
            className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-foreground hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="en">English</option>
            <option value="es">Spanish</option>
            <option value="ar">Arabic</option>
            <option value="fr">French</option>
            <option value="de">German</option>
          </select>
        </div>

        {/* Gender */}
        <div className="space-y-2">
          <label htmlFor="gender" className="text-sm font-medium text-muted-foreground block">
            Gender
          </label>
          <select
            id="gender"
            value={value.gender}
            onChange={(e) => onChange({ ...value, gender: e.target.value as "female" | "male" })}
            data-testid="select-gender"
            className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-foreground hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="female">Female</option>
            <option value="male">Male</option>
          </select>
        </div>

        {/* Style */}
        <div className="space-y-2">
          <label htmlFor="style" className="text-sm font-medium text-muted-foreground block">
            Voice Style
          </label>
          <select
            id="style"
            value={value.style}
            onChange={(e) => onChange({ ...value, style: e.target.value as "calm" | "friendly" | "professional" })}
            data-testid="select-style"
            className="w-full px-3 py-2 bg-background border border-white/10 rounded-lg text-foreground hover:border-primary/50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <option value="calm">Calm</option>
            <option value="friendly">Friendly</option>
            <option value="professional">Professional</option>
          </select>
        </div>
      </div>
    </Card>
  );
}
