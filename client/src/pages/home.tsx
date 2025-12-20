import { motion } from "framer-motion";
import { ArrowRight, Code, MessageSquare, Mic, Zap, CheckCircle2, Smartphone, Gauge, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import abstractBg from '@assets/generated_images/abstract_ai_waveform_background.png';

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

export default function Home() {

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-primary selection:text-primary-foreground">
      {/* Abstract Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        {/* Subtle background image with strong overlay */}
        <div 
            className="absolute inset-0 bg-cover bg-center opacity-15"
            style={{ backgroundImage: `url(${abstractBg})` }}
        />
        
        {/* Strong gradient overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/70 to-background/90" />
        
        {/* Dark wash over hero section for better text contrast */}
        <div className="absolute top-0 left-0 right-0 h-[80vh] bg-gradient-to-b from-black/20 to-transparent" />
        
        {/* Elegant animated gradient orbs */}
        <div className="absolute top-[-15%] right-[-5%] w-[600px] h-[600px] bg-primary/8 rounded-full blur-[80px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[-10%] left-[-8%] w-[500px] h-[500px] bg-blue-600/8 rounded-full blur-[70px] mix-blend-screen" style={{ animationDelay: '2s' }} />
      </div>

      <nav className="relative z-10 container mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2 font-display font-bold text-2xl tracking-tight">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-background shadow-lg shadow-primary/50">
            <Mic className="w-5 h-5" />
          </div>
          VocalAI
        </div>
        <div className="hidden md:flex items-center gap-8 text-sm font-medium">
          <a href="#features" className="text-muted-foreground hover:text-primary transition-colors">Features</a>
          <a href="#integration" className="text-muted-foreground hover:text-primary transition-colors">Integration</a>
          <a href="#pricing" className="text-muted-foreground hover:text-primary transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-4">
          <a href="/admin">
            <Button variant="outline" size="sm" className="text-xs border-white/20">
              Admin
            </Button>
          </a>
          <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
            Get Started
          </Button>
        </div>
      </nav>

      <main className="relative z-10">
        {/* Hero Section */}
        <section className="container mx-auto px-6 pt-20 pb-32 md:pt-32 md:pb-48">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div {...fadeInUp}>
              <div className="inline-block mb-6 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm font-medium">
                ✨ Powered by Gemini AI
              </div>
              <h1 className="font-display text-5xl md:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
                Give your website a <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-primary animate-gradient">Voice</span>.
              </h1>
              <p className="text-lg md:text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
                Embed a production-ready AI voice assistant in minutes. Natural conversations, persona switching, and real-time audio visualization.
              </p>
            </motion.div>

            <motion.div
              {...fadeInUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16"
            >
              <Button size="lg" className="h-12 px-8 text-base bg-gradient-to-r from-primary to-blue-500 text-primary-foreground hover:shadow-lg hover:shadow-primary/50 rounded-full transition-shadow">
                Start for Free <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
              <Button size="lg" variant="outline" className="h-12 px-8 text-base rounded-full border-white/20 hover:bg-white/5 hover:border-primary/50">
                View Documentation
              </Button>
            </motion.div>

            {/* Trust badges */}
            <motion.div {...fadeInUp} className="flex flex-wrap items-center justify-center gap-8 pt-8 border-t border-white/5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Used by 50+ companies</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>99.9% uptime</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="w-4 h-4 text-primary" />
                <span>Enterprise-grade</span>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="container mx-auto px-6 py-24 border-t border-white/5">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Powerful Features</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Everything you need to add voice to your application</p>
          </div>
          <div className="grid md:grid-cols-2 gap-8">
            <FeatureCard 
              icon={<MessageSquare className="w-6 h-6" />}
              title="Natural NLP"
              description="Powered by Gemini 1.5, understanding context, nuance, and maintaining conversation history."
              delay={0}
            />
            <FeatureCard 
              icon={<Mic className="w-6 h-6" />}
              title="Voice First"
              description="Web Speech API with auto-language detection and real-time waveform visualization."
              delay={0.1}
            />
            <FeatureCard 
              icon={<Smartphone className="w-6 h-6" />}
              title="Mobile Ready"
              description="Fully responsive design that works seamlessly across all devices and screen sizes."
              delay={0.2}
            />
            <FeatureCard 
              icon={<Lock className="w-6 h-6" />}
              title="Enterprise Security"
              description="End-to-end encryption with SOC 2 compliance and GDPR-ready data handling."
              delay={0.3}
            />
          </div>
        </section>

        {/* Integration Section */}
        <section id="integration" className="container mx-auto px-6 py-24">
          <div>
            <div className="bg-gradient-to-br from-secondary/40 to-blue-600/10 border border-white/10 rounded-3xl p-8 md:p-16 overflow-hidden relative">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-500" />
              
              <div className="grid md:grid-cols-2 gap-16 items-center relative z-10">
                <motion.div {...fadeInUp}>
                  <h2 className="font-display text-3xl md:text-4xl font-bold mb-6">Ready in seconds</h2>
                  <p className="text-muted-foreground mb-10 leading-relaxed">
                    Simply add our script to your <code className="bg-white/5 px-2 py-1 rounded text-primary">&lt;body&gt;</code> tag. The widget initializes automatically and handles all the complexity.
                  </p>
                  <div className="space-y-5">
                    {[
                      { num: 1, text: "Copy the script tag" },
                      { num: 2, text: "Paste into your HTML" },
                      { num: 3, text: "See the widget appear instantly" }
                    ].map((step) => (
                      <div key={step.num} className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-blue-500 flex items-center justify-center text-primary-foreground text-sm font-bold flex-shrink-0">
                          {step.num}
                        </div>
                        <span className="text-foreground font-medium">{step.text}</span>
                      </div>
                    ))}
                  </div>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                  className="relative group"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-primary/30 to-blue-500/30 blur-2xl group-hover:blur-3xl transition-all" />
                  <div className="relative bg-[#0d1117] rounded-2xl border border-white/10 p-8 font-mono text-sm shadow-2xl hover:border-primary/30 transition-colors">
                    <div className="flex gap-2 mb-6">
                      <div className="w-3 h-3 rounded-full bg-red-500/70" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                      <div className="w-3 h-3 rounded-full bg-green-500/70" />
                    </div>
                    <div className="text-gray-300 space-y-2">
                      <div><span className="text-blue-400">&lt;script</span> <span className="text-purple-400">src</span>=<span className="text-green-400">"https://cdn.vocalai.com/widget.js"</span><span className="text-blue-400">&gt;&lt;/script&gt;</span></div>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section id="pricing" className="container mx-auto px-6 py-24 border-t border-white/5">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Simple Pricing</h2>
            <p className="text-muted-foreground text-lg">Pay for what you use, no surprises</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { name: "Starter", price: "$0", features: ["Up to 1,000 requests/month", "Basic support", "Widget analytics", "1 voice persona"] },
              { name: "Pro", price: "$99", features: ["Up to 100,000 requests/month", "Priority support", "Advanced analytics", "10 voice personas", "Custom branding"], highlight: true },
              { name: "Enterprise", price: "Custom", features: ["Unlimited requests", "Dedicated support", "SLA guarantee", "Unlimited personas", "Custom integrations"] }
            ].map((plan, idx) => (
              <motion.div
                key={idx}
                {...fadeInUp}
                transition={{ ...fadeInUp.transition, delay: idx * 0.1 }}
                className={`rounded-2xl border p-8 transition-all ${
                  plan.highlight 
                    ? "bg-gradient-to-br from-primary/20 to-blue-500/20 border-primary/50 ring-2 ring-primary/30 relative" 
                    : "bg-white/5 border-white/10 hover:border-primary/30"
                }`}
              >
                {plan.highlight && <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>}
                <h3 className="font-display text-xl font-bold mb-2">{plan.name}</h3>
                <div className="mb-6">
                  <span className="text-3xl font-bold">{plan.price}</span>
                  {plan.price !== "Custom" && <span className="text-muted-foreground ml-2">/month</span>}
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button className={`w-full rounded-lg ${plan.highlight ? "bg-primary text-primary-foreground hover:bg-primary/90" : "bg-white/10 hover:bg-white/20"}`}>
                  Get Started
                </Button>
              </motion.div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-6 py-24 border-t border-white/5">
          <div className="bg-gradient-to-r from-primary/20 via-blue-500/20 to-primary/20 border border-primary/30 rounded-3xl p-12 md:p-16 text-center">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">Ready to add voice to your app?</h2>
            <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">Join companies using VocalAI to enhance user engagement with conversational voice AI.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-full px-8">
                Start Free Trial
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8">
                Schedule Demo
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="container mx-auto px-6 py-12 border-t border-white/5 text-center text-sm text-muted-foreground">
        <p>© 2025 VocalAI Inc. All rights reserved.</p>
        <p className="mt-2">Try the widget in the bottom right corner</p>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description, delay }: { icon: React.ReactNode, title: string, description: string, delay: number }) {
  return (
    <motion.div 
      whileHover={{ y: -8 }}
      className="group p-8 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 border border-white/10 hover:border-primary/50 transition-all overflow-hidden relative"
    >
      <div className="absolute inset-0 bg-gradient-to-r from-primary/0 to-blue-500/0 group-hover:from-primary/10 group-hover:to-blue-500/5 transition-all" />
      <div className="relative z-10">
        <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-primary/20 to-blue-500/20 flex items-center justify-center mb-6 text-primary group-hover:from-primary/30 group-hover:to-blue-500/30 transition-colors">
          {icon}
        </div>
        <h3 className="font-display text-xl font-bold mb-3">{title}</h3>
        <p className="text-muted-foreground leading-relaxed">{description}</p>
      </div>
    </motion.div>
  );
}
