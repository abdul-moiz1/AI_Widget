import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mic, Volume2 } from "lucide-react";
import { useState, useEffect } from "react";
import VoiceVisualizer from "./voice-visualizer";

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

interface LiveWidgetPreviewProps {
  config: WidgetConfig;
}

export default function LiveWidgetPreview({ config }: LiveWidgetPreviewProps) {
  const [state, setState] = useState<"idle" | "listening" | "thinking" | "speaking">("idle");

  useEffect(() => {
    if (state === "idle") return;

    let timeoutId: NodeJS.Timeout;

    if (state === "listening") {
      timeoutId = setTimeout(() => setState("thinking"), 2000);
    } else if (state === "thinking") {
      timeoutId = setTimeout(() => setState("speaking"), 1500);
    } else if (state === "speaking") {
      timeoutId = setTimeout(() => setState("idle"), 3000);
    }

    return () => clearTimeout(timeoutId);
  }, [state]);

  const languageLabels: Record<string, string> = {
    en: "English",
    es: "Spanish",
    fr: "French",
    de: "German",
    ar: "Arabic",
  };

  const styleLabels: Record<string, string> = {
    calm: "Calm",
    friendly: "Friendly",
    professional: "Professional",
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Live Preview</CardTitle>
          <CardDescription>
            How your widget will appear to visitors
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Widget Preview Container */}
          <div
            className="rounded-lg border-2 p-6 bg-gradient-to-br from-white/50 to-white/30 dark:from-black/30 dark:to-black/20 overflow-hidden"
            style={{
              borderColor: config.theme.primaryColor + "40",
              backgroundColor: config.theme.primaryColor + "08",
            }}
          >
            {/* Widget Header */}
            <div
              className="rounded-lg p-4 mb-4 text-white flex items-center gap-3"
              style={{ backgroundColor: config.theme.primaryColor }}
            >
              <Mic className="w-5 h-5" />
              <div>
                <h3 className="font-semibold text-sm">{config.assistantName}</h3>
                <p className="text-xs opacity-90">AI Voice Assistant</p>
              </div>
            </div>

            {/* Welcome Message */}
            <div className="bg-muted/50 rounded-lg p-4 mb-4 text-sm relative min-h-[100px] flex flex-col justify-center">
              {state === "idle" ? (
                <p className="text-foreground/80">{config.welcomeMessage}</p>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <VoiceVisualizer state={state} primaryColor={config.theme.primaryColor} />
                  <p className="text-xs font-medium capitalize" style={{ color: config.theme.primaryColor }}>
                    {state}...
                  </p>
                </div>
              )}
            </div>

            {/* Configuration Summary */}
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground font-medium mb-1">Voice Settings</p>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" data-testid="badge-language">
                    {languageLabels[config.voice.language]}
                  </Badge>
                  <Badge variant="outline" data-testid="badge-gender">
                    {config.voice.gender === "male" ? "Male" : "Female"}
                  </Badge>
                  <Badge variant="outline" data-testid="badge-style">
                    {styleLabels[config.voice.style]}
                  </Badge>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground font-medium mb-1">Colors</p>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-input"
                      style={{ backgroundColor: config.theme.primaryColor }}
                      data-testid="color-preview-primary"
                    />
                    <span className="text-xs">Primary</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded border border-input"
                      style={{ backgroundColor: config.theme.accentColor }}
                      data-testid="color-preview-accent"
                    />
                    <span className="text-xs">Accent</span>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-muted-foreground font-medium mb-1">Behavior</p>
                <div className="flex items-center gap-2">
                  <input type="checkbox" checked={config.autoStart} readOnly />
                  <span className="text-xs">Auto-start on page load</span>
                </div>
              </div>
            </div>

            {/* Simulated Widget Button */}
            <div className="mt-6 pt-4 border-t border-muted flex justify-center">
              <button
                onClick={() => state === "idle" && setState("listening")}
                disabled={state !== "idle"}
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-white transition-transform hover:scale-105 disabled:opacity-50 disabled:hover:scale-100"
                style={{ backgroundColor: config.theme.primaryColor }}
                data-testid="button-preview-widget"
              >
                <Volume2 className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {state === "idle" ? `Talk to ${config.assistantName}` : state.charAt(0).toUpperCase() + state.slice(1)}
                </span>
              </button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Configuration Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">System Prompt</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {config.systemPrompt}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
