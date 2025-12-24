/**
 * Widget Deployment Configuration & Helper Functions
 */

interface WidgetDeploymentConfig {
  businessId: string;
  firebaseProjectId: string;
  widgetVersion?: string;
}

export function generateWidgetEmbedScript(config: {
  businessId: string;
  widgetUrl: string;
  voiceBackendUrl: string;
}): string {
  return `<!-- VocalAI Widget Embed Script -->
<script>
  window.AIVoiceWidgetConfig = {
    businessId: "${config.businessId}",
    widgetUrl: "${config.widgetUrl}",
    voiceBackendUrl: "${config.voiceBackendUrl}"
  };
</script>
<script src="${config.widgetUrl}"></script>
<ai-voice-widget></ai-voice-widget>`;
}
