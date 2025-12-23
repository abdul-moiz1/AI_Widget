import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Loader2 } from "lucide-react";

interface WidgetConfig {
  assistantName: string;
  systemPrompt: string;
  welcomeMessage: string;
  voice: {
    language: string;
    gender: "female" | "male";
    style: "calm" | "friendly" | "professional";
  };
  theme: {
    primaryColor: string;
    accentColor: string;
  };
  autoStart: boolean;
}

interface WidgetEditorProps {
  config: WidgetConfig;
  onSave: (config: WidgetConfig) => void;
  isSaving: boolean;
}

export default function WidgetEditor({ config, onSave, isSaving }: WidgetEditorProps) {
  const [formData, setFormData] = useState<WidgetConfig>(config);

  const handleSave = () => {
    onSave(formData);
  };

  const updateNestedField = (path: string, value: any) => {
    const keys = path.split(".");
    const newData: any = { ...formData };
    let current: any = newData;

    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = { ...current[keys[i]] };
      current = current[keys[i]];
    }

    current[keys[keys.length - 1]] = value;
    setFormData(newData);
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Assistant Configuration</CardTitle>
          <CardDescription>
            Customize your AI assistant's personality and behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Assistant Name */}
          <div className="space-y-2">
            <Label htmlFor="assistant-name">Assistant Name</Label>
            <Input
              id="assistant-name"
              value={formData.assistantName}
              onChange={(e) => setFormData({ ...formData, assistantName: e.target.value })}
              placeholder="e.g., Alex"
              data-testid="input-assistant-name"
            />
          </div>

          {/* System Prompt */}
          <div className="space-y-2">
            <Label htmlFor="system-prompt">System Prompt</Label>
            <Textarea
              id="system-prompt"
              value={formData.systemPrompt}
              onChange={(e) => setFormData({ ...formData, systemPrompt: e.target.value })}
              placeholder="Define how your assistant should behave..."
              className="min-h-24"
              data-testid="textarea-system-prompt"
            />
          </div>

          {/* Welcome Message */}
          <div className="space-y-2">
            <Label htmlFor="welcome-message">Welcome Message</Label>
            <Textarea
              id="welcome-message"
              value={formData.welcomeMessage}
              onChange={(e) => setFormData({ ...formData, welcomeMessage: e.target.value })}
              placeholder="What should the assistant say when starting?"
              className="min-h-20"
              data-testid="textarea-welcome-message"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Voice Settings</CardTitle>
          <CardDescription>
            Configure voice characteristics
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Language */}
          <div className="space-y-2">
            <Label htmlFor="language">Language</Label>
            <Select
              value={formData.voice.language}
              onValueChange={(value) => updateNestedField("voice.language", value)}
            >
              <SelectTrigger id="language" data-testid="select-language">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="es">Spanish</SelectItem>
                <SelectItem value="fr">French</SelectItem>
                <SelectItem value="de">German</SelectItem>
                <SelectItem value="ar">Arabic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Gender */}
          <div className="space-y-2">
            <Label htmlFor="gender">Voice Gender</Label>
            <Select
              value={formData.voice.gender}
              onValueChange={(value) => updateNestedField("voice.gender", value as "female" | "male")}
            >
              <SelectTrigger id="gender" data-testid="select-gender">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="male">Male</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Style */}
          <div className="space-y-2">
            <Label htmlFor="style">Voice Style</Label>
            <Select
              value={formData.voice.style}
              onValueChange={(value) => updateNestedField("voice.style", value as "calm" | "friendly" | "professional")}
            >
              <SelectTrigger id="style" data-testid="select-style">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="calm">Calm</SelectItem>
                <SelectItem value="friendly">Friendly</SelectItem>
                <SelectItem value="professional">Professional</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Theme & Behavior</CardTitle>
          <CardDescription>
            Customize colors and widget behavior
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Primary Color */}
          <div className="space-y-2">
            <Label htmlFor="primary-color">Primary Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                id="primary-color"
                value={formData.theme.primaryColor}
                onChange={(e) => updateNestedField("theme.primaryColor", e.target.value)}
                className="h-10 w-20 rounded-md cursor-pointer border border-input"
                data-testid="input-primary-color"
              />
              <Input
                type="text"
                value={formData.theme.primaryColor}
                onChange={(e) => updateNestedField("theme.primaryColor", e.target.value)}
                placeholder="#000000"
                className="flex-1"
                data-testid="input-primary-color-hex"
              />
            </div>
          </div>

          {/* Accent Color */}
          <div className="space-y-2">
            <Label htmlFor="accent-color">Accent Color</Label>
            <div className="flex gap-2">
              <input
                type="color"
                id="accent-color"
                value={formData.theme.accentColor}
                onChange={(e) => updateNestedField("theme.accentColor", e.target.value)}
                className="h-10 w-20 rounded-md cursor-pointer border border-input"
                data-testid="input-accent-color"
              />
              <Input
                type="text"
                value={formData.theme.accentColor}
                onChange={(e) => updateNestedField("theme.accentColor", e.target.value)}
                placeholder="#000000"
                className="flex-1"
                data-testid="input-accent-color-hex"
              />
            </div>
          </div>

          {/* Auto-Start Toggle */}
          <div className="flex items-center justify-between py-2">
            <div>
              <Label htmlFor="auto-start">Auto-start Widget</Label>
              <p className="text-sm text-muted-foreground mt-1">
                Widget opens automatically on page load
              </p>
            </div>
            <Switch
              id="auto-start"
              checked={formData.autoStart}
              onCheckedChange={(checked) => setFormData({ ...formData, autoStart: checked })}
              data-testid="switch-auto-start"
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full"
        size="lg"
        data-testid="button-save-config"
      >
        {isSaving ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Configuration"
        )}
      </Button>
    </div>
  );
}
