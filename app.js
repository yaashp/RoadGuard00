/* =========================================================
   RoadGuard — pure HTML/CSS/JS build (no backend, no server)
   All data lives in memory only and resets on page refresh.
   ========================================================= */

/* ---------- In-memory "database" ---------- */
const DEMO_BOUNDS = { north: 19.29, south: 18.96, east: 73.08, west: 72.76 };

function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

let nextComplaintSeq = 421;

const state = {
  currentUser: null,
  users: [
    { id: "u_demo_1", name: "Aarav Sharma", email: "demo@roadguard.app", phone: "9876543210", password: "password123" },
  ],
  roadIssues: [
    { id: "ri_1", type: "Pothole", lat: 19.0760, lng: 72.8777, roadName: "Marine Drive, Mumbai", severity: "High", status: "Under Review", reportCount: 17 },
    { id: "ri_2", type: "Pothole", lat: 19.0330, lng: 73.0297, roadName: "Palm Beach Road, Navi Mumbai", severity: "Medium", status: "Assigned", reportCount: 9 },
    { id: "ri_3", type: "Pothole", lat: 19.2183, lng: 72.9781, roadName: "Ghodbunder Road, Thane", severity: "Low", status: "Submitted", reportCount: 3 },
    { id: "ri_4", type: "Accident", lat: 19.0896, lng: 72.8656, roadName: "Western Express Highway, Mumbai", severity: "High", status: "In Progress", reportCount: 6 },
    { id: "ri_5", type: "Accident", lat: 19.0176, lng: 73.0169, roadName: "Sion-Panvel Highway, Navi Mumbai", severity: "Medium", status: "Under Review", reportCount: 4 },
    { id: "ri_6", type: "Construction", lat: 19.0473, lng: 72.9159, roadName: "Eastern Express Highway, Mumbai", severity: "Medium", status: "In Progress", reportCount: 2 },
    { id: "ri_7", type: "Construction", lat: 19.1943, lng: 72.9634, roadName: "LBS Marg, Thane", severity: "Low", status: "Submitted", reportCount: 1 },
    { id: "ri_8", type: "Hazard", lat: 19.1090, lng: 72.8767, roadName: "S.V. Road, Mumbai", severity: "High", status: "Under Review", reportCount: 12 },
    { id: "ri_9", type: "Hazard", lat: 19.0410, lng: 73.0080, roadName: "Vashi Bridge, Navi Mumbai", severity: "Medium", status: "Assigned", reportCount: 8 },
    { id: "ri_10", type: "Resolved", lat: 19.1663, lng: 72.9950, roadName: "Pokhran Road, Thane", severity: "Low", status: "Resolved", reportCount: 5 },
    { id: "ri_11", type: "Resolved", lat: 19.0522, lng: 72.8300, roadName: "Linking Road, Mumbai", severity: "Medium", status: "Resolved", reportCount: 11 },
    { id: "ri_12", type: "Pothole", lat: 19.2403, lng: 72.9784, roadName: "Majiwada, Thane", severity: "High", status: "Under Review", reportCount: 14 },
  ],
  complaints: [
    { id: "c_1", complaintId: "RG-2026-00417", userId: "u_demo_1", issueType: "Pothole", description: "Large pothole near the signal, hard to spot at night.", image: "", lat: 19.0760, lng: 72.8777, address: "Marine Drive, Mumbai", severity: "High", status: "In Progress", createdAt: daysAgo(9) },
    { id: "c_2", complaintId: "RG-2026-00398", userId: "u_demo_1", issueType: "Waterlogging", description: "Water accumulates fully after rain, blocks one lane.", image: "", lat: 19.0330, lng: 73.0297, address: "Palm Beach Road, Navi Mumbai", severity: "Medium", status: "Resolved", createdAt: daysAgo(25) },
    { id: "c_3", complaintId: "RG-2026-00405", userId: "u_demo_1", issueType: "Road Damage", description: "Cracked road surface across two lanes.", image: "", lat: 19.1943, lng: 72.9634, address: "LBS Marg, Thane", severity: "Low", status: "Under Review", createdAt: daysAgo(4) },
  ],
};

const ISSUE_TYPES = ["Pothole", "Accident", "Road Damage", "Waterlogging", "Road Construction", "Traffic Hazard", "Other"];
const SEVERITIES = ["Low", "Medium", "High"];
const TIMELINE_STEPS = ["Submitted", "Under Review", "Assigned", "In Progress", "Resolved"];
const ISSUE_COLORS = {
  Pothole: "#E13B3B", Accident: "#F2A93B", Construction: "#EAB308", Hazard: "#8B5CF6", Resolved: "#17B890",
};

/* ---------- Helpers ---------- */
function formatDate(d) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}
function latLngToPercent(lat, lng) {
  const x = ((lng - DEMO_BOUNDS.west) / (DEMO_BOUNDS.east - DEMO_BOUNDS.west)) * 100;
  const y = ((DEMO_BOUNDS.north - lat) / (DEMO_BOUNDS.north - DEMO_BOUNDS.south)) * 100;
  return { xPct: Math.min(98, Math.max(2, x)), yPct: Math.min(96, Math.max(4, y)) };
}
function percentToLatLng(xPct, yPct) {
  const lng = DEMO_BOUNDS.west + (xPct / 100) * (DEMO_BOUNDS.east - DEMO_BOUNDS.west);
  const lat = DEMO_BOUNDS.north - (yPct / 100) * (DEMO_BOUNDS.north - DEMO_BOUNDS.south);
  return { lat, lng };
}
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}
function showToast(message, type = "success") {
  const el = document.getElementById("toast");
  el.textContent = message;
  el.className = `toast show ${type === "error" ? "error" : ""}`;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { el.className = "toast"; }, 2800);
}

/* ---------- Router ---------- */
const routes = {
  "/": renderLanding,
  "/login": renderLogin,
  "/register": renderRegister,
  "/report": renderReport,
  "/complaints": renderComplaints,
  "/map": renderMap,
};

function navigate(path) {
  window.location.hash = `#${path}`;
}

function router() {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const view = routes[hash] || renderNotFound;
  document.getElementById("navLinks").classList.remove("open");
  window.scrollTo(0, 0);
  renderNavbar();
  view();
}
window.addEventListener("hashchange", router);

/* ---------- Navbar ---------- */
function renderNavbar() {
  document.body.className = state.currentUser ? "logged-in" : "logged-out";
  const actions = document.getElementById("navActions");
  if (state.currentUser) {
    const initial = state.currentUser.name.trim()[0]?.toUpperCase() || "U";
    actions.innerHTML = `
      <div class="user-pill"><span class="avatar">${initial}</span> ${escapeHtml(state.currentUser.name.split(" ")[0])}</div>
      <button class="btn-secondary btn-sm" id="logoutBtn">Logout</button>
    `;
    document.getElementById("logoutBtn").onclick = () => {
      state.currentUser = null;
      showToast("Logged out");
      navigate("/");
    };
  } else {
    actions.innerHTML = `
      <a href="#/login" class="btn-secondary btn-sm">Login</a>
      <a href="#/register" class="btn-primary btn-sm">Sign up</a>
    `;
  }
}
document.getElementById("hamburgerBtn").onclick = () => {
  document.getElementById("navLinks").classList.toggle("open");
};

function requireAuth() {
  if (!state.currentUser) {
    showToast("Please log in to continue", "error");
    navigate("/login");
    return false;
  }
  return true;
}

function app(html) {
  document.getElementById("app").innerHTML = html;
}

/* =========================================================
   LANDING PAGE
   ========================================================= */
function renderLanding() {
  const steps = [
    ["Detect", "Live map surfaces potholes, hazards, and accident-prone stretches as they're reported.", "📡"],
    ["Report", "Snap a photo, pin the spot, and describe the issue in under a minute.", "📝"],
    ["Track", "Follow your complaint from Submitted through to Resolved with a clear timeline.", "✅"],
    ["Travel Safely", "See known hazards on the map before you head out.", "🛣️"],
  ];
  const features = [
    ["Pothole Detection", "Severity-ranked markers pulled from citizen reports.", "⚠️"],
    ["Smart Complaints", "Structured reports with photo evidence and a trackable status timeline.", "📋"],
    ["Real-Time Location", "One-tap GPS pinning for fast, accurate issue reporting.", "📍"],
    ["Live Road Map", "Explore reported issues across Mumbai, Navi Mumbai & Thane.", "🗺️"],
    ["Status Tracking", "Every complaint moves through a clear 5-stage timeline.", "📈"],
    ["No Backend Needed", "Runs entirely in your browser — nothing to install or host.", "💻"],
  ];
  const stats = [["1,250+", "Issues Reported"], ["980+", "Issues Resolved"], ["320+", "Roads Monitored"], ["4,500+", "Users"]];

  app(`
    <section class="container hero">
      <div>
        <span class="pill"><span class="pulse-dot"></span> Live across Mumbai · Navi Mumbai · Thane</span>
        <h1>Smarter Roads.<br>Safer Journeys.</h1>
        <p>Report potholes, monitor road conditions, and explore a live map of hazards — all in one place, right in your browser.</p>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <a href="#/map" class="btn-primary">Explore Map →</a>
          <a href="#/report" class="btn-secondary">Report a Road Issue</a>
        </div>
      </div>
      <div class="hero-visual">
        <svg viewBox="0 0 480 360">
          <defs><linearGradient id="roadFade" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#17B890" /><stop offset="100%" stop-color="#2F6FED" />
          </linearGradient></defs>
          <path d="M40 300 C 120 300, 130 180, 200 170 S 300 90, 340 90 S 420 60, 440 40" fill="none" stroke="url(#roadFade)" stroke-width="5" stroke-linecap="round" />
          <circle cx="150" cy="250" r="7" fill="#E13B3B" stroke="white" stroke-width="2" />
          <circle cx="250" cy="140" r="7" fill="#F2A93B" stroke="white" stroke-width="2" />
          <circle cx="360" cy="78" r="7" fill="#8B5CF6" stroke="white" stroke-width="2" />
          <circle cx="40" cy="300" r="6" fill="#17B890" stroke="white" stroke-width="2" />
          <circle cx="440" cy="40" r="7" fill="#2F6FED" stroke="white" stroke-width="2" />
          <text x="20" y="330" fill="#8E9BB3" font-size="11" font-family="monospace">START</text>
          <text x="392" y="28" fill="#8E9BB3" font-size="11" font-family="monospace">DEST</text>
        </svg>
        <div class="route-badge"><span>🛡️</span><div><div class="muted" style="font-size:.7rem;">Route Safety Score</div><strong>91% Safe</strong></div></div>
      </div>
    </section>

    <section class="container section">
      <h2>How it works</h2>
      <p class="muted" style="margin-bottom:28px;">From spotting a hazard to a safer commute, in four steps.</p>
      <div class="grid grid-4">
        ${steps.map((s, i) => `
          <div class="card feat-card">
            <span class="step-num">0${i + 1}</span>
            <div class="feat-icon">${s[2]}</div>
            <h3>${s[0]}</h3><p>${s[1]}</p>
          </div>`).join("")}
      </div>
    </section>

    <section class="container section">
      <h2>Key features</h2>
      <p class="muted" style="margin-bottom:28px;">Everything a lightweight road-safety site needs.</p>
      <div class="grid grid-3">
        ${features.map(f => `
          <div class="card feat-card">
            <div class="feat-icon">${f[2]}</div>
            <h3>${f[0]}</h3><p>${f[1]}</p>
          </div>`).join("")}
      </div>
    </section>

    <section class="container section">
      <div class="grid grid-4">
        ${stats.map(s => `<div class="card stat-card"><div class="value">${s[0]}</div><div class="label">${s[1]}</div></div>`).join("")}
      </div>
    </section>

    <section class="container" style="padding-bottom:60px;">
      <div class="card cta-card">
        <h2>Ready to make your commute safer?</h2>
        <p class="muted" style="max-width:420px; margin:0 auto 20px;">Create a free account and start reporting and tracking road hazards today.</p>
        <a href="#/register" class="btn-primary">Get started →</a>
      </div>
    </section>
  `);
}

function renderNotFound() {
  app(`<div class="empty-state"><div class="empty-icon">🚧</div><h3>Page not found</h3><p>That page doesn't exist.</p><a href="#/" class="btn-primary">Go home</a></div>`);
}

/* =========================================================
   LOGIN
   ========================================================= */
function renderLogin() {
  app(`
    <div class="auth-wrap">
      <div class="center">
        <div class="auth-icon">🛡️</div>
        <h1 style="font-size:1.5rem; margin:0;">Welcome back</h1>
        <p class="muted" style="margin-top:6px;">Log in to your RoadGuard account</p>
      </div>
      <div class="card auth-card">
        <div id="loginError"></div>
        <form id="loginForm">
          <div class="field">
            <label class="label">Email</label>
            <input class="input" type="email" id="loginEmail" placeholder="you@example.com" />
          </div>
          <div class="field">
            <label class="label">Password</label>
            <input class="input" type="password" id="loginPassword" placeholder="••••••••" />
          </div>
          <button type="submit" class="btn-primary btn-block">Login</button>
        </form>
        <p class="auth-foot">Don't have an account? <a href="#/register" style="color:var(--signal-dark); font-weight:600;">Create one</a></p>
      </div>
      <p class="demo-hint">Demo login: demo@roadguard.app / password123</p>
    </div>
  `);

  document.getElementById("loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const errBox = document.getElementById("loginError");
    errBox.innerHTML = "";

    if (!email || !password) {
      errBox.innerHTML = `<div class="error-banner">⚠️ Please enter your email and password.</div>`;
      return;
    }
    const user = state.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
      errBox.innerHTML = `<div class="error-banner">⚠️ Invalid email or password.</div>`;
      return;
    }
    state.currentUser = user;
    showToast("Welcome back!");
    navigate("/complaints");
  });
}

/* =========================================================
   REGISTER
   ========================================================= */
function renderRegister() {
  app(`
    <div class="auth-wrap">
      <div class="center">
        <div class="auth-icon">🛡️</div>
        <h1 style="font-size:1.5rem; margin:0;">Create your account</h1>
        <p class="muted" style="margin-top:6px;">Join RoadGuard and start reporting hazards</p>
      </div>
      <div class="card auth-card">
        <div id="regFormError"></div>
        <form id="regForm">
          <div class="field">
            <label class="label">Full Name</label>
            <input class="input" id="regName" placeholder="Aarav Sharma" />
            <div class="error-text" id="err-name"></div>
          </div>
          <div class="field">
            <label class="label">Email</label>
            <input class="input" type="email" id="regEmail" placeholder="you@example.com" />
            <div class="error-text" id="err-email"></div>
          </div>
          <div class="field">
            <label class="label">Phone Number</label>
            <input class="input" id="regPhone" placeholder="9876543210" />
            <div class="error-text" id="err-phone"></div>
          </div>
          <div class="field">
            <label class="label">Password</label>
            <input class="input" type="password" id="regPassword" placeholder="At least 6 characters" />
            <div class="error-text" id="err-password"></div>
          </div>
          <div class="field">
            <label class="label">Confirm Password</label>
            <input class="input" type="password" id="regConfirm" placeholder="Re-enter your password" />
            <div class="error-text" id="err-confirm"></div>
          </div>
          <button type="submit" class="btn-primary btn-block">Create account</button>
        </form>
        <p class="auth-foot">Already have an account? <a href="#/login" style="color:var(--signal-dark); font-weight:600;">Log in</a></p>
      </div>
    </div>
  `);

  document.getElementById("regForm").addEventListener("submit", (e) => {
    e.preventDefault();
    ["name", "email", "phone", "password", "confirm"].forEach((f) => (document.getElementById(`err-${f}`) || {}).textContent = "");
    document.getElementById("regFormError").innerHTML = "";

    const name = document.getElementById("regName").value.trim();
    const email = document.getElementById("regEmail").value.trim();
    const phone = document.getElementById("regPhone").value.trim();
    const password = document.getElementById("regPassword").value;
    const confirm = document.getElementById("regConfirm").value;

    let hasError = false;
    const setErr = (field, msg) => { document.getElementById(`err-${field}`).textContent = msg; hasError = true; };

    if (!name) setErr("name", "Full name is required.");
    if (!/^\S+@\S+\.\S+$/.test(email)) setErr("email", "Enter a valid email address.");
    if (phone && !/^\d{7,15}$/.test(phone.replace(/\s/g, ""))) setErr("phone", "Enter a valid phone number.");
    if (password.length < 6) setErr("password", "Password must be at least 6 characters.");
    if (confirm !== password) setErr("confirm", "Passwords do not match.");
    if (hasError) return;

    if (state.users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
      document.getElementById("regFormError").innerHTML = `<div class="error-banner">⚠️ An account with this email already exists.</div>`;
      return;
    }

    const newUser = { id: "u_" + Date.now(), name, email, phone, password };
    state.users.push(newUser);
    state.currentUser = newUser;
    showToast("Account created — welcome to RoadGuard!");
    navigate("/complaints");
  });
}

/* =========================================================
   DEMO MAP builder (shared by Report + Map pages)
   opts: { issues, pickedLocation, onMapClick, mapStyle, showLegend, showStyleSwitch, userLocation }
   Returns { html, mount(container) }
   ========================================================= */
function buildDemoMap(opts) {
  const {
    issues = [], pickedLocation = null, onMapClick = null,
    mapStyle = "satellite", showLegend = false, userLocation = null, height = "100%",
  } = opts;

  const pins = issues.map((issue) => {
    const { xPct, yPct } = latLngToPercent(issue.lat, issue.lng);
    const color = ISSUE_COLORS[issue.type] || "#2F6FED";
    return `<div class="map-pin" title="${escapeHtml(issue.roadName)}" style="left:${xPct}%; top:${yPct}%; background:${color};" data-issue="${issue.id}"></div>`;
  }).join("");

  let pickedPin = "";
  if (pickedLocation) {
    const { xPct, yPct } = latLngToPercent(pickedLocation.lat, pickedLocation.lng);
    pickedPin = `<div class="map-pin picked" style="left:${xPct}%; top:${yPct}%;"></div>`;
  }
  let userPin = "";
  if (userLocation) {
    const { xPct, yPct } = latLngToPercent(userLocation.lat, userLocation.lng);
    userPin = `<div class="map-pin user-loc" style="left:${xPct}%; top:${yPct}%;" title="You are here"></div>`;
  }

  const legend = showLegend ? `
    <div class="map-legend">
      <div class="row"><span class="dot" style="background:#E13B3B;"></span>Pothole</div>
      <div class="row"><span class="dot" style="background:#F2A93B;"></span>Accident</div>
      <div class="row"><span class="dot" style="background:#EAB308;"></span>Construction</div>
      <div class="row"><span class="dot" style="background:#8B5CF6;"></span>Hazard</div>
      <div class="row"><span class="dot" style="background:#17B890;"></span>Resolved</div>
    </div>` : "";

  const html = `
    <div class="demo-map ${mapStyle === "roadmap" ? "roadmap" : ""}" id="demoMap" style="height:${height};">
      <div class="map-grid-lines"></div>
      <div class="demo-map-badge">🗺️ Demo map — no API key needed</div>
      ${pins}${pickedPin}${userPin}
      ${legend}
    </div>
  `;

  function mount() {
    const el = document.getElementById("demoMap");
    if (!el) return;
    if (onMapClick) {
      el.addEventListener("click", (e) => {
        if (e.target.closest(".map-pin")) return;
        const rect = el.getBoundingClientRect();
        const xPct = ((e.clientX - rect.left) / rect.width) * 100;
        const yPct = ((e.clientY - rect.top) / rect.height) * 100;
        onMapClick(percentToLatLng(xPct, yPct));
      });
    }
  }

  return { html, mount };
}

/* =========================================================
   REPORT ISSUE PAGE
   ========================================================= */
function renderReport() {
  if (!requireAuth()) return;

  const formState = { issueType: "Pothole", severity: "Medium", description: "", address: "", pickedLocation: null, image: null };

  function paint() {
    const map = buildDemoMap({
      issues: [],
      pickedLocation: formState.pickedLocation,
      mapStyle: "roadmap",
      onMapClick: (loc) => { formState.pickedLocation = loc; paint(); },
    });

    app(`
      <div class="container-sm" style="padding-top:24px; padding-bottom:60px;">
        <div id="reportErr"></div>
        <div class="card" style="padding:24px; margin-bottom:16px;">
          <label class="label">Issue Type</label>
          <div class="chip-grid" id="issueTypeGrid">
            ${ISSUE_TYPES.map((t) => `<button type="button" class="chip ${formState.issueType === t ? "active" : ""}" data-type="${t}">${t}</button>`).join("")}
          </div>
        </div>

        <div class="card" style="padding:24px; margin-bottom:16px;">
          <label class="label">Photograph</label>
          ${formState.image
            ? `<div class="upload-preview"><img src="${formState.image}" /><button class="upload-remove" id="removeImg">✕</button></div>`
            : `<div class="upload-box" id="uploadBox">📷 Click to upload a photo (optional)<input type="file" accept="image/*" id="imgInput" style="display:none;"></div>`
          }
        </div>

        <div class="card" style="padding:24px; margin-bottom:16px;">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
            <label class="label" style="margin:0;">Location</label>
            <button type="button" class="btn-secondary btn-sm" id="useLocBtn">📍 Use current location</button>
          </div>
          <div style="height:220px; margin-bottom:10px;">${map.html}</div>
          <input class="input" id="addressInput" placeholder="Address or landmark (optional)" value="${escapeHtml(formState.address)}" />
          ${formState.pickedLocation ? `<p class="muted mono" style="font-size:.75rem; margin-top:8px;">📍 ${formState.pickedLocation.lat.toFixed(5)}, ${formState.pickedLocation.lng.toFixed(5)}</p>` : ""}
          <div class="error-text" id="err-location"></div>
        </div>

        <div class="card" style="padding:24px; margin-bottom:16px;">
          <label class="label">Additional Information</label>
          <textarea class="input" rows="4" id="descInput" placeholder="Describe the issue…">${escapeHtml(formState.description)}</textarea>
        </div>

        <div class="card" style="padding:24px; margin-bottom:20px;">
          <label class="label">Severity</label>
          <div class="sev-row">
            ${SEVERITIES.map((s) => `<button type="button" class="chip sev-${s} ${formState.severity === s ? "active" : ""}" data-sev="${s}">${s}</button>`).join("")}
          </div>
        </div>

        <button class="btn-primary btn-block" id="submitReportBtn">Submit Complaint</button>
      </div>
    `);

    map.mount();

    document.querySelectorAll("#issueTypeGrid .chip").forEach((btn) => {
      btn.onclick = () => { formState.issueType = btn.dataset.type; paint(); };
    });
    document.querySelectorAll(".sev-row .chip").forEach((btn) => {
      btn.onclick = () => { formState.severity = btn.dataset.sev; paint(); };
    });
    document.getElementById("addressInput").oninput = (e) => { formState.address = e.target.value; };
    document.getElementById("descInput").oninput = (e) => { formState.description = e.target.value; };

    document.getElementById("useLocBtn").onclick = () => {
      if (!navigator.geolocation) { showToast("Geolocation not supported by this browser", "error"); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          formState.pickedLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          paint();
        },
        () => showToast("Couldn't get your location — pick a spot on the map instead.", "error")
      );
    };

    const uploadBox = document.getElementById("uploadBox");
    if (uploadBox) {
      uploadBox.onclick = () => document.getElementById("imgInput").click();
      document.getElementById("imgInput").onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => { formState.image = reader.result; paint(); };
        reader.readAsDataURL(file);
      };
    }
    const removeImg = document.getElementById("removeImg");
    if (removeImg) removeImg.onclick = () => { formState.image = null; paint(); };

    document.getElementById("submitReportBtn").onclick = () => {
      document.getElementById("err-location").textContent = "";
      document.getElementById("reportErr").innerHTML = "";
      if (!formState.pickedLocation) {
        document.getElementById("err-location").textContent = "Use your current location or click the map to drop a pin.";
        return;
      }
      nextComplaintSeq += 1;
      const complaint = {
        id: "c_" + Date.now(),
        complaintId: `RG-2026-${String(nextComplaintSeq).padStart(5, "0")}`,
        userId: state.currentUser.id,
        issueType: formState.issueType,
        description: formState.description,
        image: formState.image || "",
        lat: formState.pickedLocation.lat,
        lng: formState.pickedLocation.lng,
        address: formState.address || `${formState.pickedLocation.lat.toFixed(4)}, ${formState.pickedLocation.lng.toFixed(4)}`,
        severity: formState.severity,
        status: "Submitted",
        createdAt: new Date(),
      };
      state.complaints.unshift(complaint);
      showToast("Complaint submitted successfully!");
      renderSuccess(complaint);
    };
  }

  function renderSuccess(complaint) {
    app(`
      <div class="success-wrap">
        <div class="success-icon">✅</div>
        <h2>Complaint submitted successfully!</h2>
        <p class="muted">Your complaint ID is <span class="mono" style="color:var(--signal-dark); font-weight:700;">${complaint.complaintId}</span>. You can track its progress anytime from My Complaints.</p>
        <div style="display:flex; justify-content:center; gap:12px; margin-top:16px;">
          <a href="#/complaints" class="btn-primary">Track this complaint</a>
          <button class="btn-secondary" id="reportAnotherBtn">Report another</button>
        </div>
      </div>
    `);
    document.getElementById("reportAnotherBtn").onclick = renderReport;
  }

  paint();
}

/* =========================================================
   MY COMPLAINTS PAGE
   ========================================================= */
function renderComplaints() {
  if (!requireAuth()) return;

  const mine = state.complaints.filter((c) => c.userId === state.currentUser.id);

  if (mine.length === 0) {
    app(`
      <div class="container-sm empty-state">
        <div class="empty-icon">📋</div>
        <h3>No complaints yet</h3>
        <p>Reports you submit will appear here so you can track their progress.</p>
        <a href="#/report" class="btn-primary">Report an issue</a>
      </div>
    `);
    return;
  }

  app(`
    <div class="container-sm" style="padding-top:24px; padding-bottom:50px;">
      <h1 style="font-size:1.3rem;">My complaints</h1>
      ${mine.map((c) => `
        <div class="card complaint-item">
          <div class="complaint-head">
            <div style="display:flex; gap:14px;">
              ${c.image
                ? `<img class="complaint-thumb" src="${c.image}" />`
                : `<div class="complaint-thumb">📍</div>`}
              <div>
                <div class="complaint-id">${c.complaintId}</div>
                <h3 style="margin:2px 0;">${escapeHtml(c.issueType)}</h3>
                <p class="muted" style="font-size:.85rem; margin:0;">${escapeHtml(c.address)}</p>
                <p class="muted" style="font-size:.75rem; margin:4px 0 0;">Reported ${formatDate(c.createdAt)}</p>
              </div>
            </div>
            <span class="badge badge-${c.severity}">${c.severity} severity</span>
          </div>
          ${c.description ? `<div class="complaint-desc">${escapeHtml(c.description)}</div>` : ""}
          ${renderTimeline(c.status)}
        </div>
      `).join("")}
    </div>
  `);
}

function renderTimeline(status) {
  const idx = TIMELINE_STEPS.indexOf(status);
  return `
    <div class="timeline">
      ${TIMELINE_STEPS.map((step, i) => {
        const done = i < idx;
        const current = i === idx;
        return `
          <div class="timeline-step">
            <div class="tl-col">
              <div class="tl-circle ${done ? "done" : ""} ${current ? "current" : ""}">${done ? "✓" : i + 1}</div>
              <div class="tl-label ${current ? "current" : ""}">${step}</div>
            </div>
            ${i < TIMELINE_STEPS.length - 1 ? `<div class="tl-line ${done ? "done" : ""}"></div>` : ""}
          </div>`;
      }).join("")}
    </div>
  `;
}

/* =========================================================
   MAP PAGE
   ========================================================= */
function renderMap() {
  const mapState = { query: "", selected: null, mapStyle: "satellite", userLocation: null };

  function paint() {
    const filtered = mapState.query.trim()
      ? state.roadIssues.filter((i) => i.roadName.toLowerCase().includes(mapState.query.toLowerCase()))
      : state.roadIssues;

    const map = buildDemoMap({
      issues: filtered,
      mapStyle: mapState.mapStyle,
      showLegend: true,
      userLocation: mapState.userLocation,
      height: "calc(100vh - 200px)",
    });

    app(`
      <div style="position:relative;">
        ${map.html}
        <div class="map-search">
          <input id="mapSearchInput" placeholder="Search roads, places, landmarks…" value="${escapeHtml(mapState.query)}" />
        </div>
        <button class="map-locate-btn" id="locateBtn" title="Locate me">📍</button>
        ${mapState.selected ? `
          <div class="card issue-card-float" style="padding:16px;">
            <div style="display:flex; justify-content:space-between; gap:8px;">
              <div>
                <h3 style="margin:0 0 4px; font-size:.95rem;">${escapeHtml(mapState.selected.roadName)}</h3>
                <p class="muted" style="font-size:.78rem; margin:0;">${mapState.selected.type} · ${mapState.selected.reportCount} reports</p>
              </div>
              <button id="closeIssueCard" style="background:none;border:none;cursor:pointer;font-size:1rem;">✕</button>
            </div>
            <span class="badge badge-${mapState.selected.severity}" style="margin-top:8px; display:inline-block;">${mapState.selected.severity} severity</span>
            <p class="muted" style="font-size:.75rem; margin-top:8px;">Status: ${mapState.selected.status}</p>
          </div>
        ` : ""}
      </div>
    `);

    map.mount();

    document.querySelectorAll(".map-pin[data-issue]").forEach((pin) => {
      pin.onclick = (e) => {
        e.stopPropagation();
        mapState.selected = state.roadIssues.find((i) => i.id === pin.dataset.issue);
        paint();
      };
    });
    const closeBtn = document.getElementById("closeIssueCard");
    if (closeBtn) closeBtn.onclick = () => { mapState.selected = null; paint(); };

    document.getElementById("mapSearchInput").oninput = (e) => {
      mapState.query = e.target.value;
      paint();
      document.getElementById("mapSearchInput").focus();
      const v = document.getElementById("mapSearchInput");
      v.selectionStart = v.selectionEnd = v.value.length;
    };

    document.getElementById("locateBtn").onclick = () => {
      if (!navigator.geolocation) { showToast("Geolocation not supported", "error"); return; }
      navigator.geolocation.getCurrentPosition(
        (pos) => { mapState.userLocation = { lat: pos.coords.latitude, lng: pos.coords.longitude }; paint(); showToast("Location found"); },
        () => showToast("Couldn't access your location", "error")
      );
    };
  }

  paint();
}

/* ---------- Init ---------- */
router();
