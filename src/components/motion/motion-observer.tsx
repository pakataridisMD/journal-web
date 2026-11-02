"use client";

import { useEffect } from "react";

/** Entrances that come into view together play in reading order, this far apart, all within the spread. */
const STAGGER_MS = 70;
const STAGGER_SPREAD_MS = 700;

/** Reading order: top to bottom, then left to right along a row. */
function readingOrder(a: IntersectionObserverEntry, b: IntersectionObserverEntry) {
  const dy = a.boundingClientRect.top - b.boundingClientRect.top;
  return Math.abs(dy) > 4 ? dy : a.boundingClientRect.left - b.boundingClientRect.left;
}

/**
 * Holds back entrances (see motion.ts) that start below the fold, and plays
 * each one as it scrolls into view. Whatever is on screen when it arrives
 * animates straight away, and nothing is ever hidden without this script, so
 * the pages read the same with JavaScript off. Also marks back and forward
 * navigations, which swap pages without the cross-fade. Does nothing with
 * reduced motion, where nothing animates.
 */
export function MotionObserver() {
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const reveal = new IntersectionObserver(
      (entries) => {
        const arriving = entries.filter((entry) => entry.isIntersecting).sort(readingOrder);
        const step = Math.min(STAGGER_MS, STAGGER_SPREAD_MS / Math.max(arriving.length - 1, 1));
        arriving.forEach((entry, i) => {
          const el = entry.target as HTMLElement | SVGElement;
          reveal.unobserve(el);
          if (i > 0) el.style.setProperty("--reveal-delay", `${Math.round(i * step)}ms`);
          el.dataset.reveal = "shown";
        });
      },
      // Play once the element is a little way into view.
      { rootMargin: "0px 0px -8% 0px" },
    );

    function holdBack(root: ParentNode) {
      const found: (HTMLElement | SVGElement)[] = [];
      if (root instanceof Element && root.matches("[data-motion]")) found.push(root as HTMLElement);
      root.querySelectorAll<HTMLElement | SVGElement>("[data-motion]").forEach((el) => found.push(el));
      // Measure them all before writing, so the page is laid out once.
      const below = found.filter(
        (el) => !el.dataset.reveal && el.getBoundingClientRect().top >= window.innerHeight,
      );
      for (const el of below) {
        el.dataset.reveal = "hidden";
        reveal.observe(el);
      }
    }

    holdBack(document);
    // Pages the router brings in later.
    const arrivals = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof Element) holdBack(node);
        }
      }
    });
    arrivals.observe(document.body, { childList: true, subtree: true });

    // Going back or forward, the browser (or a swipe) has already moved, so
    // the page swaps without a cross-fade until the reader acts again.
    const root = document.documentElement;
    const traverse = () => {
      root.dataset.navigation = "traverse";
    };
    const act = () => {
      delete root.dataset.navigation;
    };
    window.addEventListener("popstate", traverse);
    window.addEventListener("pointerdown", act, true);
    window.addEventListener("keydown", act, true);

    return () => {
      arrivals.disconnect();
      reveal.disconnect();
      window.removeEventListener("popstate", traverse);
      window.removeEventListener("pointerdown", act, true);
      window.removeEventListener("keydown", act, true);
    };
  }, []);

  return null;
}
