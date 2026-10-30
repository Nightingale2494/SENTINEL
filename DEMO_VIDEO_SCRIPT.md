# SENTINEL — Official Hackathon Demo Video Script

**Competition:** Nebius x NVIDIA Global AI Hackathon  
**Track:** Best Apps and Agents  
**Target Video Runtime:** 2 minutes 40 seconds (Strict Hackathon Rule: Under 3:00)  
**Resolution:** 1080p (1920x1080) / 60 FPS  
**Voiceover Tone:** Calm, technical, authoritative Site Reliability Engineer (SRE)  
**Key Infrastructure to Highlight:** NVIDIA Llama-3.1-Nemotron-70B-Instruct + Nebius Token Factory  

---

## Production Setup Checklist Before Recording

1. **Terminal 1:** Run `python -m uvicorn backend.main:app --host 0.0.0.0 --port 8000`
2. **Browser:** Open `http://localhost:8000` in full screen (100% or 110% zoom for crisp typography).
3. **State:** Click **"Reset Demo"** on the top bar to ensure services start in a pristine golden state.
4. **Recording Area:** Capture only the browser window or full desktop without clutter.

---

## Timed Second-by-Second Video Script

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOTAL RUNTIME: 02:40                                                   │
│ [0:00 - 0:30] Hook & Problem Statement                                │
│ [0:30 - 1:05] Fault Injection & Scoped Evidence Collection             │
│ [1:05 - 1:45] NVIDIA Nemotron Reasoning via Nebius Token Factory       │
│ [1:45 - 2:20] Cryptographic Approval & Empirical Multi-Probe Verify    │
│ [2:20 - 2:40] Post-Mortem Audit Export & Conclusion                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

### Segment 1: The Hook & The Autonomy Paradox (0:00 – 0:30)

* **Visual on Screen:**
  * Screen opens on the SENTINEL operations workspace (`http://localhost:8000`).
  * Mouse smoothly hovers over the header showing:
    - `SENTINEL v1.0 MVP`
    - The inference status pill: `NVIDIA Nemotron-70B` on `Nebius Token Factory`
    - The active service registry on the left sidebar (`payments-gateway`, `inventory-service`).
  * Both services start in green (200 Healthy).
* **On-Screen Text Overlay (Lower Third):**
  > **SENTINEL** | Autonomous Incident Diagnosis & Approval-Gated Recovery  
  > Powered by NVIDIA Nemotron-70B on Nebius Token Factory
* **Spoken Script (Voiceover):**
  > *"Autonomous AI agents are transforming DevOps, but in mission-critical cloud infrastructure, giving an AI unchecked write access is a recipe for catastrophe. Hallucinated fixes, blind retries, and prompt injections hidden in server logs can turn a minor blip into a multi-region outage.*
  >
  > *This is **SENTINEL**: an operations workspace built on NVIDIA Nemotron-70B and Nebius Token Factory. SENTINEL implements a strict separation of powers: the model diagnoses and proposes; the human decides; and the engine empirically verifies."*

---

### Segment 2: Reproducible Fault Injection & Scoped Evidence (0:30 – 1:05)

* **Visual on Screen:**
  * Click the red **"Inject Fault"** button on the top navbar.
  * Point cursor to `payments-gateway`:
    - Status immediately flips to **503 Unhealthy (DatabaseConnectionTimeout)**.
    - Show `inventory-service` (healthy control) remains green at **200 OK**, demonstrating fault isolation.
  * Show the incident opened automatically: `inc_...` with state **`Investigating`**.
  * Click through the **Evidence Panel** tabs:
    - Tab 1 (`EV-*-01`): Health probe failure showing database connection refused on port 5433.
    - Tab 2 (`EV-*-02`): Config diff highlighting `DB_PORT: 5432 -> 5433`.
    - Tab 3 (`EV-*-03`): Scoped application logs showing stack traces and automatically redacted bearer tokens (`[REDACTED_JWT_TOKEN]`).
* **On-Screen Text Overlay:**
  > **Scoped Evidence Collection** | Automated Redaction & Anti-Prompt-Injection Framing
* **Spoken Script (Voiceover):**
  > *"Let's trigger a realistic production outage. An automated deployment pipeline has errantly altered our database port from 5432 to 5433. 
  >
  > Immediately, payments-gateway fails with a 503 connection timeout, while our inventory control service remains unaffected.
  >
  > SENTINEL scoops three scoped telemetry artifacts: the failed health probe, the configuration diff, and application logs. Notice our regex engine automatically redacts sensitive bearer tokens before transmission, and wraps all retrieved text in anti-prompt-injection boundaries so malicious log messages cannot hijack the model."*

---

### Segment 3: NVIDIA Nemotron-70B Inference via Nebius Token Factory (1:05 – 1:45)

* **Visual on Screen:**
  * Click the teal **"Run Nemotron Diagnosis"** button.
  * The button animates into `Synthesizing Telemetry...`.
  * Within ~1–2 seconds, the **NVIDIA Nemotron Diagnosis** panel populates:
    - Zoom slightly or highlight the **Root Cause Hypothesis**: explains that `DB_PORT` was changed to `5433`, blocking connections to `pg-cluster.internal`.
    - Point cursor to the **Supporting Evidence Chips**: `[EV-*-01, EV-*-02]`.
    - Point cursor to the **Uncertainty Badge**: `Uncertainty: 4% (Low)`.
    - Highlight the **Sanitized Inference Trace** at the bottom: host `api.tokenfactory.nebius.com`, model `nvidia/Llama-3.1-Nemotron-70B-Instruct`, latency `~1200ms`, tokens `646`.
    - Show the **Approval-Gated Recovery Proposal**:
      - Target Tool: `restore_demo_config()`
      - Risk: `Low`
      - Concrete Rollback Procedure.
      - Proposal SHA256 hash.
* **On-Screen Text Overlay:**
  > **NVIDIA Llama-3.1-Nemotron-70B-Instruct** | High-Throughput Nebius Token Factory API
* **Spoken Script (Voiceover):**
  > *"We invoke NVIDIA Llama-3.1-Nemotron-70B through the high-throughput Nebius Token Factory API.
  >
  > Nemotron reasons over the telemetry, confirms the port mismatch, and cites exact, verifiable evidence IDs—hallucinated citations are rejected by our backend schema. 
  >
  > It quantifies an epistemic uncertainty of only 4%, and outputs a strictly typed remediation proposal targeting our whitelisted tool, complete with an operational rollback plan.
  >
  > The sanitized trace records the Nebius endpoint, model ID, and latency without exposing credentials."*

---

### Segment 4: Cryptographic Approval Gate & Multi-Probe Verification (1:45 – 2:20)

* **Visual on Screen:**
  * Pan down to the **Operator Approval Gate** panel.
  * Highlight the active 5-minute countdown timer: `Validity Window: 4m 52s`.
  * Highlight the **Bound Service State Hash** check.
  * Click **"Approve Remediation"** as the human operator.
  * The green confirmation appears: *"Operator approval cryptographically locked."*
  * Click **"Execute Recovery & Run Verification Probes"**.
  * The timeline shifts from `Executing` to `Verifying`.
  * Watch the live **Multi-Probe Verification** panel:
    - Probe #1 / 3: Healthy (11ms) ✓
    - Probe #2 / 3: Healthy (12ms) ✓
    - Probe #3 / 3: Healthy (11ms) ✓
    - Functional E2E Test: `POST /api/v1/charge` executes and returns `txn_...` (200 OK Authorized) ✓
  * The verdict badge turns bright green: **`RECOVERED`**.
* **On-Screen Text Overlay:**
  > **Strict Policy:** Single-Use 5m Token Binding | 3x Probes + Functional Checkout Transaction
* **Spoken Script (Voiceover):**
  > *"Here is the security core: the proposal is locked inside an ephemeral, single-use cryptographic token with a 5-minute expiry. If background configuration drift occurs, the approval is instantly invalidated.
  >
  > As the human operator, I click 'Approve Remediation' and trigger execution. The gatekeeper atomically consumes the token to block replay attacks and restores the configuration.
  >
  > But critically: in SENTINEL, a successful command execution alone **never** means Recovered. The system enters empirical verification: three consecutive healthy probes over the verification window, followed by a real functional checkout transaction.
  >
  > Only after all three probes and the functional transaction pass does SENTINEL award the final `Recovered` verdict."*

---

### Segment 5: Post-Mortem Audit Report Export & Closing (2:20 – 2:40)

* **Visual on Screen:**
  * Click the **"Export Incident Report"** button on the top right.
  * The **Incident Audit & Post-Mortem Report** modal opens.
  * Scroll smoothly through the generated Markdown document:
    - Section 1: Executive Summary
    - Section 2: Telemetry Trail
    - Section 3: Nemotron Trace Metadata
    - Section 4: Cryptographic Approval Audit Trail
    - Section 5: Executed Action
    - Section 6: Verification Probes Log
  * Click **"Copy Markdown"** (shows green checkmark) and **"Download .md"**.
  * Close modal to show the final green operations console.
* **On-Screen Text Overlay:**
  > **SENTINEL** | Autonomous Diagnosis. Cryptographic Safety. Empirical Verification.
* **Spoken Script (Voiceover):**
  > *"With recovery complete, SENTINEL compiles a complete, audit-ready post-mortem report detailing every piece of evidence, Nemotron's diagnosis, operator approval hashes, and verification timestamps—ready for one-click export to Markdown.
  >
  > SENTINEL transforms AI from an unpredictable black box into a reliable, approval-gated operational partner—powered by NVIDIA Nemotron on Nebius Token Factory. Thank you."*

---

## Post-Recording Production Tips

1. **Pacing:** Keep spoken word count around 340–360 words total to match a natural 2:30–2:40 pacing.
2. **Audio:** Use a clean USB condenser microphone with mild background noise reduction.
3. **Cursor Movement:** Move cursor with deliberate, smooth motions; avoid rapid circular shaking.
4. **YouTube Settings:** Upload as Unlisted or Public, set title to:  
   `SENTINEL — Autonomous Incident Diagnosis & Recovery with NVIDIA Nemotron & Nebius`  
   Include repository and Devpost links in the description.
