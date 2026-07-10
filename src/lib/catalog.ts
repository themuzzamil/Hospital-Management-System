/**
 * Predefined clinical catalogs used to populate dropdowns (instead of free
 * text). Lab tests carry a reference range so the receptionist can auto-generate
 * a realistic report after the bill is paid.
 */

export type LabTest = {
  name: string;
  unit: string;
  low: number;
  high: number;
  /** decimals to show for a generated value */
  precision: number;
};

export const LAB_TESTS: LabTest[] = [
  { name: "Complete Blood Count (Hemoglobin)", unit: "g/dL", low: 12, high: 17, precision: 1 },
  { name: "Blood Glucose (Fasting)", unit: "mg/dL", low: 70, high: 110, precision: 0 },
  { name: "Lipid Profile (Total Cholesterol)", unit: "mg/dL", low: 125, high: 200, precision: 0 },
  { name: "Liver Function (ALT)", unit: "U/L", low: 7, high: 55, precision: 0 },
  { name: "Kidney Function (Creatinine)", unit: "mg/dL", low: 0.6, high: 1.3, precision: 2 },
  { name: "Thyroid (TSH)", unit: "mIU/L", low: 0.4, high: 4.0, precision: 2 },
  { name: "Urine Routine Examination", unit: "", low: 0, high: 0, precision: 0 },
  { name: "Chest X-Ray", unit: "", low: 0, high: 0, precision: 0 },
  { name: "ECG", unit: "", low: 0, high: 0, precision: 0 },
  { name: "COVID-19 PCR", unit: "", low: 0, high: 0, precision: 0 },
];

export const PROCEDURES: string[] = [
  "Appendectomy",
  "Cholecystectomy (Gallbladder Removal)",
  "Hernia Repair",
  "Coronary Angioplasty",
  "Coronary Bypass (CABG)",
  "Knee Replacement",
  "Hip Replacement",
  "Fracture Fixation (ORIF)",
  "Cataract Surgery",
  "Cesarean Section",
  "Tonsillectomy",
  "Fistula Surgery",
];

/** Build a dummy but plausible lab report body for a given test name. */
export function generateLabReport(testName: string, patientName: string): string {
  const test = LAB_TESTS.find((t) => t.name === testName);
  const date = new Date().toLocaleDateString();
  const header =
    `LABORATORY REPORT\n` +
    `MediStruct Hospital\n` +
    `--------------------------------------\n` +
    `Patient : ${patientName}\n` +
    `Test    : ${testName}\n` +
    `Date    : ${date}\n` +
    `--------------------------------------\n`;

  if (!test || !test.unit) {
    // Qualitative tests (imaging / PCR / urine) get a normal-finding narrative.
    const narratives: Record<string, string> = {
      "Urine Routine Examination":
        "Colour: Pale yellow, Appearance: Clear, Albumin: Nil, Sugar: Nil,\nPus cells: 1-2 /hpf, RBC: Nil. Impression: Within normal limits.",
      "Chest X-Ray":
        "Lung fields clear. No active parenchymal lesion. Cardiac silhouette normal.\nCostophrenic angles clear. Impression: Normal study.",
      ECG:
        "Sinus rhythm. Rate 78 bpm. Normal axis. No ST-T changes.\nImpression: Normal ECG.",
      "COVID-19 PCR":
        "SARS-CoV-2 RNA: NOT DETECTED. Impression: Negative.",
    };
    const body = narratives[testName] ?? "Findings within normal limits.";
    return header + `\nRESULT\n${body}\n\n--------------------------------------\nVerified by: Pathologist (auto-generated)\n`;
  }

  // Quantitative test: pick a value inside the normal range.
  const span = test.high - test.low;
  const raw = test.low + span * (0.3 + Math.random() * 0.4); // mid-ish
  const value = raw.toFixed(test.precision);
  return (
    header +
    `\nRESULT\n` +
    `${test.name.split("(")[0].trim()} : ${value} ${test.unit}\n` +
    `Reference Range : ${test.low} - ${test.high} ${test.unit}\n` +
    `Interpretation : Normal\n` +
    `\n--------------------------------------\nVerified by: Pathologist (auto-generated)\n`
  );
}
