/******/ (() => { // webpackBootstrap
var __webpack_exports__ = {};
/*!******************************!*\
  !*** ./src/contentScript.js ***!
  \******************************/
// Google Week by Week Search Extension
// Adds functionality to search Google results one week at a time

// Main entry point for the content script
(function() {
  'use strict';
  
  // Configuration
  const config = {
    calendarIconSize: '20px',
    calendarIconColor: '#5f6368', // Google's gray color
    activeIconColor: '#1a73e8', // Google's blue color
    datePickerWidth: '300px',
    animationDuration: '0.2s'
  };
  
  // Global state
  let isDatePickerVisible = false;
  let selectedStartDate = null;
  let selectedEndDate = null;
  
  /**
   * Initialize the extension
   */
  function init() {
    console.log('Initializing Google Week by Week extension');
    
    // Check if we're on a Google search results page
    if (isGoogleSearchPage()) {
      initializeWeekByWeekSearch();
    }
    
    // Listen for page navigation (for SPA behavior)
    observeUrlChanges();
  }
  
  /**
   * Check if the current page is a Google search page
   */
  function isGoogleSearchPage() {
    return window.location.hostname.includes('google') && 
           (window.location.pathname === '/search' || window.location.pathname === '/');
  }
  
  /**
   * Initialize the week by week search functionality
   */
  function initializeWeekByWeekSearch() {
    // Create and inject the calendar icon
    injectCalendarIcon();
    
    // Create the date picker component (initially hidden)
    createDatePickerElement();
    
    // Check URL for existing date parameters and set them if present
    checkForExistingDateParams();
    
    // Add event listeners
    addEventListeners();
  }
  
  /**
   * Create and inject the calendar icon into the Google search bar
   */
  function injectCalendarIcon() {
    // Remove any existing calendar icon first
    removeExistingCalendarIcon();
    
    // Find the search form - there are a few possible selectors to try
    const searchForm = document.querySelector('form[role="search"], form#tsf, form.search-form');
    
    if (!searchForm) {
      console.error('Google Week by Week: Could not find the search form');
      return;
    }
    
    // Create the calendar icon element
    const calendarIcon = document.createElement('div');
    calendarIcon.id = 'gwbw-calendar-icon';
    calendarIcon.className = 'gwbw-calendar-icon';
    calendarIcon.innerHTML = createCalendarIconSVG();
    calendarIcon.title = 'Search by week';
    
    // Add styles to the icon
    calendarIcon.style.cssText = `
      cursor: pointer;
      width: ${config.calendarIconSize};
      height: ${config.calendarIconSize};
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 50%;
      transition: background-color 0.2s;
      vertical-align: middle;
      position: relative;
      top: 6px;
    `;
    
    // Find the right spot to insert the icon
    // Usually next to the search button or inside the search input container
    const searchButton = searchForm.querySelector('button[type="submit"], button[aria-label="Google Search"]');
    
    if (searchButton && searchButton.parentNode) {
      searchButton.parentNode.insertBefore(calendarIcon, searchButton);
      searchButton.parentNode.parentNode.style.alignItems = 'center'; // Align items in the search form
      searchButton.parentNode.parentNode.style.verticalAlign = 'middle'; // Align items in the search form
    } else {
      // Fallback to append to the form
      searchForm.appendChild(calendarIcon);
    }
    
    console.log('Calendar icon injected');
  }
  
  /**
   * Create the SVG for the calendar icon
   */
  function createCalendarIconSVG() {
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${config.calendarIconSize}" height="${config.calendarIconSize}" 
        viewBox="0 0 24 24" fill="none" stroke="${config.calendarIconColor}" 
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
        <line x1="16" y1="2" x2="16" y2="6"></line>
        <line x1="8" y1="2" x2="8" y2="6"></line>
        <line x1="3" y1="10" x2="21" y2="10"></line>
      </svg>
    `;
  }
  
  /**
   * Remove any existing calendar icon to avoid duplicates
   */
  function removeExistingCalendarIcon() {
    const existingIcon = document.getElementById('gwbw-calendar-icon');
    if (existingIcon) {
      existingIcon.remove();
    }
  }
  
  /**
   * Create the date picker element that will appear when clicking the calendar icon
   */
  function createDatePickerElement() {
    // Remove any existing date picker first
    removeExistingDatePicker();
    
    // Create the date picker container
    const datePicker = document.createElement('div');
    datePicker.id = 'gwbw-date-picker';
    datePicker.className = 'gwbw-date-picker';
    
    // Add styles to the date picker
    datePicker.style.cssText = `
      position: absolute;
      z-index: 9999;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.2);
      padding: 16px;
      width: ${config.datePickerWidth};
      display: none;
      opacity: 0;
      transition: opacity ${config.animationDuration} ease-in-out;
      font-family: Arial, sans-serif;
    `;
    
    // Create the content for the date picker
    datePicker.innerHTML = `
      <div style="margin-bottom: 16px; font-weight: bold; color: #202124;">
        Search by Week
      </div>
      
      <div style="margin-bottom: 16px;">
        <div style="margin-bottom: 8px; color: #5f6368;">Start Date</div>
        <input type="date" id="gwbw-start-date" style="width: 100%; padding: 8px; border: 1px solid #dfe1e5; border-radius: 4px;">
      </div>
      
      <div style="margin-bottom: 16px;">
        <div style="margin-bottom: 8px; color: #5f6368;">End Date</div>
        <input type="date" id="gwbw-end-date" style="width: 100%; padding: 8px; border: 1px solid #dfe1e5; border-radius: 4px;">
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center;">
          <button id="gwbw-prev-week" style="background: #f8f9fa; border: 1px solid #dadce0; border-radius: 4px 0 0 4px; padding: 8px; color: #3c4043; cursor: pointer; margin: 0; display: flex; align-items: center; justify-content: center; height: 36px;">
            ${createArrowSVG('left')}
          </button>
          <button id="gwbw-quick-week" style="background: #f8f9fa; border: 1px solid #dadce0; border-left: none; border-right: none; padding: 8px 16px; color: #3c4043; cursor: pointer; margin: 0; height: 36px;">
            Current Week
          </button>
          <button id="gwbw-next-week" style="background: #f8f9fa; border: 1px solid #dadce0; border-radius: 0 4px 4px 0; padding: 8px; color: #3c4043; cursor: pointer; margin: 0; display: flex; align-items: center; justify-content: center; height: 36px;">
            ${createArrowSVG('right')}
          </button>
        </div>
        <button id="gwbw-apply" style="background: #1a73e8; border: none; border-radius: 4px; padding: 8px 16px; color: white; cursor: pointer;">Apply</button>
      </div>
    `;
    
    // Add the date picker to the document body
    document.body.appendChild(datePicker);
    
    console.log('Date picker created (initially hidden)');
  }
  
  /**
   * Remove any existing date picker to avoid duplicates
   */
  function removeExistingDatePicker() {
    const existingPicker = document.getElementById('gwbw-date-picker');
    if (existingPicker) {
      existingPicker.remove();
    }
  }
  
  /**
   * Show the date picker positioned near the calendar icon
   */
  function showDatePicker() {
    const datePicker = document.getElementById('gwbw-date-picker');
    const calendarIcon = document.getElementById('gwbw-calendar-icon');
    
    if (!datePicker || !calendarIcon) {
      console.error('Date picker or calendar icon not found');
      return;
    }
    
    // Get the position of the calendar icon
    const iconRect = calendarIcon.getBoundingClientRect();
    
    // Position the date picker below the icon
    datePicker.style.top = (iconRect.bottom + window.scrollY + 8) + 'px';
    datePicker.style.left = (iconRect.left + window.scrollX - 150) + 'px'; // Center the picker
    
    // Show the date picker with animation
    datePicker.style.display = 'block';
    
    // Trigger reflow
    datePicker.offsetHeight;
    
    // Make it visible
    datePicker.style.opacity = '1';
    
    isDatePickerVisible = true;
    updateCalendarIconState(true);
  }
  
  /**
   * Hide the date picker
   */
  function hideDatePicker() {
    const datePicker = document.getElementById('gwbw-date-picker');
    
    if (!datePicker) {
      return;
    }
    
    // Hide with animation
    datePicker.style.opacity = '0';
    
    // Wait for animation to complete before removing from DOM
    setTimeout(() => {
      datePicker.style.display = 'none';
    }, parseFloat(config.animationDuration) * 1000);
    
    isDatePickerVisible = false;
    updateCalendarIconState(false);
  }
  
  /**
   * Update the calendar icon's visual state (active or inactive)
   */
  function updateCalendarIconState(isActive) {
    const calendarIcon = document.getElementById('gwbw-calendar-icon');
    if (!calendarIcon) return;
    
    // Update the SVG color based on active state
    const svg = calendarIcon.querySelector('svg');
    if (svg) {
      svg.setAttribute('stroke', isActive ? config.activeIconColor : config.calendarIconColor);
    }
    
    // Update the background color
    calendarIcon.style.backgroundColor = isActive ? 'rgba(26, 115, 232, 0.1)' : '';
  }
  
  /**
   * Check for existing date parameters in the URL and set the date picker values
   */
  function checkForExistingDateParams() {
    const urlParams = new URLSearchParams(window.location.search);
    const tbs = urlParams.get('tbs');
    
    if (tbs) {
      // Parse the tbs parameter to extract date ranges
      // The format is usually "cdr:1,cd_min:MM/DD/YYYY,cd_max:MM/DD/YYYY"
      const match = tbs.match(/cd_min:(\d+)\/(\d+)\/(\d+),cd_max:(\d+)\/(\d+)\/(\d+)/);
      
      if (match) {
        // Convert MM/DD/YYYY to YYYY-MM-DD for input[type=date]
        const startMonth = match[1].padStart(2, '0');
        const startDay = match[2].padStart(2, '0');
        const startYear = match[3];
        
        const endMonth = match[4].padStart(2, '0');
        const endDay = match[5].padStart(2, '0');
        const endYear = match[6];
        
        selectedStartDate = `${startYear}-${startMonth}-${startDay}`;
        selectedEndDate = `${endYear}-${endMonth}-${endDay}`;
        
        // Update the input fields when they become available
        setTimeout(() => {
          const startDateInput = document.getElementById('gwbw-start-date');
          const endDateInput = document.getElementById('gwbw-end-date');
          
          if (startDateInput) startDateInput.value = selectedStartDate;
          if (endDateInput) endDateInput.value = selectedEndDate;
        }, 100);
        
        // Visual indicator that date filter is active
        updateCalendarIconState(true);
      }
    }
  }
  
  /**
   * Add event listeners for the calendar icon and date picker
   */
  function addEventListeners() {
    // Handle calendar icon click
    document.addEventListener('click', function(e) {
      // Click on calendar icon toggles the date picker
      if (e.target.closest('#gwbw-calendar-icon')) {
        if (isDatePickerVisible) {
          hideDatePicker();
        } else {
          showDatePicker();
        }
        e.stopPropagation();
      }
      // Clicking outside the date picker closes it
      else if (isDatePickerVisible && !e.target.closest('#gwbw-date-picker')) {
        hideDatePicker();
      }
    });
    
    // Handle input changes and button clicks in the date picker
    document.addEventListener('input', function(e) {
      if (e.target.id === 'gwbw-start-date') {
        selectedStartDate = e.target.value;
      } else if (e.target.id === 'gwbw-end-date') {
        selectedEndDate = e.target.value;
      }
    });
    
    document.addEventListener('click', function(e) {
      // Apply button click
      if (e.target.id === 'gwbw-apply') {
        applyDateFilter();
        hideDatePicker();
      }
      
      // Current week button click
      else if (e.target.id === 'gwbw-quick-week') {
        setCurrentWeek();
      }
      
      // Previous week button click
      else if (e.target.closest('#gwbw-prev-week')) {
        setPreviousWeek();
      }
      
      // Next week button click
      else if (e.target.closest('#gwbw-next-week')) {
        setNextWeek();
      }
    });
  }
  
  /**
   * Set the date range to the current week (Sunday to Saturday)
   */
  function setCurrentWeek() {
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 6 = Saturday
    
    // Calculate the date for the Sunday of this week
    const sundayDate = new Date(today);
    sundayDate.setDate(today.getDate() - currentDay);
    
    // Calculate the date for the Saturday of this week
    const saturdayDate = new Date(today);
    saturdayDate.setDate(today.getDate() + (6 - currentDay));
    
    // Format dates as YYYY-MM-DD
    selectedStartDate = formatDateForInput(sundayDate);
    selectedEndDate = formatDateForInput(saturdayDate);
    
    // Update the input fields
    const startDateInput = document.getElementById('gwbw-start-date');
    const endDateInput = document.getElementById('gwbw-end-date');
    
    if (startDateInput) startDateInput.value = selectedStartDate;
    if (endDateInput) endDateInput.value = selectedEndDate;
  }
  
  /**
   * Set the date range to the previous week based on current selection
   */
  function setPreviousWeek() {
    // If no dates are selected, start with current week
    if (!selectedStartDate || !selectedEndDate) {
      setCurrentWeek();
      return;
    }
    
    // Create date objects from the current selection
    const startDate = new Date(selectedStartDate);
    const endDate = new Date(selectedEndDate);
    
    // Move both dates back by 7 days
    startDate.setDate(startDate.getDate() - 7);
    endDate.setDate(endDate.getDate() - 7);
    
    // Update the selected dates
    selectedStartDate = formatDateForInput(startDate);
    selectedEndDate = formatDateForInput(endDate);
    
    // Update the input fields
    const startDateInput = document.getElementById('gwbw-start-date');
    const endDateInput = document.getElementById('gwbw-end-date');
    
    if (startDateInput) startDateInput.value = selectedStartDate;
    if (endDateInput) endDateInput.value = selectedEndDate;
  }
  
  /**
   * Set the date range to the next week based on current selection
   */
  function setNextWeek() {
    // If no dates are selected, start with current week
    if (!selectedStartDate || !selectedEndDate) {
      setCurrentWeek();
      return;
    }
    
    // Create date objects from the current selection
    const startDate = new Date(selectedStartDate);
    const endDate = new Date(selectedEndDate);
    
    // Move both dates forward by 7 days
    startDate.setDate(startDate.getDate() + 7);
    endDate.setDate(endDate.getDate() + 7);
    
    // Update the selected dates
    selectedStartDate = formatDateForInput(startDate);
    selectedEndDate = formatDateForInput(endDate);
    
    // Update the input fields
    const startDateInput = document.getElementById('gwbw-start-date');
    const endDateInput = document.getElementById('gwbw-end-date');
    
    if (startDateInput) startDateInput.value = selectedStartDate;
    if (endDateInput) endDateInput.value = selectedEndDate;
  }
  
  /**
   * Create arrow SVG for navigation buttons
   */
  function createArrowSVG(direction) {
    const points = direction === 'left' ?
      "10,5 3,12 10,19" :  // Left arrow
      "4,5 11,12 4,19";    // Right arrow
      
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="24" 
        viewBox="0 0 14 24" fill="none" stroke="currentColor" 
        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="${points}"></polyline>
      </svg>
    `;
  }
  
  /**
   * Format a Date object as YYYY-MM-DD for input[type=date]
   */
  function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Format a Date object as MM/DD/YYYY for Google's URL parameters
   */
  function formatDateForGoogle(dateStr) {
    const date = new Date(dateStr);
    const month = (date.getMonth() + 1).toString();
    const day = date.getDate().toString();
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  }
  
  /**
   * Apply the date filter by modifying the search URL
   */
  function applyDateFilter() {
    if (!selectedStartDate || !selectedEndDate) {
      console.error('Start and end dates must be selected');
      return;
    }
    
    // Get the current URL and parameters
    const url = new URL(window.location.href);
    const urlParams = new URLSearchParams(url.search);
    
    // Format dates for Google's URL parameters
    const startDateFormatted = formatDateForGoogle(selectedStartDate);
    const endDateFormatted = formatDateForGoogle(selectedEndDate);
    
    // Set the tbs parameter for date range
    // Format: cdr:1,cd_min:MM/DD/YYYY,cd_max:MM/DD/YYYY
    urlParams.set('tbs', `cdr:1,cd_min:${startDateFormatted},cd_max:${endDateFormatted}`);
    
    // Update the URL with the new parameters
    url.search = urlParams.toString();
    
    // Navigate to the new URL
    window.location.href = url.toString();
  }
  
  /**
   * Observe URL changes to re-initialize the extension when navigating
   * between Google Search pages (handles AJAX navigation)
   */
  function observeUrlChanges() {
    let lastUrl = location.href;
    
    // Create an observer instance
    const observer = new MutationObserver(function() {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        if (isGoogleSearchPage()) {
          console.log('URL changed to a Google search page, reinitializing');
          setTimeout(initializeWeekByWeekSearch, 500);
        }
      }
    });
    
    // Start observing
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Also listen for popstate events for browser back/forward
    window.addEventListener('popstate', function() {
      if (isGoogleSearchPage()) {
        setTimeout(initializeWeekByWeekSearch, 500);
      }
    });
  }
  
  // Initialize the extension after the page has loaded
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
/******/ })()
;
//# sourceMappingURL=contentScript.js.map