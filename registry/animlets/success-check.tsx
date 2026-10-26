"use client";

import { motion, useReducedMotion } from "motion/react";
import { useLayoutEffect, useState } from "react";

type SuccessCheckProps = {
  message?: string;
  className?: string;
};

const CHECK = "M5 12.5 9.5 17 19 7.5";

export function SuccessCheck({ message = "Saved", className }: SuccessCheckProps) {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);

  // useReducedMotion is null on the server and a boolean on the first client
  // render, because that render reads matchMedia. Branching before mount
  // would ship different HTML than the server.
  useLayoutEffect(() => {
    setReady(true);
  }, []);

  const motionOn = ready && reduce === false;

  return (
    <div
      role="status"
      className={["flex items-center gap-3 text-foreground", className].filter(Boolean).join(" ")}
    >
      {motionOn ? (
        <motion.svg
          data-fade-in=""
          viewBox="0 0 24 24"
          className="size-10 text-emerald-600"
          aria-hidden="true"
          initial={{ scale: 0.84, opacity: 0.2 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", bounce: 0.2, duration: 0.5 }}
        >
          <motion.circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          />
          <motion.path
            d={CHECK}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.35, ease: "easeOut", delay: 0.25 }}
          />
        </motion.svg>
      ) : (
        <svg
          data-fade-in=""
          viewBox="0 0 24 24"
          className="size-10 text-emerald-600"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <path
            d={CHECK}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}

export function Demo() {
  return <SuccessCheck message="Account created" />;
}

export type { SuccessCheckProps };
