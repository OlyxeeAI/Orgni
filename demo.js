/**
 * demo.js — Orgni Full Demo Flow
 *
 * Runs the complete Orgni pipeline against the sample logistics business.
 * Usage: node demo.js
 *
 * Requires the server to be running: node index.js
 */

const BASE_URL = "http://localhost:3000/api/orgni";

const SAMPLE_BUSINESS = {
  businessName: "Rapid Freight Solutions",
  text: `We are a small logistics company. Admin receives invoices by email. 
The finance assistant checks invoice details against delivery records. 
Payments over R5,000 require manager approval. 
Any supplier invoice without a matching delivery record must be flagged. 
Month-end reconciliation is done manually using bank statements and spreadsheets.
The finance manager signs off on all reconciliation reports.
Supplier disputes are escalated to the operations manager.
We have no formal dispute resolution workflow documented.

Payment rules:
- Payments under R5,000: Finance Assistant can approve
- Payments R5,000 to R50,000: Finance Manager approval required
- Payments above R50,000: Director sign-off required
- All international payments: Director sign-off required regardless of amount

Exception handling:
- Missing delivery record: Flag invoice, notify supplier, hold payment
- Duplicate invoice: Reject and notify supplier
- Amount mismatch vs purchase order: Hold and escalate to operations
- Unrecognised supplier: Escalate to Finance Manager for verification`,
  notes: `Our biggest pain points are: 
1. Manual invoice matching takes 2-3 hours per day
2. Month-end reconciliation takes the entire last week of the month
3. We sometimes miss flagging supplier invoices without delivery records`
};

async function post(path, body) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  return res.json();
}

async function get(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  return res.json();
}

function section(title) {
  console.log("\n" + "═".repeat(60));
  console.log(`  ${title}`);
  console.log("═".repeat(60));
}

function print(label, data) {
  console.log(`\n▶ ${label}`);
  console.log(JSON.stringify(data, null, 2));
}

async function runDemo() {
  console.log("\n🧠 ORGNI — Organizational Intelligence Demo");
  console.log("Converting business context into AI-ready operating blueprints\n");

  // ── STEP 1: INGEST ──────────────────────────────────────────
  section("STEP 1: INGEST BUSINESS DESCRIPTION");

  const ingestResult = await post("/ingest", SAMPLE_BUSINESS);
  print("Ingest Response", ingestResult);

  if (ingestResult.error) {
    console.error("Ingest failed:", ingestResult.error);
    process.exit(1);
  }

  const { businessId } = ingestResult;
  console.log(`\n✅ Business ingested. ID: ${businessId}`);

  // ── STEP 2: ANALYZE ─────────────────────────────────────────
  section("STEP 2: RUN FULL EXTRACTION PIPELINE");
  console.log("Running: org map + workflows + governance + risk analysis...");

  const analyzeResult = await post("/analyze", { businessId });
  print("Analysis Summary", analyzeResult);

  if (analyzeResult.error) {
    console.error("Analysis failed:", analyzeResult.error);
    process.exit(1);
  }

  // ── STEP 3: ORG MAP ─────────────────────────────────────────
  section("STEP 3: ORGANIZATION MAP");

  const orgMap = await get(`/map/${businessId}`);
  print("Organization Map", orgMap);

  // ── STEP 4: WORKFLOWS ────────────────────────────────────────
  section("STEP 4: DETECTED WORKFLOWS");

  const workflows = await get(`/workflows/${businessId}`);
  print("Workflows", workflows);

  // ── STEP 5: GOVERNANCE ──────────────────────────────────────
  section("STEP 5: GOVERNANCE RULES");

  const governance = await get(`/governance/${businessId}`);
  print("Governance Rules", governance);

  // ── STEP 6: RISKS ───────────────────────────────────────────
  section("STEP 6: RISK & GAP ANALYSIS");

  const risks = await get(`/risks/${businessId}`);
  print("Risks & Gaps", risks);

  // ── STEP 7: BLUEPRINT ───────────────────────────────────────
  section("STEP 7: AI EXECUTION BLUEPRINT");
  console.log("Generating: What AI can do, what it can't, where humans must approve...");

  const blueprint = await post(`/generate-blueprint/${businessId}`, {});
  print("AI Execution Blueprint", blueprint);

  // ── SUMMARY ─────────────────────────────────────────────────
  section("DEMO COMPLETE");
  console.log(`\n✅ Orgni successfully converted business context into a governed AI blueprint.`);
  console.log(`\nBusiness ID: ${businessId}`);
  console.log(`\nFull report available at:`);
  console.log(`  GET ${BASE_URL}/full-report/${businessId}`);
  console.log(`\nThis JSON output can power:`);
  console.log(`  → A workflow UI showing governed steps`);
  console.log(`  → An AI agent with clear action boundaries`);
  console.log(`  → An automation layer with human-in-the-loop controls`);
  console.log(`  → Integration with Addup for finance execution\n`);
}

runDemo().catch((err) => {
  console.error("\n❌ Demo failed:", err.message);
  console.error("Make sure the server is running: node index.js");
  process.exit(1);
});
