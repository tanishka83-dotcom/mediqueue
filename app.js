// MediQueue Application Logic

// ==========================================
// 1. Initial State & Data Store
// ==========================================

const state = {
  doctors: {},
  patients: [],
  analytics: {
    hourlyVolume: [12, 28, 42, 18, 32, 14], // For 9am, 11am, 1pm, 3pm, 5pm, 7pm
    completedCount: 24,
    currentActiveDoctor: null
  },
  auth: {
    loggedIn: false,
    doctorId: null
  }
};

// Initialize Socket.io connection
const socket = io();

// Real-time listener
socket.on('queueUpdated', () => {
  loadInitialState();
});

async function loadInitialState() {
  try {
    const res = await fetch('/api/queue');
    const data = await res.json();
    
    // Parse timeAdded string to timestamp number so existing calculations work
    state.patients = data.patients.map(p => ({
      ...p,
      timeAdded: new Date(p.timeAdded).getTime()
    }));
    state.doctors = data.doctors;
    
    // Set active doctor default
    if (!state.analytics.currentActiveDoctor && Object.keys(state.doctors).length > 0) {
      state.analytics.currentActiveDoctor = Object.keys(state.doctors)[0];
    }

    // Recalculate completed count from state
    // For demo purposes, keep analytics completedCount baseline
    state.analytics.completedCount = 24 + (24 - state.patients.length);

    // Trigger renders
    renderLiveQueue();
    renderDoctorDashboard();
    updateAnalyticsCharts();
    updateHeroSummary();
  } catch (error) {
    console.error('Error loading initial queue state:', error);
  }
}

function checkAutoLogin() {
  const token = localStorage.getItem('docToken');
  const profileStr = localStorage.getItem('docProfile');
  if (token && profileStr) {
    const profile = JSON.parse(profileStr);
    state.auth.loggedIn = true;
    state.auth.doctorId = profile.doctorId;
    state.analytics.currentActiveDoctor = profile.doctorId;

    // Update workspace UI
    const avatarEl = document.getElementById('logged-dr-avatar');
    const nameEl = document.getElementById('logged-dr-name');
    const roomEl = document.getElementById('logged-dr-room');
    if (avatarEl) avatarEl.textContent = profile.avatar;
    if (nameEl) nameEl.textContent = profile.name;
    if (roomEl) roomEl.textContent = `${profile.room} • ${profile.dept}`;

    // Go to doctor workspace view directly
    showView('doctor');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initNavbarScroll();
  init3DHeroTilt();
  initBookingForm();
  initDoctorDashboard();
  initFAQ();
  initChatbot();
  initRoutingAndAuth();
  
  // Load initial queue data
  loadInitialState();
  
  // Restore session if already logged in
  checkAutoLogin();
});

function initRoutingAndAuth() {
  const loginTrigger = document.getElementById('nav-login-btn');
  const loginBack = document.getElementById('login-back-btn');
  const loginLogoBack = document.getElementById('login-logo-back');
  const loginForm = document.getElementById('login-form');
  const logoutBtn = document.getElementById('doc-logout-btn');
  
  const profileSelect = document.getElementById('login-profile-select');
  const usernameInput = document.getElementById('login-username');

  // Trigger login screen
  if (loginTrigger) {
    loginTrigger.addEventListener('click', () => {
      showView('login');
    });
  }

  // Go back to landing
  if (loginBack) {
    loginBack.addEventListener('click', () => {
      showView('landing');
    });
  }
  if (loginLogoBack) {
    loginLogoBack.addEventListener('click', (e) => {
      e.preventDefault();
      showView('landing');
    });
  }

  // Pre-fill fields on select picker
  if (profileSelect) {
    profileSelect.addEventListener('change', () => {
      const docId = profileSelect.value;
      if (docId) {
        usernameInput.value = `${docId.replace('dr-', '')}@mediqueue.com`;
      } else {
        usernameInput.value = '';
      }
    });
  }

  // Auth Submit
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      let email = usernameInput.value.trim().toLowerCase();
      const password = document.getElementById('login-password').value;

      // Resolve email from dropdown if user skipped manual input
      if (profileSelect && profileSelect.value && !email) {
        const docId = profileSelect.value;
        email = `${docId.replace('dr-', '')}@mediqueue.com`;
      }

      try {
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });

        const data = await response.json();
        if (!response.ok) {
          alert(data.message || 'Login failed');
          return;
        }

        // Store JWT token and logged in doctor details
        localStorage.setItem('docToken', data.token);
        localStorage.setItem('docProfile', JSON.stringify(data.doctor));

        state.auth.loggedIn = true;
        state.auth.doctorId = data.doctor.doctorId;
        state.analytics.currentActiveDoctor = data.doctor.doctorId;

        // Update workspace user details
        document.getElementById('logged-dr-avatar').textContent = data.doctor.avatar;
        document.getElementById('logged-dr-name').textContent = data.doctor.name;
        document.getElementById('logged-dr-room').textContent = `${data.doctor.room} • ${data.doctor.dept}`;

        // Show Doctor dashboard view
        showView('doctor');
        
        // Re-render
        renderDoctorDashboard();
        
        // Clear login
        loginForm.reset();
      } catch (err) {
        console.error('Login error:', err);
        alert('An error occurred during login. Please try again.');
      }
    });
  }

  // Sign out
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      state.auth.loggedIn = false;
      state.auth.doctorId = null;
      localStorage.removeItem('docToken');
      localStorage.removeItem('docProfile');
      // Close triage banner
      const banner = document.getElementById('workspace-triage-banner');
      if (banner) banner.style.display = 'none';
      showView('landing');
    });
  }
}

function showView(viewName) {
  const patientView = document.getElementById('patient-view');
  const loginView = document.getElementById('login-view');
  const docWorkspaceView = document.getElementById('doctor-workspace-view');

  if (viewName === 'landing') {
    patientView.style.display = 'block';
    loginView.style.display = 'none';
    docWorkspaceView.style.display = 'none';
    document.body.style.overflow = 'auto'; // allow scroll
  } else if (viewName === 'login') {
    patientView.style.display = 'none';
    loginView.style.display = 'block';
    docWorkspaceView.style.display = 'none';
    document.body.style.overflow = 'hidden'; // lock scroll
  } else if (viewName === 'doctor') {
    patientView.style.display = 'none';
    loginView.style.display = 'none';
    docWorkspaceView.style.display = 'block';
    document.body.style.overflow = 'auto'; // allow scroll inside dashboard
  }
}

// Global hook for dismissing alerts
window.dismissTriageBanner = function() {
  const banner = document.getElementById('workspace-triage-banner');
  if (banner) banner.style.display = 'none';
};


// Scroll Effects for Sticky Navbar
function initNavbarScroll() {
  const navbar = document.getElementById('navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
    
    // Auto-update active link in navbar
    const sections = document.querySelectorAll('section');
    const navLinks = document.querySelectorAll('.nav-link');
    
    let currentId = '';
    sections.forEach(section => {
      const sectionTop = section.offsetTop - 120;
      if (window.pageYOffset >= sectionTop) {
        currentId = section.getAttribute('id');
      }
    });

    navLinks.forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${currentId}`) {
        link.classList.add('active');
      }
    });
  });
}

// ==========================================
// 3. Premium 3D Hero Motion & Parallax
// ==========================================

function init3DHeroTilt() {
  const sandbox = document.getElementById('hero-sandbox');
  const stack = document.getElementById('card-stack');
  const cross = document.getElementById('hero-float-cross');
  const capsule = document.getElementById('hero-float-capsule');
  
  if (!sandbox || !stack) return;

  sandbox.addEventListener('mousemove', (e) => {
    const rect = sandbox.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    
    // Rotate card stack based on cursor
    const rotateX = -y / 15;
    const rotateY = x / 15;
    
    stack.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    
    // Parallax displacement of floating background objects
    const transCrossX = -x / 25;
    const transCrossY = -y / 25;
    const transCapsuleX = x / 20;
    const transCapsuleY = y / 20;
    
    cross.style.transform = `translate3d(${transCrossX}px, ${transCrossY}px, 0)`;
    capsule.style.transform = `translate3d(${transCapsuleX}px, ${transCapsuleY}px, 0) rotate(20deg)`;
  });

  sandbox.addEventListener('mouseleave', () => {
    // Return cards and floaters to baseline
    stack.style.transform = 'rotateX(0deg) rotateY(0deg)';
    cross.style.transform = 'translate3d(0px, 0px, 0)';
    capsule.style.transform = 'translate3d(0px, 0px, 0) rotate(25deg)';
  });
}

// ==========================================
// 4. Live Queue Board Rendering
// ==========================================

const deptColors = {
  'Cardiology': 'border-left: 4px solid var(--primary);',
  'General Medicine': 'border-left: 4px solid var(--sage);',
  'Pediatrics': 'border-left: 4px solid var(--waiting);',
  'Orthopedics': 'border-left: 4px solid var(--completed);'
};

function renderLiveQueue() {
  const container = document.getElementById('live-queue-list');
  if (!container) return;

  const searchQuery = document.getElementById('queue-search').value.toLowerCase();
  const activeTab = document.querySelector('.dept-tab.active').getAttribute('data-dept');
  
  container.innerHTML = '';
  
  // Sort patients: Emergencies first, then In Consultation, then Next, then Waiting
  const statusWeight = { 'Emergency': 1, 'In Consultation': 2, 'Next': 3, 'Waiting': 4 };
  const sortedPatients = [...state.patients].sort((a, b) => {
    if (statusWeight[a.status] !== statusWeight[b.status]) {
      return statusWeight[a.status] - statusWeight[b.status];
    }
    return a.timeAdded - b.timeAdded;
  });

  let matchingPatients = sortedPatients.filter(patient => {
    const doc = state.doctors[patient.doctorId] || { name: '' };
    const matchesSearch = patient.name.toLowerCase().includes(searchQuery) ||
                          patient.id.toLowerCase().includes(searchQuery) ||
                          doc.name.toLowerCase().includes(searchQuery);
    
    const matchesDept = (activeTab === 'all' || patient.dept === activeTab);
    return matchesSearch && matchesDept;
  });

  if (matchingPatients.length === 0) {
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:4rem; color:var(--text-light); text-align:center;">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" style="width:48px; height:48px; margin-bottom:1rem; opacity:0.6;">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
        </svg>
        <p style="font-weight:500;">No matching patients in queue</p>
        <p style="font-size:0.8rem;">Try checking another department or adjust search filters.</p>
      </div>
    `;
    return;
  }

  matchingPatients.forEach(patient => {
    const doc = state.doctors[patient.doctorId] || { name: 'Unassigned', room: 'Desk' };
    
    // Determine status badge class
    let badgeClass = 'waiting';
    let statusText = patient.status;
    let pulseHtml = '';

    if (patient.status === 'Emergency') {
      badgeClass = 'emergency';
      pulseHtml = '<span class="pulse-indicator pulse-emergency"></span>';
    } else if (patient.status === 'In Consultation') {
      badgeClass = 'consulting';
      pulseHtml = '<span class="pulse-indicator"></span>';
    } else if (patient.status === 'Next') {
      badgeClass = 'next-in-line';
      statusText = 'Next in Line';
    }

    // Estimate individual wait time based on queue order
    let waitMinutes = 0;
    if (patient.status !== 'In Consultation' && patient.status !== 'Emergency') {
      // Find position of this patient in doctor's queue
      const docQueue = sortedPatients.filter(p => p.doctorId === patient.doctorId);
      const position = docQueue.findIndex(p => p.id === patient.id);
      
      const inConsult = docQueue.find(p => p.status === 'In Consultation');
      const hasEmergency = docQueue.find(p => p.status === 'Emergency');
      
      // avg time * remaining position
      waitMinutes = Math.max(0, position * doc.avgTime);
      if (hasEmergency) waitMinutes += 25; // Add extra delay for emergency triage
    }

    const waitText = waitMinutes === 0 ? 'Active Now' : `~${waitMinutes} Mins`;

    const card = document.createElement('div');
    card.className = `patient-queue-card card-${patient.status.toLowerCase().replace(' ', '-')}`;
    card.setAttribute('style', deptColors[patient.dept] || '');
    
    // Hover dynamic tilt
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      card.style.transform = `perspective(600px) rotateX(${-y / 6}deg) rotateY(${x / 18}deg) translateY(-3px)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'none';
    });

    card.innerHTML = `
      <div class="queue-num">${patient.id.replace('P-', '')}</div>
      <div class="patient-meta">
        <h4>${patient.name}</h4>
        <p>${patient.dept} &bull; <strong>${doc.name}</strong> (${doc.room})</p>
      </div>
      <div class="wait-duration">
        <span>Est. Wait Time</span>
        <strong>${waitText}</strong>
      </div>
      <div class="status-pill ${badgeClass}">
        ${pulseHtml} ${statusText}
      </div>
    `;

    container.appendChild(card);
  });
}

// Queue Filtering Listener
document.querySelectorAll('.dept-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.dept-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    renderLiveQueue();
  });
});

document.getElementById('queue-search').addEventListener('input', renderLiveQueue);

// ==========================================
// 5. Dynamic Booking Interface
// ==========================================

function initBookingForm() {
  const deptSelect = document.getElementById('booking-dept');
  const docSelect = document.getElementById('booking-doctor');
  const form = document.getElementById('appointment-form');
  const resultBox = document.getElementById('booking-result');
  const emergencyCheckbox = document.getElementById('booking-emergency');
  const emergencyWarning = document.getElementById('booking-emergency-warning');

  // Show warning when emergency check is toggled
  if (emergencyCheckbox && emergencyWarning) {
    emergencyCheckbox.addEventListener('change', () => {
      emergencyWarning.style.display = emergencyCheckbox.checked ? 'block' : 'none';
    });
  }

  // Populate doctor select when department changes
  deptSelect.addEventListener('change', () => {
    const selectedDept = deptSelect.value;
    docSelect.innerHTML = '<option value="" disabled selected>Choose Doctor</option>';
    docSelect.disabled = false;

    Object.keys(state.doctors).forEach(key => {
      const doc = state.doctors[key];
      if (doc.dept === selectedDept) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = `${doc.name} (${doc.status})`;
        docSelect.appendChild(option);
      }
    });
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('booking-name').value.trim();
    const dept = deptSelect.value;
    const docId = docSelect.value;
    const isEmergency = emergencyCheckbox ? emergencyCheckbox.checked : false;

    if (!name || !dept || !docId) return;

    try {
      const response = await fetch('/api/queue/book', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, dept, doctorId: docId, isEmergency })
      });

      const data = await response.json();
      if (!response.ok) {
        alert(data.message || 'Booking failed');
        return;
      }

      const token = data.patient.id;
      const position = data.position;
      const estWait = data.estWaitTime;

      // Show result
      resultBox.style.display = 'block';
      if (isEmergency) {
        resultBox.style.backgroundColor = 'var(--emergency-light)';
        resultBox.style.borderColor = 'var(--emergency-border)';
        resultBox.style.color = 'var(--emergency)';
        resultBox.innerHTML = `
          <div style="font-weight:700; font-size:1rem; margin-bottom:0.4rem;">Emergency Checked In!</div>
          <p>Ticket Code: <strong>${token}</strong></p>
          <p>Triage Priority: <strong>Immediate (Bypassed Queue)</strong></p>
          <p style="font-size:0.75rem; margin-top:0.5rem; opacity:0.85;">Please proceed directly to ${state.doctors[docId].room} immediately. Clinical staff has been notified.</p>
        `;
      } else {
        resultBox.style.backgroundColor = 'var(--sage-light)';
        resultBox.style.borderColor = 'var(--sage-border)';
        resultBox.style.color = 'var(--sage-dark)';
        resultBox.innerHTML = `
          <div style="font-weight:700; font-size:1rem; margin-bottom:0.4rem; color:var(--primary);">Booking Successful!</div>
          <p>Ticket Code: <strong>${token}</strong></p>
          <p>Position: <strong>${position === 1 ? 'Called Now' : position + 'th in Line'}</strong></p>
          <p>Estimated Wait Time: <strong>${estWait === 0 ? 'Immediate' : estWait + ' minutes'}</strong></p>
          <p style="font-size:0.75rem; margin-top:0.5rem; opacity:0.85;">Please report to ${state.doctors[docId].room} upon arrival.</p>
        `;
      }

      // Reset Form
      form.reset();
      docSelect.innerHTML = '<option value="" disabled selected>Choose Doctor</option>';
      docSelect.disabled = true;
      if (emergencyWarning) emergencyWarning.style.display = 'none';

      // Load new state from server (Socket will trigger, but fetch immediately for instant feedback)
      loadInitialState();
    } catch (err) {
      console.error('Booking error:', err);
      alert('An error occurred while booking appointment.');
    }
  });
}

// ==========================================
// 6. Doctor Panel Simulation Cockpit
// ==========================================

function initDoctorDashboard() {
  // Sidebar selects
  document.querySelectorAll('.doctor-card-toggle').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.doctor-card-toggle').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
      state.analytics.currentActiveDoctor = card.getAttribute('data-doc-id');
      renderDoctorDashboard();
    });
  });

  // Action Buttons
  document.getElementById('btn-call-next').addEventListener('click', async () => {
    const token = localStorage.getItem('docToken');
    if (!token) return alert('Unauthorized. Please log in.');

    try {
      const response = await fetch('/api/queue/next', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || 'Failed to call next patient');
        return;
      }
      loadInitialState();
    } catch (err) {
      console.error('Call next error:', err);
    }
  });

  document.getElementById('btn-add-emergency').addEventListener('click', async () => {
    const token = localStorage.getItem('docToken');
    if (!token) return alert('Unauthorized. Please log in.');

    try {
      const response = await fetch('/api/queue/emergency', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) {
        alert(data.message || 'Failed to add emergency patient');
        return;
      }
      loadInitialState();
    } catch (err) {
      console.error('Add emergency error:', err);
    }
  });
}

function renderDoctorDashboard() {
  const docId = state.analytics.currentActiveDoctor;
  const doc = state.doctors[docId];

  // Wait until doctors list is fetched
  if (!doc) return;

  // Update Operator Info
  document.getElementById('operator-doc-name').textContent = doc.name;
  document.getElementById('operator-doc-subtitle').textContent = `${doc.dept} | ${doc.room}`;

  // Security Lock check: matches currently logged-in doctor
  const isMine = state.auth.loggedIn && state.auth.doctorId === docId;
  const actionsBox = document.getElementById('operator-actions-box');
  const warningBadge = document.getElementById('read-only-warning-badge');

  if (warningBadge) {
    warningBadge.style.display = isMine ? 'none' : 'block';
  }

  if (actionsBox) {
    if (isMine) {
      actionsBox.classList.remove('locked');
      document.getElementById('btn-call-next').disabled = false;
      document.getElementById('btn-add-emergency').disabled = false;
    } else {
      actionsBox.classList.add('locked');
      document.getElementById('btn-call-next').disabled = true;
      document.getElementById('btn-add-emergency').disabled = true;
    }
  }

  // Find patients associated with this doctor
  const docQueue = state.patients.filter(p => p.doctorId === docId);
  const activeConsultation = docQueue.find(p => p.status === 'In Consultation');
  
  // Sort remaining
  const upcomingQueue = docQueue.filter(p => p.status !== 'In Consultation');
  const statusWeight = { 'Emergency': 1, 'Next': 2, 'Waiting': 3 };
  upcomingQueue.sort((a, b) => {
    if (statusWeight[a.status] !== statusWeight[b.status]) {
      return statusWeight[a.status] - statusWeight[b.status];
    }
    return a.timeAdded - b.timeAdded;
  });

  // Render Consultation Box
  const activeBox = document.getElementById('active-consultation-box');
  if (activeConsultation) {
    let emergencyTag = activeConsultation.status === 'Emergency' 
      ? '<span class="status-pill emergency" style="padding:0.2rem 0.5rem; font-size:0.7rem;"><span class="pulse-indicator pulse-emergency"></span>Emergency Triage</span>'
      : '<span class="status-pill consulting" style="padding:0.2rem 0.5rem; font-size:0.7rem;"><span class="pulse-indicator"></span>Active Consultation</span>';
    
    activeBox.className = "current-consultation-card";
    activeBox.innerHTML = `
      <div class="consult-tag">${emergencyTag}</div>
      <div class="consult-header">Admitted Patient</div>
      <div class="consult-body">
        <h4>${activeConsultation.name}</h4>
        <p>Token: <strong>${activeConsultation.id}</strong> &bull; Registration: <strong>${new Date(activeConsultation.timeAdded).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</strong></p>
      </div>
    `;
  } else {
    activeBox.className = "current-consultation-card empty-state";
    activeBox.innerHTML = `
      <div>
        <p style="font-weight:600; font-size:1rem; margin-bottom:0.3rem;">No Admitted Patient</p>
        <p style="font-size:0.8rem; max-width: 250px; margin: 0 auto;">Queue is empty or doctor is currently charting. Click "Call Next" to admit.</p>
      </div>
    `;
  }

  // Render Upcoming Mini List
  const miniList = document.getElementById('doc-queue-mini');
  miniList.innerHTML = '';

  if (upcomingQueue.length === 0) {
    miniList.innerHTML = `
      <div style="text-align:center; padding:2rem; color:var(--text-light); font-size:0.85rem; background-color:var(--bg-secondary); border-radius:12px; border:1px solid var(--border-light);">
        Queue is empty.
      </div>
    `;
    return;
  }

  upcomingQueue.forEach((patient, index) => {
    const isEmerg = patient.status === 'Emergency';
    const row = document.createElement('div');
    row.className = `mini-patient-row ${isEmerg ? 'emergency' : ''}`;
    
    let statusBadge = '';
    if (isEmerg) {
      statusBadge = '<span class="status-pill emergency" style="padding:0.15rem 0.4rem; font-size:0.65rem;">Critical</span>';
    } else if (patient.status === 'Next') {
      statusBadge = '<span class="status-pill next-in-line" style="padding:0.15rem 0.4rem; font-size:0.65rem;">Next</span>';
    } else {
      statusBadge = '<span class="status-pill waiting" style="padding:0.15rem 0.4rem; font-size:0.65rem;">Waiting</span>';
    }

    // Check if the user is authorized to trigger actions (only if logged in doctor matches current dashboard view)
    const btnHtml = isMine
      ? `<button class="btn-mini btn-mini-danger" onclick="reschedulePatient('${patient.id}')" title="Delay Patient">Delay</button>`
      : `<button class="btn-mini btn-mini-danger" disabled style="opacity:0.4; cursor:not-allowed;" title="Delay Patient">Delay</button>`;

    row.innerHTML = `
      <div class="mini-row-num">${patient.id.replace('P-', '')}</div>
      <div class="mini-row-info">
        <h5>${patient.name}</h5>
        <p>Token: ${patient.id} &bull; ${statusBadge}</p>
      </div>
      <div class="mini-row-actions">
        ${btnHtml}
      </div>
    `;

    miniList.appendChild(row);
  });
}

// Global hook for rescheduling/delaying patient
window.reschedulePatient = async function(patientId) {
  const token = localStorage.getItem('docToken');
  if (!token) {
    alert('Unauthorized operation. Please log in.');
    return;
  }
  
  try {
    const response = await fetch(`/api/queue/delay/${patientId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const data = await response.json();
    if (!response.ok) {
      alert(data.message || 'Failed to delay patient');
      return;
    }
    loadInitialState();
  } catch (err) {
    console.error('Delay patient error:', err);
  }
};

// ==========================================
// 7. Interactive Analytics Graphing
// ==========================================

function updateAnalyticsCharts() {
  // 1. Hourly flow rate Line Chart
  const svg = document.getElementById('flow-line-chart');
  const linePath = document.getElementById('chart-line-path');
  const areaPath = document.getElementById('chart-area-path');
  const nodeContainer = document.getElementById('chart-nodes');
  
  if (!svg || !linePath || !areaPath || !nodeContainer) return;

  const volData = state.analytics.hourlyVolume;
  const xPoints = [50, 150, 250, 350, 450, 550];
  const maxPatients = 45;
  const yBase = 210;
  const yMaxRange = 180;

  // Convert volume array to chart points
  const points = volData.map((val, idx) => {
    const x = xPoints[idx];
    const y = yBase - (val / maxPatients) * yMaxRange;
    return { x, y, val };
  });

  // Calculate curves
  const bezierPath = getBezierPath(points);
  linePath.setAttribute('d', bezierPath);

  // Closed area curve
  const areaD = `${bezierPath} L 550 210 L 50 210 Z`;
  areaPath.setAttribute('d', areaD);

  // Re-render points node markers
  nodeContainer.innerHTML = '';
  points.forEach(pt => {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', pt.x);
    circle.setAttribute('cy', pt.y);
    circle.setAttribute('r', 5);
    circle.setAttribute('class', 'chart-data-node');
    
    // Simple SVG Tooltip overlay
    circle.addEventListener('mouseover', () => {
      const tooltip = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      tooltip.setAttribute('x', pt.x);
      tooltip.setAttribute('y', pt.y - 12);
      tooltip.setAttribute('fill', 'var(--text-main)');
      tooltip.setAttribute('font-size', '10px');
      tooltip.setAttribute('font-weight', '700');
      tooltip.setAttribute('text-anchor', 'middle');
      tooltip.setAttribute('id', `tooltip-${pt.x}`);
      tooltip.textContent = `${pt.val} Patients`;
      nodeContainer.appendChild(tooltip);
    });

    circle.addEventListener('mouseleave', () => {
      const tooltip = document.getElementById(`tooltip-${pt.x}`);
      if (tooltip) tooltip.remove();
    });

    nodeContainer.appendChild(circle);
  });

  // 2. Bar Chart Wait Times
  // Recalculate average waits
  const depts = {
    'General Medicine': { bar: 'bar-dept-gen', label: 'val-dept-gen', default: 12 },
    'Pediatrics': { bar: 'bar-dept-ped', label: 'val-dept-ped', default: 8 },
    'Cardiology': { bar: 'bar-dept-card', label: 'val-dept-card', default: 20 },
    'Orthopedics': { bar: 'bar-dept-orth', label: 'val-dept-orth', default: 15 }
  };

  Object.keys(depts).forEach(deptKey => {
    const deptInfo = depts[deptKey];
    const deptQueue = state.patients.filter(p => p.dept === deptKey && p.status !== 'In Consultation');
    
    // Base wait + extra minutes per patient
    let totalWait = deptInfo.default;
    if (deptQueue.length > 0) {
      // Find average doc speed
      const doc = Object.values(state.doctors).find(d => d.dept === deptKey) || { avgTime: 12 };
      totalWait = deptQueue.length * doc.avgTime;
    }

    const percentage = Math.min(100, Math.max(15, (totalWait / 50) * 100));
    
    const barEl = document.getElementById(deptInfo.bar);
    const labelEl = document.getElementById(deptInfo.label);
    
    if (barEl && labelEl) {
      barEl.style.height = `${percentage}%`;
      labelEl.textContent = `${totalWait}m`;
    }
  });

  // 3. Donut status share chart
  // Count by status
  let cCount = 0;
  let wCount = 0;
  let eCount = 0;

  state.patients.forEach(p => {
    if (p.status === 'In Consultation') cCount++;
    else if (p.status === 'Emergency') eCount++;
    else wCount++; // Waiting or Next
  });

  const totalActive = cCount + wCount + eCount;
  
  const totalLabel = document.getElementById('donut-total-count');
  const lblWaiting = document.getElementById('donut-lbl-waiting');
  const lblConsulting = document.getElementById('donut-lbl-consulting');
  const lblEmergency = document.getElementById('donut-lbl-emergency');

  if (totalLabel) {
    totalLabel.textContent = totalActive;
    lblWaiting.textContent = wCount;
    lblConsulting.textContent = cCount;
    lblEmergency.textContent = eCount;
  }

  // Draw Circle arcs
  const segConsulting = document.getElementById('donut-seg-consulting');
  const segWaiting = document.getElementById('donut-seg-waiting');
  const segEmergency = document.getElementById('donut-seg-emergency');

  if (segConsulting && segWaiting && segEmergency) {
    const circ = 283; // Circumference of radius 45

    if (totalActive === 0) {
      segConsulting.style.strokeDasharray = `0 283`;
      segWaiting.style.strokeDasharray = `0 283`;
      segEmergency.style.strokeDasharray = `0 283`;
      return;
    }

    const sliceConsult = (cCount / totalActive) * circ;
    const sliceWait = (wCount / totalActive) * circ;
    const sliceEmerg = (eCount / totalActive) * circ;

    // Set dash values
    segConsulting.style.strokeDasharray = `${sliceConsult} ${circ}`;
    segConsulting.style.setProperty('--dashoffset', '0');

    segWaiting.style.strokeDasharray = `${sliceWait} ${circ}`;
    segWaiting.style.setProperty('--dashoffset', `${-sliceConsult}`);

    segEmergency.style.strokeDasharray = `${sliceEmerg} ${circ}`;
    segEmergency.style.setProperty('--dashoffset', `${-(sliceConsult + sliceWait)}`);
  }
}

// Cubic Bezier Spline coordinate mapper helper
function getBezierPath(points) {
  if (points.length === 0) return '';
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i+1];
    const cpX1 = p0.x + 50;
    const cpY1 = p0.y;
    const cpX2 = p1.x - 50;
    const cpY2 = p1.y;
    path += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${p1.x} ${p1.y}`;
  }
  return path;
}

// ==========================================
// 8. FAQ Accordion Toggle Actions
// ==========================================

function initFAQ() {
  document.querySelectorAll('.faq-question').forEach(item => {
    item.addEventListener('click', () => {
      const parent = item.parentElement;
      const isActive = parent.classList.contains('active');
      
      // Close other accordions
      document.querySelectorAll('.faq-item').forEach(faq => {
        faq.classList.remove('active');
      });

      if (!isActive) {
        parent.classList.add('active');
      }
    });
  });
}

// ==========================================
// 9. AI Chatbot Dialog System
// ==========================================

const botReplies = {
  'wait-times': () => {
    // Dynamically query wait statuses
    const list = Object.keys(state.doctors).map(key => {
      const doc = state.doctors[key];
      const count = state.patients.filter(p => p.doctorId === key && p.status !== 'In Consultation').length;
      return `${doc.dept}: ${count * doc.avgTime}m (${count} waiting)`;
    });
    return `Current department queues:\n${list.join('\n')}\n*Estimated wait metrics update instantly.*`;
  },
  'avail': () => {
    const list = Object.values(state.doctors).map(doc => {
      return `&bull; **${doc.name}** (${doc.dept}) - status: *${doc.status}*`;
    });
    return `Active Clinical Staff Availability:\n${list.join('\n')}`;
  },
  'emergency': () => {
    return `**Emergency Policy Summary:**\nCritical triage issues skip the queuing checklist and are placed immediately next in consultations. If an emergency occurs, estimated wait times for standard tickets shift.`;
  },
  'book': () => {
    return `To join the live line:\n1. Scroll to the **Book Appointment** panel.\n2. Key in your full name.\n3. Choose your clinical department and physician.\n4. Confirm to generate your queue ticket number.`;
  },
  'default': 'Thank you for reaching out. Please specify if you are asking about: "wait times", "doctors", "emergency policy", or need booking instructions.'
};

function initChatbot() {
  const toggle = document.getElementById('chatbot-toggle');
  const panel = document.getElementById('chatbot-panel');
  const close = document.getElementById('chatbot-close');
  const sendBtn = document.getElementById('chat-send-trigger');
  const input = document.getElementById('chat-user-input');

  if (!toggle || !panel) return;

  toggle.addEventListener('click', () => {
    panel.classList.toggle('active');
  });

  close.addEventListener('click', () => {
    panel.classList.remove('active');
  });

  sendBtn.addEventListener('click', handleChatSubmit);
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleChatSubmit();
  });
}

function handleChatSubmit() {
  const input = document.getElementById('chat-user-input');
  const text = input.value.trim();
  if (!text) return;

  appendChatMessage(text, 'user');
  input.value = '';

  // Parse response
  setTimeout(() => {
    let query = text.toLowerCase();
    let reply = botReplies.default;

    if (query.includes('wait') || query.includes('time') || query.includes('delay') || query.includes('long')) {
      reply = botReplies['wait-times']();
    } else if (query.includes('doc') || query.includes('avail') || query.includes('staff') || query.includes('patel') || query.includes('jenkins') || query.includes('smith')) {
      reply = botReplies['avail']();
    } else if (query.includes('emerg') || query.includes('priority') || query.includes('triage') || query.includes('critical')) {
      reply = botReplies['emergency']();
    } else if (query.includes('book') || query.includes('appointment') || query.includes('join') || query.includes('schedule')) {
      reply = botReplies['book']();
    }

    appendChatMessage(reply, 'bot');
  }, 600);
}

// Global chip click handler
window.handleChipClick = function(topic) {
  let userQuery = '';
  if (topic === 'wait-times') userQuery = 'Check department wait times';
  else if (topic === 'avail') userQuery = 'List available doctors';
  else if (topic === 'emergency') userQuery = 'Explain emergency protocol';

  appendChatMessage(userQuery, 'user');
  
  setTimeout(() => {
    const reply = botReplies[topic]();
    appendChatMessage(reply, 'bot');
  }, 500);
};

function appendChatMessage(text, sender) {
  const container = document.getElementById('chat-messages-container');
  const msg = document.createElement('div');
  msg.className = `chat-msg chat-msg-${sender}`;
  
  // Format markdown bold points if returned
  msg.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>').replace(/&bull;/g, '&bull;');
  
  container.appendChild(msg);
  container.scrollTop = container.scrollHeight;
}

// ==========================================
// 10. Hero Section Live State Updates
// ==========================================

function updateHeroSummary() {
  const countEl = document.getElementById('hero-queue-count');
  const waitEl = document.getElementById('hero-wait-time');
  const avgEl = document.getElementById('hero-avg-wait');
  const drBadge = document.getElementById('hero-dr-status-badge');

  // General Medicine doctor alex patel state query
  const genPatients = state.patients.filter(p => p.dept === 'General Medicine' && p.status !== 'In Consultation');
  const totalGenWait = genPatients.length * state.doctors['dr-patel'].avgTime;

  if (countEl) countEl.textContent = genPatients.length;
  if (waitEl) waitEl.textContent = `${totalGenWait} Mins`;

  // General completed stat
  if (avgEl) {
    const totalPatientsCount = state.patients.length;
    const avgMins = Math.max(8.5, parseFloat(14.5 - (state.analytics.completedCount * 0.1))).toFixed(1);
    avgEl.textContent = `${avgMins}m`;
  }

  // Active cardiology doctor status sync
  if (drBadge) {
    const cardDoc = state.doctors['dr-jenkins'];
    if (cardDoc.status === 'In Consultation') {
      drBadge.className = 'availability-tag active';
      drBadge.innerHTML = '<span></span> In Consultation';
    } else {
      drBadge.className = 'availability-tag active'; // still active color green but marked Available
      drBadge.innerHTML = '<span></span> Available';
    }
  }
}
