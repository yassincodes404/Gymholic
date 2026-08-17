// DATA INTEGRITY SYSTEM — the two case studies in `caseStudies` below are the
// ONLY place on the entire site permitted to show numeric metrics (41% -> 71%,
// +30 percentage points / 60 days, 34% improvement). Every other section
// (Services results, FAQ answers, Why Gymholic, etc.) must stay qualitative —
// do not introduce stray statistics anywhere else.

export type Audience = {
  id: string;
  title: string;
  copy: string;
  /** Indices into `problems` this audience weights/highlights most. */
  emphasis: number[];
};

export const audiences: Audience[] = [
  {
    id: "existing-owners",
    title: "Existing Gym Owners",
    copy: "Running a gym that has plateaued or is quietly bleeding margin.",
    emphasis: [0, 1, 6],
  },
  {
    id: "new-investors",
    title: "New Gym Investors",
    copy: "Capital ready to deploy, needing the operating model understood before build-out.",
    emphasis: [5, 6, 4],
  },
  {
    id: "multi-branch",
    title: "Multi-Branch Operators",
    copy: "Scaling past one location without scaling the same chaos with it.",
    emphasis: [2, 5, 3],
  },
  {
    id: "boutique",
    title: "Boutique Studios",
    copy: "Small-format, high-touch businesses that need their own playbook.",
    emphasis: [0, 3, 1],
  },
  {
    id: "pt-businesses",
    title: "Personal Training Businesses",
    copy: "Training brands outgrowing a single trainer's calendar and client list.",
    emphasis: [1, 3, 6],
  },
  {
    id: "fitness-brands",
    title: "Fitness Brands entering new markets",
    copy: "International brands localizing operations for a market with different rules.",
    emphasis: [4, 5, 6],
  },
];

/** Shared problem list, re-weighted (not replaced) per audience via `emphasis` indices above. */
export const problems: string[] = [
  "Weak retention",
  "Underperforming sales",
  "Operational chaos",
  "Unproductive staff",
  "Uncalculated equipment cost",
  "Expansion without real study",
  "Unclear numbers and KPIs",
];

export type ServiceBlock = {
  name: string;
  problem: string;
  whatWeDo: string;
  result: string;
};

export const services: ServiceBlock[] = [
  {
    name: "Gym Business Audit",
    problem:
      "No clear picture of where the gym is losing money or performance.",
    whatWeDo:
      "Full operational, sales, staff, and financial audit against real KPIs.",
    result:
      "A documented list of the exact gaps costing you retention and revenue.",
  },
  {
    name: "Operations & SOPs",
    problem: "The gym runs on memory and improvisation.",
    whatWeDo:
      "Build SOPs, clear ownership, tracking, and reporting structures.",
    result: "A gym that runs the same way whether or not you're on-site.",
  },
  {
    name: "Sales Systems",
    problem: "Leads come in and quietly disappear.",
    whatWeDo:
      "Build the full sales journey — scripts, follow-up cadence, targets, performance tracking.",
    result: "A sales process that converts instead of losing leads.",
  },
  {
    name: "Member Retention",
    problem: "Members join, then quietly stop coming and paying.",
    whatWeDo:
      "Analyze churn, cohorts, attendance, freeze/renewal patterns, and member experience.",
    result: "A measurable increase in members who stay and renew.",
  },
  {
    name: "Staff & Trainer Development",
    problem: "Inconsistent staff, no accountability system.",
    whatWeDo:
      "Evaluate and train your team, build clear performance and accountability systems.",
    result: "A team that performs consistently, with a way to measure it.",
  },
  {
    name: "Gym Design & Equipment Planning",
    problem: "Layout and equipment decisions made on instinct.",
    whatWeDo:
      "Plan space and equipment tied directly to your business model.",
    result: "A floor plan and equipment list that pays for itself.",
  },
  {
    name: "Investor Consultation",
    problem: "Committing capital without a clear operating or return model.",
    whatWeDo:
      "Study the concept, market, investment requirement, costs, pricing, and operating model.",
    result: "A clear-eyed view of expected return before you commit.",
  },
  {
    name: "Expansion & Multi-Branch Strategy",
    problem: "A new branch can cannibalize the first if unplanned.",
    whatWeDo:
      "Assess expansion readiness, location selection, and unify operations across branches.",
    result: "Growth that adds revenue instead of splitting it.",
  },
];

export type Founder = {
  name: string;
  nickname: string;
  yearsInIndustry: number;
  photo: string;
};

export const founder: Founder = {
  name: "Mohamed",
  nickname: "Mr Veins",
  yearsInIndustry: 11,
  photo: "/founder/mohamed.jpg",
};

export const whyGymholic: string[] = [
  "Fitness Industry Specialization",
  "Data-Driven Decisions",
  "Operational and Commercial Experience",
  "Customized Solutions",
  "Egypt and GCC Market Understanding",
  "Execution-Focused Consulting",
];

export type CaseStudy = {
  location: string;
  headline: string;
  challenge: string;
  whatWeChanged: string;
  result: string;
  metricLabel: string;
  metricPrefix?: string;
  metricSuffix?: string;
  from?: number;
  to: number;
  keyMetric: string;
};

export const caseStudies: CaseStudy[] = [
  {
    location: "Dubai",
    headline: "Member Retention",
    challenge: "Details available on request.",
    whatWeChanged:
      "Retention systems and member experience overhaul — details available on request.",
    result: "Member retention improved from 41% to 71%.",
    metricLabel: "Member Retention",
    from: 41,
    to: 71,
    metricSuffix: "%",
    keyMetric: "+30 percentage points in 60 days",
  },
  {
    location: "Sharjah",
    headline: "Outdoor Training Zone",
    challenge: "Details available on request.",
    whatWeChanged: "Outdoor Training Zone development.",
    result: "34% improvement — details available on request.",
    metricLabel: "Improvement",
    to: 34,
    metricSuffix: "%",
    keyMetric: "34% improvement",
  },
];

export type ApproachStep = {
  step: string;
  title: string;
  copy: string;
};

export const approachSteps: ApproachStep[] = [
  {
    step: "01",
    title: "Discovery Call",
    copy: "A short call to understand where your gym stands today.",
  },
  {
    step: "02",
    title: "Business Assessment",
    copy: "A first look at how the business actually operates day to day.",
  },
  {
    step: "03",
    title: "Data and Operations Audit",
    copy: "A close read of the numbers and systems behind the operation.",
  },
  {
    step: "04",
    title: "Strategy Development",
    copy: "A plan built around what your gym specifically needs to fix or grow.",
  },
  {
    step: "05",
    title: "Implementation Plan",
    copy: "A clear, sequenced rollout so the strategy becomes daily practice.",
  },
  {
    step: "06",
    title: "Performance Tracking",
    copy: "Ongoing visibility into whether the changes are actually working.",
  },
];

export const shopCategories: string[] = [
  "Gym Management Courses",
  "Sales and Retention Blueprints",
  "SOP Templates",
  "Employment Contracts",
  "Trainer Agreements",
  "Membership Contracts",
  "Financial Calculators",
  "Gym Opening Checklists",
  "Audit Templates",
  "Investor Toolkits",
];

export type Resource = {
  title: string;
  copy: string;
};

export const resources: Resource[] = [
  {
    title: "Retention Checklist",
    copy: "A practical checklist to spot where members are quietly slipping away.",
  },
  {
    title: "Pre-Sale Evaluation Guide",
    copy: "What to evaluate before committing capital to a new gym concept.",
  },
  {
    title: "Gym Investment Checklist",
    copy: "The key checks investors should run before backing a fitness business.",
  },
];

export const faqs = [
  {
    q: "What types of gyms do you work with?",
    a: "We work with independent gyms, boutique studios, personal training businesses, and multi-branch operators, as well as investors evaluating a new concept.",
  },
  {
    q: "Do you work with new gym projects?",
    a: "Yes — we work with both existing operators and investors building a gym from the ground up.",
  },
  {
    q: "Do you provide online consultations?",
    a: "Yes — consultations are conducted online, so location is never a barrier to starting.",
  },
  {
    q: "Do you work with gyms outside the Middle East?",
    a: "Yes — Gymholic works with fitness businesses worldwide. Egypt, the UAE, and the GCC remain our deepest markets.",
  },
  {
    q: "How long does a consulting project take?",
    a: "It depends on scope — an audit is a focused, fixed engagement, while retention, sales, or expansion work runs over a longer period.",
  },
  {
    q: "Can Gymholic help with gym equipment selection?",
    a: "Yes — we plan equipment and layout decisions tied directly to your business model, not just available floor space.",
  },
  {
    q: "Do you provide staff training?",
    a: "Yes — we evaluate and train your team and build performance and accountability systems that outlast the engagement.",
  },
  {
    q: "Is the consultation free or paid?",
    a: "All sessions are paid, including the Open Time Session — an online Google Meet session where you pick any available slot. Prices are listed on the booking page at checkout.",
  },
  {
    q: "What information should I prepare before the call?",
    a: "A general picture of your gym or project — size, stage, main challenge, and what you are hoping to achieve — helps us make the call useful from the first minute.",
  },
];

// ---- Gymholic Academy (coming soon) ----
// Subscription learning platform, not yet live. Pricing is an explicit
// placeholder the client authorized ("realistic placeholder... sample
// membership price") — not a verified figure, and this is the only place
// on the Academy page a price appears.

export type AcademyFeature = {
  title: string;
  copy: string;
};

export const academyFeatures: AcademyFeature[] = [
  {
    title: "Video Lessons",
    copy: "Short practical learning videos about gym operations, staff systems, retention, sales, and growth.",
  },
  {
    title: "PDF Resources",
    copy: "Downloadable playbooks, templates, checklists, and Gymholic tools.",
  },
  {
    title: "Structured Learning",
    copy: "Courses organized by topic so members can learn step by step.",
  },
  {
    title: "Real Gym Insights",
    copy: "Advice based on real-world gym business experience, not generic theory.",
  },
  {
    title: "Business Systems",
    copy: "Frameworks for operations, performance, accountability, and decision making.",
  },
];

export const academyCategories: string[] = [
  "Operations",
  "Staff",
  "Sales",
  "Retention",
  "Finance",
  "Launch",
  "Management",
];

export type AcademyLesson = {
  title: string;
  subtitle: string;
  duration: string;
  category: string;
};

export const academyLessons: AcademyLesson[] = [
  {
    title: "How to Run a Gym With Systems",
    subtitle: "Replacing memory and improvisation with repeatable process.",
    duration: "12 min",
    category: "Operations",
  },
  {
    title: "The Real Reason Member Retention Breaks",
    subtitle: "Where members actually disengage, and why it's earlier than you think.",
    duration: "9 min",
    category: "Retention",
  },
  {
    title: "Staff Accountability for Gym Owners",
    subtitle: "Building a team that performs the same whether you're on-site or not.",
    duration: "14 min",
    category: "Staff",
  },
  {
    title: "Building a Better PT Sales Process",
    subtitle: "A sales journey that converts instead of losing leads.",
    duration: "11 min",
    category: "Sales",
  },
  {
    title: "Weekly Gym Review Structure",
    subtitle: "The recurring review that keeps numbers visible before they become problems.",
    duration: "8 min",
    category: "Management",
  },
];

export type AcademyResource = {
  title: string;
  type: string;
  copy: string;
};

export const academyResources: AcademyResource[] = [
  {
    title: "Daily Operations Checklist",
    type: "Checklist",
    copy: "The daily run-through that keeps a gym floor consistent.",
  },
  {
    title: "Retention Recovery Framework",
    type: "Framework",
    copy: "A structured approach to winning back members who are drifting away.",
  },
  {
    title: "Staff Performance Review Template",
    type: "Template",
    copy: "A ready-to-use format for regular, fair staff reviews.",
  },
  {
    title: "Gym KPI Starter Sheet",
    type: "Worksheet",
    copy: "The core numbers every gym owner should be tracking weekly.",
  },
];

export type AcademyMembership = {
  name: string;
  price: string;
  period: string;
  description: string;
  perks: string[];
  note: string;
};

export const academyMembership: AcademyMembership = {
  name: "Gymholic Academy Membership",
  price: "$29",
  period: "/month",
  description:
    "Access to the Academy content library, educational videos, downloadable PDFs, and future resources.",
  perks: [
    "Full video lesson library",
    "Downloadable PDFs, playbooks, and templates",
    "Structured, topic-based courses",
    "New lessons and resources added over time",
  ],
  note: "Cancel anytime. New lessons and resources added over time.",
};
