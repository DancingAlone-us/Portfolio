/**
 * scroll-reveal.js
 * Scroll-triggered entrance animations for Drabya Hamal's portfolio.
 * Uses IntersectionObserver — no dependencies required.
 */

(function () {
  "use strict";

  /* ─── 1. Elements to animate & their variant ─────────────────────────── */

  const TARGETS = [
    // Narrate labels + section headings — fade up, quick
    { selector: ".narrate",         variant: "fade-up",   delay: 0   },
    { selector: ".section-head",    variant: "fade-up",   delay: 80  },
    { selector: ".about-head",      variant: "fade-up",   delay: 80  },
    { selector: ".hero-eyebrow",    variant: "fade-up",   delay: 0   },
    { selector: ".hero-heading",    variant: "fade-up",   delay: 100 },
    { selector: ".hero-subtitle",   variant: "fade-up",   delay: 180 },
    { selector: ".hero-bio",        variant: "fade-up",   delay: 240 },
    { selector: ".about-desc",      variant: "fade-up",   delay: 160 },

    // Hero card — slides in from the right
    { selector: ".hero-card",       variant: "fade-left", delay: 300 },

    // Hero CTA buttons row
    { selector: ".hero-text .d-flex.flex-wrap", variant: "fade-up", delay: 320 },

    // Service cards — staggered
    { selector: ".service-card",    variant: "fade-up",   stagger: 100 },

    // Skills cards — staggered
    { selector: ".skills-card",     variant: "fade-up",   stagger: 90  },

    // Experience cards
    { selector: ".exp-card",        variant: "fade-up",   stagger: 120 },

    // Education cards
    { selector: ".edu-card",        variant: "fade-up",   stagger: 110 },

    // Reference cards
    { selector: ".ref-card",        variant: "fade-left", stagger: 120 },

    // Project cards
    { selector: ".proj-card",       variant: "fade-up",   stagger: 110 },

    // Contact panel + form card
    { selector: ".contact-panel",   variant: "fade-right", delay: 0  },
    { selector: ".contact-form-card", variant: "fade-left", delay: 80 },

    // Contact items inside the panel — staggered
    { selector: ".contact-item",    variant: "fade-up",   stagger: 80 },
  ];

  /* ─── 2. IntersectionObserver config ─────────────────────────────────── */

  const OBSERVER_OPTIONS = {
    threshold: 0.12,        // trigger when 12 % of element is visible
    rootMargin: "0px 0px -40px 0px", // small offset so it fires a touch before the element
  };

  /* ─── 3. Boot ─────────────────────────────────────────────────────────── */

  function init() {
    // Find every element we care about and mark it as "will-animate"
    const seen = new WeakSet(); // avoid double-processing an element matched by two selectors

    TARGETS.forEach(({ selector, variant, delay = 0, stagger = 0 }) => {
      const els = document.querySelectorAll(selector);

      els.forEach((el, idx) => {
        if (seen.has(el)) return;
        seen.add(el);

        // Set the animation variant as a data-attribute (CSS reads it)
        el.dataset.srVariant = variant;

        // Compute total delay: base delay + stagger offset
        const totalDelay = delay + idx * stagger;
        el.style.setProperty("--sr-delay", `${totalDelay}ms`);

        // Mark as hidden, ready to reveal
        el.classList.add("sr-hidden");

        observer.observe(el);
      });
    });
  }

  /* ─── 4. Observer callback ────────────────────────────────────────────── */

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;

      const el = entry.target;
      el.classList.remove("sr-hidden");
      el.classList.add("sr-visible");

      // Stop watching once revealed — animation plays once
      observer.unobserve(el);
    });
  }, OBSERVER_OPTIONS);

  /* ─── 5. Kick off after DOM is ready ─────────────────────────────────── */

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  /* ─── 6. Respect "prefers-reduced-motion" ────────────────────────────── */
  // If the user has reduced motion enabled, reveal everything immediately.
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (motionQuery.matches) {
    document.querySelectorAll(".sr-hidden").forEach((el) => {
      el.classList.remove("sr-hidden");
      el.classList.add("sr-visible");
    });
  }
})();