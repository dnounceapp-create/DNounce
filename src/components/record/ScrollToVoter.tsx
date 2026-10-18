"use client";

import { useEffect } from "react";

/**
 * When a record page is opened with ?voter=<alias> (from the "voters today"
 * lists), scroll to that voter's vote statement and highlight it.
 * Vote lists load asynchronously, so this waits up to ~10 seconds for the
 * element to appear. If the vote is not on the page, it does nothing.
 */
export default function ScrollToVoter() {
  useEffect(() => {
    const alias = new URLSearchParams(window.location.search).get("voter");
    if (!alias) return;

    let tries = 0;
    const timer = window.setInterval(() => {
      tries += 1;
      const el = Array.from(document.querySelectorAll<HTMLElement>("[data-voter-alias]")).find(
        (node) => node.dataset.voterAlias === alias
      );
      if (el) {
        window.clearInterval(timer);
        // Instant jump: a smooth scroll gets cancelled by the stage tracker's own
        // smooth scroll on load. Repeat once in case late content shifts the page.
        el.scrollIntoView({ block: "center" });
        window.setTimeout(() => el.scrollIntoView({ block: "center" }), 600);
        const ring = ["ring-2", "ring-amber-400", "ring-offset-4", "rounded-xl"];
        el.classList.add(...ring);
        window.setTimeout(() => el.classList.remove(...ring), 4000);
      } else if (tries > 40) {
        window.clearInterval(timer);
      }
    }, 250);

    return () => window.clearInterval(timer);
  }, []);

  return null;
}
