"use client";

import { useLayoutEffect, useRef, useState, type RefCallback } from "react";
import { services, type ServiceBlock } from "@/lib/content";
import { FadeUp } from "@/components/motion/FadeUp";
import { registerGsap, gsap, Flip } from "@/components/motion/gsapConfig";
import { useTilt } from "@/components/motion/useTilt";
import { ServiceDetailPanel } from "./ServiceDetailPanel";

type ServiceCardProps = {
  service: ServiceBlock;
  index: number;
  isOpen: boolean;
  onOpen: (index: number) => void;
  onClose: () => void;
  registerRef: RefCallback<HTMLDivElement>;
};

function ServiceCard({ service, index, isOpen, onOpen, onClose, registerRef }: ServiceCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  useTilt(ref, { maxTilt: 10, enabled: !isOpen });

  return (
    <div
      ref={(el) => {
        ref.current = el;
        registerRef(el);
      }}
      className={`service-card tilt-shadow ${index % 2 === 0 ? "service-card--dark" : "service-card--light"} ${
        isOpen ? "service-detail-overlay" : ""
      }`}
      onClick={() => (isOpen ? undefined : onOpen(index))}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !isOpen) onOpen(index);
      }}
    >
      {!isOpen && <div className="tilt-glare" aria-hidden="true" />}
      {isOpen ? (
        <ServiceDetailPanel service={service} onClose={onClose} />
      ) : (
        <>
          <span className="text-xs opacity-50">0{index + 1}</span>
          <h3 className="display-text text-lg mt-4 mb-3">{service.name}</h3>
          <p className="text-sm opacity-70">{service.problem}</p>
        </>
      )}
    </div>
  );
}

/**
 * Bento grid of services. Selecting a card GSAP-Flip-morphs it into a
 * full-screen detail panel in place — no route change, no modal fade.
 * Reduced-motion / keyboard users get an instant class-toggle fallback
 * (Flip.getState still runs but the animation duration collapses to 0).
 */
export function ServiceGrid() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const flipStateRef = useRef<ReturnType<typeof Flip.getState> | null>(null);
  const reduceMotionRef = useRef(false);

  useLayoutEffect(() => {
    reduceMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
  }, []);

  const openCard = (index: number) => {
    const el = cardRefs.current[index];
    if (!el) return;
    registerGsap();
    flipStateRef.current = Flip.getState(el);
    setOpenIndex(index);
  };

  const closeCard = () => {
    setOpenIndex(null);
  };

  useLayoutEffect(() => {
    if (openIndex === null) return;
    const el = cardRefs.current[openIndex];
    if (!el || !flipStateRef.current) return;

    registerGsap();
    Flip.from(flipStateRef.current, {
      duration: reduceMotionRef.current ? 0 : 0.65,
      ease: "power3.inOut",
      absolute: true,
      scale: true,
    });
  }, [openIndex]);

  useLayoutEffect(() => {
    if (openIndex !== null) return;
    document.body.style.overflow = "";
  }, [openIndex]);

  return (
    <section id="services" className="section-light py-24 px-6 md:px-10">
      <FadeUp as="div">
        <h2 className="display-text text-3xl md:text-5xl mb-14 max-w-2xl">
          Eight ways we fix a gym.
        </h2>
      </FadeUp>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {services.map((service, i) => (
          <ServiceCard
            key={service.name}
            service={service}
            index={i}
            isOpen={openIndex === i}
            onOpen={openCard}
            onClose={closeCard}
            registerRef={(el) => {
              cardRefs.current[i] = el;
            }}
          />
        ))}
      </div>
    </section>
  );
}
