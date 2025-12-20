import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Volume2 } from "lucide-react";

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
  const languages = [
    { id: "en", label: "English" },
    { id: "es", label: "Spanish" },
    { id: "ar", label: "Arabic" },
    { id: "fr", label: "French" },
    { id: "de", label: "German" },
  ];

  const genders = [
    { id: "female" as const, label: "Female" },
    { id: "male" as const, label: "Male" },
  ];

  const styles = [
    { id: "calm" as const, label: "Calm" },
    { id: "friendly" as const, label: "Friendly" },
    { id: "professional" as const, label: "Professional" },
  ];

  return (
    <Card className="p-4 bg-white/5 border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <Volume2 className="w-4 h-4" />
        <h3 className="font-semibold">Voice Settings</h3>
      </div>

      <div className="space-y-4">
        {/* Language */}
        <div className="space-y-2">
          <Label htmlFor="language" className="text-sm">
            Language
          </Label>
          <Select value={value.language} onValueChange={(lang) => onChange({ ...value, language: lang })}>
            <SelectTrigger id="language" className="w-full" data-testid="select-language">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.id} value={lang.id} data-testid={`option-language-${lang.id}`}>
                  {lang.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Gender */}
        <div className="space-y-2">
          <Label htmlFor="gender" className="text-sm">
            Gender
          </Label>
          <Select value={value.gender} onValueChange={(gen) => onChange({ ...value, gender: gen as "female" | "male" })}>
            <SelectTrigger id="gender" className="w-full" data-testid="select-gender">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {genders.map((gen) => (
                <SelectItem key={gen.id} value={gen.id} data-testid={`option-gender-${gen.id}`}>
                  {gen.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Style */}
        <div className="space-y-2">
          <Label htmlFor="style" className="text-sm">
            Voice Style
          </Label>
          <Select value={value.style} onValueChange={(st) => onChange({ ...value, style: st as "calm" | "friendly" | "professional" })}>
            <SelectTrigger id="style" className="w-full" data-testid="select-style">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {styles.map((st) => (
                <SelectItem key={st.id} value={st.id} data-testid={`option-style-${st.id}`}>
                  {st.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </Card>
  );
}
