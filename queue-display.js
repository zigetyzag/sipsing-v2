// queue-display.js
import { 
  db, 
  auth
} from '../firebase.js';

import { 
  getFirestore,
  doc, 
  getDoc,
  onSnapshot,
  collection
} from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";

// Wait for DOM to load
document.addEventListener('DOMContentLoaded', function() {
  // Get venue ID from URL params
  const urlParams = new URLSearchParams(window.location.search);
  const venueId = urlParams.get('venue');
  
  if (!venueId) {
    showError("No venue specified");
    return;
  }

  // Initialize realtime listener for queue updates
  initializeQueueListener(venueId);
  
  // Update refresh time every minute
  updateRefreshTime();
  setInterval(updateRefreshTime, 60000);
});

// Initialize queue listener
function initializeQueueListener(venueId) {
  try {
    // Reference to the venue document
    const venueRef = doc(db, "venues", venueId);
    
    // Subscribe to realtime updates
    onSnapshot(venueRef, (doc) => {
      if (doc.exists()) {
        const venueData = doc.data();
        
        // Update venue name
        document.getElementById('venue-name').textContent = venueData.venueName;
        
        // Update current performer
        updateCurrentPerformer(venueData.currentSinging);
        
        // Update queue
        updateQueue(venueData.songQueue, venueData.spots);
        
        // Flash refresh indicator
        flashRefreshIndicator();
        
        // Show bid animation if there's a new bid
        if (venueData.newBid) {
          showBidAnimation(venueData.newBid);
        }
      } else {
        showError("Venue not found");
      }
    }, (error) => {
      console.error("Error getting venue updates:", error);
      showError("Error getting updates");
    });
  } catch (error) {
    console.error("Error setting up listener:", error);
    showError("Error connecting to database");
  }
}

// Update current performer display
function updateCurrentPerformer(currentSinging) {
  const nowSingingElement = document.getElementById('now-singing');
  
  if (!currentSinging) {
    nowSingingElement.innerHTML = `
      <div class="text-center p-3">
        <p class="mb-0">No one is performing right now</p>
      </div>
    `;
    return;
  }
  
  nowSingingElement.innerHTML = `
    <div class="card w-100 border-0 bg-light">
      <div class="card-body">
        <div class="d-flex justify-content-between">
          <div>
            <h5 class="card-title">${currentSinging.name}</h5>
            <h6 class="card-subtitle mb-2 text-muted">${currentSinging.song}</h6>
          </div>
          <div class="d-flex align-items-center">
            <div class="table-number">${currentSinging.tableNumber}</div>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Update queue list
function updateQueue(songQueue, spots) {
  const queueListElement = document.getElementById('queue-list');
  
  if (!songQueue || songQueue.length === 0) {
    queueListElement.innerHTML = `
      <tr>
        <td class="text-center" colspan="5">No songs in queue</td>
      </tr>
    `;
    return;
  }
  
  // Sort queue by bid amount (highest first)
  const sortedQueue = [...songQueue].sort((a, b) => {
    // Sort by bid amount (descending)
    const bidA = a.bid || 0;
    const bidB = b.bid || 0;
    return bidB - bidA;
  });
  
  let queueHtml = '';
  sortedQueue.forEach((item, index) => {
    const tableName = item.tableNumber ? (spots[item.tableNumber]?.name || `Table ${item.tableNumber}`) : '';
    const hasBid = item.bid > 0;
    
    queueHtml += `
      <tr class="${hasBid ? 'bid-row' : ''}">
        <td class="text-center">
          <div class="queue-position">${index + 1}</div>
        </td>
        <td>${item.name}</td>
        <td>${item.song}</td>
        <td class="text-center">
          <div class="table-number mx-auto">${item.tableNumber || '-'}</div>
        </td>
        <td class="text-end">
          ${hasBid ? `<div class="bid-badge">$${item.bid}</div>` : ''}
        </td>
      </tr>
    `;
  });
  
  queueListElement.innerHTML = queueHtml;
}

// Show error message
function showError(message) {
  const queueDisplay = document.getElementById('queue-display');
  queueDisplay.innerHTML = `
    <div class="alert alert-danger mx-auto mt-5" style="max-width: 500px">
      <h4 class="alert-heading"><i class="fas fa-exclamation-triangle"></i> Error</h4>
      <p>${message}</p>
      <hr>
      <p class="mb-0">Please check the URL or contact the venue.</p>
    </div>
  `;
}

// Update refresh time
function updateRefreshTime() {
  const now = new Date();
  document.getElementById('refresh-time').textContent = `Last updated: ${now.toLocaleTimeString()}`;
}

// Flash refresh indicator
function flashRefreshIndicator() {
  const refreshIndicator = document.getElementById('refresh-indicator');
  refreshIndicator.classList.add('text-success');
  
  setTimeout(() => {
    refreshIndicator.classList.remove('text-success');
  }, 1000);
}

// Show bid animation
function showBidAnimation(bidData) {
  const bidAnimation = document.getElementById('bid-animation');
  const bidAmountValue = document.getElementById('bid-amount-value');
  const bidTableNumber = document.getElementById('bid-table-number');
  
  // Set bid details
  bidAmountValue.textContent = bidData.amount;
  bidTableNumber.textContent = bidData.tableNumber;
  
  // Show animation
  bidAnimation.classList.remove('d-none');
  
  // Hide after 3 seconds
  setTimeout(() => {
    bidAnimation.classList.add('d-none');
  }, 3000);
}