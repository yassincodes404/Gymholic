import {
  academyCategories,
  academyLessons,
  academyResources,
} from "@/lib/content";
import { FadeUp } from "@/components/motion/FadeUp";

function PlayGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="11" stroke="var(--orange)" strokeWidth="1.5" />
      <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="var(--orange)" />
    </svg>
  );
}

function LockGlyph() {
  return (
    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" aria-hidden="true">
      <rect x="5" y="11" width="14" height="9" rx="2" stroke="var(--paper)" strokeWidth="1.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" stroke="var(--paper)" strokeWidth="1.5" />
    </svg>
  );
}

function LessonCard({
  title,
  subtitle,
  duration,
  category,
  featured = false,
}: {
  title: string;
  subtitle: string;
  duration: string;
  category: string;
  featured?: boolean;
}) {
  return (
    <div
      className="relative rounded-xl overflow-hidden"
      style={{ background: "var(--void)" }}
    >
      <span
        className="absolute top-3 right-3 z-10 text-[10px] tracking-widest uppercase px-2 py-1 rounded-full"
        style={{ background: "rgba(0,0,0,0.6)", color: "var(--paper)", border: "1px solid rgba(245,241,232,0.2)" }}
      >
        Locked
      </span>
      <div
        className={`relative flex items-center justify-center ${featured ? "h-56 md:h-72" : "h-32"}`}
        style={{
          background:
            "linear-gradient(135deg, rgba(255,106,0,0.18), rgba(255,255,255,0.03))",
        }}
      >
        <div
          className="flex items-center justify-center rounded-full"
          style={{ width: featured ? 56 : 40, height: featured ? 56 : 40, background: "rgba(0,0,0,0.5)" }}
        >
          <PlayGlyph />
        </div>
      </div>
      <div className="p-4">
        <p className="text-[11px] uppercase tracking-widest opacity-50 mb-2">
          {category} &middot; {duration}
        </p>
        <h4 className={`display-text ${featured ? "text-2xl md:text-3xl" : "text-base"} mb-1`}>
          {title}
        </h4>
        {featured && <p className="text-sm opacity-70 max-w-md">{subtitle}</p>}
      </div>
    </div>
  );
}

function ResourceCard({ title, type, copy }: { title: string; type: string; copy: string }) {
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: "var(--void)", border: "1px solid rgba(245,241,232,0.08)" }}
    >
      <p className="text-[11px] uppercase tracking-widest mb-3" style={{ color: "var(--orange)" }}>
        {type}
      </p>
      <h4 className="display-text text-base mb-1">{title}</h4>
      <p className="text-sm opacity-60">{copy}</p>
    </div>
  );
}

/** Inside-the-Academy members-area mockup — a framed dashboard preview, locked behind a join prompt. */
export function AcademyPreview() {
  const [featuredLesson, ...restLessons] = academyLessons;

  return (
    <section className="section-dark py-24 px-6 md:px-10">
      <FadeUp as="div">
        <p className="text-sm tracking-widest uppercase mb-4" style={{ color: "var(--orange)" }}>
          Inside the Academy
        </p>
        <h2 className="display-text text-3xl md:text-5xl mb-4 max-w-2xl">
          A preview of the members area.
        </h2>
        <p className="opacity-60 max-w-lg mb-12">
          Available at launch — this is what the library will look like once the Academy opens.
        </p>
      </FadeUp>

      <div className="relative rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(245,241,232,0.1)" }}>
        {/* App-chrome header, purely decorative framing */}
        <div
          className="flex items-center gap-2 px-4 py-3"
          style={{ background: "var(--surface)", borderBottom: "1px solid rgba(245,241,232,0.08)" }}
        >
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(245,241,232,0.15)" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(245,241,232,0.15)" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "rgba(245,241,232,0.15)" }} />
          <span className="ml-3 text-xs opacity-50">Gymholic Academy — Members Area</span>
        </div>

        <div className="p-5 md:p-8" style={{ background: "var(--surface)" }}>
          {/* Category pills */}
          <div className="flex flex-wrap gap-2 mb-8">
            {academyCategories.map((cat) => (
              <span
                key={cat}
                className="text-xs px-3 py-1.5 rounded-full"
                style={{ background: "rgba(255,255,255,0.06)", color: "var(--paper)" }}
              >
                {cat}
              </span>
            ))}
          </div>

          <p className="text-xs uppercase tracking-widest opacity-40 mb-3">Featured Lesson</p>
          <div className="mb-10">
            <LessonCard
              featured
              title={featuredLesson.title}
              subtitle={featuredLesson.subtitle}
              duration={featuredLesson.duration}
              category={featuredLesson.category}
            />
          </div>

          <p className="text-xs uppercase tracking-widest opacity-40 mb-3">Recently Added</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-10">
            {restLessons.map((lesson) => (
              <LessonCard
                key={lesson.title}
                title={lesson.title}
                subtitle={lesson.subtitle}
                duration={lesson.duration}
                category={lesson.category}
              />
            ))}
          </div>

          <p className="text-xs uppercase tracking-widest opacity-40 mb-3">PDF Library</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {academyResources.map((resource) => (
              <ResourceCard key={resource.title} {...resource} />
            ))}
          </div>
        </div>

        {/* Locked overlay */}
        <div
          className="absolute inset-x-0 bottom-0 flex flex-col items-center justify-end text-center px-6 pb-10 pt-32"
          style={{
            background: "linear-gradient(to top, rgba(17,17,17,0.97) 40%, transparent 100%)",
            backdropFilter: "blur(2px)",
          }}
        >
          <div className="mb-3">
            <LockGlyph />
          </div>
          <p className="display-text text-xl md:text-2xl mb-2">
            Join the Academy to unlock full access
          </p>
          <p className="text-sm opacity-60 mb-5 max-w-sm">
            Every lesson, PDF, and framework unlocks the moment membership opens.
          </p>
          <a href="#waitlist" className="btn-pill text-sm !py-2.5 !px-5">
            Join the Academy
          </a>
        </div>
      </div>
    </section>
  );
}
