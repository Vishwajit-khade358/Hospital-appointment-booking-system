/* ── API ── */
const API = '/api';
const api = {
  async req(method, url, body) {
    const res = await fetch(API + url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) { const e = await res.json(); throw new Error(e.error || 'Request failed'); }
    return res.json();
  },
  getPatients:      ()         => api.req('GET',    '/patients'),
  createPatient:    (d)        => api.req('POST',   '/patients', d),
  updatePatient:    (id, d)    => api.req('PUT',    '/patients/' + id, d),
  deletePatient:    (id)       => api.req('DELETE', '/patients/' + id),
  loginPatient:     (u, p)     => api.req('POST',   '/patients/login', { username: u, password: p }),
  getDoctors:       ()         => api.req('GET',    '/doctors'),
  getAppointments:  ()         => api.req('GET',    '/appointments'),
  createAppointment:(d)        => api.req('POST',   '/appointments', d),
  updateAppointment:(id, d)    => api.req('PUT',    '/appointments/' + id, d),
};

/* ── Auth State ── */
const Auth = {
  state: JSON.parse(localStorage.getItem('hospital_auth') || '{"isLoggedIn":false,"role":null,"patientId":null,"patient":null}'),
  save() { localStorage.setItem('hospital_auth', JSON.stringify(this.state)); },
  async loginPatient(username, password) {
    try {
      const p = await api.loginPatient(username, password);
      this.state = { isLoggedIn: true, role: 'patient', patientId: p._id || p.id, patient: { ...p, id: p._id || p.id } };
      this.save(); return true;
    } catch { return false; }
  },
  loginAuthority(username, password) {
    if (username === 'admin' && password === 'h@2026') {
      this.state = { isLoggedIn: true, role: 'authority', patientId: null, patient: null };
      this.save(); return true;
    }
    return false;
  },
  logout() {
    this.state = { isLoggedIn: false, role: null, patientId: null, patient: null };
    localStorage.removeItem('hospital_auth');
  },
  async refreshPatient() {
    if (!this.state.patientId) return;
    try {
      const patients = await api.getPatients();
      const p = patients.find(x => (x._id || x.id) === this.state.patientId);
      if (p) { this.state.patient = { ...p, id: p._id || p.id }; this.save(); }
    } catch {}
  }
};

/* ── Toast ── */
function toast(title, desc = '', type = 'success') {
  const el = document.createElement('div');
  el.className = 'toast ' + type;
  el.innerHTML = `<div class="toast-title">${title}</div>${desc ? `<div class="toast-desc">${desc}</div>` : ''}`;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 3500);
}

/* ── Clock ── */
function clockHTML() {
  const now = new Date();
  const date = now.toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
  const time = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return `<span class="clock"><span>🕐</span><span>${date}</span><span class="clock-time">${time}</span></span>`;
}
function startClock(selector) {
  const el = document.querySelector(selector);
  if (!el) return;
  el.innerHTML = clockHTML();
  const t = setInterval(() => {
    const e = document.querySelector(selector);
    if (!e) { clearInterval(t); return; }
    e.innerHTML = clockHTML();
  }, 1000);
}

/* ── Router ── */
const routes = {};
function route(path, fn) { routes[path] = fn; }
function navigate(path) {
  history.pushState({}, '', path);
  render(path);
}
function render(path) {
  const fn = routes[path] || routes['/'];
  fn();
}
window.addEventListener('popstate', () => render(location.pathname));

/* ── Helpers ── */
function badge(status) {
  return `<span class="badge badge-${status}">${status}</span>`;
}
function spinner() {
  return `<div class="spinner-wrap"><div class="spinner"></div><p class="text-muted">Loading...</p></div>`;
}
/* ── 12-hour time formatter ── */
function to12h(t) {
  if (!t) return t;
  const [h, m] = t.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12  = h % 12 || 12;
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
}

function normalizeAppt(a) {
  return {
    ...a,
    id: a._id || a.id,
    patientId: a.patientId?._id || a.patientId,
    doctorId:  a.doctorId?._id  || a.doctorId,
  };
}

/* ══════════════════════════════════════════
   HOME PAGE
══════════════════════════════════════════ */
route('/', renderHome);
route('/index.html', renderHome);

function renderHome() {
  const { isLoggedIn, role, patient } = Auth.state;
  let actionCards = '';

  if (isLoggedIn && role === 'patient') {
    actionCards = `<div class="action-grid cols-3">
      ${actionCard('📅', 'Book Appointment', 'Schedule consultation with doctors', '/appointment')}
      ${actionCard('👤', 'My Profile', 'View your profile and appointments', '/profile')}
      ${actionCard('💳', 'My Card', 'See your patient card details', '/my-card')}
    </div>`;
  } else if (isLoggedIn && role === 'authority') {
    actionCards = `<div class="action-grid cols-2">
      ${actionCard('📋', 'Dashboard', 'View all patients and appointments', '/authority-dashboard')}
      ${actionCard('📅', 'Appointments', "Review today's appointments", '/manage-appointments')}
    </div>`;
  } else {
    actionCards = `<div class="action-grid cols-2">
      ${actionCard('📅', 'Go for an Appointment', 'Login or register to book your appointment', '#', 'showAuth()')}
      ${actionCard('🏥', 'About Our Hospital', 'Learn about our facilities and specialists', '#', 'scrollAbout()')}
    </div>`;
  }

  const navRight = isLoggedIn
    ? `<span class="nav-user">${role === 'authority' ? '🛡 Authority' : '👤 ' + (patient?.firstName || 'Patient')}</span>
       <button class="btn btn-outline btn-sm" onclick="doLogout()">🚪 Logout</button>`
    : `<button class="btn btn-primary btn-sm" onclick="showAuth()">Login / Register</button>`;

  document.getElementById('app').innerHTML = `
    <div class="page">
      <nav class="navbar">
        <div class="navbar-inner">
          <div class="brand">
            <div class="brand-icon">💊</div>
            <div>
              <div class="brand-name">CareWell Hospital</div>
              <div class="brand-sub">Your Health, Our Priority</div>
            </div>
          </div>
          <div class="nav-right">
            <div id="nav-clock"></div>
            ${navRight}
          </div>
        </div>
      </nav>

      <section class="hero">
        <h2>Compassionate Care,<br>Modern Medicine</h2>
        <p>Advanced hospital bed management system ensuring every patient gets timely, quality healthcare with seamless coordination between doctors and staff.</p>
        <div class="hero-fade"></div>
      </section>

      <section class="actions" style="padding-top:1rem">
        ${actionCards}
      </section>

      <section class="about-section" id="about">
        <h2>About Our Hospital</h2>
        <div class="about-grid">
          <div class="about-card"><div class="icon">🏥</div><h3>50+ Beds</h3><p>Fully equipped rooms with modern medical infrastructure</p></div>
          <div class="about-card"><div class="icon">👨‍⚕️</div><h3>15+ Doctors</h3><p>Experienced specialists across multiple departments</p></div>
          <div class="about-card"><div class="icon">🚑</div><h3>24/7 Emergency</h3><p>Round-the-clock emergency services and ICU care</p></div>
        </div>
      </section>

      <footer>© 2024 CareWell Hospital. All rights reserved. | Emergency: +91 9876543210</footer>
    </div>
    <div id="modal-root"></div>
  `;
  startClock('#nav-clock');
}

function actionCard(icon, title, desc, href, onclick) {
  const handler = onclick ? `onclick="${onclick}; return false;"` : `onclick="navigate('${href}'); return false;"`;
  return `<button class="action-card" ${handler}>
    <div class="action-icon">${icon}</div>
    <div><div class="action-title">${title}</div><div class="action-desc">${desc}</div></div>
  </button>`;
}

function doLogout() { Auth.logout(); navigate('/'); }
function scrollAbout() { document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' }); }

/* ══════════════════════════════════════════
   AUTH MODAL
══════════════════════════════════════════ */
function showAuth() {
  renderModal('choose');
}

function renderModal(step) {
  let content = '';

  if (step === 'choose') {
    content = `
      <div style="text-align:center;margin-bottom:1.5rem">
        <h2 style="font-size:1.5rem">Welcome</h2>
        <p class="text-muted text-sm mt-1">How would you like to begin?</p>
      </div>
      <div class="role-grid">
        <button class="role-card" onclick="renderModal('patient-login')">
          <span class="role-icon">👤</span>
          <span class="role-name">Patient</span>
          <span class="role-desc">Book appointments &amp; view records</span>
        </button>
        <button class="role-card" onclick="renderModal('authority-login')">
          <span class="role-icon">🛡️</span>
          <span class="role-name">Authority</span>
          <span class="role-desc">Manage hospital appointments</span>
        </button>
      </div>`;
  }

  if (step === 'patient-login') {
    content = `
      <button class="back-link mb-4" onclick="renderModal('choose')">← Back</button>
      <h2 style="font-size:1.5rem;margin-bottom:0.25rem">Patient Login</h2>
      <p class="text-muted text-sm mb-4">Enter your credentials or register</p>
      <div class="form-group"><label>Username</label><input id="m-username" placeholder="Enter username" /></div>
      <div class="form-group"><label>Password</label><input id="m-password" type="password" placeholder="Enter password" /></div>
      <button class="btn btn-primary btn-full mt-2" onclick="doPatientLogin()">Login</button>
      <p class="text-muted text-sm mt-4" style="text-align:center">
        New patient? <button class="back-link" onclick="renderModal('patient-register')">Register here</button>
      </p>`;
  }

  if (step === 'patient-register') {
    content = `
      <button class="back-link mb-4" onclick="renderModal('patient-login')">← Back</button>
      <h2 style="font-size:1.5rem;margin-bottom:0.25rem">Patient Registration</h2>
      <p class="text-muted text-sm mb-4">Fill in your details to register</p>
      <div class="form-row-3">
        <div class="form-group"><label>First Name *</label><input id="r-first" placeholder="First" /></div>
        <div class="form-group"><label>Middle Name</label><input id="r-middle" placeholder="Middle" /></div>
        <div class="form-group"><label>Last Name *</label><input id="r-last" placeholder="Last" /></div>
      </div>
      <div class="form-group"><label>Village/City/Address *</label><input id="r-address" placeholder="Your address" /></div>
      <div class="form-row">
        <div class="form-group"><label>Mobile Number *</label><input id="r-mobile" placeholder="+91 XXXXXXXXXX" /></div>
        <div class="form-group"><label>Email Address *</label><input id="r-email" type="email" placeholder="email@example.com" /></div>
      </div>
      <div class="form-group"><label>Username *</label><input id="r-username" placeholder="Choose a username" /></div>
      <div class="form-group"><label>Password *</label><input id="r-password" type="password" placeholder="Choose a password" /></div>
      <button class="btn btn-primary btn-full mt-2" onclick="doRegister()">Register</button>`;
  }

  if (step === 'authority-login') {
    content = `
      <button class="back-link mb-4" onclick="renderModal('choose')">← Back</button>
      <h2 style="font-size:1.5rem;margin-bottom:0.25rem">Authority Login</h2>
      <p class="text-muted text-sm mb-4">Access with hospital credentials</p>
      <div class="form-group"><label>Username</label><input id="m-username" placeholder="Admin username" /></div>
      <div class="form-group"><label>Password</label><input id="m-password" type="password" placeholder="Admin password" /></div>
      <button class="btn btn-primary btn-full mt-2" onclick="doAuthorityLogin()">Login as Authority</button>
      <div class="note-box mt-4"><strong>Note:</strong> Authority access is restricted to hospital staff with predefined credentials.</div>`;
  }

  document.getElementById('modal-root').innerHTML = `
    <div class="modal-overlay">
      <div class="modal-backdrop" onclick="closeModal()"></div>
      <div class="modal-box">
        <button class="modal-close" onclick="closeModal()">✕</button>
        ${content}
      </div>
    </div>`;
}

function closeModal() {
  const r = document.getElementById('modal-root');
  if (r) r.innerHTML = '';
}

async function doPatientLogin() {
  const u = document.getElementById('m-username').value.trim();
  const p = document.getElementById('m-password').value;
  if (!u || !p) { toast('Missing fields', 'Enter username and password', 'error'); return; }
  const ok = await Auth.loginPatient(u, p);
  if (ok) { toast('Welcome back!', 'Logged in successfully.'); closeModal(); renderHome(); }
  else toast('Login Failed', 'Invalid username or password.', 'error');
}

function doAuthorityLogin() {
  const u = document.getElementById('m-username').value.trim();
  const p = document.getElementById('m-password').value;
  if (Auth.loginAuthority(u, p)) {
    toast('Authority Access', 'Logged in as hospital authority.');
    closeModal(); renderHome();
  } else toast('Access Denied', 'Invalid credentials.', 'error');
}

async function doRegister() {
  const first   = document.getElementById('r-first').value.trim();
  const middle  = document.getElementById('r-middle').value.trim();
  const last    = document.getElementById('r-last').value.trim();
  const address = document.getElementById('r-address').value.trim();
  const mobile  = document.getElementById('r-mobile').value.trim();
  const email   = document.getElementById('r-email').value.trim();
  const username= document.getElementById('r-username').value.trim();
  const password= document.getElementById('r-password').value;
  if (!first || !last || !mobile || !email || !username || !password) {
    toast('Missing fields', 'Please fill all required fields.', 'error'); return;
  }
  try {
    await api.createPatient({ firstName: first, middleName: middle, lastName: last, address, mobile, email, username, password, registeredAt: new Date().toISOString() });
    toast('Registration Successful!', 'Logging you in...');
    const ok = await Auth.loginPatient(username, password);
    if (ok) { closeModal(); renderHome(); }
  } catch (e) { toast('Registration Failed', e.message, 'error'); }
}

/* ══════════════════════════════════════════
   APPOINTMENT PAGE
══════════════════════════════════════════ */
route('/appointment', renderAppointment);

// Slot rules:
// Morning  : 10:00 – 14:00  (max 15 patients per doctor)
// Afternoon: 15:00 – 17:00  (max 15 patients per doctor)
// 14:00 – 15:00 = lunch break (no slots)
function getSlotTime(slot, count) {
  // count = number of patients already booked in that slot for that doctor today
  if (slot === 'morning') {
    const mins = 10 * 60 + count * 8; // start 10:00, every 8 min
    return `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;
  } else {
    const mins = 15 * 60 + count * 8; // start 15:00, every 8 min
    return `${String(Math.floor(mins/60)).padStart(2,'0')}:${String(mins%60).padStart(2,'0')}`;
  }
}

async function renderAppointment() {
  if (!Auth.state.isLoggedIn || Auth.state.role !== 'patient') { navigate('/'); return; }
  document.getElementById('app').innerHTML = `
    <div class="page">
      <nav class="sub-nav"><div class="sub-nav-inner">
        <button class="back-link" onclick="navigate('/')">← Back to Home</button>
        <div id="nav-clock"></div>
      </div></nav>
      <div class="page-inner">${spinner()}</div>
    </div>`;
  startClock('#nav-clock');

  const patient = Auth.state.patient;
  let allAppts = [], doctors = [], myAppts = [];
  try {
    [allAppts, doctors] = await Promise.all([api.getAppointments(), api.getDoctors()]);
    allAppts = allAppts.map(normalizeAppt);
    doctors  = doctors.map(d => ({ ...d, id: d._id || d.id }));
    myAppts  = allAppts.filter(a => a.patientId === patient.id);
    window._allAppts = allAppts;
    window._doctors  = doctors;
  } catch (e) { toast('Error', e.message, 'error'); }

  renderAppointmentForm(patient, myAppts);
}

function renderAppointmentForm(patient, myAppts) {
  const doctors = window._doctors || [];
  const today   = new Date().toISOString().split('T')[0];

  const doctorOptions = doctors.map(d =>
    `<div class="doctor-card" id="dcard-${d.id}" onclick="selectDoctor('${d.id}')">
      <div class="doctor-card-name">🩺 ${d.name}</div>
      <div class="doctor-card-spec">${d.specialization}</div>
      <div class="doctor-card-qual">${d.qualification || ''}</div>
    </div>`
  ).join('');

  const pastList = myAppts.length ? `
    <div class="mt-6">
      <h3 style="font-family:'Playfair Display',serif;font-size:1.1rem;font-weight:700;margin-bottom:0.75rem">Your Appointments</h3>
      ${myAppts.map(a => {
        const dr = doctors.find(d => d.id === a.doctorId);
        return `<div style="display:flex;align-items:center;justify-content:space-between;background:var(--card);border:1px solid var(--border);border-radius:var(--radius);padding:0.75rem 1rem;margin-bottom:0.5rem;font-size:0.875rem">
          <span><strong>${dr?.name || 'Doctor'}</strong> · ${a.date} at <span style="color:var(--primary);font-weight:600">${to12h(a.time)}</span></span>
          ${badge(a.status)}
        </div>`;
      }).join('')}
    </div>` : '';

  document.querySelector('.page-inner').innerHTML = `
    <div class="card">
      <div class="card-body">
        <h2 style="font-size:1.5rem;margin-bottom:1.5rem">📅 Book Appointment</h2>
        <div class="prefilled-box">
          <div class="prefilled-label">Patient Information (auto-filled)</div>
          <div class="prefilled-grid">
            <span class="lbl">Name:</span><span class="val">${patient.firstName} ${patient.middleName || ''} ${patient.lastName}</span>
            <span class="lbl">Mobile:</span><span class="val">${patient.mobile}</span>
            <span class="lbl">Email:</span><span class="val">${patient.email}</span>
            <span class="lbl">Address:</span><span class="val">${patient.address}</span>
          </div>
        </div>

        <div class="form-group mt-4">
          <label style="font-weight:600;margin-bottom:0.75rem;display:block">Select Doctor</label>
          <div class="doctor-grid">${doctorOptions}</div>
        </div>

        <div class="form-group mt-4" id="slot-section" style="display:none">
          <label style="font-weight:600;margin-bottom:0.75rem;display:block">Select Time Slot</label>
          <div style="display:flex;gap:1rem;flex-wrap:wrap">
            <button class="slot-btn" id="slot-morning" onclick="selectSlot('morning')">🌅 Morning (10:00 AM – 2:00 PM)</button>
            <button class="slot-btn" id="slot-afternoon" onclick="selectSlot('afternoon')">🌇 Afternoon (3:00 PM – 5:00 PM)</button>
          </div>
          <div id="slot-info" class="slot-info-box" style="display:none"></div>
        </div>

        <div class="form-group mt-4">
          <label>Reason for Visit</label>
          <input id="appt-reason" placeholder="Describe your symptoms or reason..." />
        </div>
        <button class="btn btn-primary btn-full mt-2" onclick="confirmAppointment()">Confirm Appointment</button>
      </div>
    </div>
    ${pastList}`;
}

function selectDoctor(doctorId) {
  window._selectedDoctorId = doctorId;
  window._selectedSlot = null;
  document.querySelectorAll('.doctor-card').forEach(el => el.classList.remove('selected'));
  document.getElementById('dcard-' + doctorId)?.classList.add('selected');

  // Calculate slot availability for this doctor today
  const today    = new Date().toISOString().split('T')[0];
  const allAppts = (window._allAppts || []).filter(a => a.doctorId === doctorId && a.date === today && a.status === 'scheduled');
  const morningCount   = allAppts.filter(a => a.slot === 'morning').length;
  const afternoonCount = allAppts.filter(a => a.slot === 'afternoon').length;
  window._morningCount   = morningCount;
  window._afternoonCount = afternoonCount;

  const mBtn = document.getElementById('slot-morning');
  const aBtn = document.getElementById('slot-afternoon');
  mBtn.disabled = morningCount >= 15;
  aBtn.disabled = afternoonCount >= 15;
  mBtn.textContent = morningCount >= 15
    ? '🌅 Morning – Full (15/15)'
    : `🌅 Morning (10:00 AM – 2:00 PM) · ${15 - morningCount} slots left`;
  aBtn.textContent = afternoonCount >= 15
    ? '🌇 Afternoon – Full (15/15)'
    : `🌇 Afternoon (3:00 PM – 5:00 PM) · ${15 - afternoonCount} slots left`;

  document.getElementById('slot-section').style.display = 'block';
  document.getElementById('slot-info').style.display = 'none';
}

function selectSlot(slot) {
  window._selectedSlot = slot;
  document.querySelectorAll('.slot-btn').forEach(b => b.classList.remove('selected'));
  document.getElementById('slot-' + slot)?.classList.add('selected');

  const count = slot === 'morning' ? window._morningCount : window._afternoonCount;
  const time  = getSlotTime(slot, count);
  window._expectedTime = time;

  const infoBox = document.getElementById('slot-info');
  infoBox.style.display = 'block';
  infoBox.innerHTML = `Your appointment time: <strong style="color:var(--primary)">${to12h(time)}</strong>`;
}

async function confirmAppointment() {
  const patient  = Auth.state.patient;
  const doctorId = window._selectedDoctorId;
  const slot     = window._selectedSlot;
  const expTime  = window._expectedTime;

  if (!doctorId) { toast('Select a doctor', 'Please choose a doctor first.', 'error'); return; }
  if (!slot)     { toast('Select a slot', 'Please choose a time slot.', 'error'); return; }

  const doctor = (window._doctors || []).find(d => d.id === doctorId);
  try {
    await api.createAppointment({
      patientId: patient.id,
      doctorId,
      date:      new Date().toISOString().split('T')[0],
      time:      expTime,
      slot,
      status:    'scheduled',
      createdAt: new Date().toISOString(),
    });
    toast('Appointment Booked!', `Scheduled at ${to12h(expTime)} with ${doctor?.name}`);
    document.querySelector('.page-inner').innerHTML = `
      <div class="card">
        <div class="card-body success-screen">
          <div class="success-icon">✅</div>
          <h2 style="font-size:1.75rem">Appointment Confirmed!</h2>
          <p class="text-muted mt-2">Your appointment is scheduled.</p>
          <div class="confirm-box">
            <p><span class="text-muted">Doctor:</span> <strong>${doctor?.name}</strong></p>
            <p><span class="text-muted">Specialization:</span> <strong>${doctor?.specialization}</strong></p>
            <p><span class="text-muted">Time:</span> <strong>${to12h(expTime)}</strong></p>
            <p><span class="text-muted">Slot:</span> <strong style="text-transform:capitalize">${slot}</strong></p>
            <p><span class="text-muted">Date:</span> <strong>${new Date().toLocaleDateString('en-IN')}</strong></p>
          </div>
          <button class="btn btn-outline mt-6" onclick="navigate('/')">Back to Home</button>
        </div>
      </div>`;
  } catch (e) { toast('Error', e.message, 'error'); }
}

/* ══════════════════════════════════════════
   PATIENT PROFILE PAGE
══════════════════════════════════════════ */
route('/profile', renderProfile);

async function renderProfile() {
  if (!Auth.state.isLoggedIn || Auth.state.role !== 'patient') { navigate('/'); return; }
  document.getElementById('app').innerHTML = `
    <div class="page">
      <nav class="sub-nav"><div class="sub-nav-inner">
        <button class="back-link" onclick="navigate('/')">← Back to Home</button>
        <span class="sub-nav-title">My Profile</span>
        <div id="nav-clock"></div>
      </div></nav>
      <div class="page-inner-lg">${spinner()}</div>
    </div>`;
  startClock('#nav-clock');

  const patient = Auth.state.patient;
  let appts = [], doctors = [];
  try {
    [appts, doctors] = await Promise.all([api.getAppointments(), api.getDoctors()]);
    appts   = appts.map(normalizeAppt).filter(a => a.patientId === patient.id);
    doctors = doctors.map(d => ({ ...d, id: d._id || d.id }));
  } catch {}

  const getDrName = id => doctors.find(d => d.id === id)?.name || 'Unknown';

  const apptList = appts.length ? appts.map(a => `
    <div class="list-item" style="padding:1rem">
      <div style="display:flex;align-items:flex-start;justify-content:space-between">
        <div>
          <div style="font-weight:600;margin-bottom:0.4rem">Dr. ${getDrName(a.doctorId)}</div>
          <div style="font-size:0.85rem;color:var(--muted-fg)">📅 ${new Date(a.date).toLocaleDateString('en-IN')} &nbsp; 🕐 ${to12h(a.time)}</div>
        </div>
        ${badge(a.status)}
      </div>
      <div style="font-size:0.75rem;color:var(--muted-fg);margin-top:0.5rem">Booked on: ${new Date(a.createdAt).toLocaleString('en-IN')}</div>
    </div>`).join('')
    : `<div class="empty-state"><p style="margin-bottom:1rem">You haven't booked any appointments yet</p>
       <button class="btn btn-primary" onclick="navigate('/appointment')">Book Your First Appointment</button></div>`;

  document.querySelector('.page-inner-lg').innerHTML = `
    <div class="profile-layout">
      <div class="profile-sidebar">
        <div class="card card-body">
          <div style="text-align:center;margin-bottom:1.5rem">
            <div class="profile-avatar">👤</div>
            <h2 style="font-size:1.5rem">${patient.firstName} ${patient.lastName}</h2>
            ${patient.middleName ? `<p class="text-muted text-sm">${patient.middleName}</p>` : ''}
          </div>
          <div class="info-row"><span class="lbl">Username</span><span class="val">${patient.username}</span></div>
          <div class="info-row"><span class="lbl">📞 Mobile</span><span class="val">${patient.mobile}</span></div>
          <div class="info-row"><span class="lbl">✉️ Email</span><span class="val" style="font-size:0.8rem">${patient.email}</span></div>
          <div class="info-row"><span class="lbl">📍 Address</span><span class="val" style="font-size:0.8rem">${patient.address}</span></div>
          <div class="info-row"><span class="lbl">Registered</span><span class="val" style="font-size:0.8rem">${new Date(patient.registeredAt).toLocaleDateString('en-IN')}</span></div>
          <div style="margin-top:1.5rem;padding-top:1.5rem;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:0.5rem">
            <button class="btn btn-outline btn-full" onclick="navigate('/my-card')">✏️ Edit Profile</button>
            <button class="btn btn-outline btn-full" style="color:var(--destructive)" onclick="doLogout()">🚪 Logout</button>
          </div>
        </div>
      </div>
      <div>
        <div class="card card-body">
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">
            <h3 style="font-size:1.5rem;display:flex;align-items:center;gap:0.5rem">📅 My Appointments</h3>
            <button class="btn btn-primary btn-sm" onclick="navigate('/appointment')">Book Appointment</button>
          </div>
          ${apptList}
        </div>
      </div>
    </div>`;
}

/* ══════════════════════════════════════════
   PATIENT CARD PAGE
══════════════════════════════════════════ */
route('/my-card', renderMyCard);

async function renderMyCard() {
  if (!Auth.state.isLoggedIn || Auth.state.role !== 'patient') { navigate('/'); return; }
  document.getElementById('app').innerHTML = `
    <div class="page">
      <nav class="sub-nav"><div class="sub-nav-inner">
        <button class="back-link" onclick="navigate('/')">← Back to Home</button>
        <div id="nav-clock"></div>
      </div></nav>
      <div class="page-inner-sm">${spinner()}</div>
    </div>`;
  startClock('#nav-clock');

  const patient = Auth.state.patient;
  let appts = [], doctors = [];
  try {
    [appts, doctors] = await Promise.all([api.getAppointments(), api.getDoctors()]);
    appts   = appts.map(normalizeAppt).filter(a => a.patientId === patient.id);
    doctors = doctors.map(d => ({ ...d, id: d._id || d.id }));
  } catch {}

  const getDrName = id => doctors.find(d => d.id === id)?.name || 'Unknown Doctor';
  renderCardView(patient, appts, doctors, getDrName, false);
}

function renderCardView(patient, appts, doctors, getDrName, editing) {
  const apptSummary = appts.slice(0, 3).map(a => `
    <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.75rem;background:var(--muted);border-radius:0.5rem;padding:0.5rem 0.75rem;margin-bottom:0.4rem">
      <span style="font-weight:500">${getDrName(a.doctorId)}</span>
      <span class="text-muted">${a.date} · ${to12h(a.time)}</span>
      ${badge(a.status)}
    </div>`).join('');

  const editFields = editing ? `
    <div class="form-group mt-4"><label>Username</label><input id="edit-username" value="${patient.username}" /></div>
    <div class="form-group"><label>Password</label><input id="edit-password" type="password" placeholder="Leave blank to keep current" /></div>
    <div class="form-group"><label>Mobile</label><input id="edit-mobile" value="${patient.mobile}" /></div>
    <div class="form-group"><label>Email</label><input id="edit-email" value="${patient.email}" /></div>
    <div class="form-group"><label>Address</label><input id="edit-address" value="${patient.address}" /></div>` : '';

  const actions = editing
    ? `<button class="btn btn-primary" onclick="saveCard()">Save</button>
       <button class="btn btn-outline" onclick="renderMyCard()">Cancel</button>`
    : `<button class="btn btn-primary" onclick="window._cardEditing=true;renderCardView(Auth.state.patient,window._cardAppts,window._cardDoctors,window._getDrName,true)">Edit Account</button>
       <button class="btn btn-danger" onclick="deleteAccount()">Delete Account</button>`;

  window._cardAppts   = appts;
  window._cardDoctors = doctors;
  window._getDrName   = getDrName;

  document.querySelector('.page-inner-sm').innerHTML = `
    <div class="card" style="overflow:hidden;box-shadow:var(--shadow-elev)">
      <div class="card-header-hero">
        <div class="avatar-circle">👤</div>
        <h2>${patient.firstName} ${patient.middleName || ''} ${patient.lastName}</h2>
        <p>Patient ID: ${patient.id.toString().toUpperCase().slice(-8)}</p>
      </div>
      <div class="card-body">
        <div class="info-row"><span class="lbl">Mobile</span><span class="val">${patient.mobile}</span></div>
        <div class="info-row"><span class="lbl">Email</span><span class="val" style="font-size:0.8rem">${patient.email}</span></div>
        <div class="info-row"><span class="lbl">Address</span><span class="val" style="font-size:0.8rem">${patient.address}</span></div>
        <div class="info-row"><span class="lbl">Registered</span><span class="val">${new Date(patient.registeredAt).toLocaleDateString('en-IN')}</span></div>
        ${!editing ? `<div class="info-row"><span class="lbl">Username</span><span class="val">${patient.username}</span></div>` : ''}
        ${editFields}
        <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border)">
          <div style="font-size:0.85rem;color:var(--muted-fg);margin-bottom:0.5rem">📅 Appointments: <strong style="color:var(--fg)">${appts.length}</strong></div>
          ${apptSummary}
        </div>
      </div>
      <div style="padding:0 1.5rem 1.5rem;display:flex;justify-content:space-between;gap:1rem">
        ${actions}
      </div>
    </div>`;
}

async function saveCard() {
  const patient = Auth.state.patient;
  const updates = {};
  const u = document.getElementById('edit-username')?.value.trim();
  const p = document.getElementById('edit-password')?.value;
  const m = document.getElementById('edit-mobile')?.value.trim();
  const e = document.getElementById('edit-email')?.value.trim();
  const a = document.getElementById('edit-address')?.value.trim();
  if (u && u !== patient.username) updates.username = u;
  if (p) updates.password = p;
  if (m && m !== patient.mobile) updates.mobile = m;
  if (e && e !== patient.email) updates.email = e;
  if (a && a !== patient.address) updates.address = a;
  try {
    await api.updatePatient(patient.id, updates);
    await Auth.refreshPatient();
    toast('Saved!', 'Your account has been updated.');
    renderMyCard();
  } catch (err) { toast('Error', err.message, 'error'); }
}

async function deleteAccount() {
  if (!confirm('Delete your account? This cannot be undone.')) return;
  try {
    await api.deletePatient(Auth.state.patient.id);
    Auth.logout();
    toast('Account deleted.');
    navigate('/');
  } catch (e) { toast('Error', e.message, 'error'); }
}

/* ══════════════════════════════════════════
   AUTHORITY DASHBOARD
══════════════════════════════════════════ */
route('/authority-dashboard', renderDashboard);

async function renderDashboard() {
  if (!Auth.state.isLoggedIn || Auth.state.role !== 'authority') { navigate('/'); return; }
  document.getElementById('app').innerHTML = `
    <div class="page">
      <nav class="sub-nav"><div class="sub-nav-inner">
        <button class="back-link" onclick="navigate('/')">← Back to Home</button>
        <span class="sub-nav-title">Authority Dashboard</span>
        <div id="nav-clock"></div>
      </div></nav>
      <div class="page-inner-lg">${spinner()}</div>
    </div>`;
  startClock('#nav-clock');

  let appts = [], doctors = [], patients = [];
  try {
    // Clean up any orphan appointments first
    await api.req('DELETE', '/appointments/cleanup');
    [appts, doctors, patients] = await Promise.all([api.getAppointments(), api.getDoctors(), api.getPatients()]);
    appts    = appts.map(normalizeAppt);
    doctors  = doctors.map(d => ({ ...d, id: d._id || d.id }));
    patients = patients.map(p => ({ ...p, id: p._id || p.id }));
  } catch (e) { toast('Error', e.message, 'error'); }

  window._dashData = { appts, doctors, patients, search: '', tab: 'all' };
  renderDashboardContent();
}

function renderDashboardContent() {
  const { appts, doctors, patients, search, tab } = window._dashData;

  // Only count appointments that belong to known patients (filters ghost/stale records)
  const validAppts = appts.filter(a => patients.some(p => p.id === a.patientId));

  const stats = {
    total:     validAppts.length,
    upcoming:  validAppts.filter(a => a.status === 'scheduled').length,
    completed: validAppts.filter(a => a.status === 'completed').length,
    cancelled: validAppts.filter(a => a.status === 'cancelled').length,
  };

  // Filter by search
  function filterBySearch(list) {
    if (!search) return list;
    return list.filter(a => {
      const p = patients.find(x => x.id === a.patientId);
      return p && (
        p.firstName.toLowerCase().includes(search.toLowerCase()) ||
        p.lastName.toLowerCase().includes(search.toLowerCase()) ||
        p.mobile.includes(search)
      );
    });
  }

  // Build an appointment card row
  function apptRow(apt, showComplete = false) {
    const p = patients.find(x => x.id === apt.patientId);
    const d = doctors.find(x => x.id === apt.doctorId);
    if (!p) return '';
    return `<div class="list-item">
      <div class="list-item-grid">
        <div>
          <div style="font-weight:700;margin-bottom:0.5rem">${p.firstName} ${p.lastName}</div>
          <div class="text-sm"><span class="text-muted">📞</span> ${p.mobile}</div>
          <div class="text-sm mt-1"><span class="text-muted">✉️</span> <span style="font-size:0.8rem">${p.email}</span></div>
          <div class="text-sm mt-1"><span class="text-muted">📍</span> <span style="font-size:0.8rem">${p.address}</span></div>
        </div>
        <div>
          <div class="text-sm"><span class="text-muted">🩺 Doctor:</span> <strong>${d?.name || 'Unknown'}</strong></div>
          <div class="text-sm mt-1"><span class="text-muted">📅 Date:</span> <strong>${new Date(apt.date).toLocaleDateString('en-IN')}</strong></div>
          <div class="text-sm mt-1"><span class="text-muted">🕐 Time:</span> <strong>${to12h(apt.time)}</strong></div>
          <div class="text-sm mt-1"><span class="text-muted">Slot:</span> <strong style="text-transform:capitalize">${apt.slot || '-'}</strong></div>
          <div style="margin-top:0.5rem">${badge(apt.status)}</div>
          ${showComplete && apt.status === 'scheduled' ? `<button class="btn btn-green btn-xs mt-2" onclick="markComplete('${apt.id}')">Mark Complete</button>` : ''}
        </div>
      </div>
    </div>`;
  }

  // ── Tab: All Appointments (doctor card grid) ──
  function buildAllTab() {
    const searched = filterBySearch(validAppts);
    const cards = doctors.map(doctor => {
      const doctorAppts = searched.filter(a => a.doctorId === doctor.id);
      const upcoming  = doctorAppts.filter(a => a.status === 'scheduled').length;
      const completed = doctorAppts.filter(a => a.status === 'completed').length;
      const imgSrc = `images/doctors/${doctor.name.replace(/[^a-zA-Z]/g,'_').toLowerCase()}.jpg`;
      return `<div class="dr-card" onclick="openDoctorDrawer('${doctor.id}')">
        <div class="dr-card-img-wrap">
          <img src="${imgSrc}" alt="${doctor.name}" class="dr-card-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
          <div class="dr-card-img-fallback" style="display:none">🩺</div>
        </div>
        <div class="dr-card-body">
          <div class="dr-card-name">${doctor.name}</div>
          <div class="dr-card-spec">${doctor.specialization}</div>
          <div class="dr-card-qual">${doctor.qualification || ''}</div>
          <div class="dr-card-stats">
            <span class="dr-stat upcoming">${upcoming} upcoming</span>
            <span class="dr-stat completed">${completed} done</span>
          </div>
          <div class="dr-card-total">${doctorAppts.length} total patient${doctorAppts.length !== 1 ? 's' : ''}</div>
        </div>
        <div class="dr-card-arrow">›</div>
      </div>`;
    }).join('');
    return `<div class="dr-card-grid">${cards}</div>`;
  }

  // ── Tab: Upcoming (scheduled only) ──
  function buildUpcomingTab() {
    const list = filterBySearch(validAppts.filter(a => a.status === 'scheduled'))
      .sort((a, b) => a.time.localeCompare(b.time));
    if (!list.length) return '<div class="empty-state">No upcoming appointments.</div>';
    return list.map(a => apptRow(a, true)).join('');
  }

  // ── Tab: Completed ──
  function buildCompletedTab() {
    const list = filterBySearch(validAppts.filter(a => a.status === 'completed'))
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (!list.length) return '<div class="empty-state">No completed appointments yet.</div>';
    return list.map(a => apptRow(a, false)).join('');
  }

  const tabs = [
    { key: 'upcoming',  label: `Upcoming (${stats.upcoming})` },
    { key: 'completed', label: `Completed (${stats.completed})` },
  ];

  const activeTab = (tab === 'all') ? 'upcoming' : tab;
  if (window._dashData.tab === 'all') window._dashData.tab = 'upcoming';

  const tabContent = activeTab === 'upcoming' ? buildUpcomingTab() : buildCompletedTab();

  document.querySelector('.page-inner-lg').innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><div class="stat-label">Total Appointments</div><div class="stat-value">${stats.total}</div></div>
      <div class="stat-card"><div class="stat-label">Upcoming</div><div class="stat-value blue">${stats.upcoming}</div></div>
      <div class="stat-card"><div class="stat-label">Completed</div><div class="stat-value green">${stats.completed}</div></div>
      <div class="stat-card"><div class="stat-label">Cancelled</div><div class="stat-value red">${stats.cancelled}</div></div>
    </div>
    <div class="search-wrap">
      <span class="search-icon">🔍</span>
      <input placeholder="Search patient by name or phone..." value="${search}" oninput="dashSearch(this.value)" />
    </div>
    <div class="tab-list">
      ${tabs.map(t => `<button class="tab-btn ${activeTab === t.key ? 'active' : ''}" onclick="dashTab('${t.key}')">${t.label}</button>`).join('')}
    </div>
    <div class="tab-content">${tabContent}</div>
    <div id="doctor-drawer-root"></div>`;
}

function dashSearch(v) { window._dashData.search = v; renderDashboardContent(); }
function dashTab(t)    { window._dashData.tab = t; renderDashboardContent(); }

function openDoctorDrawer(doctorId) {
  const { appts, doctors, patients } = window._dashData;
  const doctor = doctors.find(d => d.id === doctorId);
  const validAppts = appts.filter(a => patients.some(p => p.id === a.patientId));
  const doctorAppts = validAppts
    .filter(a => a.doctorId === doctorId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const imgSrc = `images/doctors/${doctor.name.replace(/[^a-zA-Z]/g,'_').toLowerCase()}.jpg`;

  const rows = doctorAppts.length ? doctorAppts.map((apt, i) => {
    const p = patients.find(x => x.id === apt.patientId);
    if (!p) return '';
    return `<div class="drawer-appt-row">
      <div class="drawer-appt-avatar">#${i + 1}</div>
      <div class="drawer-appt-info">
        <div class="drawer-appt-name">${p.firstName} ${p.lastName}</div>
        <div class="drawer-appt-meta">
          <span>📞 ${p.mobile}</span>
          <span>📅 ${new Date(apt.date).toLocaleDateString('en-IN')}</span>
          <span>🕐 ${to12h(apt.time)}</span>
          <span style="text-transform:capitalize">🌟 ${apt.slot || '-'}</span>
        </div>
        <div class="drawer-appt-email">${p.email}</div>
      </div>
      <div class="drawer-appt-right">
        ${badge(apt.status)}
        ${apt.status === 'scheduled' ? `<button class="btn btn-green btn-xs mt-2" onclick="markCompleteDrawer('${apt.id}','${doctorId}')">Mark Complete</button>` : ''}
      </div>
    </div>`;
  }).join('') : `<div class="empty-state" style="padding:2rem">No appointments for this doctor yet.</div>`;

  const upcoming  = doctorAppts.filter(a => a.status === 'scheduled').length;
  const completed = doctorAppts.filter(a => a.status === 'completed').length;

  document.getElementById('doctor-drawer-root').innerHTML = `
    <div class="drawer-overlay" id="drawer-overlay" onclick="closeDoctorDrawer()">
      <div class="drawer-panel" onclick="event.stopPropagation()">
        <div class="drawer-header">
          <div class="drawer-header-left">
            <div class="drawer-img-wrap">
              <img src="${imgSrc}" alt="${doctor.name}" class="drawer-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
              <div class="drawer-img-fallback" style="display:none">🩺</div>
            </div>
            <div>
              <div class="drawer-doctor-name">${doctor.name}</div>
              <div class="drawer-doctor-spec">${doctor.specialization}</div>
              <div class="drawer-doctor-qual">${doctor.qualification || ''}</div>
            </div>
          </div>
          <button class="drawer-close" onclick="closeDoctorDrawer()">✕</button>
        </div>
        <div class="drawer-stats">
          <div class="drawer-stat-pill upcoming">⏰ ${upcoming} Upcoming</div>
          <div class="drawer-stat-pill completed">✅ ${completed} Completed</div>
          <div class="drawer-stat-pill total">📊 ${doctorAppts.length} Total</div>
        </div>
        <div class="drawer-divider"></div>
        <div class="drawer-list">${rows}</div>
      </div>
    </div>`;

  // animate in
  requestAnimationFrame(() => {
    document.querySelector('.drawer-overlay').classList.add('open');
    document.querySelector('.drawer-panel').classList.add('open');
  });
}

function closeDoctorDrawer() {
  const overlay = document.querySelector('.drawer-overlay');
  const panel   = document.querySelector('.drawer-panel');
  if (!overlay) return;
  overlay.classList.remove('open');
  panel.classList.remove('open');
  setTimeout(() => { document.getElementById('doctor-drawer-root').innerHTML = ''; }, 300);
}

async function markCompleteDrawer(apptId, doctorId) {
  try {
    await api.updateAppointment(apptId, { status: 'completed' });
    toast('Appointment Completed', 'Marked as completed.');
    const appts = await api.getAppointments();
    window._dashData.appts = appts.map(normalizeAppt);
    renderDashboardContent();
    openDoctorDrawer(doctorId); // refresh drawer
  } catch (e) { toast('Error', e.message, 'error'); }
}

async function markComplete(id) {
  try {
    await api.updateAppointment(id, { status: 'completed' });
    toast('Appointment Completed', 'Marked as completed.');
    const appts = await api.getAppointments();
    window._dashData.appts = appts.map(normalizeAppt);
    renderDashboardContent();
  } catch (e) { toast('Error', e.message, 'error'); }
}

/* ══════════════════════════════════════════
   MANAGE APPOINTMENTS PAGE
══════════════════════════════════════════ */
route('/manage-appointments', renderManageAppointments);

async function renderManageAppointments() {
  if (!Auth.state.isLoggedIn || Auth.state.role !== 'authority') { navigate('/'); return; }
  document.getElementById('app').innerHTML = `
    <div class="page">
      <nav class="sub-nav"><div class="sub-nav-inner">
        <button class="back-link" onclick="navigate('/')">← Back to Home</button>
        <span class="sub-nav-title">Appointments</span>
        <div id="nav-clock"></div>
      </div></nav>
      <div class="page-inner-lg">${spinner()}</div>
    </div>`;
  startClock('#nav-clock');

  let appts = [], patients = [], doctors = [];
  try {
    [appts, patients, doctors] = await Promise.all([api.getAppointments(), api.getPatients(), api.getDoctors()]);
    appts    = appts.map(normalizeAppt);
    patients = patients.map(p => ({ ...p, id: p._id || p.id }));
    doctors  = doctors.map(d => ({ ...d, id: d._id || d.id }));
  } catch (e) { toast('Error', e.message, 'error'); }

  window._manageData = { appts, patients, doctors };
  renderManageContent();
}

function renderManageContent() {
  const { appts, patients, doctors } = window._manageData;
  const validAppts = appts.filter(a => patients.some(p => p.id === a.patientId));

  const cards = doctors.map(doctor => {
    const doctorAppts = validAppts.filter(a => a.doctorId === doctor.id);
    const upcoming  = doctorAppts.filter(a => a.status === 'scheduled').length;
    const completed = doctorAppts.filter(a => a.status === 'completed').length;
    const imgSrc = `images/doctors/${doctor.name.replace(/[^a-zA-Z]/g,'_').toLowerCase()}.jpg`;
    return `<div class="dr-card" onclick="openManageDrawer('${doctor.id}')">
      <div class="dr-card-img-wrap">
        <img src="${imgSrc}" alt="${doctor.name}" class="dr-card-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
        <div class="dr-card-img-fallback" style="display:none">🩺</div>
      </div>
      <div class="dr-card-body">
        <div class="dr-card-name">${doctor.name}</div>
        <div class="dr-card-spec">${doctor.specialization}</div>
        <div class="dr-card-qual">${doctor.qualification || ''}</div>
        <div class="dr-card-stats">
          <span class="dr-stat upcoming">${upcoming} upcoming</span>
          <span class="dr-stat completed">${completed} done</span>
        </div>
        <div class="dr-card-total">${doctorAppts.length} total patient${doctorAppts.length !== 1 ? 's' : ''}</div>
      </div>
      <div class="dr-card-arrow">›</div>
    </div>`;
  }).join('');

  document.querySelector('.page-inner-lg').innerHTML = `
    <div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1.5rem">
      <span style="font-size:1.5rem">📅</span>
      <h2 style="font-size:1.5rem">Appointments by Doctor</h2>
    </div>
    <div class="dr-card-grid">${cards}</div>
    <div id="manage-drawer-root"></div>`;
}

function openManageDrawer(doctorId) {
  const { appts, patients, doctors } = window._manageData;
  const doctor = doctors.find(d => d.id === doctorId);
  const validAppts = appts.filter(a => patients.some(p => p.id === a.patientId));
  const doctorAppts = validAppts
    .filter(a => a.doctorId === doctorId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

  const imgSrc = `images/doctors/${doctor.name.replace(/[^a-zA-Z]/g,'_').toLowerCase()}.jpg`;
  const upcoming  = doctorAppts.filter(a => a.status === 'scheduled').length;
  const completed = doctorAppts.filter(a => a.status === 'completed').length;

  const rows = doctorAppts.length ? doctorAppts.map((apt, i) => {
    const p = patients.find(x => x.id === apt.patientId);
    if (!p) return '';
    return `<div class="drawer-appt-row">
      <div class="drawer-appt-avatar">#${i + 1}</div>
      <div class="drawer-appt-info">
        <div class="drawer-appt-name">${p.firstName} ${p.lastName}</div>
        <div class="drawer-appt-meta">
          <span>📞 ${p.mobile}</span>
          <span>📅 ${new Date(apt.date).toLocaleDateString('en-IN')}</span>
          <span>🕐 ${to12h(apt.time)}</span>
          <span style="text-transform:capitalize">🌟 ${apt.slot || '-'}</span>
        </div>
        <div class="drawer-appt-email">${p.email}</div>
      </div>
      <div class="drawer-appt-right">
        ${badge(apt.status)}
        ${apt.status === 'scheduled' ? `<button class="btn btn-green btn-xs mt-2" onclick="markTodayComplete('${apt.id}','${doctorId}')">Mark Complete</button>` : ''}
      </div>
    </div>`;
  }).join('') : `<div class="empty-state" style="padding:2rem">No appointments for this doctor yet.</div>`;

  document.getElementById('manage-drawer-root').innerHTML = `
    <div class="drawer-overlay" id="manage-drawer-overlay" onclick="closeManageDrawer()">
      <div class="drawer-panel" onclick="event.stopPropagation()">
        <div class="drawer-header">
          <div class="drawer-header-left">
            <div class="drawer-img-wrap">
              <img src="${imgSrc}" alt="${doctor.name}" class="drawer-img" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">
              <div class="drawer-img-fallback" style="display:none">🩺</div>
            </div>
            <div>
              <div class="drawer-doctor-name">${doctor.name}</div>
              <div class="drawer-doctor-spec">${doctor.specialization}</div>
              <div class="drawer-doctor-qual">${doctor.qualification || ''}</div>
            </div>
          </div>
          <button class="drawer-close" onclick="closeManageDrawer()">✕</button>
        </div>
        <div class="drawer-stats">
          <div class="drawer-stat-pill upcoming">⏰ ${upcoming} Upcoming</div>
          <div class="drawer-stat-pill completed">✅ ${completed} Completed</div>
          <div class="drawer-stat-pill total">📊 ${doctorAppts.length} Total</div>
        </div>
        <div class="drawer-divider"></div>
        <div class="drawer-list">${rows}</div>
      </div>
    </div>`;

  requestAnimationFrame(() => {
    document.querySelector('#manage-drawer-overlay').classList.add('open');
    document.querySelector('#manage-drawer-overlay .drawer-panel').classList.add('open');
  });
}

function closeManageDrawer() {
  const overlay = document.getElementById('manage-drawer-overlay');
  const panel   = overlay?.querySelector('.drawer-panel');
  if (!overlay) return;
  overlay.classList.remove('open');
  panel.classList.remove('open');
  setTimeout(() => { document.getElementById('manage-drawer-root').innerHTML = ''; }, 300);
}

async function markTodayComplete(id, doctorId) {
  try {
    await api.updateAppointment(id, { status: 'completed' });
    toast('Marked Complete');
    const appts = await api.getAppointments();
    window._manageData.appts = appts.map(normalizeAppt);
    renderManageContent();
    if (doctorId) openManageDrawer(doctorId);
  } catch (e) { toast('Error', e.message, 'error'); }
}

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
render(location.pathname);
