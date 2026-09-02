/*!
 * Gymholic account icons — a small hand-drawn set instead of stock emoji,
 * so the account area speaks the site's visual language: 1.6px cream
 * strokes on the 24px grid, `currentColor` everywhere (active tabs turn
 * them orange via the sidebar styles, never a hardcoded colour).
 */

import type { SVGProps } from "react";

function base(props: SVGProps<SVGSVGElement>): SVGProps<SVGSVGElement> {
  return {
    width: 18,
    height: 18,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  };
}

export function IconUser(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20c.8-3.4 3.6-5.2 7-5.2s6.2 1.8 7 5.2" />
    </svg>
  );
}

export function IconShield(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.2 5 5.8v5.4c0 4.3 2.9 7.6 7 9.6 4.1-2 7-5.3 7-9.6V5.8L12 3.2Z" />
      <path d="m9.2 11.8 2 2 3.6-3.9" />
    </svg>
  );
}

export function IconGraduationCap(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="m12 4.5 9.5 4.2L12 12.9 2.5 8.7 12 4.5Z" />
      <path d="M6.5 10.6v4.5c0 1.5 2.5 3 5.5 3s5.5-1.5 5.5-3v-4.5" />
      <path d="M21.5 8.7v5.1" />
    </svg>
  );
}

export function IconCalendar(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 9.8h17" />
      <path d="M8.2 3v3.4M15.8 3v3.4" />
      <path d="M7.6 13.6h2.2M10.9 13.6h2.2M14.2 13.6h2.2M7.6 17h2.2M10.9 17h2.2" />
    </svg>
  );
}

export function IconCard(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
      <path d="M3 10h18" />
      <path d="M6.4 14.6h4" />
    </svg>
  );
}

export function IconLibrary(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4.5 4.5h4a2 2 0 0 1 2 2v13a1.6 1.6 0 0 0-1.6-1.6H4.5V4.5Z" />
      <path d="M19.5 4.5h-4a2 2 0 0 0-2 2v13a1.6 1.6 0 0 1 1.6-1.6h4.4V4.5Z" />
      <path d="M12 6.9v11" />
    </svg>
  );
}

export function IconLogout(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M14.5 4.5h3A1.8 1.8 0 0 1 19.3 6.3v11.4a1.8 1.8 0 0 1-1.8 1.8h-3" />
      <path d="M9.8 16.2 6 12.4l3.8-3.8" />
      <path d="M6 12.4h9" />
    </svg>
  );
}

export function IconPhone(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M7.2 3.8 9 3.3c.6-.2 1.3.1 1.5.7l1 2.4c.2.5.1 1.1-.3 1.5l-1.3 1.3a12.2 12.2 0 0 0 4.9 4.9l1.3-1.3c.4-.4 1-.5 1.5-.3l2.4 1c.6.2.9.9.7 1.5l-.5 1.8c-.2.7-.8 1.2-1.5 1.2C11.3 17.8 6.2 12.7 6 5.3c0-.7.5-1.3 1.2-1.5Z" />
    </svg>
  );
}

export function IconMail(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3.2" y="5.2" width="17.6" height="13.6" rx="2.4" />
      <path d="m4.4 7.4 7.6 5.4 7.6-5.4" />
    </svg>
  );
}

export function IconNote(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M6 3.8h9.4L19.5 8v12.2H6V3.8Z" />
      <path d="M15 3.8V8h4.4" />
      <path d="M9 12h6M9 15.4h6M9 8.6h2.6" />
    </svg>
  );
}

export function IconSpark(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 3.5c.5 4.5 2 6 6.5 6.5-4.5.5-6 2-6.5 6.5-.5-4.5-2-6-6.5-6.5 4.5-.5 6-2 6.5-6.5Z" />
      <path d="M18.8 14.6c.3 2.5 1.1 3.3 3.7 3.7-2.6.3-3.4 1.1-3.7 3.7-.3-2.6-1.1-3.4-3.7-3.7 2.6-.4 3.4-1.2 3.7-3.7Z" />
    </svg>
  );
}

/* ---- Commerce & document icons ---- */

export function IconPdf(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M6 3.8h8.2l4.8 4.8v11.6H6V3.8Z" />
      <path d="M14 3.8V8.6h4.6" />
      <path d="M9.2 17.4v-4.6h1.2a1.3 1.3 0 0 1 0 2.6H9.2" />
      <path d="M12.9 17.4v-4.6h.9a1.8 2.3 0 0 1 0 4.6h-.9Z" fill="none" />
      <path d="M15.4 12.8v4.6" />
    </svg>
  );
}

export function IconLock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="5" y="10.4" width="14" height="9.6" rx="2.4" />
      <path d="M8.2 10.4V7.8a3.8 3.8 0 0 1 7.6 0v2.6" />
      <path d="M12 14.2v2.2" />
    </svg>
  );
}

export function IconCheck(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="m4.8 12.6 4.6 4.6L19.2 6.8" />
    </svg>
  );
}

export function IconClock(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M12 7.4V12l3.2 1.9" />
    </svg>
  );
}

export function IconVideo(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3.2" y="6.4" width="12.4" height="11.2" rx="2.4" />
      <path d="m15.6 10.4 5.2-3v9.2l-5.2-3" />
    </svg>
  );
}

export function IconPin(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M12 21c-4-4.2-6.2-7.5-6.2-10.4a6.2 6.2 0 0 1 12.4 0C18.2 13.5 16 16.8 12 21Z" />
      <circle cx="12" cy="10.4" r="2.3" />
    </svg>
  );
}

/* ---- Navigation & viewer icons ---- */

export function IconMenu(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 7.2h16M4 12h16M4 16.8h10" />
    </svg>
  );
}

export function IconClose(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="m5.4 5.4 13.2 13.2M18.6 5.4 5.4 18.6" />
    </svg>
  );
}

export function IconChevronLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="m14.4 5.6-6.4 6.4 6.4 6.4" />
    </svg>
  );
}

export function IconChevronRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="m9.6 5.6 6.4 6.4-6.4 6.4" />
    </svg>
  );
}

export function IconArrowRight(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4.6 12h14.2M13.4 6.4 19 12l-5.6 5.6" />
    </svg>
  );
}

export function IconZoomIn(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="6.8" />
      <path d="m16 16 4.4 4.4M11 8.6v4.8M8.6 11h4.8" />
    </svg>
  );
}

export function IconZoomOut(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="11" cy="11" r="6.8" />
      <path d="m16 16 4.4 4.4M8.6 11h4.8" />
    </svg>
  );
}

export function IconRotate(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4.6 10a8 8 0 1 1 1.8 6.6" />
      <path d="M4.2 5.6V10h4.4" />
    </svg>
  );
}

export function IconExpand(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
    </svg>
  );
}

export function IconFitWidth(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3.4" y="5" width="17.2" height="14" rx="2.4" />
      <path d="M7.4 12h9.2M7.4 12l2-2M7.4 12l2 2M16.6 12l-2-2M16.6 12l-2 2" />
    </svg>
  );
}

export function IconGrid(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="4" y="4" width="6.6" height="6.6" rx="1.4" />
      <rect x="13.4" y="4" width="6.6" height="6.6" rx="1.4" />
      <rect x="4" y="13.4" width="6.6" height="6.6" rx="1.4" />
      <rect x="13.4" y="13.4" width="6.6" height="6.6" rx="1.4" />
    </svg>
  );
}

export function IconCamera(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="M4.4 8.2h2.8l1.6-2.4h6.4l1.6 2.4h2.8a1.6 1.6 0 0 1 1.6 1.6v8a1.6 1.6 0 0 1-1.6 1.6H4.4a1.6 1.6 0 0 1-1.6-1.6v-8a1.6 1.6 0 0 1 1.6-1.6Z" />
      <circle cx="12" cy="13.4" r="3.4" />
    </svg>
  );
}

export function IconInstagram(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <rect x="3.6" y="3.6" width="16.8" height="16.8" rx="4.4" />
      <circle cx="12" cy="12" r="3.6" />
      <circle cx="16.9" cy="7.1" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconChevronDown(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <path d="m6 9.4 6 6 6-6" />
    </svg>
  );
}

export function IconGlobe(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base(props)}>
      <circle cx="12" cy="12" r="8.4" />
      <path d="M3.6 12h16.8" />
      <path d="M12 3.6c2.3 2.2 3.5 5 3.5 8.4s-1.2 6.2-3.5 8.4c-2.3-2.2-3.5-5-3.5-8.4s1.2-6.2 3.5-8.4Z" />
    </svg>
  );
}
