// Main JavaScript file for Sipsing DJ Manager
// Import Firebase functions
import {
  checkAuthState,
  signIn,
  signUp,
  signInWithGoogle,
  signInWithApple,
  logOut,
  saveVenueData,
  getVenueData,
  addSongToDatabase,
  subscribeToVenueUpdates
} from './firebase.js';

// Application state
let appState = {
  currentUser: null,
  isAnonymous: false,
  venueName: '',
  venueAddress: '',
  venueLogo: '',
  venueQRCode: '',
  spots: {},
  songQueue: [],
  history: [],
  currentSinging: null,
  timeElapsed: 0,
  timer: null,
  timeIsUp: false,
  songDatabase: [],
  
  // UI customization settings
  uiSettings: {
    theme: 'default',       // default, dark, light, custom
    colorScheme: 'purple',  // purple, blue, green, red
    compactView: false      // for smaller screens/dense displays
  },
  
  // DJ workflow settings
  workflow: {
    mode: 'standard',       // standard, one-by-one, double, balanced
    preventConsecutive: true, // prevent same table singing consecutive songs
    balancingFactor: 2,     // how many songs must pass before a table can sing again
    
    // Song pricing options
    songPrice: 2,           // standard price per song (default $2)
    enableFreeSongs: false, // allow free songs
    enableCustomPricing: false, // allow custom pricing per song
    maxSongPrice: 99,       // maximum price per song
    
    // Remote ordering options
    enableRemoteOrdering: true, // allow remote users to order songs
    remoteOrderingSurcharge: 5,  // additional cost for remote orders
    showRemoteUsers: true,      // show remote users in venue displays
    allowRemoteChat: true,      // allow remote users to use the chat
    
    // Time-based pricing
    enableTimeBasedPricing: false, // change prices based on time of day
    timePricingRules: [
      { startHour: 0, endHour: 24, price: 2 } // 24-hour format
    ],
    
    // Bidding system
    enableBidding: true,    // enable the song bidding system
    minimumBid: 5,          // minimum bid amount in dollars
    bidIncrement: 5,        // minimum increment for bids in dollars
    
    // Recording options
    enableRecording: true,  // enable song recording option
    recordingPrice: 10,     // price for recording a song in dollars
    
    // Chat system
    enableChat: true,       // enable chat system
    moderateChat: true,     // require moderator approval for messages
    userGroupColors: {
      remote: "#9c27b0",    // remote users in purple
      table: "#2196f3",     // table customers in blue
      bar: "#ff9800",       // bar customers in orange
      admin: "#f44336",     // admin/staff in red
    }
  },
  
  // Queue display settings
  queueDisplay: {
    isOpen: false,          // is the queue display window open
    windowRef: null,        // reference to the queue display window
    url: ''                 // URL for the queue display
  },
  
  // Combined display settings
  combinedDisplay: {
    isOpen: false,          // is the combined display window open
    windowRef: null,        // reference to the combined display window
    url: ''                 // URL for the combined display
  },
  
  // Bidding system
  newBid: null,             // tracks new bids for animation
  
  // Customer wallets - table/spot ID as key, wallet balance as value
  wallets: {},
  
  // Pending payments - table/spot ID as key, amount as value
  pendingPayments: {},
  
  // Venue layout
  venueLayout: {
    isCustomized: false,    // whether a custom layout exists
    width: 8,               // grid width (columns)
    height: 6,              // grid height (rows)
    gridCells: {},          // cell content: {type: 'table'|'bar'|'stage'|'wall'|'empty', spotId: 'table_1', rotation: 0}
    rooms: ['Main Room'],   // list of rooms in the venue
    activeRoom: 'Main Room' // currently active room
  },
  
  // Recording options
  recordings: [],           // list of recorded songs
  sharingOptions: [
    { id: 'email', name: 'Email', enabled: true, description: 'Send recording to your email' },
    { id: 'facebook', name: 'Facebook', enabled: true, description: 'Share on Facebook with you tagged' },
    { id: 'download', name: 'Download', enabled: true, description: 'Download directly after performance' },
    { id: 'cloud', name: 'Cloud Link', enabled: true, description: 'Get a private link to your recording' }
  ],
  
  // Service requests
  serviceRequests: [],      // list of service requests
  pendingRequests: {},      // pending service requests by spot ID
  notificationSound: null,  // sound for service request notifications
  
  // Chat system
  chatMessages: [],        // all chat messages
  pendingChatMessages: [], // messages pending approval
  remoteUsers: {},         // users connected remotely
  currentRemoteUser: null, // current remote user information
  
  // Staff members
  staff: [
    { id: 'waiter', name: 'Waiter', available: true, responseTime: '~3 mins' },
    { id: 'bartender', name: 'Bartender', available: true, responseTime: '~3 mins' },
    { id: 'manager', name: 'Manager', available: true, responseTime: '~5 mins' }
  ]
};

// Main function to initialize the app
document.addEventListener('DOMContentLoaded', function() {
  // Initialize notification sound
  appState.notificationSound = new Audio('https://cdn.pixabay.com/download/audio/2021/08/04/audio_0625c1539c.mp3');
  
  // Initialize service request event handlers
  document.addEventListener('click', function(event) {
    // Handle service bell button click
    if (event.target.closest('#service-bell-btn')) {
      showServiceRequestsPanel();
    }
  });
  
  // Add error handler for Firebase initialization issues
  try {
    // Check authentication state
    checkAuthState((user) => {
      if (user) {
        // User is logged in
        appState.currentUser = user;
        appState.isAnonymous = false;
        loadVenueData(user.uid);
      } else {
        // User is not logged in, show login screen
        showLoginScreen();
      }
    });
  } catch (error) {
    console.error("Firebase initialization error:", error);
    // Still show the login screen with an error message
    showLoginScreen(true);
    
    // Add a warning about Firebase - helpful for debugging on GitHub Pages
    console.warn("If you're using GitHub Pages, make sure to add your GitHub Pages domain to Firebase Authentication > Authorized domains");
  }
});

// Show login screen with option to use without logging in
function showLoginScreen(hasFirebaseError = false) {
  const appElement = document.getElementById('app');
  
  appElement.innerHTML = `
    <div class="row justify-content-center mt-5">
      <div class="col-md-6">
        <div class="card shadow">
          <div class="card-header bg-primary text-white">
            <h2 class="text-center mb-0">Sipsing DJ Manager</h2>
          </div>
          <div class="card-body">
            ${hasFirebaseError ? `
            <div class="alert alert-warning mb-3">
              <i class="fas fa-exclamation-triangle"></i> <strong>Firebase Connection Error:</strong> 
              There are issues connecting to the Firebase backend. You can continue without logging in.
            </div>` : ''}
            
            <ul class="nav nav-tabs" id="authTabs" role="tablist" ${hasFirebaseError ? 'style="display:none"' : ''}>
              <li class="nav-item" role="presentation">
                <button class="nav-link active" id="login-tab" data-bs-toggle="tab" data-bs-target="#login" type="button" role="tab" aria-controls="login" aria-selected="true">Login</button>
              </li>
              <li class="nav-item" role="presentation">
                <button class="nav-link" id="register-tab" data-bs-toggle="tab" data-bs-target="#register" type="button" role="tab" aria-controls="register" aria-selected="false">Register</button>
              </li>
            </ul>
            <div class="tab-content p-3" id="authTabsContent" ${hasFirebaseError ? 'style="display:none"' : ''}>
              <div class="tab-pane fade show active" id="login" role="tabpanel" aria-labelledby="login-tab">
                <form id="login-form">
                  <div class="mb-3">
                    <label for="login-username" class="form-label">Username</label>
                    <input type="text" class="form-control" id="login-username" required>
                  </div>
                  <div class="mb-3">
                    <label for="login-password" class="form-label">Password</label>
                    <input type="password" class="form-control" id="login-password" required>
                  </div>
                  <div id="login-error" class="alert alert-danger d-none"></div>
                  <button type="submit" class="btn btn-primary w-100 mb-3">Login</button>
                  
                  <div class="d-flex justify-content-center">
                    <button type="button" id="google-signin" class="btn btn-outline-danger me-2">
                      <i class="fab fa-google"></i> Sign in with Google
                    </button>
                    <button type="button" id="apple-signin" class="btn btn-outline-dark">
                      <i class="fab fa-apple"></i> Sign in with Apple
                    </button>
                  </div>
                </form>
              </div>
              <div class="tab-pane fade" id="register" role="tabpanel" aria-labelledby="register-tab">
                <form id="register-form">
                  <div class="mb-3">
                    <label for="register-username" class="form-label">Username</label>
                    <input type="text" class="form-control" id="register-username" required>
                  </div>
                  <div class="mb-3">
                    <label for="register-password" class="form-label">Password</label>
                    <input type="password" class="form-control" id="register-password" required>
                    <div class="form-text">Password must be at least 6 characters long.</div>
                  </div>
                  <div class="mb-3">
                    <label for="register-confirm-password" class="form-label">Confirm Password</label>
                    <input type="password" class="form-control" id="register-confirm-password" required>
                  </div>
                  <div id="register-error" class="alert alert-danger d-none"></div>
                  <button type="submit" class="btn btn-primary w-100">Register</button>
                </form>
              </div>
            </div>
            
            <div class="text-center mt-4">
              ${!hasFirebaseError ? `<p>- OR -</p>` : ''}
              <button id="use-without-login" class="btn btn-lg ${hasFirebaseError ? 'btn-primary' : 'btn-success'}" style="${hasFirebaseError ? 'font-size: 1.2em; padding: 15px 30px;' : ''}">
                <i class="fas fa-play-circle"></i> Use Without Login
              </button>
              <p class="mt-2 text-muted small">Note: Your data will only be stored on this device</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add event listeners for forms
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  document.getElementById('register-form').addEventListener('submit', handleRegister);
  document.getElementById('use-without-login').addEventListener('click', useWithoutLogin);
  document.getElementById('google-signin').addEventListener('click', signInWithGoogleHandler);
  document.getElementById('apple-signin').addEventListener('click', signInWithAppleHandler);
}

// Handle login form submission
async function handleLogin(event) {
  event.preventDefault();
  
  const username = document.getElementById('login-username').value;
  const password = document.getElementById('login-password').value;
  const errorElement = document.getElementById('login-error');
  
  // Show loading state
  const submitButton = event.target.querySelector('button[type="submit"]');
  submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Logging in...';
  submitButton.disabled = true;
  errorElement.classList.add('d-none');
  
  // Attempt to sign in
  const result = await signIn(username, password);
  
  // Reset button
  submitButton.innerHTML = 'Login';
  submitButton.disabled = false;
  
  if (result.success) {
    // Login successful
    appState.currentUser = result.user;
    appState.isAnonymous = false;
    loadVenueData(result.user.uid);
  } else {
    // Login failed, show error
    errorElement.textContent = result.error;
    errorElement.classList.remove('d-none');
  }
}

// Handle register form submission
async function handleRegister(event) {
  event.preventDefault();
  
  const username = document.getElementById('register-username').value;
  const password = document.getElementById('register-password').value;
  const confirmPassword = document.getElementById('register-confirm-password').value;
  const errorElement = document.getElementById('register-error');
  
  // Show loading state
  const submitButton = event.target.querySelector('button[type="submit"]');
  submitButton.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Registering...';
  submitButton.disabled = true;
  errorElement.classList.add('d-none');
  
  // Validate form
  if (password !== confirmPassword) {
    errorElement.textContent = "Passwords do not match";
    errorElement.classList.remove('d-none');
    submitButton.innerHTML = 'Register';
    submitButton.disabled = false;
    return;
  }
  
  if (password.length < 6) {
    errorElement.textContent = "Password must be at least 6 characters long";
    errorElement.classList.remove('d-none');
    submitButton.innerHTML = 'Register';
    submitButton.disabled = false;
    return;
  }
  
  // Create default venue name
  const venueName = `${username}'s Karaoke Venue`;
  
  // Attempt to sign up
  const result = await signUp(username, password, venueName);
  
  // Reset button
  submitButton.innerHTML = 'Register';
  submitButton.disabled = false;
  
  if (result.success) {
    // Registration successful
    appState.currentUser = result.user;
    appState.isAnonymous = false;
    appState.venueName = venueName;
    initializeVenueData();
  } else {
    // Registration failed, show error
    errorElement.textContent = result.error;
    errorElement.classList.remove('d-none');
  }
}

// Sign in with Google handler
async function signInWithGoogleHandler() {
  // Show loading state
  const button = document.getElementById('google-signin');
  const originalHTML = button.innerHTML;
  button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Connecting...';
  button.disabled = true;
  
  // Clear previous errors
  document.getElementById('login-error').classList.add('d-none');
  
  // Attempt to sign in with Google
  const result = await signInWithGoogle();
  
  // Reset button
  button.innerHTML = originalHTML;
  button.disabled = false;
  
  if (result.success) {
    // Login successful
    appState.currentUser = result.user;
    appState.isAnonymous = false;
    loadVenueData(result.user.uid);
  } else {
    // Login failed, show error
    const errorElement = document.getElementById('login-error');
    errorElement.textContent = result.error;
    errorElement.classList.remove('d-none');
  }
}

// Sign in with Apple handler
async function signInWithAppleHandler() {
  // Show loading state
  const button = document.getElementById('apple-signin');
  const originalHTML = button.innerHTML;
  button.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Connecting...';
  button.disabled = true;
  
  // Clear previous errors
  document.getElementById('login-error').classList.add('d-none');
  
  // Attempt to sign in with Apple
  const result = await signInWithApple();
  
  // Reset button
  button.innerHTML = originalHTML;
  button.disabled = false;
  
  if (result.success) {
    // Login successful
    appState.currentUser = result.user;
    appState.isAnonymous = false;
    loadVenueData(result.user.uid);
  } else {
    // Login failed, show error
    const errorElement = document.getElementById('login-error');
    errorElement.textContent = result.error;
    errorElement.classList.remove('d-none');
  }
}

// Use without login
function useWithoutLogin() {
  appState.isAnonymous = true;
  appState.venueName = "My Karaoke Venue";
  
  // Create fake user
  appState.currentUser = {
    uid: 'anonymous-' + Date.now(),
    isAnonymous: true
  };
  
  // Initialize with default data
  initializeVenueData();
}

// Initialize venue data with defaults
function initializeVenueData() {
  // Create default tables (1-20)
  const spots = {};
  const wallets = {};
  
  // Regular tables
  for (let i = 1; i <= 20; i++) {
    const id = `table_${i}`;
    spots[id] = {
      id,
      name: `Table ${i}`,
      type: 'table',
      occupant: '',
      performedCount: 0
    };
    wallets[id] = 0; // Initialize wallet with $0 balance
  }
  
  // Bar seats (1-10)
  for (let i = 1; i <= 10; i++) {
    const id = `bar_${i}`;
    spots[id] = {
      id,
      name: `Bar #${i}`,
      type: 'bar',
      occupant: '',
      performedCount: 0
    };
    wallets[id] = 0; // Initialize wallet with $0 balance
  }
  
  // Set up initial state
  appState.spots = spots;
  appState.wallets = wallets;
  appState.pendingPayments = {};
  appState.songQueue = [];
  appState.history = [];
  appState.currentSinging = null;
  
  // Build and display main UI
  buildMainUI();
}

// Setup service request listener
function setupServiceRequestListener() {
  if (!appState.currentUser) return;
  
  // Subscribe to venue updates
  subscribeToVenueUpdates(appState.currentUser.uid, function(result) {
    if (result.success) {
      const data = result.data;
      
      // Check for new service requests
      if (data.serviceRequests && data.serviceRequests.length > 0) {
        const currentCount = appState.serviceRequests ? appState.serviceRequests.length : 0;
        const newCount = data.serviceRequests.length;
        
        // Filter out expired or resolved requests
        const activeRequests = data.serviceRequests.filter(req => 
          req.status === 'pending' && 
          (!req.expiresAt || new Date(req.expiresAt) > new Date())
        );
        
        // Update app state
        appState.serviceRequests = data.serviceRequests;
        appState.pendingRequests = data.pendingRequests || {};
        
        // Play notification sound if there are new active requests
        if (newCount > currentCount && appState.notificationSound && activeRequests.length > 0) {
          appState.notificationSound.play().catch(e => console.log("Error playing sound:", e));
        }
        
        // Clear old requests in bulk if there are more than 50
        if (appState.serviceRequests.length > 50) {
          cleanupOldServiceRequests();
        }
        
        // Update service request counter
        updateServiceRequestCount();
      }
    }
  });
}

// Cleanup old service requests
async function cleanupOldServiceRequests() {
  if (!appState.currentUser) return;
  
  try {
    // Keep only the last 50 requests and any active pending requests
    const pendingRequests = appState.serviceRequests.filter(req => req.status === 'pending');
    const resolvedRequests = appState.serviceRequests.filter(req => req.status !== 'pending')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50 - pendingRequests.length);
    
    appState.serviceRequests = [...pendingRequests, ...resolvedRequests];
    
    // Update Firebase silently
    await saveVenueData(appState.currentUser.uid, {
      serviceRequests: appState.serviceRequests
    });
    
    console.log(`Cleaned up service requests. Keeping ${appState.serviceRequests.length} requests.`);
  } catch (error) {
    console.error("Error cleaning up service requests:", error);
  }
}

// Update service request count in UI
function updateServiceRequestCount() {
  const countElement = document.getElementById('service-count');
  if (!countElement) return;
  
  // Only count non-expired pending requests
  const now = new Date();
  const pendingCount = appState.serviceRequests.filter(req => 
    req.status === 'pending' && 
    (!req.expiresAt || new Date(req.expiresAt) > now)
  ).length;
  
  if (pendingCount > 0) {
    countElement.textContent = pendingCount;
    countElement.style.display = 'block';
    
    // Add urgent class if there are high urgency requests
    const hasUrgentRequests = appState.serviceRequests.some(req => 
      req.status === 'pending' && req.urgency === 'high'
    );
    
    if (hasUrgentRequests) {
      countElement.classList.add('bg-danger');
      countElement.classList.remove('bg-warning');
    } else {
      countElement.classList.remove('bg-danger');
      countElement.classList.add('bg-warning');
    }
  } else {
    countElement.style.display = 'none';
  }
}

// Reset custom table names at end of day (to keep things clean)
async function resetCustomTableNames() {
  if (!appState.currentUser) return;
  
  try {
    let needsUpdate = false;
    
    // Check each spot for custom names
    Object.keys(appState.spots).forEach(spotId => {
      const spot = appState.spots[spotId];
      if (spot.customName) {
        delete spot.customName;
        delete spot.lastRenamed;
        needsUpdate = true;
      }
    });
    
    if (needsUpdate) {
      // Update Firebase
      await saveVenueData(appState.currentUser.uid, {
        spots: appState.spots
      });
      console.log("Reset all custom table names");
    }
  } catch (error) {
    console.error("Error resetting custom table names:", error);
  }
}

// Show service requests panel
function showServiceRequestsPanel() {
  // Create modal for service requests
  const modal = document.createElement('div');
  modal.id = 'service-request-modal';
  modal.className = 'modal fade';
  modal.setAttribute('tabindex', '-1');
  
  // Filter active pending requests
  const now = new Date();
  const pendingRequests = appState.serviceRequests.filter(req => 
    req.status === 'pending' && 
    (!req.expiresAt || new Date(req.expiresAt) > now)
  );
  
  modal.innerHTML = `
    <div class="modal-dialog modal-lg">
      <div class="modal-content">
        <div class="modal-header bg-primary text-white">
          <h5 class="modal-title"><i class="fas fa-bell me-2"></i>Service Requests</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          ${pendingRequests.length === 0 ? 
            `<div class="text-center my-4">
              <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
              <p>No pending service requests</p>
            </div>` : 
            `<div class="table-responsive">
              <table class="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Table</th>
                    <th>Type</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  ${pendingRequests.map(req => {
                    const spotInfo = appState.spots[req.spotId] || { name: 'Unknown' };
                    const timeAgo = timeSince(new Date(req.timestamp));
                    const typeIcon = getServiceTypeIcon(req.type);
                    
                    return `
                      <tr>
                        <td>${timeAgo}</td>
                        <td>${spotInfo.name}</td>
                        <td><i class="${typeIcon} me-2"></i>${req.type}</td>
                        <td>
                          <button class="btn btn-sm btn-success resolve-request-btn" data-request-id="${req.id}" data-spot-id="${req.spotId}">
                            <i class="fas fa-check me-1"></i> Mark Resolved
                          </button>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>`
          }
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" id="open-combined-display-btn">
            <i class="fas fa-desktop me-1"></i> Open Combined Display
          </button>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to body
  document.body.appendChild(modal);
  
  // Initialize Bootstrap modal
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
  
  // Add event listener for resolve buttons
  modal.querySelectorAll('.resolve-request-btn').forEach(btn => {
    btn.addEventListener('click', function() {
      const requestId = this.dataset.requestId;
      const spotId = this.dataset.spotId;
      resolveServiceRequest(requestId, spotId);
      
      // Remove the row from the table
      this.closest('tr').remove();
      
      // If no more rows, update the modal body
      if (modal.querySelectorAll('tbody tr').length === 0) {
        modal.querySelector('.modal-body').innerHTML = `
          <div class="text-center my-4">
            <i class="fas fa-check-circle fa-3x text-success mb-3"></i>
            <p>No pending service requests</p>
          </div>
        `;
      }
    });
  });
  
  // Add event listener for combined display button
  const openCombinedDisplayBtn = modal.querySelector('#open-combined-display-btn');
  if (openCombinedDisplayBtn) {
    openCombinedDisplayBtn.addEventListener('click', function() {
      openCombinedDisplay();
    });
  }
  
  // Handle modal hidden event (remove from DOM)
  modal.addEventListener('hidden.bs.modal', function() {
    document.body.removeChild(modal);
  });
}

// Allow customers to rename their tables
function renameTable(spotId, newName) {
  if (!appState.currentUser || !spotId || !newName) return;
  
  // Sanitize the name - limit length and remove problematic characters
  newName = newName.trim().substring(0, 20).replace(/[<>]/g, '');
  
  try {
    // Update spot name in app state
    if (appState.spots[spotId]) {
      appState.spots[spotId].customName = newName;
      
      // Update Firebase
      saveVenueData(appState.currentUser.uid, {
        spots: appState.spots
      }).then(() => {
        showToast(`Table renamed to "${newName}"`, 'success');
      }).catch(error => {
        console.error("Error saving table name:", error);
        showToast('Error saving table name', 'danger');
      });
    }
  } catch (error) {
    console.error("Error renaming table:", error);
    showToast('Error renaming table', 'danger');
  }
}

// Resolve service request
async function resolveServiceRequest(requestId, spotId) {
  if (!appState.currentUser || !requestId) return;
  
  try {
    // Update request status in app state
    const requestIndex = appState.serviceRequests.findIndex(req => req.id === requestId);
    if (requestIndex !== -1) {
      appState.serviceRequests[requestIndex].status = 'resolved';
      appState.serviceRequests[requestIndex].resolvedAt = new Date().toISOString();
    }
    
    // Remove from pending requests
    if (spotId && appState.pendingRequests[spotId]) {
      delete appState.pendingRequests[spotId];
    }
    
    // Update Firebase
    await saveVenueData(appState.currentUser.uid, {
      serviceRequests: appState.serviceRequests,
      pendingRequests: appState.pendingRequests
    });
    
    // Update UI
    updateServiceRequestCount();
    
  } catch (error) {
    console.error("Error resolving service request:", error);
    // Show error toast
    showToast('Error resolving service request', 'danger');
  }
}

// Open combined display in new window
function openCombinedDisplay() {
  // Check if display is already open
  if (appState.combinedDisplay.isOpen && appState.combinedDisplay.windowRef && !appState.combinedDisplay.windowRef.closed) {
    appState.combinedDisplay.windowRef.focus();
    return;
  }
  
  // Build URL
  const userId = appState.currentUser ? appState.currentUser.uid : 'anonymous';
  const url = `./public/combined-display.html?venue=${userId}`;
  
  // Open window
  const screenWidth = window.screen.width;
  const screenHeight = window.screen.height;
  const width = Math.min(screenWidth, 1200);
  const height = Math.min(screenHeight, 800);
  const left = (screenWidth - width) / 2;
  const top = (screenHeight - height) / 2;
  
  const windowRef = window.open(
    url,
    'combinedDisplay',
    `width=${width},height=${height},left=${left},top=${top},location=no,menubar=no,toolbar=no,status=no`
  );
  
  // Update app state
  appState.combinedDisplay.isOpen = true;
  appState.combinedDisplay.windowRef = windowRef;
  appState.combinedDisplay.url = url;
  
  // Add window close event listener
  windowRef.addEventListener('beforeunload', function() {
    appState.combinedDisplay.isOpen = false;
    appState.combinedDisplay.windowRef = null;
  });
  
  // Show toast
  showToast('Combined display opened', 'success');
}

// Helper function to get time since a date
function timeSince(date) {
  const seconds = Math.floor((new Date() - date) / 1000);
  
  let interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + " hours ago";
  }
  
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + " minutes ago";
  }
  
  return "Just now";
}

// Schedule daily cleanup tasks to keep the system uncluttered
function scheduleDailyCleanup() {
  // Check current time
  const now = new Date();
  
  // Set target time to 5:30 AM
  let targetTime = new Date();
  targetTime.setHours(5, 30, 0, 0);
  
  // If it's past 5:30 AM, set target to next day
  if (now > targetTime) {
    targetTime.setDate(targetTime.getDate() + 1);
  }
  
  // Calculate time until target
  const timeUntilTarget = targetTime - now;
  
  // Schedule cleanup
  setTimeout(() => {
    // Run cleanup tasks
    resetCustomTableNames();
    cleanupOldServiceRequests();
    
    // Schedule again for next day
    scheduleDailyCleanup();
    
    console.log("Daily cleanup tasks executed at", new Date().toLocaleString());
    showToast('System reset for new day completed', 'success');
  }, timeUntilTarget);
  
  console.log("Daily cleanup scheduled for", targetTime.toLocaleString());
}

// Change the venue password based on user input
function changeVenuePassword() {
  const passwordInput = document.getElementById('new-password');
  const newPassword = passwordInput.value.trim();
  
  if (!newPassword) {
    showToast('Please enter a password', 'warning');
    return;
  }
  
  // Update the password
  updateVenuePassword(newPassword);
  
  // Clear the input
  passwordInput.value = '';
  
  // Show toast
  showToast('Venue password updated successfully', 'success');
  
  // Close dropdown (needs to be handled via Bootstrap)
  // This is a workaround since we can't directly access the dropdown instance
  document.body.click();
}

// Update the venue password for song ordering
function updateVenuePassword(newPassword) {
  if (!appState.currentUser) return;
  
  // If no password provided, generate a simple one
  if (!newPassword) {
    // Simple words list for generating readable passwords
    const simpleWords = [
      'apple', 'book', 'cake', 'dog', 'egg', 
      'fish', 'grape', 'house', 'ice', 'juice',
      'kite', 'lemon', 'music', 'note', 'orange',
      'pizza', 'queen', 'radio', 'sun', 'table',
      'water', 'yellow', 'zebra'
    ];
    
    // Pick a random simple word
    const randomIndex = Math.floor(Math.random() * simpleWords.length);
    newPassword = simpleWords[randomIndex];
  }
  
  // Save to app state and Firebase
  appState.venuePassword = newPassword;
  appState.passwordUpdatedAt = new Date().toISOString();
  
  saveVenueData(appState.currentUser.uid, {
    venuePassword: newPassword,
    passwordUpdatedAt: appState.passwordUpdatedAt
  }).catch(error => {
    console.error("Error saving venue password:", error);
  });
  
  return newPassword;
}

// Print the venue password for display at the venue
function printVenuePassword() {
  if (!appState.venuePassword) {
    updateVenuePassword();
  }
  
  // Create a printable version
  const printWindow = window.open('', '_blank');
  
  const currentDate = new Date().toLocaleDateString(undefined, { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Venue Song Order Password</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          padding: 20px;
          max-width: 500px;
          margin: 0 auto;
          text-align: center;
        }
        .container {
          border: 2px solid #333;
          padding: 20px;
          margin-bottom: 20px;
        }
        .header {
          font-size: 24px;
          font-weight: bold;
          margin-bottom: 20px;
          color: #3498db;
        }
        .venue-name {
          font-size: 18px;
          margin-bottom: 5px;
        }
        .date {
          font-size: 16px;
          margin-bottom: 30px;
          color: #555;
        }
        .password-label {
          font-size: 14px;
          margin-bottom: 10px;
        }
        .password {
          font-family: sans-serif;
          font-size: 42px;
          font-weight: bold;
          padding: 15px;
          background-color: #f8f9fa;
          border: 1px dashed #dee2e6;
          display: inline-block;
          margin-bottom: 20px;
          color: #333;
        }
        .instructions {
          font-size: 14px;
          color: #555;
          text-align: left;
          margin-top: 30px;
        }
        .footer {
          margin-top: 40px;
          font-size: 12px;
          color: #777;
        }
        @media print {
          body {
            padding: 0;
          }
          .print-button {
            display: none;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">Sipsing DJ Manager</div>
        <div class="venue-name">${appState.venueName}</div>
        <div class="date">${currentDate}</div>
        <div class="password-label">Song Order Password:</div>
        <div class="password">${appState.venuePassword}</div>
        <div class="instructions">
          <p><strong>Instructions for customers:</strong></p>
          <ol>
            <li>To order a song, you must enter this password</li>
            <li>Only those physically present at the venue can see this password</li>
            <li>Please do not share this password outside the venue</li>
          </ol>
        </div>
        <div class="footer">* Display this at the bar or entrance for customers to see.</div>
      </div>
      <button class="print-button" onclick="window.print()">Print Password</button>
    </body>
    </html>
  `);
  
  printWindow.document.close();
  
  // After a short delay, print automatically
  setTimeout(() => {
    printWindow.print();
  }, 500);
}

// Confirm system reset with modal
function confirmResetSystem() {
  // Create modal for confirmation
  const modal = document.createElement('div');
  modal.id = 'reset-system-modal';
  modal.className = 'modal fade';
  modal.setAttribute('tabindex', '-1');
  
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header bg-warning">
          <h5 class="modal-title"><i class="fas fa-exclamation-triangle"></i> Reset System</h5>
          <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <p>You are about to reset the system for a new day. This will:</p>
          <ul>
            <li>Clear all custom table names</li>
            <li>Reset all pending service requests</li>
            <li>Generate a new daily password</li>
            <li>Keep song queue and history</li>
          </ul>
          <p>This is typically done at the end of the day or start of a new business day.</p>
          <div class="form-check mb-3">
            <input class="form-check-input" type="checkbox" id="reset-confirmation">
            <label class="form-check-label" for="reset-confirmation">
              I understand this action cannot be undone
            </label>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-warning" id="reset-confirm-btn" disabled>
            Reset System
          </button>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to body
  document.body.appendChild(modal);
  
  // Initialize Bootstrap modal
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
  
  // Checkbox enablement
  const checkbox = document.getElementById('reset-confirmation');
  const confirmBtn = document.getElementById('reset-confirm-btn');
  
  checkbox.addEventListener('change', function() {
    confirmBtn.disabled = !this.checked;
  });
  
  // Add event listener for confirm button
  confirmBtn.addEventListener('click', function() {
    // Show loading spinner
    confirmBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Resetting...';
    confirmBtn.disabled = true;
    
    // Perform reset
    const newPassword = manualDailyCleanup();
    
    // Close modal
    modalInstance.hide();
    
    // Show success modal with new password
    if (newPassword) {
      showPasswordModal(newPassword);
    }
  });
  
  // Handle modal hidden event (remove from DOM)
  modal.addEventListener('hidden.bs.modal', function() {
    document.body.removeChild(modal);
  });
}

// Show the new password after reset
function showPasswordModal(password) {
  // Create modal for the new password
  const modal = document.createElement('div');
  modal.id = 'new-password-modal';
  modal.className = 'modal fade';
  modal.setAttribute('tabindex', '-1');
  
  modal.innerHTML = `
    <div class="modal-dialog">
      <div class="modal-content">
        <div class="modal-header bg-success text-white">
          <h5 class="modal-title"><i class="fas fa-check-circle"></i> System Reset Complete</h5>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <div class="alert alert-success">
            <i class="fas fa-sync"></i> The system has been reset for a new day.
          </div>
          
          <div class="card mb-3">
            <div class="card-header bg-primary text-white">
              <h5 class="card-title mb-0"><i class="fas fa-key"></i> Venue Password</h5>
            </div>
            <div class="card-body text-center">
              <p class="mb-2">Your venue's song order password is:</p>
              <div class="display-5 fw-bold bg-light p-3 mb-3 border rounded">
                ${password}
              </div>
              <p class="small text-muted">Display this password at your venue for customers to use when ordering songs.</p>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-primary" onclick="printVenuePassword()">
            <i class="fas fa-print"></i> Print Password
          </button>
          <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to body
  document.body.appendChild(modal);
  
  // Initialize Bootstrap modal
  const modalInstance = new bootstrap.Modal(modal);
  modalInstance.show();
  
  // Handle modal hidden event (remove from DOM)
  modal.addEventListener('hidden.bs.modal', function() {
    document.body.removeChild(modal);
  });
}

// Manual cleanup for staff to reset the system
function manualDailyCleanup() {
  if (!appState.currentUser) return false;
  
  try {
    // Run all cleanup tasks
    resetCustomTableNames();
    cleanupOldServiceRequests();
    
    // Reset all pending requests
    appState.pendingRequests = {};
    
    // Reset service requests but keep a history of the last 20
    const resolvedRequests = appState.serviceRequests
      .filter(req => req.status !== 'pending')
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 20);
    
    appState.serviceRequests = resolvedRequests;
    
    // Save to Firebase
    saveVenueData(appState.currentUser.uid, {
      pendingRequests: appState.pendingRequests,
      serviceRequests: appState.serviceRequests
    });
    
    showToast('System has been reset for a new day', 'success');
    return appState.venuePassword || updateVenuePassword();
  } catch (error) {
    console.error("Error during manual cleanup:", error);
    showToast('Error during system reset', 'danger');
    return false;
  }
}

// Get the current song price based on time and settings
function getCurrentSongPrice() {
  // Check if pricing is disabled (free)
  if (appState.workflow.enableFreeSongs) {
    return 0;
  }
  
  // Check for time-based pricing
  if (appState.workflow.enableTimeBasedPricing && appState.workflow.timePricingRules.length > 0) {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Find the matching time rule
    for (const rule of appState.workflow.timePricingRules) {
      if (currentHour >= rule.startHour && currentHour < rule.endHour) {
        return rule.price;
      }
    }
  }
  
  // Return standard price
  return appState.workflow.songPrice || 2; // Default to $2 if not set
}

// Helper to check if a pricing rule is currently active
function isCurrentPricingRule(rule) {
  const currentHour = new Date().getHours();
  return currentHour >= rule.startHour && currentHour < rule.endHour;
}

// Helper to format hour range for display
function formatHourRange(startHour, endHour) {
  // Format hours for 12-hour display
  function formatHour(hour) {
    const isPM = hour >= 12;
    const hour12 = hour === 0 ? 12 : (hour > 12 ? hour - 12 : hour);
    return `${hour12}${isPM ? 'PM' : 'AM'}`;
  }
  
  return `${formatHour(startHour)} - ${formatHour(endHour)}`;
}

// Add a new time-based pricing rule
function addTimePricingRule(startHour, endHour, price) {
  if (!appState.currentUser) return;
  
  // Validate input
  startHour = Math.max(0, Math.min(24, startHour));
  endHour = Math.max(0, Math.min(24, endHour));
  price = Math.max(0, Math.min(appState.workflow.maxSongPrice, price));
  
  // Check for overlaps
  const rules = appState.workflow.timePricingRules || [];
  const hasOverlap = rules.some(rule => 
    (startHour < rule.endHour && endHour > rule.startHour)
  );
  
  if (hasOverlap) {
    showToast('Time ranges cannot overlap', 'danger');
    return false;
  }
  
  // Add new rule
  appState.workflow.timePricingRules.push({ startHour, endHour, price });
  
  // Sort rules by start time
  appState.workflow.timePricingRules.sort((a, b) => a.startHour - b.startHour);
  
  // Save to Firebase
  saveVenueData(appState.currentUser.uid, {
    workflow: appState.workflow
  }).then(() => {
    showToast('Time-based pricing rule added', 'success');
    return true;
  }).catch(error => {
    console.error("Error saving time pricing rule:", error);
    showToast('Error saving pricing rule', 'danger');
    return false;
  });
}

// Delete a time-based pricing rule
function deleteTimePricingRule(index) {
  if (!appState.currentUser || 
      !appState.workflow.timePricingRules || 
      index >= appState.workflow.timePricingRules.length) {
    return false;
  }
  
  // Remove rule
  appState.workflow.timePricingRules.splice(index, 1);
  
  // Make sure we always have at least one rule
  if (appState.workflow.timePricingRules.length === 0) {
    appState.workflow.timePricingRules.push({ startHour: 0, endHour: 24, price: appState.workflow.songPrice || 2 });
  }
  
  // Save to Firebase
  saveVenueData(appState.currentUser.uid, {
    workflow: appState.workflow
  }).then(() => {
    showToast('Time-based pricing rule deleted', 'success');
    return true;
  }).catch(error => {
    console.error("Error deleting time pricing rule:", error);
    showToast('Error deleting pricing rule', 'danger');
    return false;
  });
}

// Register a new remote user
function registerRemoteUser(name, email) {
  if (!appState.currentUser || !appState.workflow.enableRemoteOrdering) return false;
  
  try {
    // Generate a unique ID for this remote user
    const userId = `remote_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    
    // Create user object
    const remoteUser = {
      id: userId,
      name: name.trim().substring(0, 30), // Limit name length
      email: email,
      type: 'remote',
      createdAt: new Date().toISOString(),
      lastActive: new Date().toISOString(),
      orders: []
    };
    
    // Add to app state
    appState.remoteUsers[userId] = remoteUser;
    
    // Save to Firebase
    saveVenueData(appState.currentUser.uid, {
      remoteUsers: appState.remoteUsers
    });
    
    return userId;
  } catch (error) {
    console.error("Error registering remote user:", error);
    return false;
  }
}

// Add a remote song order (donation)
function addRemoteSongOrder(remoteUserId, songName, forTable, donationAmount) {
  if (!appState.currentUser || !appState.workflow.enableRemoteOrdering) return false;
  
  try {
    // Validate required fields
    if (!remoteUserId || !songName || !forTable || !donationAmount) {
      return { success: false, error: "Missing required information" };
    }
    
    // Check for user
    const remoteUser = appState.remoteUsers[remoteUserId];
    if (!remoteUser) {
      return { success: false, error: "Remote user not found" };
    }
    
    // Validate donation amount (must be >= base price + surcharge)
    const minAmount = appState.workflow.songPrice + appState.workflow.remoteOrderingSurcharge;
    if (donationAmount < minAmount) {
      return { success: false, error: `Minimum donation amount is $${minAmount}` };
    }
    
    // Create a song order
    const order = {
      id: Date.now().toString(),
      remoteUserId: remoteUserId,
      songName: songName,
      forTable: forTable,
      donationAmount: donationAmount,
      status: 'pending', // pending, accepted, rejected, completed
      timestamp: new Date().toISOString()
    };
    
    // Add to user's orders
    remoteUser.orders.push(order);
    remoteUser.lastActive = new Date().toISOString();
    
    // Add to song queue
    const queueItem = {
      spotId: forTable,
      songName: songName,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
      price: appState.workflow.songPrice,
      donatedBy: remoteUser.name,
      donationAmount: donationAmount,
      isRemoteOrder: true,
      remoteOrderId: order.id
    };
    
    // Add to queue and sort
    appState.songQueue.push(queueItem);
    
    // Sort the queue (remote orders with donations act like bids)
    sortQueueByBids();
    
    // Save changes to Firebase
    saveVenueData(appState.currentUser.uid, {
      remoteUsers: appState.remoteUsers,
      songQueue: appState.songQueue
    });
    
    // Update UI
    updateQueueDisplay();
    
    // Add a chat notification
    addSystemChatMessage(`${remoteUser.name} donated $${donationAmount} for "${songName}" to be sung at ${getSpotDisplay(forTable)}`);
    
    return { success: true, order: order };
  } catch (error) {
    console.error("Error adding remote song order:", error);
    return { success: false, error: "An error occurred" };
  }
}

// Chat functions
function addChatMessage(userId, message, type = 'user') {
  if (!appState.workflow.enableChat) return false;
  
  try {
    // Create a message object
    const chatMessage = {
      id: Date.now().toString(),
      userId: userId,
      message: message.trim().substring(0, 200), // Limit message length
      type: type, // user, system, admin
      timestamp: new Date().toISOString(),
      approved: !appState.workflow.moderateChat // Auto-approve if moderation is off
    };
    
    // If moderation is enabled, add to pending messages
    if (appState.workflow.moderateChat && type === 'user') {
      appState.pendingChatMessages.push(chatMessage);
    } else {
      // Otherwise add directly to chat
      appState.chatMessages.push(chatMessage);
      
      // Keep only the last 100 messages
      if (appState.chatMessages.length > 100) {
        appState.chatMessages = appState.chatMessages.slice(-100);
      }
    }
    
    // Save to Firebase
    saveVenueData(appState.currentUser.uid, {
      chatMessages: appState.chatMessages,
      pendingChatMessages: appState.pendingChatMessages
    });
    
    return true;
  } catch (error) {
    console.error("Error adding chat message:", error);
    return false;
  }
}

// Add a system message to the chat
function addSystemChatMessage(message) {
  return addChatMessage('system', message, 'system');
}

// Approve a pending chat message
function approveChatMessage(messageId) {
  if (!appState.currentUser || !appState.workflow.moderateChat) return false;
  
  try {
    // Find the message
    const messageIndex = appState.pendingChatMessages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return false;
    
    // Move from pending to approved
    const message = appState.pendingChatMessages[messageIndex];
    message.approved = true;
    appState.chatMessages.push(message);
    appState.pendingChatMessages.splice(messageIndex, 1);
    
    // Keep only the last 100 messages
    if (appState.chatMessages.length > 100) {
      appState.chatMessages = appState.chatMessages.slice(-100);
    }
    
    // Save to Firebase
    saveVenueData(appState.currentUser.uid, {
      chatMessages: appState.chatMessages,
      pendingChatMessages: appState.pendingChatMessages
    });
    
    return true;
  } catch (error) {
    console.error("Error approving chat message:", error);
    return false;
  }
}

// Reject a pending chat message
function rejectChatMessage(messageId) {
  if (!appState.currentUser || !appState.workflow.moderateChat) return false;
  
  try {
    // Find the message
    const messageIndex = appState.pendingChatMessages.findIndex(m => m.id === messageId);
    if (messageIndex === -1) return false;
    
    // Remove from pending
    appState.pendingChatMessages.splice(messageIndex, 1);
    
    // Save to Firebase
    saveVenueData(appState.currentUser.uid, {
      pendingChatMessages: appState.pendingChatMessages
    });
    
    return true;
  } catch (error) {
    console.error("Error rejecting chat message:", error);
    return false;
  }
}

// Helper function to get service type icon
function getServiceTypeIcon(type) {
  switch(type) {
    case 'waiter': 
      return 'fas fa-utensils';
    case 'bartender': 
      return 'fas fa-glass-martini-alt';
    case 'manager': 
      return 'fas fa-user-tie';
    default: 
      return 'fas fa-bell';
  }
}

// Show a toast notification
function showToast(message, type = 'info') {
  const toastContainer = document.getElementById('toast-container');
  
  // Create container if it doesn't exist
  if (!toastContainer) {
    const newContainer = document.createElement('div');
    newContainer.id = 'toast-container';
    newContainer.className = 'position-fixed bottom-0 end-0 p-3';
    newContainer.style.zIndex = '5000';
    document.body.appendChild(newContainer);
  }
  
  // Create toast
  const toastId = 'toast-' + Date.now();
  const toast = document.createElement('div');
  toast.id = toastId;
  toast.className = `toast align-items-center text-white bg-${type} border-0`;
  toast.setAttribute('role', 'alert');
  toast.setAttribute('aria-live', 'assertive');
  toast.setAttribute('aria-atomic', 'true');
  
  toast.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">
        ${message}
      </div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
    </div>
  `;
  
  // Add to container
  document.getElementById('toast-container').appendChild(toast);
  
  // Initialize and show toast
  const bsToast = new bootstrap.Toast(toast, { delay: 3000 });
  bsToast.show();
  
  // Remove from DOM when hidden
  toast.addEventListener('hidden.bs.toast', function() {
    if (document.getElementById(toastId)) {
      document.getElementById(toastId).remove();
    }
  });
}

// Load venue data from Firebase
async function loadVenueData(userId) {
  try {
    const result = await getVenueData(userId);
    
    if (result.success) {
      console.log("Loaded venue data:", result.data);
      
      // Schedule daily cleanup tasks
      scheduleDailyCleanup();
      
      // Update app state with venue data
      appState.venueName = result.data.venueName || "My Karaoke Venue";
      
      // Load spots (tables and seats)
      if (result.data.spots) {
        appState.spots = result.data.spots;
      } else {
        // Initialize with default spots if none exist
        initializeVenueData();
        return; // initializeVenueData will call buildMainUI
      }
      
      // Load song queue
      if (result.data.songQueue) {
        appState.songQueue = result.data.songQueue;
      }
      
      // Load history
      if (result.data.history) {
        appState.history = result.data.history;
      }
      
      // Load current singing
      if (result.data.currentSinging) {
        appState.currentSinging = result.data.currentSinging;
        appState.timeElapsed = result.data.timeElapsed || 0;
        appState.timeIsUp = result.data.timeIsUp || false;
      }
      
      // Load service requests
      if (result.data.serviceRequests) {
        appState.serviceRequests = result.data.serviceRequests;
      }
      
      // Load pending requests
      if (result.data.pendingRequests) {
        appState.pendingRequests = result.data.pendingRequests;
      }
      
      // Load song database
      if (result.data.songDatabase) {
        appState.songDatabase = result.data.songDatabase;
      }
      
      // Load settings
      if (result.data.uiSettings) {
        appState.uiSettings = { ...appState.uiSettings, ...result.data.uiSettings };
      }
      
      if (result.data.workflow) {
        appState.workflow = { ...appState.workflow, ...result.data.workflow };
      }
      
      // Load wallet data
      if (result.data.wallets) {
        appState.wallets = result.data.wallets;
      } else {
        // Initialize wallets if not present
        const wallets = {};
        Object.keys(appState.spots).forEach(spotId => {
          wallets[spotId] = 0;
        });
        appState.wallets = wallets;
      }
      
      // Load pending payments
      if (result.data.pendingPayments) {
        appState.pendingPayments = result.data.pendingPayments;
      } else {
        appState.pendingPayments = {};
      }
      
      // Load venue layout
      if (result.data.venueLayout) {
        appState.venueLayout = { ...appState.venueLayout, ...result.data.venueLayout };
      }
      
      // Load recordings
      if (result.data.recordings) {
        appState.recordings = result.data.recordings;
      }
      
      // Load sharing options
      if (result.data.sharingOptions) {
        appState.sharingOptions = result.data.sharingOptions;
      }
      
      // Build main UI
      buildMainUI();
      
      // Resume timer if a song is in progress
      if (appState.currentSinging) {
        startSongTimer();
      }
    } else {
      console.error("Error loading venue data:", result.error);
      // Initialize with default data if loading fails
      initializeVenueData();
    }
  } catch (error) {
    console.error("Error loading venue data:", error);
    // Initialize with default data if loading fails
    initializeVenueData();
  }
}

// Save data to Firebase
function saveToFirebase(updates) {
  // Don't save if user is anonymous
  if (appState.isAnonymous || !appState.currentUser) {
    console.log("User is anonymous, not saving to Firebase");
    return;
  }
  
  // Save to Firebase
  saveVenueData(appState.currentUser.uid, updates)
    .then(result => {
      if (!result.success) {
        console.error("Error saving to Firebase:", result.error);
      }
    })
    .catch(error => {
      console.error("Error saving to Firebase:", error);
    });
}

// Build the main application UI
function buildMainUI() {
  const appElement = document.getElementById('app');
  
  // Set up service request listener
  setupServiceRequestListener();
  
  // Main app structure with tabs
  appElement.innerHTML = `
    <div class="container-fluid p-3">
      <!-- Header bar -->
      <header class="d-flex justify-content-between align-items-center mb-4 p-3 bg-primary text-white rounded">
        <div>
          <h1 class="mb-0 d-flex align-items-center">
            <i class="fas fa-music me-2"></i>
            Sipsing DJ Manager
          </h1>
          <p class="mb-0">${appState.venueName}</p>
        </div>
        <div class="d-flex align-items-center">
          <div id="service-notifications" class="position-relative mx-2">
            <button class="btn btn-light position-relative" id="service-bell-btn">
              <i class="fas fa-bell"></i>
              <span id="service-count" class="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger" style="display: none;">
                0
              </span>
            </button>
          </div>
          <div class="mx-2">
            <button class="btn btn-info" id="combined-display-header-btn" onclick="openCombinedDisplay()">
              <i class="fas fa-tv"></i> Venue Display
            </button>
          </div>
          <div class="mx-2">
            <div class="dropdown">
              <button class="btn btn-warning dropdown-toggle" type="button" id="passwordDropdown" data-bs-toggle="dropdown" aria-expanded="false">
                <i class="fas fa-key"></i> Venue Password
              </button>
              <div class="dropdown-menu p-3" aria-labelledby="passwordDropdown" style="min-width: 300px;">
                <div class="mb-2">
                  <h6 class="mb-2">Current Password:</h6>
                  <div class="bg-light p-2 border rounded text-center mb-2">
                    <span class="fs-4 fw-bold">${appState.venuePassword || 'Not set'}</span>
                  </div>
                </div>
                <p class="small text-muted mb-2">This password is required for customers to order songs. Display it at your venue.</p>
                <div class="mb-3">
                  <label for="new-password" class="form-label small">Change Password:</label>
                  <div class="input-group">
                    <input type="text" class="form-control" id="new-password" placeholder="New password">
                    <button class="btn btn-outline-secondary" type="button" onclick="changeVenuePassword()">
                      <i class="fas fa-save"></i>
                    </button>
                  </div>
                </div>
                <div class="d-grid gap-2">
                  <button class="btn btn-sm btn-primary" onclick="printVenuePassword()">
                    <i class="fas fa-print"></i> Print Password
                  </button>
                  <button class="btn btn-sm btn-outline-secondary" onclick="updateVenuePassword(); showToast('Password updated', 'success');">
                    <i class="fas fa-sync"></i> Generate Random
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="mx-2">
            ${appState.isAnonymous ? 
              `<span class="badge bg-warning text-dark"><i class="fas fa-exclamation-triangle"></i> Offline Mode</span>` : 
              `<span class="badge bg-success"><i class="fas fa-cloud"></i> Cloud Synchronized</span>`
            }
          </div>
          <button class="btn btn-light" id="logout-btn" ${appState.isAnonymous ? 'style="display: none;"' : ''}>
            <i class="fas fa-sign-out-alt"></i> Logout
          </button>
        </div>
      </header>
      
      <!-- Status bar for current singer -->
      <div id="now-singing-area" class="mb-4">
        <!-- Will be populated by updateNowSingingDisplay() -->
      </div>
      
      <!-- Main tabs -->
      <ul class="nav nav-tabs mb-4" id="main-tabs" role="tablist">
        <li class="nav-item" role="presentation">
          <button class="nav-link active" id="queue-tab-btn" data-bs-toggle="tab" data-bs-target="#queue-tab" type="button" role="tab" aria-controls="queue-tab" aria-selected="true">
            <i class="fas fa-list"></i> Queue
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="tables-tab-btn" data-bs-toggle="tab" data-bs-target="#tables-tab" type="button" role="tab" aria-controls="tables-tab" aria-selected="false">
            <i class="fas fa-chair"></i> Tables
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="layout-tab-btn" data-bs-toggle="tab" data-bs-target="#layout-tab" type="button" role="tab" aria-controls="layout-tab" aria-selected="false">
            <i class="fas fa-vector-square"></i> Layout
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="recordings-tab-btn" data-bs-toggle="tab" data-bs-target="#recordings-tab" type="button" role="tab" aria-controls="recordings-tab" aria-selected="false">
            <i class="fas fa-microphone"></i> Recordings
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="history-tab-btn" data-bs-toggle="tab" data-bs-target="#history-tab" type="button" role="tab" aria-controls="history-tab" aria-selected="false">
            <i class="fas fa-history"></i> History
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button class="nav-link" id="settings-tab-btn" data-bs-toggle="tab" data-bs-target="#settings-tab" type="button" role="tab" aria-controls="settings-tab" aria-selected="false">
            <i class="fas fa-cog"></i> Settings
          </button>
        </li>
      </ul>
      
      <!-- Tab content -->
      <div class="tab-content" id="main-tab-content">
        <!-- Queue Tab -->
        <div class="tab-pane fade show active" id="queue-tab" role="tabpanel" aria-labelledby="queue-tab-btn">
          <!-- Will be populated by buildQueueTab() -->
        </div>
        
        <!-- Tables Tab -->
        <div class="tab-pane fade" id="tables-tab" role="tabpanel" aria-labelledby="tables-tab-btn">
          <!-- Will be populated by buildTablesTab() -->
        </div>
        
        <!-- Layout Tab -->
        <div class="tab-pane fade" id="layout-tab" role="tabpanel" aria-labelledby="layout-tab-btn">
          <!-- Will be populated by buildLayoutTab() -->
        </div>
        
        <!-- Recordings Tab -->
        <div class="tab-pane fade" id="recordings-tab" role="tabpanel" aria-labelledby="recordings-tab-btn">
          <!-- Will be populated by buildRecordingsTab() -->
        </div>
        
        <!-- History Tab -->
        <div class="tab-pane fade" id="history-tab" role="tabpanel" aria-labelledby="history-tab-btn">
          <!-- Will be populated by buildHistoryTab() -->
        </div>
        
        <!-- Settings Tab -->
        <div class="tab-pane fade" id="settings-tab" role="tabpanel" aria-labelledby="settings-tab-btn">
          <!-- Will be populated by buildSettingsTab() -->
        </div>
      </div>
      
      <!-- Toast container for notifications -->
      <div class="toast-container position-fixed bottom-0 end-0 p-3"></div>
    </div>
  `;
  
  // Add event listener for logout button
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  
  // Build individual tabs
  buildQueueTab();
  buildTablesTab();
  buildLayoutTab();
  buildRecordingsTab();
  buildHistoryTab();
  buildSettingsTab();
  
  // Update now singing display
  updateNowSingingDisplay();
  
  // Apply UI settings
  applyUISettings();
  
  // Check if queue display window is open
  checkQueueDisplayWindow();
  
  // Start periodic check of queue display window
  setInterval(checkQueueDisplayWindow, 5000);
}

// Check if queue display window is still open
function checkQueueDisplayWindow() {
  if (appState.queueDisplay.windowRef && appState.queueDisplay.windowRef.closed) {
    appState.queueDisplay.isOpen = false;
    appState.queueDisplay.windowRef = null;
    
    // Update UI
    updateQueueDisplayButton();
  }
}

// Apply UI settings
function applyUISettings() {
  const body = document.body;
  
  // Apply theme
  body.classList.remove('theme-default', 'theme-dark', 'theme-light');
  body.classList.add(`theme-${appState.uiSettings.theme}`);
  
  // Apply color scheme
  body.dataset.colorScheme = appState.uiSettings.colorScheme;
  
  // Apply compact view
  if (appState.uiSettings.compactView) {
    body.classList.add('compact-view');
  } else {
    body.classList.remove('compact-view');
  }
}

// Handle logout button click
async function handleLogout() {
  const result = await logOut();
  
  if (result.success) {
    // Reset state and show login screen
    appState.currentUser = null;
    appState.isAnonymous = false;
    showLoginScreen();
  } else {
    // Show error notification
    showNotification('Logout failed: ' + result.error, 'error');
  }
}

// Build the Queue Tab UI
function buildQueueTab() {
  const queueTab = document.getElementById('queue-tab');
  
  // Get current price based on time of day
  const currentPrice = getCurrentSongPrice();
  
  queueTab.innerHTML = `
    <div class="row">
      <!-- Song input form -->
      <div class="col-md-4 mb-4">
        <div class="card shadow-sm">
          <div class="card-header bg-primary text-white">
            <h2 class="card-title mb-0"><i class="fas fa-plus-circle"></i> Add Song</h2>
          </div>
          <div class="card-body">
            <form id="add-song-form" class="mb-0">
              <div class="mb-3">
                <label for="song-name" class="form-label">Song Name</label>
                <input type="text" class="form-control form-control-lg" id="song-name" required placeholder="Enter song name and artist">
              </div>
              
              <div class="mb-3">
                <label for="song-spot" class="form-label">Select Table/Seat</label>
                <select class="form-select form-select-lg" id="song-spot" required>
                  <option value="" disabled selected>Choose table/seat</option>
                  <optgroup label="Tables">
                    ${Object.values(appState.spots)
                      .filter(spot => spot.id.startsWith('table_'))
                      .map(spot => `<option value="${spot.id}">${spot.name}${spot.occupant ? ` (${spot.occupant})` : ''}</option>`)
                      .join('')}
                  </optgroup>
                  <optgroup label="Bar Seats">
                    ${Object.values(appState.spots)
                      .filter(spot => spot.id.startsWith('bar_'))
                      .map(spot => `<option value="${spot.id}">${spot.name}${spot.occupant ? ` (${spot.occupant})` : ''}</option>`)
                      .join('')}
                  </optgroup>
                </select>
              </div>
              
              <!-- Current song pricing information -->
              <div class="mb-3">
                <div class="card bg-light">
                  <div class="card-body py-2">
                    <div class="d-flex justify-content-between align-items-center">
                      <span class="fw-bold">Current Song Price:</span>
                      <span class="fs-5 text-${currentPrice === 0 ? 'success' : 'primary'} fw-bold">
                        ${currentPrice === 0 ? 'FREE' : `$${currentPrice}`}
                      </span>
                    </div>
                    ${appState.workflow.enableTimeBasedPricing ? 
                      `<div class="small text-muted mt-1">
                        <i class="fas fa-clock"></i> Time-based pricing is in effect
                      </div>` : ''}
                  </div>
                </div>
              </div>
              
              ${appState.workflow.enableCustomPricing ? `
              <div class="mb-3">
                <label for="song-custom-price" class="form-label">Custom Price ($)</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="fas fa-dollar-sign"></i></span>
                  <input type="number" class="form-control" id="song-custom-price" 
                         min="0" max="${appState.workflow.maxSongPrice}" value="${currentPrice}" placeholder="Custom price">
                </div>
                <div class="form-text">
                  Optional: Enter a custom price for this song (0-${appState.workflow.maxSongPrice})
                </div>
              </div>
              ` : ''}
              
              ${appState.workflow.enableBidding ? `
              <div class="mb-3">
                <label for="song-bid" class="form-label">Bid Amount ($)</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="fas fa-dollar-sign"></i></span>
                  <input type="number" class="form-control form-control-lg" id="song-bid" 
                         min="0" step="${appState.workflow.bidIncrement}" value="0" placeholder="0 = No bid">
                  <button class="btn btn-warning" type="button" data-bs-toggle="tooltip" 
                          title="Minimum bid: $${appState.workflow.minimumBid}. Bids place songs higher in the queue.">
                    <i class="fas fa-info-circle"></i>
                  </button>
                </div>
                <div class="form-text">
                  Optional: $${appState.workflow.minimumBid} minimum bid to boost position
                </div>
              </div>
              ` : ''}
              
              <div id="add-song-error" class="alert alert-danger d-none"></div>
              
              <div class="d-grid">
                <button type="submit" class="btn btn-primary btn-lg">
                  <i class="fas fa-plus-circle"></i> Add to Queue
                </button>
              </div>
            </form>
          </div>
        </div>
        
        ${appState.workflow.enableBidding ? `
        <div class="card shadow-sm mt-3">
          <div class="card-header bg-warning text-dark">
            <h5 class="card-title mb-0">
              <i class="fas fa-dollar-sign"></i> Bidding System Enabled
            </h5>
          </div>
          <div class="card-body">
            <p>Customers can pay to boost their songs in the queue!</p>
            <p class="mb-0"><strong>Minimum bid:</strong> $${appState.workflow.minimumBid}</p>
            <p class="mb-0"><strong>Bid increments:</strong> $${appState.workflow.bidIncrement}</p>
            <div class="d-flex gap-2 mt-3">
              <button id="queue-display-btn" class="btn btn-primary flex-grow-1" onclick="openQueueDisplay()">
                <i class="fas fa-desktop"></i> Open Queue Display
              </button>
              <button id="combined-display-btn" class="btn btn-info flex-grow-1" onclick="openCombinedDisplay()">
                <i class="fas fa-tv"></i> Venue & Queue
              </button>
            </div>
          </div>
        </div>
        ` : ''}
        
        ${appState.workflow.enableTimeBasedPricing ? `
        <div class="card shadow-sm mt-3">
          <div class="card-header bg-info text-dark">
            <h5 class="card-title mb-0">
              <i class="fas fa-clock"></i> Time-Based Pricing
            </h5>
          </div>
          <div class="card-body">
            <p>Song prices change throughout the day:</p>
            <div class="list-group">
              ${appState.workflow.timePricingRules.map(rule => `
                <div class="list-group-item ${isCurrentPricingRule(rule) ? 'active' : ''}">
                  <div class="d-flex justify-content-between align-items-center">
                    <span>${formatHourRange(rule.startHour, rule.endHour)}</span>
                    <span class="badge bg-${rule.price === 0 ? 'success' : 'primary'} rounded-pill">
                      ${rule.price === 0 ? 'FREE' : `$${rule.price}`}
                    </span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        ` : ''}
      </div>
      
      <!-- Song queue -->
      <div class="col-md-8">
        <div class="card shadow-sm">
          <div class="card-header bg-primary text-white">
            <div class="d-flex justify-content-between align-items-center">
              <h2 class="card-title mb-0"><i class="fas fa-list"></i> Song Queue</h2>
              <div class="d-flex gap-2">
                <button class="btn btn-warning" onclick="confirmResetSystem()">
                  <i class="fas fa-sync"></i> Reset System
                </button>
                <button class="btn btn-light" onclick="confirmClearQueue()">
                  <i class="fas fa-trash"></i> Clear Queue
                </button>
              </div>
            </div>
          </div>
          <div class="card-body">
            <div id="song-queue-table">
              <!-- Will be populated by updateQueueDisplay() -->
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add event listener for form submission
  document.getElementById('add-song-form').addEventListener('submit', handleAddSong);
  
  // Initialize tooltips
  if (typeof bootstrap !== 'undefined') {
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
      return new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }
  
  // Update the queue display
  updateQueueDisplay();
}

// Update the song queue display
function updateQueueDisplay() {
  const songQueueTable = document.getElementById('song-queue-table');
  
  if (!appState.songQueue || appState.songQueue.length === 0) {
    songQueueTable.innerHTML = `
      <div class="text-center py-4">
        <i class="fas fa-list fa-3x text-secondary mb-3"></i>
        <p class="fs-5 text-dark">No songs in queue</p>
        <p class="text-secondary">Songs will appear here after adding them using the form above</p>
      </div>
    `;
    return;
  }
  
  // Build the queue table
  let tableHTML = `
    <div class="table-responsive">
      <table class="table table-hover border">
        <thead class="table-dark">
          <tr>
            <th class="text-center" style="width: 60px;">Order</th>
            <th>Song</th>
            <th style="width: 160px;">Seat</th>
            ${appState.workflow.enableBidding ? `<th class="text-center" style="width: 100px;">Bid</th>` : ''}
            <th class="text-center" style="width: 120px;">Actions</th>
          </tr>
        </thead>
        <tbody>
  `;
  
  appState.songQueue.forEach((item, index) => {
    // Alternate row colors for better readability
    const rowClass = index % 2 === 0 ? 'table-light' : '';
    // Add bid highlight class if there's a bid
    const hasBid = appState.workflow.enableBidding && (item.bid > 0);
    if (hasBid) rowClass += ' bid-highlight';
    
    tableHTML += `
      <tr class="${rowClass}">
        <td class="text-center align-middle">
          <span class="badge bg-secondary rounded-circle p-2 fs-6">${index + 1}</span>
          <div class="d-flex justify-content-center gap-1 mt-2">
            ${index > 0 ? `
              <button class="btn btn-sm btn-outline-dark" onclick="moveSongUp(${index})" title="Move Up">
                <i class="fas fa-arrow-up"></i>
              </button>
            ` : ''}
            ${index < appState.songQueue.length - 1 ? `
              <button class="btn btn-sm btn-outline-dark" onclick="moveSongDown(${index})" title="Move Down">
                <i class="fas fa-arrow-down"></i>
              </button>
            ` : ''}
          </div>
        </td>
        <td class="align-middle">
          <input type="text" class="form-control form-control-lg border-secondary text-dark" value="${item.songName}" 
                 onchange="updateSongName(${index}, this.value)">
        </td>
        <td class="text-dark small align-middle fw-bold">
          ${getSpotDisplay(item.spotId)}
          ${item.price !== undefined ? 
            `<div class="small text-${item.price === 0 ? 'success' : 'primary'} mt-1">
              ${item.price === 0 ? 'Free' : `$${item.price}`}
            </div>` : 
            ''}
        </td>
        ${appState.workflow.enableBidding ? `
        <td class="text-center align-middle">
          ${item.bid > 0 ? 
            `<div class="bid-badge mb-1">$${item.bid}</div>` : 
            `<span class="text-muted">No bid</span>`}
          <button class="btn btn-sm btn-outline-warning" onclick="showBidDialog(${index})">
            ${item.bid > 0 ? 'Update' : 'Add'} Bid
          </button>
        </td>
        ` : ''}
        <td class="text-center align-middle">
          <div class="d-flex flex-column gap-2">
            <button class="btn btn-success" onclick="startCurrentSong('${item.spotId}', '${item.songName}')" title="Start Now">
              <i class="fas fa-play"></i> Start
            </button>
            <div class="btn-group mt-1">
              ${index > 0 ? `
                <button class="btn btn-danger btn-sm" onclick="boostSongToTop('${item.spotId}', '${item.songName}')" title="Boost to Top">
                  <i class="fas fa-bolt"></i> Boost
                </button>
              ` : ''}
              <button class="btn btn-outline-danger btn-sm" onclick="deleteSongFromQueue(${index})" title="Remove Song">
                <i class="fas fa-trash"></i>
              </button>
            </div>
          </div>
        </td>
      </tr>
    `;
  });
  
  tableHTML += `
        </tbody>
      </table>
    </div>
  `;
  
  songQueueTable.innerHTML = tableHTML;
}

// Handle add song form submission
function handleAddSong(event) {
  event.preventDefault();
  
  const songNameInput = document.getElementById('song-name');
  const spotSelect = document.getElementById('song-spot');
  const bidInput = document.getElementById('song-bid');
  const errorElement = document.getElementById('add-song-error');
  
  const songName = songNameInput.value.trim();
  const spotId = spotSelect.value;
  let bid = 0;
  
  // Get current song price based on time of day
  const currentPrice = getCurrentSongPrice();
  
  // If we're using custom pricing, check for price input
  const customPriceInput = document.getElementById('song-custom-price');
  let songPrice = currentPrice;
  
  if (appState.workflow.enableCustomPricing && customPriceInput) {
    const customPrice = parseFloat(customPriceInput.value);
    if (!isNaN(customPrice) && customPrice >= 0 && customPrice <= appState.workflow.maxSongPrice) {
      songPrice = customPrice;
    }
  }
  
  // Check for bid amount if bidding is enabled
  if (appState.workflow.enableBidding && bidInput) {
    bid = parseInt(bidInput.value) || 0;
    
    // Validate bid amount
    if (bid > 0 && bid < appState.workflow.minimumBid) {
      errorElement.textContent = `Minimum bid is $${appState.workflow.minimumBid}`;
      errorElement.classList.remove('d-none');
      return;
    }
    
    // Validate against wallet balance
    const walletBalance = appState.wallets[spotId] || 0;
    if (bid > 0 && bid > walletBalance) {
      errorElement.textContent = `Insufficient funds in wallet. Current balance: $${walletBalance}`;
      errorElement.classList.remove('d-none');
      return;
    }
  }
  
  // Show error if no song name
  if (!songName) {
    errorElement.textContent = "Please enter a song name";
    errorElement.classList.remove('d-none');
    return;
  }
  
  // Show error if no spot selected
  if (!spotId) {
    errorElement.textContent = "Please select a table or seat";
    errorElement.classList.remove('d-none');
    return;
  }
  
  // Check if we can add a song for this table based on workflow settings
  if (!canAddSongForTable(spotId)) {
    errorElement.textContent = "Cannot add another song for this table right now based on your workflow settings";
    errorElement.classList.remove('d-none');
    return;
  }
  
  // Clear error if any
  errorElement.classList.add('d-none');
  
  // Create queue item
  const queueItem = {
    spotId: spotId,
    songName: songName,
    time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}),
    price: songPrice // Add the calculated price to queue item
  };
  
  // Add bid if present
  if (bid > 0) {
    queueItem.bid = bid;
    queueItem.lastBidTime = new Date().toISOString();
    queueItem.bidPaid = false; // Mark bid as unpaid initially
    
    // Record pending payment
    const pendingPayment = appState.pendingPayments[spotId] || 0;
    appState.pendingPayments[spotId] = pendingPayment + bid;
    
    // Set new bid for animation on queue display
    appState.newBid = {
      amount: bid,
      tableNumber: spotId,
      timestamp: new Date().toISOString()
    };
  }
  
  // Add to queue
  appState.songQueue.push(queueItem);
  
  // Sort queue by bids if bidding is enabled
  if (appState.workflow.enableBidding) {
    sortQueueByBids();
  }
  
  // Reset form
  songNameInput.value = '';
  spotSelect.value = '';
  if (bidInput) bidInput.value = '0';
  
  // Update queue display
  updateQueueDisplay();
  updateNowSingingDisplay();
  
  // Save to Firebase
  const updates = { 
    songQueue: appState.songQueue,
    pendingPayments: appState.pendingPayments,
    newBid: bid > 0 ? appState.newBid : null
  };
  
  saveToFirebase(updates);
  
  // Show notification
  if (bid > 0) {
    showNotification(`Added "${songName}" to queue with $${bid} bid`);
  } else {
    showNotification(`Added "${songName}" to queue`);
  }
}

// Format time for display (MM:SS)
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

// Open queue display window
function openQueueDisplay() {
  // Close existing window if open
  if (appState.queueDisplay.windowRef && !appState.queueDisplay.windowRef.closed) {
    appState.queueDisplay.windowRef.close();
  }
  
  // Generate URL with venue ID
  const baseUrl = window.location.origin;
  const queueUrl = `${baseUrl}/public/queue-display.html?venue=${appState.currentUser?.uid || 'anonymous'}`;
  
  // Save URL for copying
  appState.queueDisplay.url = queueUrl;
  
  // Open new window
  const width = 1024;
  const height = 768;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  
  appState.queueDisplay.windowRef = window.open(
    queueUrl,
    'karaoke_queue',
    `width=${width},height=${height},left=${left},top=${top},toolbar=0,location=0,menubar=0`
  );
  
  // Update state
  appState.queueDisplay.isOpen = true;
  
  // Show notification
  showNotification('Queue display opened in new window', 'success');
  
  // Update UI
  updateQueueDisplayButton();
}

// Update queue display button state
function updateQueueDisplayButton() {
  const queueDisplayBtn = document.getElementById('queue-display-btn');
  if (!queueDisplayBtn) return;
  
  // Check if window is still open
  if (appState.queueDisplay.windowRef && !appState.queueDisplay.windowRef.closed) {
    queueDisplayBtn.innerHTML = '<i class="fas fa-external-link-alt"></i> Queue Display Open';
    queueDisplayBtn.classList.replace('btn-primary', 'btn-success');
  } else {
    queueDisplayBtn.innerHTML = '<i class="fas fa-desktop"></i> Open Queue Display';
    queueDisplayBtn.classList.replace('btn-success', 'btn-primary');
    appState.queueDisplay.isOpen = false;
  }
}

// Copy queue display URL to clipboard
function copyQueueDisplayUrl() {
  if (!appState.queueDisplay.url) {
    // Generate URL if not already set
    const baseUrl = window.location.origin;
    appState.queueDisplay.url = `${baseUrl}/public/queue-display.html?venue=${appState.currentUser?.uid || 'anonymous'}`;
  }
  
  // Copy to clipboard
  navigator.clipboard.writeText(appState.queueDisplay.url)
    .then(() => {
      showNotification('Queue display URL copied to clipboard', 'success');
    })
    .catch(err => {
      console.error('Failed to copy URL: ', err);
      showNotification('Failed to copy URL', 'error');
    });
}

// Add bid to song
function addBidToSong(index, bidAmount) {
  if (!appState.workflow.enableBidding || index < 0 || index >= appState.songQueue.length) {
    return false;
  }
  
  const queueEntry = appState.songQueue[index];
  const spotId = queueEntry.spotId;
  const currentBid = queueEntry.bid || 0;
  
  // Ensure bid is valid
  if (bidAmount < appState.workflow.minimumBid) {
    showNotification(`Minimum bid is $${appState.workflow.minimumBid}`, 'warning');
    return false;
  }
  
  // If there's already a bid, ensure the new bid meets increment requirements
  if (currentBid > 0 && bidAmount < currentBid + appState.workflow.bidIncrement) {
    showNotification(`Minimum increment is $${appState.workflow.bidIncrement}`, 'warning');
    return false;
  }
  
  // Check wallet balance
  const walletBalance = appState.wallets[spotId] || 0;
  if (bidAmount > walletBalance) {
    showNotification(`Insufficient funds in wallet. Balance: $${walletBalance}`, 'warning');
    return false;
  }
  
  // If there was a previous bid, update the pending payment amount
  if (currentBid > 0) {
    // Refund the previous bid
    appState.pendingPayments[spotId] -= currentBid;
    if (appState.pendingPayments[spotId] <= 0) {
      delete appState.pendingPayments[spotId];
    }
  }
  
  // Update bid in queue entry
  queueEntry.bid = bidAmount;
  queueEntry.lastBidTime = new Date().toISOString();
  queueEntry.bidPaid = false;
  
  // Record pending payment
  const pendingPayment = appState.pendingPayments[spotId] || 0;
  appState.pendingPayments[spotId] = pendingPayment + bidAmount;
  
  // Set new bid for animation
  appState.newBid = {
    amount: bidAmount,
    tableNumber: spotId,
    timestamp: new Date().toISOString()
  };
  
  // Sort queue by bids
  sortQueueByBids();
  
  // Update UI
  updateQueueDisplay();
  
  // Save to Firebase
  const updates = {
    songQueue: appState.songQueue,
    pendingPayments: appState.pendingPayments,
    newBid: appState.newBid
  };
  
  saveToFirebase(updates);
  
  // Show notification
  showNotification(`Bid of $${bidAmount} added to song`, 'success');
  
  return true;
}

// Sort queue by bid amounts (highest to lowest)
function sortQueueByBids() {
  if (!appState.workflow.enableBidding) return;
  
  appState.songQueue.sort((a, b) => {
    const bidA = a.bid || 0;
    const bidB = b.bid || 0;
    
    // Sort by bid (highest first)
    if (bidA !== bidB) {
      return bidB - bidA;
    }
    
    // If bids are equal, sort by time added (first in, first out)
    return new Date(a.time || 0) - new Date(b.time || 0);
  });
}

// Show bid dialog for a song
function showBidDialog(index) {
  if (!appState.workflow.enableBidding || index < 0 || index >= appState.songQueue.length) {
    return;
  }
  
  const song = appState.songQueue[index];
  const currentBid = song.bid || 0;
  const minBid = currentBid > 0 
    ? currentBid + appState.workflow.bidIncrement 
    : appState.workflow.minimumBid;
  
  // Create modal for bid input
  const modalId = 'bid-dialog-' + Date.now();
  const modalHTML = `
    <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-warning text-dark">
            <h5 class="modal-title">
              <i class="fas fa-dollar-sign"></i> Place Bid
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="p-2">
              <h6>Song: <strong>${song.songName}</strong></h6>
              <p class="mb-3">Table: ${getSpotDisplay(song.spotId)}</p>
              
              <div class="alert ${currentBid > 0 ? 'alert-info' : 'alert-secondary'}">
                ${currentBid > 0 
                  ? `<i class="fas fa-info-circle"></i> Current bid: <strong>$${currentBid}</strong>` 
                  : '<i class="fas fa-info-circle"></i> No bids yet for this song.'}
              </div>
              
              <div class="form-group mb-3">
                <label for="bid-amount" class="form-label">Bid Amount ($)</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="fas fa-dollar-sign"></i></span>
                  <input type="number" class="form-control form-control-lg" id="bid-amount" 
                         min="${minBid}" step="${appState.workflow.bidIncrement}" value="${minBid}">
                </div>
                <div class="form-text">
                  ${currentBid > 0
                    ? `Minimum bid is $${minBid} (current bid + $${appState.workflow.bidIncrement} increment)`
                    : `Minimum bid is $${appState.workflow.minimumBid}`}
                </div>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-warning" onclick="placeBid(${index})">
              <i class="fas fa-check"></i> Place Bid
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById(modalId));
  modal.show();
  
  // Remove modal from DOM when hidden
  document.getElementById(modalId).addEventListener('hidden.bs.modal', function() {
    this.remove();
  });
}

// Place a bid on a song
function placeBid(index) {
  const bidAmountInput = document.getElementById('bid-amount');
  const bidAmount = parseInt(bidAmountInput.value);
  
  if (isNaN(bidAmount) || bidAmount < appState.workflow.minimumBid) {
    showNotification(`Bid must be at least $${appState.workflow.minimumBid}`, 'warning');
    return;
  }
  
  // Add bid to song
  const success = addBidToSong(index, bidAmount);
  
  if (success) {
    // Close modal - find by searching for all modals and closing the first one
    const modals = document.querySelectorAll('.modal.show');
    if (modals.length > 0) {
      const modalInstance = bootstrap.Modal.getInstance(modals[0]);
      modalInstance.hide();
    }
  }
}

// Toggle bidding system
function toggleBiddingSystem(enabled) {
  appState.workflow.enableBidding = enabled;
  
  // Enable/disable bid settings inputs
  const biddingSettings = document.getElementById('bidding-settings');
  const inputs = biddingSettings.querySelectorAll('input');
  
  if (enabled) {
    biddingSettings.style.opacity = '1';
    inputs.forEach(input => input.disabled = false);
    
    // Resort queue by bids
    sortQueueByBids();
  } else {
    biddingSettings.style.opacity = '0.5';
    inputs.forEach(input => input.disabled = true);
    
    // Resort queue by time (if we want to go back to time-based)
    appState.songQueue.sort((a, b) => new Date(a.time || 0) - new Date(b.time || 0));
  }
  
  // Rebuild queue tab to show/hide bid controls
  buildQueueTab();
  
  // Save to Firebase if logged in
  if (appState.currentUser && !appState.isAnonymous) {
    saveVenueData(appState.currentUser.uid, { workflow: appState.workflow });
  }
}

// Update minimum bid amount
function updateMinimumBid(value) {
  if (value < 1) value = 1;
  appState.workflow.minimumBid = value;
  
  // Rebuild queue tab to update bid controls
  buildQueueTab();
  
  // Save to Firebase if logged in
  if (appState.currentUser && !appState.isAnonymous) {
    saveVenueData(appState.currentUser.uid, { workflow: appState.workflow });
  }
}

// Update bid increment amount
function updateBidIncrement(value) {
  if (value < 1) value = 1;
  appState.workflow.bidIncrement = value;
  
  // Save to Firebase if logged in
  if (appState.currentUser && !appState.isAnonymous) {
    saveVenueData(appState.currentUser.uid, { workflow: appState.workflow });
  }
}

// Update wallet balance
function updateWalletBalance(spotId, amount) {
  amount = parseInt(amount) || 0;
  
  if (amount < 0) amount = 0;
  
  // Update wallet balance
  appState.wallets[spotId] = amount;
  
  // Save to Firebase
  const updates = { wallets: appState.wallets };
  saveToFirebase(updates);
}

// Show dialog to add funds to wallet
function showAddFundsDialog(spotId) {
  const spot = appState.spots[spotId];
  const walletBalance = appState.wallets[spotId] || 0;
  
  // Create modal for funds input
  const modalId = 'add-funds-' + Date.now();
  const modalHTML = `
    <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-success text-white">
            <h5 class="modal-title">
              <i class="fas fa-wallet"></i> Add Funds to Wallet
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="p-2">
              <h6>Table/Seat: <strong>${spot.name}</strong></h6>
              <p class="mb-3">Occupant: ${spot.occupant || 'None'}</p>
              
              <div class="alert alert-info">
                <i class="fas fa-info-circle"></i> Current wallet balance: <strong>$${walletBalance}</strong>
              </div>
              
              <div class="form-group mb-3">
                <label for="funds-amount" class="form-label">Amount to Add ($)</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="fas fa-dollar-sign"></i></span>
                  <input type="number" class="form-control form-control-lg" id="funds-amount" 
                         min="5" step="5" value="20">
                </div>
              </div>
              
              <div class="d-grid gap-2">
                <button class="btn btn-lg btn-success" onclick="addQuickAmount('${spotId}', 5)">
                  <i class="fas fa-dollar-sign"></i> $5
                </button>
                <button class="btn btn-lg btn-success" onclick="addQuickAmount('${spotId}', 10)">
                  <i class="fas fa-dollar-sign"></i> $10
                </button>
                <button class="btn btn-lg btn-success" onclick="addQuickAmount('${spotId}', 20)">
                  <i class="fas fa-dollar-sign"></i> $20
                </button>
                <button class="btn btn-lg btn-success" onclick="addQuickAmount('${spotId}', 50)">
                  <i class="fas fa-dollar-sign"></i> $50
                </button>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-success" onclick="addFundsToWallet('${spotId}')">
              <i class="fas fa-check"></i> Add Funds
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById(modalId));
  modal.show();
  
  // Remove modal from DOM when hidden
  document.getElementById(modalId).addEventListener('hidden.bs.modal', function() {
    this.remove();
  });
}

// Add funds to wallet - quick amount buttons
function addQuickAmount(spotId, amount) {
  document.getElementById('funds-amount').value = amount;
}

// Add funds to wallet
function addFundsToWallet(spotId) {
  const amountInput = document.getElementById('funds-amount');
  const amount = parseInt(amountInput.value) || 0;
  
  if (amount <= 0) {
    showNotification('Please enter a valid amount', 'warning');
    return;
  }
  
  // Add funds to wallet
  appState.wallets[spotId] = (appState.wallets[spotId] || 0) + amount;
  
  // Close modal - find by searching for all modals and closing the first one
  const modals = document.querySelectorAll('.modal.show');
  if (modals.length > 0) {
    const modalInstance = bootstrap.Modal.getInstance(modals[0]);
    modalInstance.hide();
  }
  
  // Save to Firebase
  const updates = { wallets: appState.wallets };
  saveToFirebase(updates);
  
  // Update tables UI
  buildTablesTab();
  
  // Show notification
  showNotification(`Added $${amount} to ${getSpotDisplay(spotId)} wallet`, 'success');
}

// Collect payment for a table's pending bids
function collectPayment(spotId) {
  const pendingAmount = appState.pendingPayments[spotId] || 0;
  
  if (pendingAmount <= 0) {
    showNotification('No pending payments for this table', 'info');
    return;
  }
  
  // Check if wallet has enough funds
  const walletBalance = appState.wallets[spotId] || 0;
  if (walletBalance < pendingAmount) {
    showNotification(`Insufficient funds in wallet. Need $${pendingAmount - walletBalance} more.`, 'warning');
    
    // Show add funds dialog
    setTimeout(() => {
      showAddFundsDialog(spotId);
    }, 1000);
    
    return;
  }
  
  // Mark all songs with bids as paid
  appState.songQueue.forEach(song => {
    if (song.spotId === spotId && song.bid > 0 && !song.bidPaid) {
      song.bidPaid = true;
    }
  });
  
  // Deduct amount from wallet
  appState.wallets[spotId] = walletBalance - pendingAmount;
  
  // Clear pending payment
  delete appState.pendingPayments[spotId];
  
  // Save to Firebase
  const updates = {
    songQueue: appState.songQueue,
    wallets: appState.wallets,
    pendingPayments: appState.pendingPayments
  };
  
  saveToFirebase(updates);
  
  // Update tables UI
  buildTablesTab();
  
  // Show notification
  showNotification(`Collected $${pendingAmount} payment from ${getSpotDisplay(spotId)}`, 'success');
}

// Process bid payment when a song starts
function processBidPayment(spotId, songName) {
  // Find the song in the queue
  const songIndex = appState.songQueue.findIndex(item => 
    item.spotId === spotId && item.songName === songName
  );
  
  if (songIndex === -1) return;
  
  const song = appState.songQueue[songIndex];
  
  // Check if there's a bid that needs to be paid
  if (song.bid > 0 && !song.bidPaid) {
    // Add bid to history record
    const historyItem = {
      id: Date.now(),
      spotId,
      spotName: appState.spots[spotId]?.name || 'Unknown',
      occupant: appState.spots[spotId]?.occupant || 'Unknown',
      songName,
      bidAmount: song.bid,
      timestamp: new Date().toISOString(),
      type: 'bid_payment'
    };
    
    if (!appState.bidHistory) appState.bidHistory = [];
    appState.bidHistory.unshift(historyItem);
    
    // Update Firebase with bid history
    saveToFirebase({ bidHistory: appState.bidHistory });
  }
}

// Build the Layout Tab UI
function buildLayoutTab() {
  const layoutTab = document.getElementById('layout-tab');
  
  // Set up grid size based on venue layout
  const gridWidth = appState.venueLayout.width;
  const gridHeight = appState.venueLayout.height;
  const gridCells = appState.venueLayout.gridCells;
  const isCustomized = appState.venueLayout.isCustomized;
  const rooms = appState.venueLayout.rooms;
  const activeRoom = appState.venueLayout.activeRoom;
  
  // Create grid cells if not initialized
  if (!isCustomized) {
    // Initialize grid with empty cells
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const cellId = `${x}-${y}`;
        if (!gridCells[cellId]) {
          gridCells[cellId] = { type: 'empty' };
        }
      }
    }
    
    // Add stage in the middle top
    const stageX = Math.floor(gridWidth / 2);
    gridCells[`${stageX}-0`] = { type: 'stage', name: 'Main Stage' };
    gridCells[`${stageX-1}-0`] = { type: 'stage', name: 'Main Stage' };
    
    appState.venueLayout.isCustomized = true;
  }
  
  layoutTab.innerHTML = `
    <div class="row">
      <div class="col-md-8">
        <div class="card shadow-sm mb-4">
          <div class="card-header bg-primary text-white">
            <div class="d-flex justify-content-between align-items-center">
              <h2 class="card-title mb-0"><i class="fas fa-vector-square"></i> Venue Layout</h2>
              <div>
                <button class="btn btn-light" onclick="openVenueDisplay()">
                  <i class="fas fa-desktop"></i> Preview
                </button>
                <button class="btn btn-light" data-bs-toggle="modal" data-bs-target="#layout-settings-modal">
                  <i class="fas fa-cog"></i> Settings
                </button>
              </div>
            </div>
          </div>
          <div class="card-body">
            <!-- Room selector -->
            <div class="mb-3 d-flex justify-content-between align-items-center">
              <div class="btn-group room-selector">
                ${rooms.map(room => `
                  <button class="btn btn-${room === activeRoom ? 'primary' : 'outline-primary'}" 
                          onclick="switchRoom('${room}')">
                    ${room}
                  </button>
                `).join('')}
              </div>
              <button class="btn btn-outline-success btn-sm" onclick="addNewRoom()">
                <i class="fas fa-plus"></i> Add Room
              </button>
            </div>
            
            <!-- Layout grid -->
            <div class="venue-layout-grid" style="grid-template-columns: repeat(${gridWidth}, 1fr); grid-template-rows: repeat(${gridHeight}, 60px);">
              ${Array(gridHeight).fill().map((_, y) => 
                Array(gridWidth).fill().map((_, x) => {
                  const cellId = `${x}-${y}`;
                  const cell = gridCells[cellId] || { type: 'empty' };
                  const cellTypeClass = cell.type;
                  const cellContent = getCellContent(cell);
                  
                  return `
                    <div class="venue-cell venue-cell-${cellTypeClass}" 
                         data-x="${x}" data-y="${y}" data-cell-id="${cellId}"
                         onclick="selectLayoutCell('${cellId}')">
                      ${cellContent}
                    </div>
                  `;
                }).join('')
              ).join('')}
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-4">
        <div class="card shadow-sm mb-4">
          <div class="card-header bg-primary text-white">
            <h2 class="card-title mb-0"><i class="fas fa-edit"></i> Cell Editor</h2>
          </div>
          <div class="card-body">
            <div id="cell-editor-content">
              <p class="text-center text-muted">
                <i class="fas fa-info-circle"></i> Select a cell to edit
              </p>
            </div>
          </div>
        </div>
        
        <div class="card shadow-sm">
          <div class="card-header bg-primary text-white">
            <h2 class="card-title mb-0"><i class="fas fa-th-large"></i> Cell Types</h2>
          </div>
          <div class="card-body">
            <div class="d-flex flex-wrap gap-2 justify-content-center mb-3">
              <button class="btn btn-outline-dark cell-type-btn" onclick="setActiveCellType('empty')">
                <i class="fas fa-square"></i> Empty
              </button>
              <button class="btn btn-outline-primary cell-type-btn" onclick="setActiveCellType('table')">
                <i class="fas fa-chair"></i> Table
              </button>
              <button class="btn btn-outline-info cell-type-btn" onclick="setActiveCellType('bar')">
                <i class="fas fa-glass-martini-alt"></i> Bar
              </button>
              <button class="btn btn-outline-danger cell-type-btn" onclick="setActiveCellType('stage')">
                <i class="fas fa-microphone-alt"></i> Stage
              </button>
              <button class="btn btn-outline-secondary cell-type-btn" onclick="setActiveCellType('wall')">
                <i class="fas fa-grip-lines"></i> Wall
              </button>
            </div>
            
            <div class="alert alert-info">
              <i class="fas fa-info-circle"></i> Click on a cell type and then on the grid to change cell types.
            </div>
            
            <div class="d-grid gap-2 mt-3">
              <button class="btn btn-success" onclick="saveVenueLayout()">
                <i class="fas fa-save"></i> Save Layout
              </button>
              <button class="btn btn-warning" onclick="resetVenueLayout()">
                <i class="fas fa-undo"></i> Reset Layout
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Layout Settings Modal -->
    <div class="modal fade" id="layout-settings-modal" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">Layout Settings</h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="mb-3">
              <label for="grid-width" class="form-label">Grid Width</label>
              <input type="number" class="form-control" id="grid-width" min="4" max="16" value="${gridWidth}">
            </div>
            <div class="mb-3">
              <label for="grid-height" class="form-label">Grid Height</label>
              <input type="number" class="form-control" id="grid-height" min="3" max="12" value="${gridHeight}">
            </div>
            <div class="alert alert-warning">
              <i class="fas fa-exclamation-triangle"></i> <strong>Warning:</strong> Changing grid dimensions will reset your current layout.
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="updateGridDimensions()">Apply Changes</button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Set up active cell type
  appState.activeLayoutCellType = appState.activeLayoutCellType || 'table';
  updateActiveCellTypeUI();
}

// Get cell content based on cell type and data
function getCellContent(cell) {
  switch(cell.type) {
    case 'table':
      return `<div class="cell-icon"><i class="fas fa-chair"></i></div>
              <div class="cell-label">${cell.spotId ? `Table ${cell.spotId.split('_')[1]}` : 'Table'}</div>`;
    case 'bar':
      return `<div class="cell-icon"><i class="fas fa-glass-martini-alt"></i></div>
              <div class="cell-label">${cell.spotId ? `Bar #${cell.spotId.split('_')[1]}` : 'Bar'}</div>`;
    case 'stage':
      return `<div class="cell-icon"><i class="fas fa-microphone-alt"></i></div>
              <div class="cell-label">${cell.name || 'Stage'}</div>`;
    case 'wall':
      return `<div class="cell-icon"><i class="fas fa-grip-lines"></i></div>`;
    default:
      return '';
  }
}

// Set active cell type for editing
function setActiveCellType(type) {
  appState.activeLayoutCellType = type;
  updateActiveCellTypeUI();
}

// Update UI to show active cell type
function updateActiveCellTypeUI() {
  const buttons = document.querySelectorAll('.cell-type-btn');
  buttons.forEach(btn => {
    btn.classList.remove('active');
    if (btn.textContent.toLowerCase().includes(appState.activeLayoutCellType)) {
      btn.classList.add('active');
    }
  });
}

// Select a cell in the layout grid
function selectLayoutCell(cellId) {
  const cell = appState.venueLayout.gridCells[cellId] || { type: 'empty' };
  const [x, y] = cellId.split('-').map(Number);
  
  // If we have an active cell type, change this cell
  if (appState.activeLayoutCellType && 
      !document.querySelector('.venue-cell.selected')) {
    
    const newCell = { type: appState.activeLayoutCellType };
    
    // Add spotId for tables and bar seats
    if (appState.activeLayoutCellType === 'table') {
      // Find the next available table number
      const tableIds = Object.values(appState.venueLayout.gridCells)
        .filter(c => c.type === 'table' && c.spotId)
        .map(c => parseInt(c.spotId.split('_')[1]));
      
      const nextTableNum = tableIds.length > 0 ? Math.max(...tableIds) + 1 : 1;
      newCell.spotId = `table_${nextTableNum}`;
      
      // Create spot in appState if it doesn't exist
      if (!appState.spots[newCell.spotId]) {
        appState.spots[newCell.spotId] = {
          id: newCell.spotId,
          name: `Table ${nextTableNum}`,
          type: 'table',
          occupant: '',
          performedCount: 0
        };
        
        // Initialize wallet
        appState.wallets[newCell.spotId] = 0;
      }
    } else if (appState.activeLayoutCellType === 'bar') {
      // Find the next available bar seat number
      const barIds = Object.values(appState.venueLayout.gridCells)
        .filter(c => c.type === 'bar' && c.spotId)
        .map(c => parseInt(c.spotId.split('_')[1]));
      
      const nextBarNum = barIds.length > 0 ? Math.max(...barIds) + 1 : 1;
      newCell.spotId = `bar_${nextBarNum}`;
      
      // Create spot in appState if it doesn't exist
      if (!appState.spots[newCell.spotId]) {
        appState.spots[newCell.spotId] = {
          id: newCell.spotId,
          name: `Bar #${nextBarNum}`,
          type: 'bar',
          occupant: '',
          performedCount: 0
        };
        
        // Initialize wallet
        appState.wallets[newCell.spotId] = 0;
      }
    } else if (appState.activeLayoutCellType === 'stage') {
      newCell.name = 'Stage';
    }
    
    // Update the cell
    appState.venueLayout.gridCells[cellId] = newCell;
    
    // Rebuild layout tab to reflect changes
    buildLayoutTab();
    return;
  }
  
  // Otherwise, show cell editor UI
  const cellEditorContent = document.getElementById('cell-editor-content');
  
  // Highlight selected cell
  const cells = document.querySelectorAll('.venue-cell');
  cells.forEach(c => c.classList.remove('selected'));
  document.querySelector(`.venue-cell[data-cell-id="${cellId}"]`).classList.add('selected');
  
  // Build editor UI based on cell type
  switch(cell.type) {
    case 'table':
      const tableNum = cell.spotId ? cell.spotId.split('_')[1] : '';
      cellEditorContent.innerHTML = `
        <h4>Table Editor</h4>
        <div class="mb-3">
          <label for="table-number" class="form-label">Table Number</label>
          <input type="number" class="form-control" id="table-number" value="${tableNum}" min="1">
        </div>
        <div class="mb-3">
          <label for="table-shape" class="form-label">Shape</label>
          <select class="form-select" id="table-shape">
            <option value="square" ${cell.shape === 'square' ? 'selected' : ''}>Square</option>
            <option value="round" ${cell.shape === 'round' ? 'selected' : ''}>Round</option>
            <option value="rectangle" ${cell.shape === 'rectangle' ? 'selected' : ''}>Rectangle</option>
          </select>
        </div>
        <div class="mb-3">
          <label for="table-seats" class="form-label">Number of Seats</label>
          <input type="number" class="form-control" id="table-seats" value="${cell.seats || 4}" min="1" max="12">
        </div>
        <div class="d-grid gap-2">
          <button class="btn btn-primary" onclick="updateTableCell('${cellId}')">
            <i class="fas fa-save"></i> Update Table
          </button>
          <button class="btn btn-danger" onclick="removeCell('${cellId}')">
            <i class="fas fa-trash"></i> Remove Table
          </button>
        </div>
      `;
      break;
      
    case 'bar':
      const barNum = cell.spotId ? cell.spotId.split('_')[1] : '';
      cellEditorContent.innerHTML = `
        <h4>Bar Seat Editor</h4>
        <div class="mb-3">
          <label for="bar-number" class="form-label">Bar Seat Number</label>
          <input type="number" class="form-control" id="bar-number" value="${barNum}" min="1">
        </div>
        <div class="d-grid gap-2">
          <button class="btn btn-primary" onclick="updateBarCell('${cellId}')">
            <i class="fas fa-save"></i> Update Bar Seat
          </button>
          <button class="btn btn-danger" onclick="removeCell('${cellId}')">
            <i class="fas fa-trash"></i> Remove Bar Seat
          </button>
        </div>
      `;
      break;
      
    case 'stage':
      cellEditorContent.innerHTML = `
        <h4>Stage Editor</h4>
        <div class="mb-3">
          <label for="stage-name" class="form-label">Name</label>
          <input type="text" class="form-control" id="stage-name" value="${cell.name || 'Stage'}">
        </div>
        <div class="d-grid gap-2">
          <button class="btn btn-primary" onclick="updateStageCell('${cellId}')">
            <i class="fas fa-save"></i> Update Stage
          </button>
          <button class="btn btn-danger" onclick="removeCell('${cellId}')">
            <i class="fas fa-trash"></i> Remove Stage
          </button>
        </div>
      `;
      break;
      
    case 'wall':
      cellEditorContent.innerHTML = `
        <h4>Wall Editor</h4>
        <div class="mb-3">
          <label for="wall-direction" class="form-label">Direction</label>
          <select class="form-select" id="wall-direction">
            <option value="horizontal" ${cell.direction === 'horizontal' ? 'selected' : ''}>Horizontal</option>
            <option value="vertical" ${cell.direction === 'vertical' ? 'selected' : ''}>Vertical</option>
          </select>
        </div>
        <div class="d-grid gap-2">
          <button class="btn btn-primary" onclick="updateWallCell('${cellId}')">
            <i class="fas fa-save"></i> Update Wall
          </button>
          <button class="btn btn-danger" onclick="removeCell('${cellId}')">
            <i class="fas fa-trash"></i> Remove Wall
          </button>
        </div>
      `;
      break;
      
    default:
      cellEditorContent.innerHTML = `
        <p class="text-center text-muted">
          <i class="fas fa-info-circle"></i> Empty cell. Click on it to change its type.
        </p>
        <div class="d-flex flex-wrap gap-2 justify-content-center">
          <button class="btn btn-outline-primary" onclick="setActiveCellType('table'); selectLayoutCell('${cellId}')">
            <i class="fas fa-chair"></i> Table
          </button>
          <button class="btn btn-outline-info" onclick="setActiveCellType('bar'); selectLayoutCell('${cellId}')">
            <i class="fas fa-glass-martini-alt"></i> Bar
          </button>
          <button class="btn btn-outline-danger" onclick="setActiveCellType('stage'); selectLayoutCell('${cellId}')">
            <i class="fas fa-microphone-alt"></i> Stage
          </button>
          <button class="btn btn-outline-secondary" onclick="setActiveCellType('wall'); selectLayoutCell('${cellId}')">
            <i class="fas fa-grip-lines"></i> Wall
          </button>
        </div>
      `;
  }
}

// Update table cell data
function updateTableCell(cellId) {
  const tableNumber = document.getElementById('table-number').value;
  const tableShape = document.getElementById('table-shape').value;
  const tableSeats = document.getElementById('table-seats').value;
  
  const cell = appState.venueLayout.gridCells[cellId];
  const oldSpotId = cell.spotId;
  const newSpotId = `table_${tableNumber}`;
  
  // Update cell data
  cell.spotId = newSpotId;
  cell.shape = tableShape;
  cell.seats = tableSeats;
  
  // Update spots data
  if (oldSpotId !== newSpotId) {
    // Check if the new spot ID exists
    if (appState.spots[newSpotId]) {
      showNotification('Table number already exists', 'warning');
      return;
    }
    
    // Create or update spot
    appState.spots[newSpotId] = {
      id: newSpotId,
      name: `Table ${tableNumber}`,
      type: 'table',
      occupant: appState.spots[oldSpotId]?.occupant || '',
      performedCount: appState.spots[oldSpotId]?.performedCount || 0
    };
    
    // Update wallet
    appState.wallets[newSpotId] = appState.wallets[oldSpotId] || 0;
    
    // Remove old spot if no other cells use it
    const spotStillUsed = Object.values(appState.venueLayout.gridCells)
      .some(c => c.spotId === oldSpotId && c !== cell);
    
    if (!spotStillUsed && oldSpotId) {
      delete appState.spots[oldSpotId];
      delete appState.wallets[oldSpotId];
    }
  }
  
  // Rebuild layout tab
  buildLayoutTab();
  
  // Show notification
  showNotification('Table updated', 'success');
}

// Update bar cell data
function updateBarCell(cellId) {
  const barNumber = document.getElementById('bar-number').value;
  
  const cell = appState.venueLayout.gridCells[cellId];
  const oldSpotId = cell.spotId;
  const newSpotId = `bar_${barNumber}`;
  
  // Update cell data
  cell.spotId = newSpotId;
  
  // Update spots data
  if (oldSpotId !== newSpotId) {
    // Check if the new spot ID exists
    if (appState.spots[newSpotId]) {
      showNotification('Bar seat number already exists', 'warning');
      return;
    }
    
    // Create or update spot
    appState.spots[newSpotId] = {
      id: newSpotId,
      name: `Bar #${barNumber}`,
      type: 'bar',
      occupant: appState.spots[oldSpotId]?.occupant || '',
      performedCount: appState.spots[oldSpotId]?.performedCount || 0
    };
    
    // Update wallet
    appState.wallets[newSpotId] = appState.wallets[oldSpotId] || 0;
    
    // Remove old spot if no other cells use it
    const spotStillUsed = Object.values(appState.venueLayout.gridCells)
      .some(c => c.spotId === oldSpotId && c !== cell);
    
    if (!spotStillUsed && oldSpotId) {
      delete appState.spots[oldSpotId];
      delete appState.wallets[oldSpotId];
    }
  }
  
  // Rebuild layout tab
  buildLayoutTab();
  
  // Show notification
  showNotification('Bar seat updated', 'success');
}

// Update stage cell data
function updateStageCell(cellId) {
  const stageName = document.getElementById('stage-name').value;
  
  // Update cell data
  appState.venueLayout.gridCells[cellId].name = stageName;
  
  // Rebuild layout tab
  buildLayoutTab();
  
  // Show notification
  showNotification('Stage updated', 'success');
}

// Update wall cell data
function updateWallCell(cellId) {
  const wallDirection = document.getElementById('wall-direction').value;
  
  // Update cell data
  appState.venueLayout.gridCells[cellId].direction = wallDirection;
  
  // Rebuild layout tab
  buildLayoutTab();
  
  // Show notification
  showNotification('Wall updated', 'success');
}

// Remove a cell
function removeCell(cellId) {
  const cell = appState.venueLayout.gridCells[cellId];
  
  // Check if removing a table or bar
  if ((cell.type === 'table' || cell.type === 'bar') && cell.spotId) {
    // Check if this spot is used elsewhere
    const spotStillUsed = Object.values(appState.venueLayout.gridCells)
      .some(c => c.spotId === cell.spotId && c !== cell);
    
    if (!spotStillUsed) {
      // Remove spot and wallet
      delete appState.spots[cell.spotId];
      delete appState.wallets[cell.spotId];
    }
  }
  
  // Set cell to empty
  appState.venueLayout.gridCells[cellId] = { type: 'empty' };
  
  // Rebuild layout tab
  buildLayoutTab();
  
  // Show notification
  showNotification('Cell removed', 'success');
}

// Update grid dimensions
function updateGridDimensions() {
  const newWidth = parseInt(document.getElementById('grid-width').value);
  const newHeight = parseInt(document.getElementById('grid-height').value);
  
  // Validate inputs
  if (newWidth < 4 || newWidth > 16 || newHeight < 3 || newHeight > 12) {
    showNotification('Invalid grid dimensions', 'error');
    return;
  }
  
  // Update dimensions
  appState.venueLayout.width = newWidth;
  appState.venueLayout.height = newHeight;
  
  // Reset grid cells
  appState.venueLayout.gridCells = {};
  
  // Close modal
  const modal = bootstrap.Modal.getInstance(document.getElementById('layout-settings-modal'));
  modal.hide();
  
  // Rebuild layout tab
  buildLayoutTab();
  
  // Show notification
  showNotification('Layout dimensions updated', 'success');
}

// Add a new room
function addNewRoom() {
  const roomName = prompt('Enter name for new room:', 'Room ' + (appState.venueLayout.rooms.length + 1));
  
  if (!roomName) return;
  
  // Add to rooms array
  appState.venueLayout.rooms.push(roomName);
  
  // Rebuild layout tab
  buildLayoutTab();
  
  // Show notification
  showNotification(`Room "${roomName}" added`, 'success');
}

// Switch to a different room
function switchRoom(roomName) {
  appState.venueLayout.activeRoom = roomName;
  
  // Rebuild layout tab
  buildLayoutTab();
}

// Save venue layout
function saveVenueLayout() {
  // Update Firebase
  const updates = { 
    venueLayout: appState.venueLayout,
    spots: appState.spots,
    wallets: appState.wallets
  };
  
  saveToFirebase(updates);
  
  // Show notification
  showNotification('Venue layout saved', 'success');
}

// Reset venue layout
function resetVenueLayout() {
  if (!confirm('Are you sure you want to reset the venue layout? This will delete all tables, bar seats, and other layout elements.')) {
    return;
  }
  
  // Reset layout
  appState.venueLayout = {
    isCustomized: false,
    width: 8,
    height: 6,
    gridCells: {},
    rooms: ['Main Room'],
    activeRoom: 'Main Room'
  };
  
  // Rebuild layout tab
  buildLayoutTab();
  
  // Show notification
  showNotification('Venue layout reset', 'success');
}

// Build the Recordings Tab UI
function buildRecordingsTab() {
  const recordingsTab = document.getElementById('recordings-tab');
  
  recordingsTab.innerHTML = `
    <div class="row">
      <div class="col-md-6">
        <div class="card shadow-sm mb-4">
          <div class="card-header bg-primary text-white">
            <h2 class="card-title mb-0"><i class="fas fa-microphone"></i> Recording Settings</h2>
          </div>
          <div class="card-body">
            <div class="form-check form-switch mb-3">
              <input class="form-check-input" type="checkbox" id="enable-recording" 
                ${appState.workflow.enableRecording ? 'checked' : ''} 
                onchange="toggleRecording(this.checked)">
              <label class="form-check-label fw-bold" for="enable-recording">
                <i class="fas fa-microphone text-danger"></i> Enable Song Recording
              </label>
            </div>
            <p class="text-muted">Allow customers to request professional recordings of their performances.</p>
            
            <div class="mb-3">
              <label for="recording-price" class="form-label">Recording Price ($)</label>
              <div class="input-group">
                <span class="input-group-text"><i class="fas fa-dollar-sign"></i></span>
                <input type="number" class="form-control" id="recording-price" 
                      value="${appState.workflow.recordingPrice}" min="0" 
                      onchange="updateRecordingPrice(this.value)">
              </div>
            </div>
            
            <h5 class="mt-4 mb-3">Sharing Options</h5>
            <div class="d-flex flex-column gap-2">
              ${appState.sharingOptions.map(option => `
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="share-${option.id}" 
                    ${option.enabled ? 'checked' : ''} 
                    onchange="toggleSharingOption('${option.id}', this.checked)">
                  <label class="form-check-label" for="share-${option.id}">
                    <i class="fas fa-${getSharingIcon(option.id)}"></i> ${option.name}
                    <p class="text-muted small mb-0">${option.description}</p>
                  </label>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
      
      <div class="col-md-6">
        <div class="card shadow-sm">
          <div class="card-header bg-primary text-white">
            <h2 class="card-title mb-0"><i class="fas fa-history"></i> Recording History</h2>
          </div>
          <div class="card-body">
            ${appState.recordings.length > 0 ? `
              <div class="list-group">
                ${appState.recordings.map(recording => `
                  <div class="list-group-item">
                    <div class="d-flex w-100 justify-content-between">
                      <h5 class="mb-1">${recording.songName}</h5>
                      <small>${new Date(recording.timestamp).toLocaleDateString()}</small>
                    </div>
                    <p class="mb-1">Performer: ${recording.performer}</p>
                    <small>Table: ${getSpotDisplay(recording.spotId)}</small>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                      <div>
                        ${recording.shared ? 
                          `<span class="badge bg-success">Shared: ${recording.shared.join(', ')}</span>` : 
                          '<span class="badge bg-warning text-dark">Not shared</span>'}
                      </div>
                      <button class="btn btn-sm btn-outline-primary" onclick="manageRecording('${recording.id}')">
                        <i class="fas fa-cog"></i> Manage
                      </button>
                    </div>
                  </div>
                `).join('')}
              </div>
            ` : `
              <div class="text-center p-4">
                <i class="fas fa-music fa-3x text-muted mb-3"></i>
                <p>No recordings yet</p>
              </div>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

// Get sharing icon
function getSharingIcon(sharerId) {
  switch(sharerId) {
    case 'email': return 'envelope';
    case 'facebook': return 'facebook';
    case 'download': return 'download';
    case 'cloud': return 'cloud';
    default: return 'share';
  }
}

// Toggle recording feature
function toggleRecording(enabled) {
  appState.workflow.enableRecording = enabled;
  
  // Save to Firebase
  const updates = { workflow: appState.workflow };
  saveToFirebase(updates);
  
  // Show notification
  const status = enabled ? 'enabled' : 'disabled';
  showNotification(`Recording ${status}`, 'success');
}

// Update recording price
function updateRecordingPrice(price) {
  price = parseInt(price) || 0;
  
  if (price < 0) price = 0;
  
  appState.workflow.recordingPrice = price;
  
  // Save to Firebase
  const updates = { workflow: appState.workflow };
  saveToFirebase(updates);
  
  // Show notification
  showNotification(`Recording price updated to $${price}`, 'success');
}

// Toggle sharing option
function toggleSharingOption(optionId, enabled) {
  const option = appState.sharingOptions.find(opt => opt.id === optionId);
  
  if (option) {
    option.enabled = enabled;
    
    // Save to Firebase
    const updates = { sharingOptions: appState.sharingOptions };
    saveToFirebase(updates);
    
    // Show notification
    const status = enabled ? 'enabled' : 'disabled';
    showNotification(`${option.name} sharing ${status}`, 'success');
  }
}

// Manage recording
function manageRecording(recordingId) {
  const recording = appState.recordings.find(r => r.id === recordingId);
  
  if (!recording) {
    showNotification('Recording not found', 'error');
    return;
  }
  
  // Create modal for managing recording
  const modalId = 'recording-' + Date.now();
  const modalHTML = `
    <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
      <div class="modal-dialog modal-dialog-centered">
        <div class="modal-content">
          <div class="modal-header bg-primary text-white">
            <h5 class="modal-title">
              <i class="fas fa-microphone"></i> Manage Recording
            </h5>
            <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <h5>${recording.songName}</h5>
            <p class="mb-3">Performer: ${recording.performer}</p>
            
            <div class="mb-3">
              <label class="form-label">Share Recording</label>
              ${appState.sharingOptions.map(option => `
                <div class="form-check form-switch">
                  <input class="form-check-input" type="checkbox" id="share-rec-${option.id}" 
                    ${recording.shared?.includes(option.id) ? 'checked' : ''} 
                    ${!option.enabled ? 'disabled' : ''}>
                  <label class="form-check-label" for="share-rec-${option.id}">
                    <i class="fas fa-${getSharingIcon(option.id)}"></i> ${option.name}
                  </label>
                </div>
              `).join('')}
            </div>
            
            <div class="mb-3">
              <label for="recording-status" class="form-label">Status</label>
              <select class="form-select" id="recording-status">
                <option value="pending" ${recording.status === 'pending' ? 'selected' : ''}>Pending</option>
                <option value="processing" ${recording.status === 'processing' ? 'selected' : ''}>Processing</option>
                <option value="completed" ${recording.status === 'completed' ? 'selected' : ''}>Completed</option>
                <option value="error" ${recording.status === 'error' ? 'selected' : ''}>Error</option>
              </select>
            </div>
            
            <div class="mb-3">
              <label for="recording-notes" class="form-label">Notes</label>
              <textarea class="form-control" id="recording-notes" rows="3">${recording.notes || ''}</textarea>
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-danger" onclick="deleteRecording('${recording.id}')">
              <i class="fas fa-trash"></i> Delete
            </button>
            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
            <button type="button" class="btn btn-primary" onclick="updateRecording('${recording.id}')">
              <i class="fas fa-save"></i> Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  `;
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Show modal
  const modal = new bootstrap.Modal(document.getElementById(modalId));
  modal.show();
  
  // Remove modal from DOM when hidden
  document.getElementById(modalId).addEventListener('hidden.bs.modal', function() {
    this.remove();
  });
}

// Update recording
function updateRecording(recordingId) {
  const recording = appState.recordings.find(r => r.id === recordingId);
  
  if (!recording) {
    showNotification('Recording not found', 'error');
    return;
  }
  
  // Get updated values
  const status = document.getElementById('recording-status').value;
  const notes = document.getElementById('recording-notes').value;
  
  // Get sharing options
  const shared = [];
  appState.sharingOptions.forEach(option => {
    const checkbox = document.getElementById(`share-rec-${option.id}`);
    if (checkbox && checkbox.checked) {
      shared.push(option.id);
    }
  });
  
  // Update recording
  recording.status = status;
  recording.notes = notes;
  recording.shared = shared;
  
  // Close modal - find by searching for all modals and closing the first one
  const modals = document.querySelectorAll('.modal.show');
  if (modals.length > 0) {
    const modalInstance = bootstrap.Modal.getInstance(modals[0]);
    modalInstance.hide();
  }
  
  // Save to Firebase
  const updates = { recordings: appState.recordings };
  saveToFirebase(updates);
  
  // Rebuild recordings tab
  buildRecordingsTab();
  
  // Show notification
  showNotification('Recording updated', 'success');
}

// Delete recording
function deleteRecording(recordingId) {
  if (!confirm('Are you sure you want to delete this recording?')) {
    return;
  }
  
  // Remove recording
  appState.recordings = appState.recordings.filter(r => r.id !== recordingId);
  
  // Close modal - find by searching for all modals and closing the first one
  const modals = document.querySelectorAll('.modal.show');
  if (modals.length > 0) {
    const modalInstance = bootstrap.Modal.getInstance(modals[0]);
    modalInstance.hide();
  }
  
  // Save to Firebase
  const updates = { recordings: appState.recordings };
  saveToFirebase(updates);
  
  // Rebuild recordings tab
  buildRecordingsTab();
  
  // Show notification
  showNotification('Recording deleted', 'success');
}

// Open venue display window
function openVenueDisplay() {
  // Close existing window if open
  if (appState.venueDisplayWindow && !appState.venueDisplayWindow.closed) {
    appState.venueDisplayWindow.close();
  }
  
  // Generate URL with venue ID
  const baseUrl = window.location.origin;
  const displayUrl = `${baseUrl}/public/venue-display.html?venue=${appState.currentUser?.uid || 'anonymous'}`;
  
  // Open new window
  const width = 1024;
  const height = 768;
  const left = (window.screen.width - width) / 2;
  const top = (window.screen.height - height) / 2;
  
  appState.venueDisplayWindow = window.open(
    displayUrl,
    'venue_display',
    `width=${width},height=${height},left=${left},top=${top},toolbar=0,location=0,menubar=0`
  );
  
  // Show notification
  showNotification('Venue layout display opened in new window', 'success');
}

// Make all functions available globally
window.handleLogin = handleLogin;
window.handleRegister = handleRegister;
window.signInWithGoogleHandler = signInWithGoogleHandler;
window.signInWithAppleHandler = signInWithAppleHandler;
window.useWithoutLogin = useWithoutLogin;
window.handleLogout = handleLogout;
window.updateQueueDisplay = updateQueueDisplay;
window.handleAddSong = handleAddSong;
window.getSpotDisplay = getSpotDisplay;
window.formatTime = formatTime;
window.updateSongName = updateSongName;
window.moveSongUp = moveSongUp;
window.moveSongDown = moveSongDown;
window.boostSongToTop = boostSongToTop;
window.startCurrentSong = startCurrentSong;
window.startNextSong = startNextSong;
window.deleteSongFromQueue = deleteSongFromQueue;
window.confirmClearQueue = confirmClearQueue;
window.clearQueue = clearQueue;
window.markAsCompleted = markAsCompleted;
window.updateWorkflowMode = updateWorkflowMode;
window.updatePreventConsecutive = updatePreventConsecutive;
window.updateBalancingFactor = updateBalancingFactor;
window.showNotification = showNotification;
window.clearAllTables = clearAllTables;
window.clearAllBarSeats = clearAllBarSeats;
window.toggleCompactView = toggleCompactView;
window.updateTheme = updateTheme;
window.updateColorScheme = updateColorScheme;
window.updateSpotOccupant = updateSpotOccupant;
window.updateSpotCount = updateSpotCount;
window.markSpotAsPaid = markSpotAsPaid;
window.skipCurrentSong = skipCurrentSong;
window.openQueueDisplay = openQueueDisplay;
window.updateQueueDisplayButton = updateQueueDisplayButton;
window.copyQueueDisplayUrl = copyQueueDisplayUrl;
window.addBidToSong = addBidToSong;
window.sortQueueByBids = sortQueueByBids;
window.showBidDialog = showBidDialog;
window.placeBid = placeBid;
window.toggleBiddingSystem = toggleBiddingSystem;
window.updateMinimumBid = updateMinimumBid;
window.updateBidIncrement = updateBidIncrement;
window.updateWalletBalance = updateWalletBalance;
window.showAddFundsDialog = showAddFundsDialog;
window.addQuickAmount = addQuickAmount;
window.addFundsToWallet = addFundsToWallet;
window.collectPayment = collectPayment;
window.processBidPayment = processBidPayment;
window.buildLayoutTab = buildLayoutTab;
window.buildRecordingsTab = buildRecordingsTab;
window.getCellContent = getCellContent;
window.setActiveCellType = setActiveCellType;
window.updateActiveCellTypeUI = updateActiveCellTypeUI;
window.selectLayoutCell = selectLayoutCell;
window.updateTableCell = updateTableCell;
window.updateBarCell = updateBarCell;
window.updateStageCell = updateStageCell;
window.updateWallCell = updateWallCell;
window.removeCell = removeCell;
window.updateGridDimensions = updateGridDimensions;
window.addNewRoom = addNewRoom;
window.switchRoom = switchRoom;
window.saveVenueLayout = saveVenueLayout;
window.resetVenueLayout = resetVenueLayout;
window.getSharingIcon = getSharingIcon;
window.toggleRecording = toggleRecording;
window.updateRecordingPrice = updateRecordingPrice;
window.toggleSharingOption = toggleSharingOption;
window.manageRecording = manageRecording;
window.updateRecording = updateRecording;
window.deleteRecording = deleteRecording;
window.openVenueDisplay = openVenueDisplay;