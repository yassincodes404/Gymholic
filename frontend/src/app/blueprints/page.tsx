import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { BlueprintsHero } from "@/components/blueprints/BlueprintsHero";
import { FadeUp } from "@/components/motion/FadeUp";

const PLANNED = [
  { icon: "📄", title: "Operations Playbooks", text: "Day-to-day systems for opening, staffing and running a profitable gym floor." },
  { icon: "📊", title: "Financial Templates", text: "Budgets, P&L trackers and pricing calculators built for gym businesses." },
  { icon: "🧲", title: "Sales & Retention Kits", text: "Membership scripts, lead follow-up flows and win-back campaigns." },
  { icon: "🚀", title: "Launch Blueprints", text: "Step-by-step guides for opening or expanding a facility." },
];

/*!
  Blueprints — coming soon. The mock product grid was removed; the real
  library will be sold here (and in Admin → Products) when it launches.
*/
export default function BlueprintsPage() {
  return (
    <>
      <Header />
      <main>
        <BlueprintsHero />
        <section className="section-dark py-16 px-6 md:px-10">
          <div className="max-w-3xl mx-auto">
            <FadeUp as="div">
              <div
                className="flex items-center gap-4 rounded-full px-6 py-4 mb-12"
                style={{ background: "rgba(255,106,0,0.08)", border: "1px solid rgba(255,106,0,0.25)" }}
              >
                <span className="relative flex h-2.5 w-2.5 shrink-0" style={{ background: "var(--orange)", borderRadius: "9999px" }} />
                <p className="text-sm md:text-base">
                  <span className="font-semibold" style={{ color: "var(--orange)" }}>Coming Soon</span>{" "}
                  — the Gymholic Blueprints library is being prepared. Book a
                  consultation or join the Academy waitlist in the meantime.
                </p>
              </div>
            </FadeUp>

            <div className="grid sm:grid-cols-2 gap-5">
              {PLANNED.map((item) => (
                <FadeUp key={item.title} as="div">
                  <div className="rounded-2xl p-6 h-full" style={{ background: "var(--surface)", border: "1px solid rgba(245,241,232,0.1)" }}>
                    <span className="text-3xl">{item.icon}</span>
                    <h3 className="display-text text-lg mt-4 mb-2">{item.title}</h3>
                    <p className="text-sm opacity-70">{item.text}</p>
                  </div>
                </FadeUp>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 justify-center mt-12">
              <a href="/book" className="btn-pill">Book a Consultation</a>
              <a href="/academy#waitlist" className="btn-pill btn-pill--ghost">Join the Academy Waitlist</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
