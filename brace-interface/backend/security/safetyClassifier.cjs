const RISK_ORDER = { low: 1, medium: 2, high: 3, blocked: 4 };

function highestRisk(values) {
  return values.reduce((current, value) => (RISK_ORDER[value] > RISK_ORDER[current] ? value : current), "low");
}

function requiresApproval(riskLevel) {
  return riskLevel === "medium" || riskLevel === "high";
}

module.exports = { highestRisk, requiresApproval, RISK_ORDER };
