export type ConsultationService = {
  id: string;
  name: string;
  shortLabel: string;
  price: number;
  currency: string;
  isFree: boolean;
  durationLabel: string;
  meetingType: "Online" | "In Person";
  description: string;
  examples?: string[];
  cta: string;
};

// Note: the source spec had a stray "2500" next to the Discovery Call while
// three separate lines around it explicitly say "Free" / "FREE" — treated
// as a typo, kept as the free intro call the rest of the spec describes.
export const consultationServices: ConsultationService[] = [
  {
    id: "strategy-call",
    name: "45-Minute Strategy Call",
    shortLabel: "45 Min Strategy Call",
    price: 500,
    currency: "AED",
    isFree: false,
    durationLabel: "45 Minutes",
    meetingType: "Online",
    description:
      "A focused 45-minute consultation for gym owners, managers, or investors who need expert input on a specific problem.",
    examples: [
      "Gym operations",
      "Retention",
      "Staff performance",
      "Sales",
      "Membership structure",
      "Expansion",
      "Facility problems",
      "Business decisions",
    ],
    cta: "Book 45-Min Call",
  },
  {
    id: "in-person",
    name: "Private In-Person Consultation",
    shortLabel: "Private In-Person",
    price: 1000,
    currency: "AED",
    isFree: false,
    durationLabel: "Private Meeting",
    meetingType: "In Person",
    description:
      "A private face-to-face meeting for deeper discussions about the gym, business strategy, operations, investment, or major decisions.",
    cta: "Book In-Person Meeting",
  },
  {
    id: "discovery-call",
    name: "Free Discovery Call",
    shortLabel: "Free Discovery Call",
    price: 0,
    currency: "AED",
    isFree: true,
    durationLabel: "Introductory Call",
    meetingType: "Online",
    description:
      "A quick call to understand your situation, identify what you need, and determine whether Gymholic can help.",
    cta: "Book Free Call",
  },
];

export function getConsultationService(id: string): ConsultationService | undefined {
  return consultationServices.find((s) => s.id === id);
}
