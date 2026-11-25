// Single source of truth for profile content. Ported from the TanStack build;
// icons dropped to plain labels so the Astro output has zero icon-library JS.

export const CORE_STACK = [
  { name: "TypeScript", slug: "typescript", color: "#3178c6" },
  { name: "React", slug: "react", color: "#61dafb" },
  { name: "Next.js", slug: "nextdotjs", color: "#000000" },
  { name: "Node.js / Express", slug: "nodedotjs", color: "#5fa04e" },
  { name: "Golang", slug: "go", color: "#00ADD8" },
  { name: "PostgreSQL", slug: "postgresql", color: "#4169e1" },
  { name: ".NET / C#", slug: "dotnet", color: "#512bd4" },
  { name: "Docker", slug: "docker", color: "#2496ED" },
];

export interface SkillGroup {
  label: string;
  items: string[];
}

export const SKILL_GROUPS: SkillGroup[] = [
  {
    label: "Core",
    items: ["TypeScript", "React", "Next.js", "Node.js / Express", "Golang", "PostgreSQL", "Docker"],
  },
  {
    label: "Proficient",
    items: [
      "Python",
      ".NET / C#",
      "React Native",
      "MongoDB",
      "SQL Server",
      "Tailwind / shadcn/ui",
      "Redux Toolkit",
      "TanStack Query",
      "CI/CD",
      "Redis",
    ],
  },
  {
    label: "Familiar",
    items: [
      "Rust",
      "C++",
      "PHP / Laravel",
      "Flutter / Dart",
      "Kubernetes",
      "Apache Spark",
      "Apache Airflow",
      "Apache Kafka",
      "AWS S3",
      "GIS (OpenLayers / GeoServer)",
    ],
  },
  {
    label: "Focus Areas",
    items: ["AI / RAG & LLMs", "Data Engineering (ETL, Warehousing)", "DevSecOps (OWASP, Security Testing)"],
  },
];

export interface CareerItem {
  title: string;
  org: string;
  bullets: string[];
  location: string;
  period: string;
  kind: "work" | "education";
  highlight?: boolean;
  grade?: string;
}

export const EXPERIENCE: CareerItem[] = [
  {
    title: "Senior Fullstack Developer",
    org: "PT Duta Intidaya Tbk (Watsons)",
    period: "Jun 2026 - Present",
    location: "Jakarta, Indonesia",
    kind: "work",
    highlight: true,
    bullets: [
      "Build and maintain internal enterprise applications: voucher management, complaint dashboard, approval management, and admin portal.",
      "Fullstack delivery on .NET + React (TypeScript), SQL Server reporting (Excel/PDF exports), and Azure/IIS deployment.",
      "Designed role-based access control (RBAC) per module and automated email workflows (SMTP, templates, CC/watcher routing).",
      "Own end-to-end feature work: spec, backend API, frontend UI, migrations, and office PC deployment.",
    ],
  },
  {
    title: "Senior Fullstack Developer",
    org: "PT. Mega Akses Persada (Fiberstar)",
    period: "Apr 2026 - Jun 2026",
    location: "South Jakarta, Indonesia",
    kind: "work",
    bullets: [
      "Develop internal applications for Fiberstar network operations using SQL Server, Angular, and .NET.",
      "Contributed to One Act, a material approval and network-installation workflow system (.NET, Angular, Express.js, SQL Server).",
      "Review code and support a team of 4+ developers, helping improve release quality.",
      "Maintain self-hosted CI/CD pipelines that reduced typical deployment time from around 30 minutes to under 5 minutes.",
    ],
  },
  {
    title: "Fullstack Developer",
    org: "KPN Plantation",
    period: "Aug 2023 - Mar 2026",
    location: "South Jakarta, Indonesia",
    kind: "work",
    bullets: [
      "Delivered 8+ enterprise systems for plantation operations, covering database, backend, frontend, and delivery.",
      "Contributed to an EUDR compliance platform that reduced reporting time by approximately 40%.",
      "Built an internal RAG assistant used by 1,000+ staff, reducing routine support requests by approximately 50%.",
      "Developed Spark/Airflow data pipelines processing 5M+ monthly records and reduced report generation from around 4 hours to under 10 minutes.",
      "Built monitoring tools for soil and groundwater data across 500+ plantation blocks.",
      "Delivered GIS, material reservation, work-plan, and photo-proof modules.",
    ],
  },
  {
    title: "Fullstack Web Developer",
    org: "PT. Extreme Network Sistem",
    period: "Oct 2022 - Jul 2023",
    location: "South Jakarta, Indonesia",
    kind: "work",
    bullets: [
      "Built Tnosworld PWA for security-service ordering and legal-entity registration with Google Maps and Xendit integration, supporting up to approximately 1K monthly transactions.",
      "Implemented Android push notifications and Telegram order alerts for faster operational follow-up.",
    ],
  },
  {
    title: "Fullstack Web Developer (Internship)",
    org: "PT. Technogis Indonesia",
    period: "Jul 2021 - Dec 2021",
    location: "Yogyakarta, Indonesia",
    kind: "work",
    bullets: [
      "Built a Laravel inventory-management website, replacing manual spreadsheet tracking and reducing stock-reconciliation effort.",
      "Converted 18 Figma pages into responsive, pixel-accurate HTML for the Jagoweb main site.",
    ],
  },
];

export const EDUCATION: CareerItem[] = [
  {
    title: "Bachelor of Computer Science (S1 Informatika)",
    org: "Universitas Siber Asia",
    period: "Jan 2024 - Apr 2026",
    location: "Jakarta, Indonesia",
    kind: "education",
    grade: "GPA 3.62",
    bullets: [],
  },
  {
    title: "Associate Degree (D3 Teknik Informatika)",
    org: "Politeknik Negeri Indramayu",
    period: "Jan 2019 - Jan 2022",
    location: "Indramayu, Indonesia",
    kind: "education",
    grade: "GPA 3.46",
    bullets: [],
  },
  {
    title: "Vocational High School (SMK), Mechanical Engineering",
    org: "SMKN 1 Losarang",
    period: "Jan 2016 - Jan 2019",
    location: "Indramayu, Indonesia",
    kind: "education",
    bullets: [],
  },
];

export interface Certification {
  title: string;
  issuer: string;
  date: string;
  thumbnail?: string;
  credentialUrl?: string;
}

export const CERTIFICATIONS: Certification[] = [
  {
    title: "Certified LLM Security Professional (CLLMSP)",
    issuer: "Red Team Leaders",
    date: "Oct 2026 - Oct 2029",
    thumbnail: "/certificates/cllmsp.png",
    credentialUrl: "https://courses.redteamleaders.com/exam-completion/deda7ee94279fbd3",
  },
  {
    title: "Certified LLM Security Expert (CLLMSE)",
    issuer: "Red Team Leaders",
    date: "Oct 2026 - Oct 2029",
    thumbnail: "/certificates/cllmse.png",
    credentialUrl: "https://courses.redteamleaders.com/exam-completion/d5accb3a6631ac0a",
  },
  {
    title: "Certified Cybersecurity Educator Professional (CCEP)",
    issuer: "Red Team Leaders",
    date: "Oct 2026 - Oct 2029",
    thumbnail: "/certificates/ccep.png",
    credentialUrl: "https://courses.redteamleaders.com/exam-completion/15dcb75d1d046949",
  },
  {
    title: "Monitoring and Observability for Development and DevOps",
    issuer: "IBM",
    date: "May 2026",
    thumbnail: "/certificates/ibm-monitoring-observability.png",
    credentialUrl: "https://www.coursera.org/account/accomplishments/verify/II6G3M5WUX0Y",
  },
  {
    title: "Security & Compliance on Google Cloud",
    issuer: "Google Cloud Security",
    date: "May 2026",
    thumbnail: "/certificates/gcp-security-compliance.png",
    credentialUrl: "https://www.coursera.org/account/accomplishments/specialization/VNQWAHTLSIJQ",
  },
  {
    title: "Membuat Data Warehouse untuk Arsitek Database (Data Engineer)",
    issuer: "Skill Academy by Ruangguru",
    date: "Apr 2026",
    thumbnail: "/certificates/ruangguru-data-warehouse.jpg",
    credentialUrl: "https://img-certificate.ruangguru.com/USERBGF1NHAO/CERT-1XEU4R92.jpg?orig=1",
  },
  {
    title: "CCNA: Switching, Routing, and Wireless Essentials",
    issuer: "Cisco",
    date: "Jan 2022",
    thumbnail: "/certificates/cisco-ccna.png",
    credentialUrl: "https://www.credly.com/badges/be9cee2f-cf1e-4350-abbd-3523e29c4386/public_url",
  },
  {
    title: "Introduction to Data Engineering",
    issuer: "IBM",
    date: "May 2026",
    thumbnail: "/certificates/ibm-intro-data-engineering.png",
    credentialUrl: "https://www.coursera.org/account/accomplishments/verify/0N7VRFBQAKLQ",
  },
  {
    title: "Modern Security Operations",
    issuer: "Google Cloud Security",
    date: "May 2026",
    thumbnail: "/certificates/gcp-modern-security-operations.png",
    credentialUrl: "https://www.coursera.org/account/accomplishments/verify/2NOGIFGFZKWK",
  },
  {
    title: "Security Command Center: Vulnerabilities/Misconfigurations",
    issuer: "Google Cloud Security",
    date: "May 2026",
    thumbnail: "/certificates/gcp-scc-vulnerabilities.png",
    credentialUrl: "https://www.coursera.org/account/accomplishments/verify/PQRMX2UIMFP2",
  },
  {
    title: "Application Security for Developers and DevOps Professionals",
    issuer: "IBM",
    date: "May 2026",
    thumbnail: "/certificates/ibm-app-security.png",
    credentialUrl: "https://www.coursera.org/account/accomplishments/verify/1VVPV4QPU5EC",
  },
];

export const SOCIAL = {
  email: "dickiprasetya176@gmail.com",
  phone: "+62 813-8900-3413",
  github: "https://github.com/evairo176",
  linkedin: "https://linkedin.com/in/dicki-prasetya-3a7587195",
};

export const AVATAR_URL = "/avatar.jpg";
export const CV_URL = "https://resume.evairo.fun/dicki/dicki-prasetya-cv";
export const CV_PDF_URL = "/dicki-prasetya-cv.pdf";

export const SITE = {
  url: "https://folio.evairo.fun",
  name: "Dicki Prasetya",
  role: "Senior Fullstack Developer",
  description:
    "Senior Fullstack Developer building enterprise systems: .NET, React, TypeScript, Go, PostgreSQL, and data engineering.",
  gaId: "G-Z0341KP026",
  googleVerification: "google0faedc88c5638fd6",
};

export interface Stat {
  value: string;
  label: string;
}

export const STATS: Stat[] = [
  { value: "4+", label: "Years of experience" },
  { value: "10+", label: "Enterprise systems delivered" },
  { value: "5+", label: "Internal modules shipped" },
  { value: "5M+", label: "Records/month processed (ETL)" },
  { value: "5+", label: "Self-hosted apps live" },
  { value: "30→5 min", label: "Deploy time (self-hosted CI/CD)" },
];
