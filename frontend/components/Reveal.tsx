"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Reveals its children once they scroll into view.
 *
 * Uses IntersectionObserver rather than an animation library — these are
 * simple fade-ups and a dependency would outweigh the payload. Motion is
 * skipped entirely when the visitor has reduced motion turned on.
 */
export default function Reveal({
  children,
  delay = 0,
  as: Tag = "div",
  className,
  style,
}: {
  children: React.ReactNode;
  /** Stagger in ms — use to cascade siblings. */
  delay?: number;
  as?: any;
  className?: string;
  style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      // Fire slightly before the element reaches the viewport edge so the
      // motion finishes as it settles into view rather than after.
      { threshold: 0.1, rootMargin: "0px 0px -60px 0px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      className={className}
      style={{
        ...style,
        opacity: reduced || shown ? 1 : 0,
        transform: reduced || shown ? "none" : "translateY(14px)",
        transition: reduced
          ? "none"
          : "opacity .7s cubic-bezier(.22,.61,.36,1), transform .7s cubic-bezier(.22,.61,.36,1)",
        transitionDelay: reduced ? "0ms" : `${delay}ms`,
      }}
    >
      {children}
    </Tag>
  );
}
