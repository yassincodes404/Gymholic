export type ConsultationService = {
  id: string;
  name: string;
  shortLabel: string;
  price: number;
  currency: string;
  durationLabel: string;
  meetingType: "Online" | "In Person";
  description: string;
  examples?: string[];
  cta: string;
};

// Defaults mirror the backend settings (BOOKING_PRICE_STRATEGY_CALL=125,
// BOOKING_PRICE_IN_PERSON=275, BOOKING_PRICE_OPEN_SESSION=150,
// BOOKING_CURRENCY=USD). The book page replaces price/currency at runtime
// with the live values from GET /api/settings/pricing so admin price changes
// are reflected on the website immediately, and hides the free time session
// when FREE_SESSION_ENABLED is switched off.
export const consultationServices: ConsultationService[] = [
  {
    id: "strategy-call",
    name: "45-Minute Strategy Call",
    shortLabel: "45 Min Strategy Call",
    price: 125,
    currency: "USD",
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
    price: 275,
    currency: "USD",
    durationLabel: "Private Meeting",
    meetingType: "In Person",
    description:
      "A private face-to-face meeting for deeper discussions about the gym, business strategy, operations, investment, or major decisions.",
    cta: "Book In-Person Meeting",
  },
  {
    id: "discovery-call",
    name: "Open Time Session",
    shortLabel: "Open Time Session",
    price: 150,
    currency: "USD",
    durationLabel: "Open Time",
    meetingType: "Online",
    description:
      "An online Google Meet session with open time — you pick any available slot in the calendar, join the meeting, and get guidance on where to start.",
    cta: "Book Open Time Session",
  },
  {
    id: "free-session",
    name: "Free Time Session",
    shortLabel: "Free Time Session",
    price: 0,
    currency: "USD",
    durationLabel: "3 Hours",
    meetingType: "Online",
    description:
      "A free 3-hour open block with the expert — one session per day, first come first served. Pick any day with an open block and reserve it at no cost.",
    cta: "Book Free Session",
  },
];

export function getConsultationService(id: string): ConsultationService | undefined {
  return consultationServices.find((s) => s.id === id);
}
