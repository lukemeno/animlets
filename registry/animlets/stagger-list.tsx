"use client";

import { motion, useReducedMotion } from "motion/react";
import { Children, useLayoutEffect, useState, type ReactNode } from "react";

type StaggerListProps = {
  as?: "div" | "ul";
  children: ReactNode;
  className?: string;
};

const motionTag = {
  div: motion.div,
  li: motion.li,
} as const;

export function StaggerList({ as = "div", children, className }: StaggerListProps) {
  const reduce = useReducedMotion();
  const [ready, setReady] = useState(false);
  const itemTag = as === "ul" ? "li" : "div";

  // useReducedMotion is null on the server and a boolean on the first client
  // render, because that render reads matchMedia. Branching before mount
  // would ship different HTML than the server.
  useLayoutEffect(() => {
    setReady(true);
  }, []);

  const motionOn = ready && reduce === false;
  const items = Children.toArray(children);
  const ListTag = as;

  return (
    <ListTag className={className ?? "grid list-none gap-3 p-0"}>
      {items.map((child, index) => (
        <StaggerRow key={index} tag={itemTag} index={index} motionOn={motionOn}>
          {child}
        </StaggerRow>
      ))}
    </ListTag>
  );
}

function StaggerRow({
  tag,
  index,
  motionOn,
  children,
}: {
  tag: "div" | "li";
  index: number;
  motionOn: boolean;
  children: ReactNode;
}) {
  const marked = index === 0 ? { "data-fade-in": "" } : {};
  if (!motionOn) {
    const Tag = tag;
    return <Tag {...marked}>{children}</Tag>;
  }
  const MotionTag = motionTag[tag];
  return (
    <MotionTag
      {...marked}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: "easeOut", delay: index * 0.08 }}
    >
      {children}
    </MotionTag>
  );
}

const ROWS = [
  ["Northwind", "$18,240"],
  ["Acme", "$12,480"],
  ["Globex", "$9,110"],
  ["Initech", "$6,430"],
];

export function Demo() {
  return (
    <StaggerList className="w-80" as="ul">
      {ROWS.map(([name, amount]) => (
        <div
          key={name}
          className="flex items-center justify-between rounded-lg border bg-card px-4 py-3 text-card-foreground"
        >
          <span className="text-sm font-medium">{name}</span>
          <span className="text-sm tabular-nums text-muted-foreground">{amount}</span>
        </div>
      ))}
    </StaggerList>
  );
}

export type { StaggerListProps };
