/**
 * Helper to determine realistic Canadian tech internship and co-op salary ranges.
 * Based on Canadian co-op statistics (UBC, Waterloo, UofT) and live job postings.
 */

export function formatRealisticSalary(job: {
  role_title?: string;
  company_name?: string;
  salary_range_cad?: string | null;
}): string {
  const current = (job.salary_range_cad || "").trim();

  // If salary is already realistic and specific (e.g. from employer ATS), keep it
  const isGenericDefault =
    !current ||
    current === "$42 - $58 / hr CAD" ||
    current === "$38 - $55 CAD/hr" ||
    current === "$40 - $56 / hr CAD" ||
    current === "$40 - $55 / hr CAD" ||
    current === "$45 - $62 / hr CAD" ||
    current === "$48 - $65 / hr CAD";

  if (!isGenericDefault) {
    return current;
  }

  const title = (job.role_title || "").toLowerCase();
  const comp = (job.company_name || "").toLowerCase();

  // 1. HR / People Operations / Recruiting / Office / Admin
  if (
    /people|operat|talent|hr\b|human resources|recruiting|office|admin|coordinator/i.test(
      title
    )
  ) {
    return "$22 - $28 / hr CAD";
  }

  // 2. Marketing / Content / Social Media / Growth
  if (/market|growth|content|social/i.test(title)) {
    return "$22 - $27 / hr CAD";
  }

  // 3. Sales / Business Development / SDR
  if (/sales|business dev|sdr|bdr|account/i.test(title)) {
    return "$24 - $30 / hr CAD";
  }

  // 4. Finance / Accounting / Risk / Legal
  if (/finance|account|audit|tax|actuarial|counsel|legal/i.test(title)) {
    return "$25 - $32 / hr CAD";
  }

  // 5. Hardware / Mechanical / Electrical / Firmware / Robotics / Silicon / Analog
  if (
    /hardware|mechanical|thermal|electrical|firmware|robotics|analog|silicon|fpga|circuit|embedded/i.test(
      title
    )
  ) {
    return "$28 - $38 / hr CAD";
  }

  // 6. Product Design / UI / UX / Graphic
  if (/(?:product|ui|ux|graphic|visual|brand|interaction)\s*design|ui\b|ux\b|graphic|designer\b/i.test(title)) {
    return "$28 - $36 / hr CAD";
  }

  // 7. Business Analyst / Data Analyst / QA / Testing / Datacenter Support
  if (
    /analyst|qa\b|quality|test|support|datacenter|technicien|centre de donn/i.test(
      title
    )
  ) {
    return "$26 - $34 / hr CAD";
  }

  // 8. Product Management
  if (/product manager|apm\b/i.test(title)) {
    return "$35 - $48 / hr CAD";
  }

  // 9. AI / Machine Learning / Research
  if (/machine learning|research|ai\b|deep learning|nlp|computer vision/i.test(title)) {
    if (/cohere|snowflake|amazon|shopify|apple|google|meta|microsoft/i.test(comp)) {
      return "$52 - $70 / hr CAD";
    }
    return "$38 - $50 / hr CAD";
  }

  // 10. Top Tier Big Tech SWE
  if (
    /cohere|snowflake|amazon|shopify|stripe|palantir|microsoft|apple|google|meta|uber|datadog/i.test(
      comp
    )
  ) {
    return "$48 - $65 / hr CAD";
  }

  // 11. Standard Software Engineering / Full Stack / Backend / Frontend / Mobile
  return "$30 - $42 / hr CAD";
}
