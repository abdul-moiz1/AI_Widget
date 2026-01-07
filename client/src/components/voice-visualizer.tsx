import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface VoiceVisualizerProps {
  state: "idle" | "listening" | "thinking" | "speaking";
  primaryColor: string;
}

export default function VoiceVisualizer({ state, primaryColor }: VoiceVisualizerProps) {
  const [bars, setBars] = useState<number[]>(new Array(5).fill(4));

  useEffect(() => {
    if (state === "idle") {
      setBars(new Array(5).fill(4));
      return;
    }

    const interval = setInterval(() => {
      setBars((prev) =>
        prev.map(() => {
          if (state === "thinking") return Math.random() * 10 + 5;
          if (state === "listening") return Math.random() * 20 + 5;
          if (state === "speaking") return Math.random() * 30 + 10;
          return 4;
        })
      );
    }, 100);

    return () => clearInterval(interval);
  }, [state]);

  if (state === "idle") {
    return (
      <div className="flex items-center justify-center gap-1 h-12">
        <div 
          className="w-1.5 h-1.5 rounded-full" 
          style={{ backgroundColor: primaryColor, opacity: 0.3 }} 
        />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center gap-1.5 h-12">
      {bars.map((height, i) => (
        <motion.div
          key={i}
          animate={{
            height: `${height}px`,
            opacity: state === "thinking" ? [0.4, 0.8, 0.4] : 1,
          }}
          transition={{
            type: "spring",
            bounce: 0.5,
            duration: 0.2,
            opacity: {
              repeat: Infinity,
              duration: 1.5,
              ease: "easeInOut",
            },
          }}
          className="w-1.5 rounded-full"
          style={{ backgroundColor: primaryColor }}
        />
      ))}
    </div>
  );
}
