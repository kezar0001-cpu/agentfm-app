// Utility functions for computing Property Condition Index (PCI) and
// generating recommendations based on a rule set.  The PCI is a simple
// weighted average of scores for individual findings.  Severity levels
// are mapped to numeric scores.  Rules are matched against findings to
// produce recommendations.

/**
 * Map severities to numeric scores.  Higher numbers mean better
 * condition.  These values are illustrative; adjust as appropriate
 * for your own scoring model.
 */
const SEVERITY_SCORES = {
  LOW: 90,
  MEDIUM: 70,
  HIGH: 50,
  CRITICAL: 20
};

/**
 * Compute an overall PCI given a list of finding objects.  Each
 * finding must have a `severity` property.  The PCI is the average of
 * the mapped severity scores, rounded to the nearest integer.  If
 * there are no findings the PCI is assumed to be 100.
 * @param {Array<{ severity: string }>} findings
 * @returns {number}
 */
function computePCI(findings) {
  if (!findings || findings.length === 0) return 100;
  const total = findings.reduce((sum, f) => {
    const sev = (f.severity || '').toUpperCase();
    return sum + (SEVERITY_SCORES[sev] || 50);
  }, 0);
  const avg = total / findings.length;
  return Math.round(avg);
}

/**
 * Given an array of findings and a list of rules, produce an array of
 * recommendation objects.  Each rule has an `if` clause with keys
 * like `system`, `severity` and `noteContains`, and a `then` clause
 * describing the recommendation fields to set.  A rule matches a
 * finding if all keys in the `if` clause match (case-insensitive).
 * @param {Array<{ system: string, severity: string, note: string }>} findings
 * @param {Array<{ if: object, then: object }>} rules
 */
function applyRules(findings, rules) {
  const recommendations = [];
  for (const f of findings) {
    for (const r of rules) {
      const conditions = r.if || {};
      let match = true;
      for (const key of Object.keys(conditions)) {
        const expected = String(conditions[key]).toLowerCase();
        if (key === 'noteContains') {
          const note = (f.note || '').toLowerCase();
          if (!note.includes(expected)) {
            match = false;
            break;
          }
        } else {
          const actual = String(f[key] || '').toLowerCase();
          if (actual !== expected) {
            match = false;
            break;
          }
        }
      }
      if (match) {
        // Clone the then object so modifications don't mutate the rule
        recommendations.push({ ...r.then });
      }
    }
  }
  return recommendations;
}

export { computePCI, applyRules };