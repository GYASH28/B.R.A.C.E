const PRICES_PER_MILLION = {
  "gpt-5.6-luna": { input: 0.20, cached: 0.02, output: 1.20 },
  "gpt-5.6-terra": { input: 2.00, cached: 0.20, output: 12.00 },
  "gpt-5.6-sol": { input: 4.00, cached: 0.40, output: 20.00 },
};

function estimateResponseCost(model, usage = {}) {
  const prices = PRICES_PER_MILLION[model];
  if (!prices) return null;
  const input = Number(usage.input_tokens || 0);
  const output = Number(usage.output_tokens || 0);
  const cached = Math.min(input, Number(usage.input_tokens_details?.cached_tokens || 0));
  const uncached = Math.max(0, input - cached);
  const usd = (uncached * prices.input + cached * prices.cached + output * prices.output) / 1_000_000;
  return Number(usd.toFixed(6));
}

module.exports = { PRICES_PER_MILLION, estimateResponseCost };
