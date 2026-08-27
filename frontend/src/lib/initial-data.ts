import { Application, DiscoveredJob } from '../types';

export const INITIAL_APPLICATIONS: Application[] = [
  {
    "id": "ef3d40c0-b88f-4eea-94f8-bc2c5c1f4aa2",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "company_name": "Target Company",
    "role_title": "Software Engineer",
    "job_location": "Remote / Hybrid",
    "work_model": "ONSITE",
    "status": "APPLIED",
    "applied_date": "2026-10-06",
    "salary_range": "$55 - $75 / hr",
    "match_score": 24,
    "match_details": {
      "deficiencies": [
        {
          "similarity": 19.5,
          "requirement": "Proficiency and experience with Python",
          "best_match_bullet": "Engineered distributed microservices in Go and Python, serving 12M+ monthly active requests with sub-45ms p95 latency.",
          "actionable_feedback": "Requirement 'Proficiency and experience with Python' has low resume coverage (20%). Consider adding a bullet point highlighting practical experience."
        },
        {
          "similarity": 20.9,
          "requirement": "Proficiency and experience with Go",
          "best_match_bullet": "Engineered distributed microservices in Go and Python, serving 12M+ monthly active requests with sub-45ms p95 latency.",
          "actionable_feedback": "Requirement 'Proficiency and experience with Go' has low resume coverage (21%). Consider adding a bullet point highlighting practical experience."
        },
        {
          "similarity": 31.6,
          "requirement": "Proficiency and experience with Redis",
          "best_match_bullet": "Architected event-driven asynchronous task queues with Redis streams and background workers to isolate heavy AI inference.",
          "actionable_feedback": "Requirement 'Proficiency and experience with Redis' has low resume coverage (32%). Consider adding a bullet point highlighting practical experience."
        }
      ],
      "matched_count": 0,
      "coverage_score": 24,
      "matched_skills": [],
      "deficiencies_count": 3,
      "total_requirements": 3
    },
    "created_at": "2026-10-06T08:04:19.132413+00:00",
    "updated_at": "2026-10-06T08:04:19.933821+00:00"
  },
  {
    "id": "11111111-1111-1111-1111-111111111105",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "company_name": "Palantir",
    "role_title": "Forward Deployed Software Engineer",
    "job_location": "New York, NY",
    "work_model": "ONSITE",
    "status": "APPLIED",
    "applied_date": "2026-10-06",
    "salary_range": "$135,000 - $160,000",
    "match_score": 84,
    "match_details": {
      "deficiencies": [],
      "coverage_score": 84,
      "matched_skills": [
        {
          "similarity": 86,
          "requirement": "TypeScript & React"
        }
      ]
    },
    "created_at": "2026-10-06T08:04:05.846066+00:00",
    "updated_at": "2026-10-06T17:41:29.126727+00:00"
  },
  {
    "id": "11111111-1111-1111-1111-111111111104",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "company_name": "Stripe",
    "role_title": "Backend Infrastructure Engineer Intern",
    "job_location": "Seattle, WA",
    "work_model": "REMOTE",
    "status": "APPLIED",
    "applied_date": "2026-10-05",
    "salary_range": "$65 - $82 / hr",
    "match_score": 89,
    "match_details": {
      "deficiencies": [],
      "coverage_score": 89,
      "matched_skills": [
        {
          "similarity": 92,
          "requirement": "PostgreSQL & Redis performance"
        }
      ]
    },
    "created_at": "2026-10-05T08:04:05.846066+00:00",
    "updated_at": "2026-10-06T08:04:05.846066+00:00"
  },
  {
    "id": "11111111-1111-1111-1111-111111111101",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "company_name": "Amazon",
    "role_title": "Software Development Engineer Intern",
    "job_location": "Seattle, WA",
    "work_model": "HYBRID",
    "status": "OA_SCHEDULED",
    "applied_date": "2026-10-03",
    "salary_range": "$62 - $75 / hr",
    "match_score": 92.5,
    "match_details": {
      "deficiencies": [],
      "coverage_score": 92.5,
      "matched_skills": [
        {
          "similarity": 95,
          "requirement": "Proficiency in Go or Python"
        },
        {
          "similarity": 90,
          "requirement": "Distributed Systems"
        }
      ]
    },
    "created_at": "2026-10-03T08:04:05.846066+00:00",
    "updated_at": "2026-10-06T08:04:05.846066+00:00"
  },
  {
    "id": "11111111-1111-1111-1111-111111111107",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "company_name": "Cloudflare",
    "role_title": "Systems Engineering Intern",
    "job_location": "Austin, TX",
    "work_model": "HYBRID",
    "status": "WITHDRAWN",
    "applied_date": "2026-09-28",
    "salary_range": "$60 - $70 / hr",
    "match_score": 88,
    "match_details": {
      "deficiencies": [],
      "coverage_score": 88,
      "matched_skills": [
        {
          "similarity": 90,
          "requirement": "Rust & Go networking"
        }
      ]
    },
    "created_at": "2026-09-28T08:04:05.846066+00:00",
    "updated_at": "2026-10-06T08:04:05.846066+00:00"
  },
  {
    "id": "11111111-1111-1111-1111-111111111102",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "company_name": "Rivian",
    "role_title": "Embedded Software Engineer Co-op",
    "job_location": "Palo Alto, CA",
    "work_model": "ONSITE",
    "status": "INTERVIEWING",
    "applied_date": "2026-09-26",
    "salary_range": "$58 - $68 / hr",
    "match_score": 78,
    "match_details": {
      "deficiencies": [
        {
          "similarity": 42,
          "requirement": "CAN bus and RTOS",
          "actionable_feedback": "Resume lacks embedded RTOS or CAN automotive protocol experience."
        }
      ],
      "coverage_score": 78,
      "matched_skills": [
        {
          "similarity": 88,
          "requirement": "C/C++ Systems Programming"
        }
      ]
    },
    "created_at": "2026-09-26T08:04:05.846066+00:00",
    "updated_at": "2026-10-06T08:04:05.846066+00:00"
  },
  {
    "id": "11111111-1111-1111-1111-111111111106",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "company_name": "Tesla",
    "role_title": "Autopilot Software Intern",
    "job_location": "Austin, TX",
    "work_model": "ONSITE",
    "status": "REJECTED",
    "applied_date": "2026-09-22",
    "salary_range": "$50 - $65 / hr",
    "match_score": 65,
    "match_details": {
      "deficiencies": [
        {
          "similarity": 48,
          "requirement": "CUDA & C++ optimization"
        }
      ],
      "coverage_score": 65,
      "matched_skills": [
        {
          "similarity": 80,
          "requirement": "Python & PyTorch"
        }
      ]
    },
    "created_at": "2026-09-22T08:04:05.846066+00:00",
    "updated_at": "2026-10-06T08:04:05.846066+00:00"
  },
  {
    "id": "11111111-1111-1111-1111-111111111103",
    "user_id": "00000000-0000-0000-0000-000000000001",
    "company_name": "Databricks",
    "role_title": "Systems Software Engineer Intern",
    "job_location": "San Francisco, CA",
    "work_model": "HYBRID",
    "status": "OFFER",
    "applied_date": "2026-09-11",
    "salary_range": "$80 - $95 / hr",
    "match_score": 96,
    "match_details": {
      "deficiencies": [],
      "coverage_score": 96,
      "matched_skills": [
        {
          "similarity": 96,
          "requirement": "Distributed storage & query engines"
        }
      ]
    },
    "created_at": "2026-09-11T08:04:05.846066+00:00",
    "updated_at": "2026-10-06T08:04:05.846066+00:00"
  }
];

export const INITIAL_DISCOVERED_JOBS: DiscoveredJob[] = [
  {
    "id": "1010a4a2-04d6-4e28-ab28-fc9aa6be71ac",
    "company_name": "Electronic Arts",
    "company_domain": "ea.com",
    "role_title": "Software Engineer Intern",
    "city": "Vancouver",
    "province": "BC",
    "work_model": "ONSITE",
    "job_type": "INTERNSHIP",
    "salary_range_cad": "$42 - $58 / hr CAD",
    "job_url": "https://jobs.ea.com/en_US/careers/JobDetail/Software-Engineer-Intern/216227",
    "description": "Software Engineer Intern at Electronic Arts (Vancouver, BC). Verified Canadian tech student position. Tech stack: Software Engineering, Algorithms, Git....",
    "requirements": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "skills": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "created_at": "2026-10-07T04:56:05.117020+00:00"
  },
  {
    "id": "5614eb6e-ee48-4d88-84ae-e1aac75ea8ae",
    "company_name": "Moment Energy",
    "company_domain": "job-boards.greenhouse.io",
    "role_title": "Data Scientist Co-op (Winter 2027)",
    "city": "Surrey",
    "province": "BC",
    "work_model": "ONSITE",
    "job_type": "INTERNSHIP",
    "salary_range_cad": "$42 - $58 / hr CAD",
    "job_url": "https://job-boards.greenhouse.io/momentenergy/jobs/4421775009",
    "description": "Data Scientist Co-op (Winter 2027) at Moment Energy (Surrey, BC). Verified Canadian tech student position. Tech stack: Software Engineering, Algorithms, Git....",
    "requirements": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "skills": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "created_at": "2026-10-07T04:56:05.390968+00:00"
  },
  {
    "id": "ada9160b-fe30-41fa-91b0-963ea49802a7",
    "company_name": "Electronic Arts",
    "company_domain": "ea.com",
    "role_title": "Rendering Engineer Intern (Summer 2027)",
    "city": "Vancouver",
    "province": "BC",
    "work_model": "ONSITE",
    "job_type": "INTERNSHIP",
    "salary_range_cad": "$42 - $58 / hr CAD",
    "job_url": "https://jobs.ea.com/en_US/careers/JobDetail/Rendering-Engineer-Intern/216222",
    "description": "Rendering Engineer Intern (Summer 2027) at Electronic Arts (Vancouver, BC). Verified Canadian tech student position. Tech stack: Software Engineering, Algorithms, Git....",
    "requirements": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "skills": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "created_at": "2026-10-07T04:56:07.184477+00:00"
  },
  {
    "id": "3b3bc7ea-af51-45e2-91cd-9138f0a38012",
    "company_name": "Nokia",
    "company_domain": "fa-evmr-saasfaprod1.fa.ocs.oraclecloud.com",
    "role_title": "Automation Engineer Co-op Intern (Winter 2027)",
    "city": "Ottawa",
    "province": "ON",
    "work_model": "ONSITE",
    "job_type": "INTERNSHIP",
    "salary_range_cad": "$42 - $58 / hr CAD",
    "job_url": "https://fa-evmr-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/41168",
    "description": "Automation Engineer Co-op Intern (Winter 2027) at Nokia (Ottawa, ON). Verified Canadian tech student position. Tech stack: Software Engineering, Algorithms, Git....",
    "requirements": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "skills": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "created_at": "2026-10-07T04:56:03.421943+00:00"
  },
  {
    "id": "92ded2f5-11d8-46fa-b8c2-ea9fd6796326",
    "company_name": "Definity Financial",
    "company_domain": "hdks.fa.ca2.oraclecloud.com",
    "role_title": "Operations Analyst Co-op Intern (Winter 2027)",
    "city": "Toronto",
    "province": "ON",
    "work_model": "ONSITE",
    "job_type": "INTERNSHIP",
    "salary_range_cad": "$42 - $58 / hr CAD",
    "job_url": "https://hdks.fa.ca2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/9410",
    "description": "Operations Analyst Co-op Intern (Winter 2027) at Definity Financial (Toronto, ON). Verified Canadian tech student position. Tech stack: Software Engineering, Algorithms, Git....",
    "requirements": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "skills": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "created_at": "2026-10-07T04:56:03.556466+00:00"
  },
  {
    "id": "861d95a3-0828-45c7-bdbf-be7ba4ad10b2",
    "company_name": "Intel",
    "company_domain": "intel.wd1.myworkdayjobs.com",
    "role_title": "Thermal Mechanical Engineering Intern, GPU Platforms",
    "city": "Toronto",
    "province": "ON",
    "work_model": "ONSITE",
    "job_type": "INTERNSHIP",
    "salary_range_cad": "$42 - $58 / hr CAD",
    "job_url": "https://intel.wd1.myworkdayjobs.com/en-us/external/job/Canada-Toronto/Thermal-Mechanical-Engineering-Undergraduate-Intern--GPU-Platforms_JR0287516",
    "description": "Thermal Mechanical Engineering Intern, GPU Platforms at Intel (Toronto, ON). Verified Canadian tech student position. Tech stack: Software Engineering, Algorithms, Git....",
    "requirements": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "skills": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "created_at": "2026-10-07T04:56:03.690783+00:00"
  },
  {
    "id": "9f1dd089-f162-4fa7-a5a5-1cecb324bb56",
    "company_name": "Manulife Financial",
    "company_domain": "manulife.wd3.myworkdayjobs.com",
    "role_title": "Technology Enablement Analyst Co-op (Winter 2027)",
    "city": "Toronto",
    "province": "ON",
    "work_model": "ONSITE",
    "job_type": "INTERNSHIP",
    "salary_range_cad": "$42 - $58 / hr CAD",
    "job_url": "https://manulife.wd3.myworkdayjobs.com/en-US/MFCJH_Jobs/job/Toronto-Ontario/Winter-Co-op-2027---Technology-Enablement-Analyst_JR26090774",
    "description": "Technology Enablement Analyst Co-op (Winter 2027) at Manulife Financial (Toronto, ON). Verified Canadian tech student position. Tech stack: Software Engineering, Algorithms, Git....",
    "requirements": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "skills": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "created_at": "2026-10-07T04:56:03.760132+00:00"
  },
  {
    "id": "25fa7ca8-6dce-4cea-9751-9161d6f3c2d8",
    "company_name": "Mila",
    "company_domain": "apply.workable.com",
    "role_title": "AI Safety Research Intern",
    "city": "Montreal",
    "province": "QC",
    "work_model": "ONSITE",
    "job_type": "INTERNSHIP",
    "salary_range_cad": "$42 - $58 / hr CAD",
    "job_url": "https://apply.workable.com/mila-2/j/1E81635604/",
    "description": "AI Safety Research Intern at Mila (Montreal, QC). Verified Canadian tech student position. Tech stack: Software Engineering, Algorithms, Git....",
    "requirements": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "skills": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "created_at": "2026-10-07T04:56:03.353515+00:00"
  },
  {
    "id": "e0588248-696a-4d3d-b666-6ee72fce82b0",
    "company_name": "TD Bank",
    "company_domain": "td.wd3.myworkdayjobs.com",
    "role_title": "Data Analytics & Insights Intern Co-op (Winter 2027)",
    "city": "Montreal",
    "province": "QC",
    "work_model": "ONSITE",
    "job_type": "INTERNSHIP",
    "salary_range_cad": "$42 - $58 / hr CAD",
    "job_url": "https://td.wd3.myworkdayjobs.com/TD_Bank_Careers/job/Montral-Qubec/Data-Analytics---Insights-Intern---Co-op--Winter-2027-_R_1513914",
    "description": "Data Analytics & Insights Intern Co-op (Winter 2027) at TD Bank (Montreal, QC). Verified Canadian tech student position. Tech stack: Software Engineering, Algorithms, Git....",
    "requirements": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "skills": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "created_at": "2026-10-07T04:56:05.322380+00:00"
  },
  {
    "id": "6edfd4d3-df69-41af-a09d-2d0b9daf610d",
    "company_name": "Acuity",
    "company_domain": "careers.acuityinc.com",
    "role_title": "Firmware Development Intern",
    "city": "Montreal",
    "province": "QC",
    "work_model": "ONSITE",
    "job_type": "INTERNSHIP",
    "salary_range_cad": "$42 - $58 / hr CAD",
    "job_url": "https://careers.acuityinc.com/job/Brossard-Stage-en-d%C3%A9veloppement-micrologicielfirmware-Qu%C3%A9b-J4Y-0C4/1434107300/?ats=successfactors",
    "description": "Firmware Development Intern at Acuity (Montreal, QC). Verified Canadian tech student position. Tech stack: Software Engineering, Algorithms, Git....",
    "requirements": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "skills": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "created_at": "2026-10-07T04:56:05.527518+00:00"
  },
  {
    "id": "f555659c-c11d-4bdb-9417-32f870edb98d",
    "company_name": "Cenovus Energy",
    "company_domain": "cenovus.wd3.myworkdayjobs.com",
    "role_title": "Information Technology Student (Summer 2027)",
    "city": "Calgary",
    "province": "AB",
    "work_model": "ONSITE",
    "job_type": "NEW_GRAD",
    "salary_range_cad": "$42 - $58 / hr CAD",
    "job_url": "https://cenovus.wd3.myworkdayjobs.com/careers/job/CA-AB-Calgary/Student--IT--Data-Science-and-Software--Calgary--May-2027-_R-411145",
    "description": "Information Technology Student (Summer 2027) at Cenovus Energy (Calgary, AB). Verified Canadian tech student position. Tech stack: Software Engineering, Algorithms, Git....",
    "requirements": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "skills": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "created_at": "2026-10-07T04:56:05.663960+00:00"
  },
  {
    "id": "248e4a20-d25b-4cb5-8196-43936ae57fff",
    "company_name": "TRC Companies",
    "company_domain": "careers.trccompanies.com",
    "role_title": "Software Engineer Intern",
    "city": "Calgary",
    "province": "AB",
    "work_model": "ONSITE",
    "job_type": "INTERNSHIP",
    "salary_range_cad": "$42 - $58 / hr CAD",
    "job_url": "https://careers.trccompanies.com/jobs/26840?icims=1",
    "description": "Software Engineer Intern at TRC Companies (Calgary, AB). Verified Canadian tech student position. Tech stack: Software Engineering, Algorithms, Git....",
    "requirements": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "skills": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "created_at": "2026-10-07T04:56:09.173041+00:00"
  },
  {
    "id": "93ecbe09-135d-4fe3-9fdc-67dcfeb9d89a",
    "company_name": "Solink",
    "company_domain": "jobs.ashbyhq.com",
    "role_title": "Software Engineer Co-op, Agents",
    "city": "Remote",
    "province": "REMOTE",
    "work_model": "REMOTE",
    "job_type": "INTERNSHIP",
    "salary_range_cad": "$42 - $58 / hr CAD",
    "job_url": "https://jobs.ashbyhq.com/solink/8493613d-ea47-4182-ac0b-f5f24d11f49e/",
    "description": "Software Engineer Co-op, Agents at Solink (Remote, REMOTE). Verified Canadian tech student position. Tech stack: Software Engineering, Algorithms, Git....",
    "requirements": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "skills": [
      "Software Engineering",
      "Algorithms",
      "Git"
    ],
    "created_at": "2026-10-07T04:56:03.285860+00:00"
  },
  {
    "id": "178cfd14-8d1e-4497-8917-5b153e89fa7b",
    "company_name": "StackAdapt",
    "company_domain": "stackadapt.com",
    "role_title": "Employment Counsel, Canada & International",
    "city": "Remote",
    "province": "REMOTE",
    "work_model": "ONSITE",
    "job_type": "INTERNSHIP",
    "salary_range_cad": "$38 - $55 CAD/hr",
    "job_url": "https://job-boards.greenhouse.io/stackadapt/jobs/4373441009",
    "description": "<div class=\"content-intro\"><p>StackAdapt is the leading technology company that empowers marketers to reach, engage, and convert audiences with precision. With 465 billion automated optimizations per second, the AI-powered StackAdapt Marketing Platform seamlessly connects brand and performance marketing to drive measurable results across the entire customer journey. The most forward-thinking marke...",
    "requirements": [
      "Experience with AI"
    ],
    "skills": [
      "AI"
    ],
    "created_at": "2026-10-06T17:57:58.075727+00:00"
  }
];
