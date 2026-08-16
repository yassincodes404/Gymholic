import { consultationServices, type ConsultationService } from "@/lib/consultations";

export function ServiceSelect({
  services = consultationServices,
  onSelect,
}: {
  services?: ConsultationService[];
  onSelect: (service: ConsultationService) => void;
}) {
  return (
    <div>
      <h1 className="display-hero text-4xl md:text-6xl mb-4">Book Your Session</h1>
      <p className="opacity-70 max-w-lg mb-12">Choose the type of session that fits what you need.</p>

      <div className="grid md:grid-cols-3 gap-5">
        {services.map((service) => (
          <button
            key={service.id}
            type="button"
            onClick={() => onSelect(service)}
            className="text-left rounded-2xl p-6 flex flex-col"
            style={{ background: "var(--surface)", border: "1px solid rgba(245,241,232,0.1)" }}
          >
            <p className="text-xs uppercase tracking-widest mb-4 opacity-50">
              {service.durationLabel} &middot; {service.meetingType}
            </p>
            <h3 className="display-text text-xl mb-3">{service.name}</h3>
            <p className="text-sm opacity-70 mb-6 flex-1">{service.description}</p>
            <p className="display-text text-2xl mb-4" style={{ color: "var(--orange)" }}>
              {service.isFree ? "Free" : `${service.price} ${service.currency}`}
            </p>
            <span className="btn-pill w-fit text-sm">{service.cta}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
