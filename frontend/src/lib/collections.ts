// Browse pages (/internships/<city>, /roles/<role>): fixed, indexable slices of the feed.
// Each one is just a set of Discover filters, so "See all" opens the same view in Discover.

type Params = Record<string, string>;

export type Collection = {
  slug: string;
  /** Short name for links and headings, e.g. "Toronto" or "Backend". */
  name: string;
  title: string;
  intro: string;
  params: Params;
};

export const CITIES: Collection[] = [
  {
    slug: "toronto",
    name: "Toronto",
    title: "Tech internships and co-ops in Toronto",
    intro: "Open software, data and engineering roles across Toronto and the GTA: downtown banks and startups, plus Markham, Mississauga and Oakville.",
    params: { city: "Toronto,Markham,Mississauga,Oakville,Richmond Hill,Burlington,Vaughan,Brampton" },
  },
  {
    slug: "vancouver",
    name: "Vancouver",
    title: "Tech internships and co-ops in Vancouver",
    intro: "Open student roles in Vancouver, Burnaby, Surrey and Richmond, from game studios to cleantech.",
    params: { city: "Vancouver,Burnaby,Surrey,Richmond,North Vancouver" },
  },
  {
    slug: "montreal",
    name: "Montreal",
    title: "Tech internships and co-ops in Montreal",
    intro: "Open student roles in Montreal and Laval. Many postings are in French; the role and pay are on each listing.",
    params: { city: "Montreal,Montréal,Laval" },
  },
  {
    slug: "ottawa",
    name: "Ottawa",
    title: "Tech internships and co-ops in Ottawa",
    intro: "Open student roles in Ottawa and Kanata: telecom, defence, government tech and SaaS.",
    params: { city: "Ottawa,Kanata,Nepean,Gatineau" },
  },
  {
    slug: "waterloo",
    name: "Waterloo",
    title: "Tech internships and co-ops in Waterloo",
    intro: "Open student roles in Waterloo, Kitchener and Cambridge, near the region's universities.",
    params: { city: "Waterloo,Kitchener,Cambridge" },
  },
  {
    slug: "calgary",
    name: "Calgary",
    title: "Tech internships and co-ops in Calgary",
    intro: "Open student roles in Calgary: energy, fintech and a growing startup scene.",
    params: { city: "Calgary" },
  },
  {
    slug: "edmonton",
    name: "Edmonton",
    title: "Tech internships and co-ops in Edmonton",
    intro: "Open student roles in Edmonton, home to a strong AI research community.",
    params: { city: "Edmonton" },
  },
  {
    slug: "remote",
    name: "Remote",
    title: "Remote tech internships and co-ops in Canada",
    intro: "Roles you can do from anywhere in Canada. Check each posting for time-zone or occasional office requirements.",
    params: { mode: "remote" },
  },
];

export const ROLES: Collection[] = [
  {
    slug: "software-engineering",
    name: "Software engineering",
    title: "Software engineering internships and co-ops in Canada",
    intro: "Open software developer and engineer roles for students: backend, frontend, mobile, embedded software and more.",
    params: { discipline: "software" },
  },
  {
    slug: "backend",
    name: "Backend",
    title: "Backend developer internships in Canada",
    intro: "Roles that ask for backend skills: Node.js, Django, Spring, .NET, microservices and friends.",
    params: { skill: "Node.js,Django,Flask,FastAPI,Spring,Express,Rails,.NET,gRPC,Microservices" },
  },
  {
    slug: "frontend",
    name: "Frontend",
    title: "Frontend developer internships in Canada",
    intro: "Roles that ask for frontend skills: React, Vue, Angular, Next.js and friends.",
    params: { skill: "React,Vue,Angular,Svelte,Next.js,Redux,Tailwind" },
  },
  {
    slug: "full-stack",
    name: "Full stack",
    title: "Full stack developer internships in Canada",
    intro: "Roles that span the browser, the server and the database.",
    params: { q: "\"full stack\" OR fullstack OR full-stack" },
  },
  {
    slug: "machine-learning",
    name: "AI and ML",
    title: "Machine learning and AI internships in Canada",
    intro: "Open data science, machine learning and AI research roles for students.",
    params: { discipline: "data_ml" },
  },
  {
    slug: "devops",
    name: "DevOps and cloud",
    title: "DevOps and cloud internships in Canada",
    intro: "Roles that ask for infrastructure skills: Docker, Kubernetes, Terraform and CI/CD.",
    params: { skill: "Kubernetes,Terraform,CI/CD,Jenkins,Ansible,Docker" },
  },
  {
    slug: "hardware",
    name: "Hardware",
    title: "Hardware and embedded internships in Canada",
    intro: "Open electrical, firmware, FPGA and embedded systems roles.",
    params: { discipline: "hardware" },
  },
  {
    slug: "security",
    name: "IT and security",
    title: "IT and cybersecurity internships in Canada",
    intro: "Open IT support, systems and security roles for students.",
    params: { discipline: "security_it" },
  },
  {
    slug: "new-grad",
    name: "New grad",
    title: "New grad software jobs in Canada",
    intro: "Full-time entry-level roles for students finishing their degree.",
    params: { type: "new_grad" },
  },
];

export const findCity = (slug: string) => CITIES.find((c) => c.slug === slug);
export const findRole = (slug: string) => ROLES.find((r) => r.slug === slug);
