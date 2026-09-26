/**
 * Master Institutional Offices and Departments List for Batanes State College (BSC)
 * Single source of truth for all institutional offices, academic departments, and support units.
 */

export interface InstitutionalOffice {
  code: string;
  name: string;
  category: "Executive & Administrative" | "Academic & Departments" | "Research & Extension" | "Student & Support Services" | "Auxiliary & Projects";
  description?: string;
}

export const INSTITUTIONAL_OFFICES: InstitutionalOffice[] = [
  // Executive & Administrative
  {
    code: "OOP",
    name: "Office of the President (OOP)",
    category: "Executive & Administrative",
  },
  {
    code: "OVP",
    name: "Office of the Vice President (OVP)",
    category: "Executive & Administrative",
  },
  {
    code: "OVPAA",
    name: "Office of the Vice President for Academic Affairs (OVPAA)",
    category: "Executive & Administrative",
  },
  {
    code: "OVPA",
    name: "Office of the Vice President for Administration (OVPA)",
    category: "Executive & Administrative",
  },
  {
    code: "PROC",
    name: "Procurement Office",
    category: "Executive & Administrative",
  },
  {
    code: "BAC",
    name: "Bids and Awards Committee (BAC)",
    category: "Executive & Administrative",
  },
  {
    code: "LEGAL",
    name: "Legal Affairs Office",
    category: "Executive & Administrative",
  },
  {
    code: "PLANNING",
    name: "Planning and Development Office",
    category: "Executive & Administrative",
  },
  {
    code: "DAFS",
    name: "Department of Accounting & Financial Services (DAFS)",
    category: "Executive & Administrative",
  },
  {
    code: "GSO",
    name: "General Services Office (GSO)",
    category: "Executive & Administrative",
  },
  {
    code: "ICT",
    name: "Information & Communications Technology (ICT) Unit",
    category: "Executive & Administrative",
  },
  {
    code: "GAD",
    name: "Gender and Development (GAD)",
    category: "Executive & Administrative",
  },

  // Academic & Departments
  {
    code: "CBAO",
    name: "College of Business and Accountancy (CBAO)",
    category: "Academic & Departments",
  },
  {
    code: "TED",
    name: "Teacher Education Department (TED)",
    category: "Academic & Departments",
  },
  {
    code: "HTM",
    name: "Hospitality & Tourism Management (HTM)",
    category: "Academic & Departments",
  },
  {
    code: "AGRI",
    name: "Department of Agriculture",
    category: "Academic & Departments",
  },
  {
    code: "IT",
    name: "Information Technology Department (IT)",
    category: "Academic & Departments",
  },
  {
    code: "DI",
    name: "Department of Instruction (DI)",
    category: "Academic & Departments",
  },

  // Research & Extension
  {
    code: "RDET",
    name: "Research, Development, Extension & Training (RDET)",
    category: "Research & Extension",
  },
  {
    code: "RDET-ST",
    name: "RDET - Science & Technology",
    category: "Research & Extension",
  },
  {
    code: "RDET-FT",
    name: "RDET - Futures Thinking",
    category: "Research & Extension",
  },
  {
    code: "RDET-TOUR",
    name: "RDET - Sustainable Tourism",
    category: "Research & Extension",
  },
  {
    code: "DOST-PCAARRD",
    name: "Agriculture - DOST PCAARRD Projects",
    category: "Research & Extension",
  },

  // Student & Support Services
  {
    code: "REG",
    name: "Office of the College Registrar",
    category: "Student & Support Services",
  },
  {
    code: "LIB",
    name: "College Library",
    category: "Student & Support Services",
  },
  {
    code: "SSC",
    name: "Supreme Student Council (SSC)",
    category: "Student & Support Services",
  },
  {
    code: "PUB",
    name: "Student Publication Office",
    category: "Student & Support Services",
  },
  {
    code: "SSO-MED",
    name: "Student Services - Medical Clinic",
    category: "Student & Support Services",
  },
  {
    code: "SOCIO-CUL",
    name: "Socio-Cultural Affairs Office",
    category: "Student & Support Services",
  },

  // Auxiliary & Projects
  {
    code: "CBAO-IGP",
    name: "CBAO - Income Generating Projects",
    category: "Auxiliary & Projects",
  },
];

/**
 * Normalizes any office query / acronym / partial name to its official full display name.
 */
export function normalizeOfficeName(input?: string | null): string {
  if (!input) return "";
  const trimmed = input.trim();
  const directMatch = INSTITUTIONAL_OFFICES.find(
    (o) => o.code.toLowerCase() === trimmed.toLowerCase() || o.name.toLowerCase() === trimmed.toLowerCase()
  );
  if (directMatch) return directMatch.name;

  // Check prefix or code contains
  const lower = trimmed.toLowerCase();
  const partial = INSTITUTIONAL_OFFICES.find(
    (o) => o.code.toLowerCase() === lower || o.name.toLowerCase().includes(lower)
  );
  return partial ? partial.name : trimmed;
}
