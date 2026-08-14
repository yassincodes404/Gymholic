export type BlueprintCategory =
  | "Operations"
  | "Staff"
  | "Sales"
  | "Retention"
  | "Finance"
  | "Opening";

export type Blueprint = {
  id: string;
  name: string;
  category: BlueprintCategory;
  description: string;
  resourceType: string;
  price: number;
  /** Which lines print on the BlueprintCover (2-3 short words each). */
  coverLines: string[];
};

export const blueprintCategories: BlueprintCategory[] = [
  "Operations",
  "Staff",
  "Sales",
  "Retention",
  "Finance",
  "Opening",
];

export const blueprints: Blueprint[] = [
  {
    id: "gym-operations-blueprint",
    name: "Gym Operations Blueprint",
    category: "Operations",
    description: "Complete daily, weekly and monthly gym operating system.",
    resourceType: "PDF + Templates",
    price: 49,
    coverLines: ["GYMHOLIC", "OPERATIONS", "BLUEPRINT"],
  },
  {
    id: "staff-management-system",
    name: "Staff Management System",
    category: "Staff",
    description: "Schedules, responsibilities, reporting systems and accountability templates.",
    resourceType: "PDF + Sheets",
    price: 39,
    coverLines: ["GYMHOLIC", "STAFF", "MANAGEMENT"],
  },
  {
    id: "member-retention-blueprint",
    name: "Member Retention Blueprint",
    category: "Retention",
    description: "A complete retention workflow for identifying, tracking and recovering at-risk members.",
    resourceType: "PDF + Templates",
    price: 59,
    coverLines: ["GYMHOLIC", "RETENTION", "SYSTEM"],
  },
  {
    id: "pt-sales-system",
    name: "PT Sales System",
    category: "Sales",
    description: "Trainer sales process, follow-up system and performance tracking.",
    resourceType: "PDF + Templates",
    price: 49,
    coverLines: ["GYMHOLIC", "PT SALES", "SYSTEM"],
  },
  {
    id: "gym-opening-checklist",
    name: "Gym Opening Checklist",
    category: "Opening",
    description: "Everything required before opening a gym location.",
    resourceType: "PDF Checklist",
    price: 29,
    coverLines: ["GYMHOLIC", "OPENING", "CHECKLIST"],
  },
  {
    id: "gym-kpi-dashboard",
    name: "Gym KPI Dashboard",
    category: "Finance",
    description: "Operational and financial KPI tracking framework.",
    resourceType: "PDF + Sheets",
    price: 39,
    coverLines: ["GYMHOLIC", "KPI", "DASHBOARD"],
  },
];

export function getBlueprint(id: string): Blueprint | undefined {
  return blueprints.find((b) => b.id === id);
}
