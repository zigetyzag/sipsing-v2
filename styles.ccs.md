/* Custom styles for Sipsing DJ Manager */
:root {
  /* Default theme (purple) */
  --primary-color: #563d7c;
  --primary-dark: #452d6b;
  --primary-light: #7952b3;
  --accent-color: #e83e8c;
  --bg-color: #f8f9fa;
  --text-color: #212529;
  --card-bg: #ffffff;
  --border-color: #dee2e6;
}

/* Color schemes */
.color-purple {
  --primary-color: #563d7c;
  --primary-dark: #452d6b;
  --primary-light: #7952b3;
  --accent-color: #e83e8c;
}

.color-blue {
  --primary-color: #0d6efd;
  --primary-dark: #0a58ca;
  --primary-light: #6ea8fe;
  --accent-color: #0dcaf0;
}

.color-green {
  --primary-color: #198754;
  --primary-dark: #146c43;
  --primary-light: #479f76;
  --accent-color: #20c997;
}

.color-red {
  --primary-color: #dc3545;
  --primary-dark: #b02a37;
  --primary-light: #e35d6a;
  --accent-color: #fd7e14;
}

/* Themes */
.theme-default {
  --bg-color: #f8f9fa;
  --text-color: #212529;
  --card-bg: #ffffff;
  --border-color: #dee2e6;
}

.theme-dark {
  --bg-color: #212529;
  --text-color: #f8f9fa;
  --card-bg: #343a40;
  --border-color: #495057;
}

.theme-light {
  --bg-color: #ffffff;
  --text-color: #212529;
  --card-bg: #f8f9fa;
  --border-color: #e9ecef;
}

body {
  font-family: 'Arial', sans-serif;
  background-color: var(--bg-color);
  color: var(--text-color);
  transition: background-color 0.3s, color 0.3s;
}

/* Compact view */
.compact-view .card {
  margin-bottom: 0.5rem;
}

.compact-view .card-body {
  padding: 0.75rem;
}

.compact-view .form-control,
.compact-view .form-select,
.compact-view .btn {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.compact-view .table td, 
.compact-view .table th {
  padding: 0.5rem;
}

.bg-purple-900 {
  background-color: var(--primary-color);
}

.header {
  background-color: var(--primary-color);
  color: white;
  padding: 1rem;
  margin-bottom: 1rem;
}

.card {
  margin-bottom: 1rem;
  border-radius: 0.5rem;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  background-color: var(--card-bg);
  border-color: var(--border-color);
}

.now-singing {
  background: linear-gradient(90deg, var(--primary-color), var(--accent-color));
  color: white;
  border-radius: 0.5rem;
}

.time-warning {
  background: linear-gradient(90deg, #dc3545, #f78b77);
  color: white;
}

.next-up {
  background-color: #e9ecef;
  border-left: 4px solid #6495ed;
}

.song-boost {
  color: #dc3545;
  font-size: 0.875rem;
}

.seat-occupant {
  font-weight: normal;
}

/* Nav tab styling */
.nav-tabs .nav-link {
  border: none;
  border-bottom: 2px solid transparent;
  color: #6c757d;
  padding: 0.75rem 1rem;
}

.nav-tabs .nav-link.active {
  color: var(--primary-color);
  border-bottom: 2px solid var(--primary-color);
  background-color: transparent;
}

.navbar-dark .navbar-nav .nav-link {
  color: rgba(255, 255, 255, 0.85);
}

.navbar-dark .navbar-nav .nav-link.active {
  color: white;
  font-weight: 500;
}

/* Toast styling */
.toast-container {
  z-index: 1090;
}

/* Form controls */
.form-control:focus, .form-select:focus {
  border-color: var(--primary-light);
  box-shadow: 0 0 0 0.25rem rgba(121, 82, 179, 0.25);
}

.btn-primary {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
}

.btn-primary:hover {
  background-color: var(--primary-dark);
  border-color: var(--primary-dark);
}

/* Animation for song changes */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.fade-in {
  animation: fadeIn 0.5s;
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .card-title {
    font-size: 1.25rem;
  }
  
  .display-4, .display-6 {
    font-size: 1.75rem;
  }
}