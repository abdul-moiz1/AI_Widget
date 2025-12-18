import { motion } from "framer-motion";
import { ArrowRight, Code, MessageSquare, Mic, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import abstractBg from '@assets/generated_images/abstract_ai_waveform_background.png';

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div 
            className="absolute inset-0 bg-cover bg-center opacity-40 mix-blend-screen"
            style={{ backgroundImage: `url(${abstractBg})` }}
        />
        <div className="absolute inset-0 bg-background/80" /> {/* Overlay to darken */}
        
        <div className="absolute top-[-20%] right-[-10%] w-[800px] h-[800px] bg-primary/10 rounded-full blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-600/10 rounded-full blur-[100px] mix-blend-screen" />
      </div>

      <nav className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 font-display font-bold text-2xl tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-background">
            <Mic className="w-5 h-5" />
          </div>
          VocalAI
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-muted-foreground">
          <a href="#features" className="hover:text-primary transition-colors">Features</a>
          <a href="#integration" className="hover:text-primary transition-colors">Integration</a>
          <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
        </div>
        <Button variant="outline" className="border-primary/20 hover:bg-primary/10 hover:text-primary">
          Get Started
        </Button>
      </nav>

      <main className="relative z-10">
        <section className="container mx-auto px-6 pt-20 pb-32 md:pt-32 md:pb-48">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
                Give your website a <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">Voice</span>.
              </h1>
              <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
                Embed a production-ready AI voice assistant in minutes. 
                Natural conversations, persona switching, and real-time audio visualization.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <Button size="lg" className="h-12 px-8 text-base bg-primary text-primary-foreground hover:bg-primary/90 rounded-full">
                Start for Free <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base rounded-full border-white/10 hover:bg-white/5">
                View Documentation
              </Button>
            </motion.div>
          </div>
        </section>

        <section id="features" className="container mx-auto px-6 py-24 border-t border-white/5">
          <div className="grid md:grid-cols-3 gap-12">
            <FeatureCard 
              icon={<MessageSquare className="w-6 h-6 text-primary" />}
              title="Natural NLP"
              description="Powered by Gemini 1.5, understanding context, nuance, and maintaining conversation history across sessions."
            />
            <FeatureCard 
              icon={<Mic className="w-6 h-6 text-primary" />}
              title="Voice First"
              description="Built on the Web Speech API with auto-language detection and real-time waveform visualization."
            />
            <FeatureCard 
              icon={<Code className="w-6 h-6 text-primary" />}
              title="Zero Config"
              description="Just drop a single script tag into your HTML. No build steps, no complex configuration required."
            />
          </div>
        </section>

        <section id="integration" className="container mx-auto px-6 py-24">
          <div className="bg-secondary/30 border border-white/5 rounded-2xl p-8 md:p-12 overflow-hidden relative">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="font-display text-3xl font-bold mb-4">Ready in seconds</h2>
                <p className="text-muted-foreground mb-8">
                  Simply add our script to your <code>&lt;body&gt;</code> tag. The widget initializes automatically 
                  and handles all the complexity of audio processing, state management, and API calls.
                </p>
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">1</div>
                    <span>Copy the script tag</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">2</div>
                    <span>Paste into your HTML</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xs font-bold">3</div>
                    <span>See the widget appear instantly</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-500/20 blur-3xl" />
                <div className="relative bg-[#0d1117] rounded-xl border border-white/10 p-6 font-mono text-sm shadow-2xl">
                  <div className="flex gap-2 mb-4">
                    <div className="w-3 h-3 rounded-full bg-red-500/50" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/50" />
                    <div className="w-3 h-3 rounded-full bg-green-500/50" />
                  </div>
                  <div className="text-gray-400">
                    <span className="text-blue-400">&lt;script</span> <span className="text-purple-400">src</span>=<span className="text-green-400">"https://cdn.vocalai.com/widget.js"</span><span className="text-blue-400">&gt;&lt;/script&gt;</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-6 py-12 border-t border-white/5 text-center text-sm text-muted-foreground">
        <p>© 2025 VocalAI Inc. All rights reserved.</p>
        <p className="mt-2">Try the widget in the bottom right corner!</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div 
      whileHover={{ y: -5 }}
      className="p-6 rounded-xl bg-white/5 border border-white/5 hover:border-primary/50 transition-colors"
    >
      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="font-display text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </motion.div>
  );
}
