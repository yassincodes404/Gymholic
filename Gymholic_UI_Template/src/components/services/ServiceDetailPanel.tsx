import type { ServiceBlock } from "@/lib/content";

type ServiceDetailPanelProps = {
  service: ServiceBlock;
  onClose: () => void;
};

/** Content rendered inside the expanded Flip-morphed card. */
export function ServiceDetailPanel({ service, onClose }: ServiceDetailPanelProps) {
  return (
    <div className="h-full w-full flex flex-col justify-center px-8 md:px-20 py-16 max-w-4xl mx-auto">
      <button
        type="button"
        onClick={onClose}
        className="self-start mb-10 text-sm opacity-70 hover:opacity-100 flex items-center gap-2"
        aria-label="Close"
      >
        ← Back to services
      </button>
      <h3 className="display-text text-3xl md:text-5xl mb-8">{service.name}</h3>
      <dl className="space-y-6 text-base md:text-lg">
        <div>
          <dt className="text-sm uppercase tracking-widest mb-1" style={{ color: "var(--orange)" }}>
            The Problem
          </dt>
          <dd className="opacity-80">{service.problem}</dd>
        </div>
        <div>
          <dt className="text-sm uppercase tracking-widest mb-1" style={{ color: "var(--orange)" }}>
            What We Do
          </dt>
          <dd className="opacity-80">{service.whatWeDo}</dd>
        </div>
        <div>
          <dt className="text-sm uppercase tracking-widest mb-1" style={{ color: "var(--orange)" }}>
            The Result
          </dt>
          <dd className="opacity-80">{service.result}</dd>
        </div>
      </dl>
    </div>
  );
}
