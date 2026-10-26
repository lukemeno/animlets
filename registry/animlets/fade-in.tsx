"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useState, type ReactNode } from "react";

type FadeInProps = {
  children: ReactNode;
  className?: string;
};

export function FadeIn({ children, className }: FadeInProps) {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setReady(true);
  }, []);

  // useReducedMotion is null on the server and a boolean on the first client
  // render, because that render reads matchMedia. Branching before mount
  // would ship different HTML than the server.
  if (!ready || reduce !== false) {
    return (
      <div className={className} data-fade-in="">
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      data-fade-in=""
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

export function Demo() {
  return (
    <FadeIn>
      <p className="text-3xl font-semibold tracking-tight">Fade in</p>
    </FadeIn>
  );
}
