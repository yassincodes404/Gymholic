/*!
  SEO landing pages for the services gym owners actually search for.
  Each entry renders at /<slug> via src/app/[slug]/page.tsx with its own
  metadata, Service JSON-LD and FAQ schema.
*/

export interface ServiceSection {
  heading: string;
  body: string[];
  bullets?: string[];
}

export interface ServicePage {
  slug: string;
  title: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  intro: string[];
  whoFor: string;
  deliverables: string[];
  sections: ServiceSection[];
  faqs: { q: string; a: string }[];
  related: string[];
}

export const SITE_URL = "https://gymholic.ae";

export const servicePages: ServicePage[] = [
  {
    slug: "gym-consulting",
    title: "Gym Consulting Services | Gymholic — Egypt, UAE & GCC",
    metaDescription:
      "Expert gym consulting for owners and investors. Feasibility, pricing, operations and growth strategy for gyms in Egypt, the UAE and the GCC. Book a 45-minute consultation.",
    eyebrow: "Gym Consulting",
    h1: "Gym consulting that turns your facility into a business",
    intro: [
      "Most gyms don't fail because of bad equipment or bad coaching — they fail because nobody is managing them like a business. Gymholic works with gym owners, operators and investors across Egypt, the UAE and the wider GCC on the decisions that decide whether a facility compounds or bleeds: pricing, member retention, cost structure, staffing and growth sequencing.",
      "Every engagement starts the same way: a 45-minute working session where we map your numbers, identify the two or three constraints actually holding the business back, and leave you with a prioritised action list — whether or not you ever work with us again.",
    ],
    whoFor: "Owners and investors who want an experienced outside pair of eyes on the whole business — not just marketing.",
    deliverables: [
      "Full business review: revenue, churn, costs, utilization and staffing",
      "Constraint diagnosis — the 2–3 issues causing most of the damage",
      "Prioritised 90-day action plan with owners and deadlines",
      "Pricing and membership-structure recommendations",
      "Retention and member-experience fixes with the fastest payback",
      "Follow-up session to review implementation and adjust",
    ],
    sections: [
      {
        heading: "What a gym consulting engagement looks like",
        body: [
          "We start with discovery: your P&L, membership data, class schedules, staff structure and local competitive position. From there the work is specific to you — a single-site gym in Cairo fighting churn needs a different plan than a pre-revenue studio in Dubai sizing its launch budget.",
          "The output is never a generic PDF. It's a working document you run the business from, revisited in follow-up sessions as conditions change.",
        ],
      },
      {
        heading: "Why gyms across the region struggle",
        body: [
          "The regional market has hardened. Customers compare you to every app, boutique studio and home-workout option on their phone. Rents and equipment costs rise yearly. Meanwhile most gyms still sell the same 12-month contract they sold in 2015 and wonder why sign-ups fall.",
          "The gyms growing through this are the ones that treat membership as a product: measured acquisition, engineered retention, disciplined cost control and community that no app can copy.",
        ],
      },
      {
        heading: "Where we start with you",
        body: [
          "In the first session we usually find quick wins worth more than the consulting fee: mispriced memberships, unused floor space, unmonitored churn, staff incentive plans that reward the wrong behaviour, or a class schedule that ignores when members actually train.",
          "Book the strategy call and bring your questions — the session is yours to direct.",
        ],
      },
    ],
    faqs: [
      {
        q: "How much does gym consulting cost?",
        a: "It starts at $125 for a 45-minute strategy call. Longer engagements are scoped after the first session based on the size of the opportunity and how much hands-on help you want.",
      },
      {
        q: "Do you work with gyms outside the GCC?",
        a: "Yes. Most consulting is remote and the operating principles transfer. Time zones across MENA, Europe and Asia are all workable.",
      },
      {
        q: "I haven't opened my gym yet — is this for me?",
        a: "Yes — see our gym setup and gym design services. Pre-opening is the cheapest time to avoid expensive mistakes.",
      },
    ],
    related: ["gym-business-consulting", "gym-marketing", "gym-revenue-consulting"],
  },
  {
    slug: "gym-business-consulting",
    title: "Gym Business Consulting | Business Plans, Profitability & Growth — Gymholic",
    metaDescription:
      "Gym business consulting: feasibility studies, business plans, unit economics and profitability turnarounds for gyms and fitness studios in Egypt, the UAE and the GCC.",
    eyebrow: "Business Consulting",
    h1: "Gym business consulting: the commercial engine behind the iron",
    intro: [
      "A gym is a capital-intensive, high-fixed-cost business with recurring revenue — which makes it uniquely buildable and uniquely easy to wreck. Gymholic's business consulting focuses on the commercial engine: unit economics, membership economics, cash-flow planning, feasibility and the business plan that gets a facility funded and opened.",
      "Whether you're evaluating a location, preparing a business plan for a bank or investor, or trying to understand why a profitable-looking gym keeps running out of cash, this is the work.",
    ],
    whoFor: "Owners, partners and investors who need the numbers to make sense before and after opening.",
    deliverables: [
      "Feasibility study for a location or concept (market, competition, demand)",
      "Investor- or bank-ready gym business plan and financial model",
      "Membership unit economics: CAC, LTV, churn, payback period",
      "Break-even analysis and 12–24 month cash-flow projection",
      "Cost-structure review: rent, staff, equipment and consumables",
      "Scenario planning for pricing, capacity and expansion decisions",
    ],
    sections: [
      {
        heading: "Feasibility before lease, not after",
        body: [
          "The single most expensive mistake in this industry is signing a lease on a location that could never work — wrong catchment, wrong rent-to-revenue ratio, wrong size. A proper feasibility pass costs a fraction of one month's rent on a bad building.",
          "We size the catchment, analyse competing facilities, estimate realistic membership at your price point and stress-test the rent before you commit.",
        ],
      },
      {
        heading: "Membership economics most owners never calculate",
        body: [
          "What does a member actually cost to acquire? What do they contribute over their lifetime after payment processing, staff time and facility wear? How many months does it take to repay acquisition spend? These three numbers — CAC, contribution margin, LTV — decide your marketing budget, your pricing and your promotion calendar.",
          "Once they're on one page, most pricing and discount debates settle themselves.",
        ],
      },
      {
        heading: "Turnaround: profitable on paper, broke in the bank",
        body: [
          "Cash-flow surprises in gyms usually trace to seasonal sign-ups matched against fixed monthly costs, prepaid memberships spent before they're earned, or unmanaged supplier terms. We rebuild your cash calendar and restructure payment terms so growth stops creating cash crises.",
        ],
      },
    ],
    faqs: [
      {
        q: "Can you write the business plan for my bank or investor?",
        a: "Yes. We build the model with you — not for you — so you can defend every number in the meeting. That's what gets plans approved.",
      },
      {
        q: "How long does a feasibility study take?",
        a: "Typically 2–3 weeks depending on data availability and how many locations are being compared.",
      },
      {
        q: "My gym loses money every month — can you help?",
        a: "Start with the strategy call. We'll tell you honestly whether this is a fixable operations problem or a structurally broken location.",
      },
    ],
    related: ["gym-consulting", "gym-startup-cost", "gym-revenue-consulting"],
  },
  {
    slug: "gym-management-consulting",
    title: "Gym Management Consulting | Operations, Staffing & Systems — Gymholic",
    metaDescription:
      "Gym management consulting: daily operations, staff structure, KPIs, scheduling and SOPs that make your gym run without you. For gyms in Egypt, the UAE and the GCC.",
    eyebrow: "Management Consulting",
    h1: "Gym management consulting: build a gym that runs without you",
    intro: [
      "If the gym gets worse every time you take a week off, you don't have a business — you have a job with overhead. Gymholic's management consulting installs the operating layer that makes a gym run to standard regardless of who's on shift: KPIs, SOPs, staff structures, schedules and management rhythms.",
      "This is the least glamorous and highest-leverage work in the industry. Facilities with real operating systems sell for multiples; facilities held together by one heroic manager sell for their equipment value.",
    ],
    whoFor: "Owner-operators trapped in daily operations and multi-site operators standardising across locations.",
    deliverables: [
      "Operating dashboard: the 8–12 numbers that describe gym health weekly",
      "Staff structure and role definitions from front desk to head coach",
      "SOPs for opening/closing, onboarding, tours, cleanliness and safety",
      "Shift scheduling matched to actual member traffic patterns",
      "Management meeting rhythm: daily huddle to monthly review",
      "Incentive plans aligned to retention and member results",
    ],
    sections: [
      {
        heading: "The KPIs that actually matter",
        body: [
          "Revenue hides problems. The numbers that expose them: weekly new-member count, 90-day churn, class utilisation by hour, average revenue per member, front-desk tour-to-signup conversion, and cost per member served.",
          "Put those on one page every Monday and the gym starts managing itself.",
        ],
      },
      {
        heading: "Staffing: right people, right roles, right incentives",
        body: [
          "Most gym org charts grew by accident. We redesign them deliberately: what each role owns, what great performance looks like, what it costs, and how pay is structured so the team wins when members stay — not just when they sign.",
        ],
      },
      {
        heading: "Consistency across shifts and sites",
        body: [
          "Members experience your gym at its worst shift, not its best. SOPs and checklists — boring as they sound — are how you make the 6 AM experience identical to the 8 PM one, and how a second location feels like the same brand.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do you provide ongoing gym management?",
        a: "We consult and set up the systems; your team executes them. Ongoing advisory is available through recurring sessions.",
      },
      {
        q: "We're a small single-site gym — is this overkill?",
        a: "No — small gyms benefit most, because the owner is usually the single point of failure. Systems are cheaper than burnout.",
      },
      {
        q: "How do we start?",
        a: "Book the strategy call. We'll review your current operations and propose the smallest set of changes with the biggest effect.",
      },
    ],
    related: ["gym-consulting", "gym-management-guide", "gym-business-consulting"],
  },
  {
    slug: "gym-setup",
    title: "Gym Setup Services | Open Your Gym the Right Way — Gymholic",
    metaDescription:
      "End-to-end gym setup consulting: location selection, legal structure, budgeting, equipment, staffing and pre-launch marketing for new gyms in Egypt, the UAE and the GCC.",
    eyebrow: "Gym Setup",
    h1: "Gym setup: from empty unit to open doors",
    intro: [
      "Opening a gym has a hundred ways to go over budget and behind schedule, and almost all of them are decided before the first dumbbell arrives. Gymholic's setup consulting walks the whole path with you: concept, location, budget, legal structure, layout, equipment, staffing, systems and the pre-launch marketing that fills the floor in week one.",
      "We've seen which corners cost you later and which saves you now. That judgment is the product.",
    ],
    whoFor: "First-time founders and investors opening a gym, studio or fitness facility.",
    deliverables: [
      "Concept definition and target-member positioning",
      "Location shortlisting with catchment and rent analysis",
      "Full opening budget with contingency planning",
      "Licensing and legal-structure roadmap for your emirate or governorate",
      "Equipment list and supplier negotiation support",
      "Hiring plan and pre-opening team training",
      "90-day pre-launch marketing and founders-membership campaign",
    ],
    sections: [
      {
        heading: "The budget that survives contact with reality",
        body: [
          "Almost every first-time gym owner underestimates fit-out, licensing timelines and the working capital needed to survive months 1–6 while membership ramps. We build the budget from real regional quotes and pad it where reality pads it.",
        ],
      },
      {
        heading: "Location and lease: the decision you can't undo",
        body: [
          "Visibility, parking, catchment demographics, competing gyms, rent-to-projected-revenue ratio, fit-out restrictions — we score every candidate unit on the same sheet so the choice is made on evidence, not on how the space felt during the visit.",
        ],
      },
      {
        heading: "Pre-launch: open with a queue, not a hope",
        body: [
          "A gym should open with founding memberships already sold. The pre-launch window — sign on the door, Instagram page, community seeding, founding-member pricing — is the cheapest marketing you will ever do. We run the countdown with you.",
        ],
      },
    ],
    faqs: [
      {
        q: "How much does it cost to open a gym?",
        a: "It varies enormously by size, market and standard — see our gym startup cost guide for the full breakdown by category. The strategy call will size your specific concept.",
      },
      {
        q: "Do you supply the equipment?",
        a: "We don't sell equipment — that keeps our advice neutral. We spec the list and help you negotiate with suppliers.",
      },
      {
        q: "How long does the whole setup take?",
        a: "From concept to open doors, typically 4–9 months depending on market, licensing and fit-out scope.",
      },
    ],
    related: ["gym-design", "gym-equipment-consulting", "how-to-start-a-gym"],
  },
  {
    slug: "gym-design",
    title: "Gym Design & Layout Consulting — Gymholic",
    metaDescription:
      "Gym design consulting: floor plans, zoning, equipment layout, lighting and member flow that maximise capacity, safety and experience. Egypt, UAE & GCC.",
    eyebrow: "Gym Design",
    h1: "Gym design: layout is strategy you can't change later",
    intro: [
      "Once the walls are up and the racks are bolted down, your layout is locked in for years — along with its ceiling on capacity, its traffic bottlenecks and its atmosphere. Gymholic's design consulting makes sure what gets built is what the business needs: zones that flow, equipment that fits how members actually train, sightlines that keep the floor safe, and a space people want to photograph.",
      "We work alongside your architect and fit-out contractor, translating business requirements into drawings.",
    ],
    whoFor: "New facilities planning their space and existing gyms renovating or re-flowing their floor.",
    deliverables: [
      "Zoning plan: strength, cardio, functional, stretch, social and staff areas",
      "Equipment layout optimised for flow, safety and supervision",
      "Capacity modelling — how many members the design supports at peak",
      "Lighting, music and finish recommendations by zone",
      "Visibility and CCTV sightline review for safety and theft reduction",
      "Review of architect drawings against operational reality",
    ],
    sections: [
      {
        heading: "Flow: the invisible design element",
        body: [
          "A well-designed gym never feels crowded at 80% capacity; a badly designed one feels packed at 40%. The difference is circulation space, adjacency (do squats and deadlifts fight for the same mirror?), and separating high-traffic cardio from focused strength zones.",
        ],
      },
      {
        heading: "Design for your market, not an Instagram template",
        body: [
          "A ladies-only studio in Riyadh, a hardcore strength gym in Alexandria and a boutique HIIT studio in Dubai Marina need completely different floors — in zoning, privacy, finishes and equipment ratios. We design for the members you're actually serving.",
        ],
      },
      {
        heading: "Renovations without closing",
        body: [
          "For operating gyms we phase renovation work so revenue keeps flowing — sequencing noisy/dusty work, temporary equipment relocation and member communication so churn doesn't spike.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do you replace our architect?",
        a: "No — architects handle structure and permits. We handle the operational layer: zoning, equipment layout and member experience, and we review their drawings with you.",
      },
      {
        q: "Can you work from our floor plans remotely?",
        a: "Yes. Most design consulting is done from drawings, photos and video walkthroughs.",
      },
      {
        q: "When should design consulting start?",
        a: "Before the lease is signed if possible — the building itself is part of the design.",
      },
    ],
    related: ["gym-setup", "gym-equipment-consulting", "gym-consulting"],
  },
  {
    slug: "gym-equipment-consulting",
    title: "Gym Equipment Consulting | Spec, Source & Negotiate — Gymholic",
    metaDescription:
      "Independent gym equipment consulting: needs analysis, brand selection, new vs used, supplier negotiation and lifecycle cost planning. No supplier commissions.",
    eyebrow: "Equipment Consulting",
    h1: "Gym equipment consulting without a commission agenda",
    intro: [
      "Equipment is usually the second-largest check a gym ever writes — and the market is full of suppliers whose 'free consultation' is really a sales pitch for the brands they distribute. Gymholic takes no supplier commissions. We spec what your members need, compare what it actually costs to own, and negotiate on your side of the table.",
      "The right answer is often a mix: premium where durability and branding matter, value brands where it doesn't, and used equipment where the maths wins.",
    ],
    whoFor: "Owners equipping a new gym, expanding an existing floor, or replacing failing equipment.",
    deliverables: [
      "Equipment needs analysis from your programming and member profile",
      "Brand and model shortlist across budget tiers with trade-offs explained",
      "New vs refurbished vs used analysis per category",
      "Total cost of ownership: warranty, parts, service and lifespan",
      "Supplier quote comparison and negotiation support",
      "Delivery, installation and commissioning checklist",
    ],
    sections: [
      {
        heading: "Spec from programming, not from catalogues",
        body: [
          "Your class schedule and member profile dictate the equipment list — not the other way round. A functional-training facility needs a different floor than a bodybuilding gym at the same square footage. We start from your programming and build the list backwards.",
        ],
      },
      {
        heading: "The categories where quality pays",
        body: [
          "Plate-loaded and free-weight equipment barely wears out — buy sensibly, not luxuriously. Cardio fails constantly and expensively — buy the best warranty and service network you can. Cables sit in between. Knowing which is which saves six figures over a facility's life.",
        ],
      },
      {
        heading: "Negotiating the deal",
        body: [
          "List prices are fiction. We compare quotes line by line, bundle installation and training into the deal, anchor payment milestones to delivery and commissioning, and keep spare parts priced in writing before you sign.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do you sell or import equipment?",
        a: "No. We're deliberately independent — our only financial interest is your best outcome.",
      },
      {
        q: "Is used equipment worth it?",
        a: "For free weights and racks, almost always. For cardio with heavy usage history, rarely. We run the numbers per category for your situation.",
      },
      {
        q: "How are you paid?",
        a: "Flat consulting fees — the same whether you spend $50k or $500k, so the advice stays honest.",
      },
    ],
    related: ["gym-setup", "gym-design", "gym-equipment-guide"],
  },
  {
    slug: "gym-marketing",
    title: "Gym Marketing Consulting — Gymholic | Members, Not Just Likes",
    metaDescription:
      "Gym marketing consulting: member acquisition, referrals, retention marketing and local positioning that fills classes and signs memberships. Egypt, UAE & GCC.",
    eyebrow: "Marketing",
    h1: "Gym marketing that signs members, not vanity metrics",
    intro: [
      "Gym marketing in this region is dominated by two failure modes: discount spirals that train customers to wait for offers, and content that wins likes from people who already train at your competitor. Gymholic's marketing consulting builds the unglamorous machinery that actually grows membership: a clear local offer, a reliable acquisition funnel, a referral engine, and retention communication that keeps the members you paid for.",
      "We plan it, we build it with your team, and we measure it in sign-ups — not impressions.",
    ],
    whoFor: "Gyms that need predictable member acquisition and are tired of agency roulette.",
    deliverables: [
      "Local positioning and offer design (what you sell, to whom, at what hook)",
      "Acquisition funnel: ads, landing pages, WhatsApp/lead handling and trials",
      "Referral programme design with member incentives",
      "Retention marketing: onboarding sequence, win-back and milestone campaigns",
      "Class and community marketing that fills off-peak hours",
      "Marketing calendar and KPI reporting (trials, sign-ups, CAC)",
    ],
    sections: [
      {
        heading: "The offer is the campaign",
        body: [
          "Most gym ads underperform because the underlying offer is undifferentiated: same trial, same price, same stock photo. We fix the offer first — a specific promise to a specific member type — and only then spend on distribution.",
        ],
      },
      {
        heading: "Referrals: the channel gyms forget",
        body: [
          "Fitness is social. A structured referral programme — asked at the right moment, rewarded in the right currency — routinely becomes the cheapest acquisition channel a gym has, beating paid ads on both volume and quality of member.",
        ],
      },
      {
        heading: "Retention is marketing",
        body: [
          "Every member who stays another six months is a sale you didn't have to make. Onboarding in week one, milestone celebrations, win-back flows for fading members — this is where marketing budget has the highest ROI in the industry.",
        ],
      },
    ],
    faqs: [
      {
        q: "Do you run the ads for us?",
        a: "We build the system and can run it with your team. Most clients take over execution after a few months — that's the goal.",
      },
      {
        q: "What should a gym marketing budget be?",
        a: "A useful rule: know your member LTV first, then budget acquisition as a fraction of it. We'll calculate both in the strategy call.",
      },
      {
        q: "We have no marketing staff — can we still do this?",
        a: "Yes. The plans are sized for small teams; consistency beats headcount.",
      },
    ],
    related: ["how-to-increase-gym-membership", "gym-consulting", "gym-revenue-consulting"],
  },
  {
    slug: "gym-revenue-consulting",
    title: "Gym Revenue Consulting | Grow Revenue & Profit — Gymholic",
    metaDescription:
      "Gym revenue consulting: pricing, membership tiers, secondary revenue streams and upsells that grow top and bottom line without discounting. Egypt, UAE & GCC.",
    eyebrow: "Revenue Growth",
    h1: "Gym revenue consulting: more revenue per member, more members retained",
    intro: [
      "Gym revenue grows three ways: more members, better pricing, and more revenue per member. Discount-driven growth burns all three at once. Gymholic's revenue work rebuilds the model deliberately — pricing architecture, membership tiers, secondary streams like personal training and programs, and the operational changes that make the new structure stick.",
      "The typical engagement finds 10–30% of revenue hiding in plain sight: underpriced core memberships, unbundled services given away free, no recurring premium tier, and personal training run as an afterthought instead of a business line.",
    ],
    whoFor: "Gyms with stable membership whose revenue has plateaued, and premium facilities leaving money on the table.",
    deliverables: [
      "Revenue audit by stream: memberships, PT, programs, retail, drop-ins",
      "Pricing architecture: tiers, contracts, and annual/commitment structure",
      "Personal-training business line design (packages, trainer splits, schedules)",
      "Premium and add-on tier creation (programming, testing, small group)",
      "Price-change rollout plan that protects retention",
      "Revenue dashboard and per-member economics tracking",
    ],
    sections: [
      {
        heading: "Pricing is a system, not a number",
        body: [
          "A single all-inclusive price forces your best members to underpay and your lightest users to overpay — and both resent it. Tiered structures let members self-select upward, anchor value at the top, and give sales a ladder to climb instead of a wall to discount.",
        ],
      },
      {
        heading: "Personal training: the second business inside your gym",
        body: [
          "In well-run facilities PT contributes 20–40% of revenue at higher margin than memberships. It needs its own packages, its own scheduling discipline, its own trainer economics and its own sales process. We build that line properly.",
        ],
      },
      {
        heading: "Raising prices without a revolt",
        body: [
          "Price increases fail from surprise, not from math. We sequence the change: earn it with service fixes first, grandfather wisely, communicate early, and bundle the increase with new value. Done right, net revenue rises while churn barely moves.",
        ],
      },
    ],
    faqs: [
      {
        q: "Won't raising prices lose members?",
        a: "Some price-sensitive members will leave; the question is net revenue. We model the churn/revenue trade-off before recommending anything.",
      },
      {
        q: "How fast should we expect results?",
        a: "Pricing and PT restructuring show impact within a quarter. Member-count growth from retention fixes compounds over two to three.",
      },
      {
        q: "We're already expensive for our area — can you still help?",
        a: "Yes — the work then shifts to justifying the premium, tiering, and building secondary revenue rather than the headline price.",
      },
    ],
    related: ["gym-business-consulting", "how-to-increase-personal-training-revenue", "how-to-increase-gym-membership"],
  },
  {
    slug: "personal-training-consulting",
    title: "Personal Training Business Consulting — Gymholic",
    metaDescription:
      "Consulting for personal trainers and PT departments: pricing, packages, client acquisition, retention and scaling from solo trainer to team. Egypt, UAE & GCC.",
    eyebrow: "Personal Training",
    h1: "Personal training consulting: build a PT business, not a PT hustle",
    intro: [
      "Most personal trainers are excellent coaches and accidental businesspeople — fully booked at prices that don't cover their own burnout, or brilliant and empty at the same time. Gymholic's PT consulting fixes the business side: positioning, pricing, packages, client acquisition and retention, and the jump from selling your own hours to leading a team.",
      "The same discipline applies inside gyms: a PT department run as a business line instead of a freelancer lounge.",
    ],
    whoFor: "Independent trainers, studio owners, and gym operators building a PT department.",
    deliverables: [
      "Positioning and niche definition (who you serve, with what promise)",
      "Package and pricing architecture: sessions, programmes, commitments",
      "Client acquisition system: referrals, trials, and local partnerships",
      "Retention machinery: onboarding, progress reviews, re-commitment flows",
      "Schedule and capacity design — earning more without more hours",
      "For departments: trainer recruitment, economics, splits and standards",
    ],
    sections: [
      {
        heading: "Price for the outcome, structure for retention",
        body: [
          "Hourly pricing invites comparison with everyone else's hourly price. Outcome-based packages — 12-week transformations, strength programmes, event prep — compete on value, prepay cleanly, and retain by design.",
        ],
      },
      {
        heading: "Full book, empty calendar margin",
        body: [
          "A 'fully booked' trainer can still earn poorly: discounted sessions, travel gaps, cancellations without policies, and clients on month-to-month drift. We rebuild the calendar around high-value sessions, protected by clear policies, with space reserved for premium work.",
        ],
      },
      {
        heading: "From solo to studio",
        body: [
          "Hiring your first trainer is a rite of passage and a cash-flow risk. We structure the step: employment vs revenue-share models, quality control, brand standards, and pricing that keeps the economics working when you're paying someone else.",
        ],
      },
    ],
    faqs: [
      {
        q: "I train clients in a commercial gym — is this for me?",
        a: "Yes. Most consulting clients start exactly there, working within their gym's rules while building their own book.",
      },
      {
        q: "How do I get more clients?",
        a: "Systems, not charisma: a referral ask at the moment of visible progress, a trial offer that converts, and partnerships with adjacent local businesses. We build these together.",
      },
      {
        q: "Can you help our gym's PT department specifically?",
        a: "Yes — department structure, trainer economics and standards are a core offering. See also our revenue consulting for the membership side.",
      },
    ],
    related: ["how-to-increase-personal-training-revenue", "gym-revenue-consulting", "gym-consulting"],
  },
];

export function getServicePage(slug: string): ServicePage | undefined {
  return servicePages.find((s) => s.slug === slug);
}
