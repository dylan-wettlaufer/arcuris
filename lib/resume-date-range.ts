/**
 * When models emit two month+year chunks without a separator (e.g. "September 2022 April 2026"),
 * insert an en dash so PDF and preview match expected resume formatting.
 */
export function normalizeResumeDateRange(
  value: string | null | undefined
): string {
  if (value === null || value === undefined) {
    return "";
  }

  let s = value.trim();
  if (s.length === 0) {
    return "";
  }

  // Zero-width / BOM-style characters break word-boundary regexes but still
  // render as "gaps" in PDF/HTML.
  s = s.replace(/[\u200B-\u200D\uFEFF]/g, "");

  // Collapse all Unicode whitespace (thin spaces, NBSP, etc.) so patterns match.
  s = s.replace(/\s+/gu, " ").trim();
  if (s.length === 0) {
    return "";
  }

  if (
    /\s+[–—]\s+/u.test(s) ||
    /\s+-\s+/.test(s) ||
    /\s+to\s+/iu.test(s)
  ) {
    return s;
  }

  // "Sep 2022–Apr 2026" or em dash with no surrounding spaces
  const compactDashRange =
    /^([A-Za-z]{3,})\s+(\d{4})[–—]([A-Za-z]{3,})\s+(\d{4})$/u.exec(s);
  if (compactDashRange !== null) {
    return `${compactDashRange[1]} ${compactDashRange[2]} – ${compactDashRange[3]} ${compactDashRange[4]}`;
  }

  const compactDashPresent =
    /^([A-Za-z]{3,})\s+(\d{4})[–—](Present)$/iu.exec(s);
  if (compactDashPresent !== null) {
    return `${compactDashPresent[1]} ${compactDashPresent[2]} – Present`;
  }

  // "Sep 2022-Apr 2026" (hyphen glued to years/month token)
  const gluedHyphenRange =
    /^([A-Za-z]{3,})\s+(\d{4})-([A-Za-z]{3,})\s+(\d{4})$/.exec(s);
  if (gluedHyphenRange !== null) {
    return `${gluedHyphenRange[1]} ${gluedHyphenRange[2]} – ${gluedHyphenRange[3]} ${gluedHyphenRange[4]}`;
  }

  const gluedHyphenPresent =
    /^([A-Za-z]{3,})\s+(\d{4})-(Present)$/iu.exec(s);
  if (gluedHyphenPresent !== null) {
    return `${gluedHyphenPresent[1]} ${gluedHyphenPresent[2]} – Present`;
  }

  const monthYearTwice =
    /^([A-Za-z]{3,})\s+(\d{4})\s+([A-Za-z]{3,})\s+(\d{4})$/.exec(s);
  if (monthYearTwice !== null) {
    return `${monthYearTwice[1]} ${monthYearTwice[2]} – ${monthYearTwice[3]} ${monthYearTwice[4]}`;
  }

  const monthYearPresent =
    /^([A-Za-z]{3,})\s+(\d{4})\s+(Present)$/iu.exec(s);
  if (monthYearPresent !== null) {
    return `${monthYearPresent[1]} ${monthYearPresent[2]} – Present`;
  }

  const yearOnly = /^(\d{4})\s+(\d{4})$/.exec(s);
  if (yearOnly !== null) {
    return `${yearOnly[1]} – ${yearOnly[2]}`;
  }

  return s;
}
