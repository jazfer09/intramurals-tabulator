// Shared level/bracket definitions used across Admin, Scorer, and Scoreboard.

// Specific grade/level options an event can be tagged with.
export const LEVELS = [
  "Grade 1",
  "Grade 2",
  "Grade 3",
  "Grade 4",
  "Grade 5",
  "Grade 6",
  "Junior High School",
  "Senior High School",
  "College",
];

// Broad brackets used for the filter buttons (Elementary groups
// Grade 1-6 together; the rest map 1:1).
export const BRACKETS = [
  "Elementary",
  "Junior High School",
  "Senior High School",
  "College",
];

export function bracketOf(level) {
  if (!level) return "Unspecified";
  if (level.startsWith("Grade")) return "Elementary";
  return level;
}

export const DEFAULT_CRITERIA = [
  { name: "Criterion 1", weight: 20 },
  { name: "Criterion 2", weight: 20 },
  { name: "Criterion 3", weight: 20 },
  { name: "Criterion 4", weight: 20 },
  { name: "Criterion 5", weight: 20 },
];

export function totalWeight(criteria) {
  return (criteria || []).reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
}
