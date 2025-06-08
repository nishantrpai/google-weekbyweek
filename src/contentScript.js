// Week by Week Search Extension
// Adds functionality to search Google, YouTube and Twitter results one week at a time

// Main entry point for the content script
(function() {
  'use strict';
  
  // Configuration
  const config = {
    calendarIconSize: '20px',
    calendarIconColor: '#5f6368', // Default gray color
    activeIconColor: '#1a73e8', // Default blue color
    datePickerWidth: '300px',
    animationDuration: '0.2s',
    // Initialization configuration
    initDelay: {
      google: 100,   // Google loads quickly
      youtube: 2000, // YouTube needs more time for SPA to render
      twitter: 1500  // Twitter also needs time for SPA to render
    },
    maxRetries: 3,   // Maximum number of retries when searching for elements
    retryDelay: 1500, // Delay between retries in milliseconds
    // Site-specific configurations
    sites: {
      google: {
        activeIconColor: '#1a73e8', // Google blue
        searchFormSelector: 'form[role="search"], form#tsf, form.search-form',
        searchButtonSelector: 'button[type="submit"], button[aria-label="Google Search"]',
        urlParam: 'tbs',
        iconSize: '20px' // Default icon size for Google
      },
      twitter: {
        activeIconColor: '#1DA1F2', // Twitter blue
        searchFormSelector: 'button[aria-label="More"]',
        searchButtonSelector: 'button[aria-label="More"]',
        urlParam: 'since',
        iconSize: '24px' // Bigger icon size for Twitter
      }
    }
  };
  
  // Global state
  let isDatePickerVisible = false;
  let selectedStartDate = null;
  let selectedEndDate = null;
  let currentSite = null;
  let initAttempts = 0;
  
  /**
   * Initialize the extension
   */
  function init() {
    console.log('Initializing Week by Week Search extension');
    
    // Detect which site we're on
    currentSite = detectSite();
    
    // Only proceed if we're on a supported site
    if (currentSite) {
      // Get site-specific delay
      const delay = config.initDelay[currentSite] || 500;
      console.log(`Delaying initialization for ${delay}ms on ${currentSite}`);
      
      // Delay initialization to ensure page has fully loaded
      setTimeout(() => {
        initializeWeekByWeekSearch();
      }, delay);
    }
    
    // Listen for page navigation (for SPA behavior)
    observeUrlChanges();
  }
  
  /**
   * Detect which site we're currently on
   */
  function detectSite() {
    const hostname = window.location.hostname.toLowerCase();
    
    if (hostname.includes('google') && 
        (window.location.pathname === '/search' || window.location.pathname === '/')) {
      return 'google';
    } 
    else if (hostname.includes('twitter') || hostname.includes('x.com')) {
      return 'twitter';
    }
    
    return null;
  }
  
  /**
   * Initialize the week by week search functionality
   */
  function initializeWeekByWeekSearch() {
    // Reset attempt counter
    initAttempts = 0;
    
    // Try to inject the calendar icon (with retry mechanism)
    tryInjectCalendarIcon();
    
    // Create the date picker component (initially hidden)
    createDatePickerElement();
    
    // Check URL for existing date parameters and set them if present
    checkForExistingDateParams();
    
    // Add event listeners
    addEventListeners();
  }
  
  /**
   * Try to inject the calendar icon with retry mechanism
   */
  function tryInjectCalendarIcon() {
    // Remove any existing calendar icon first
    removeExistingCalendarIcon();
    
    if (!currentSite) return;
    
    // Try to inject the calendar icon
    const success = injectCalendarIcon();
    
    // If not successful and we haven't reached max retries, try again
    if (!success && initAttempts < config.maxRetries) {
      initAttempts++;
      console.log(`Retry attempt ${initAttempts} for ${currentSite} in ${config.retryDelay}ms`);
      setTimeout(tryInjectCalendarIcon, config.retryDelay);
    }
  }
  
  /**
   * Create and inject the calendar icon into the site's search bar
   * @returns {boolean} Whether injection was successful
   */
  function injectCalendarIcon() {
    if (!currentSite) return false;
    
    // Get site-specific selectors
    const siteConfig = config.sites[currentSite];
    
    // Find the search form using the site-specific selector
    let searchForm = document.querySelector(siteConfig.searchFormSelector);
    
    // Special handling for different sites
    if (currentSite === 'twitter') {
      searchForm = searchForm ? searchForm.parentNode : null;
    }
    
    console.log(searchForm);
    if (!searchForm) {
      console.error(`Week by Week: Could not find the search form on ${currentSite}`);
      return false;
    }
    
    // Create the calendar icon element
    const calendarIcon = document.createElement('div');
    calendarIcon.id = 'gwbw-calendar-icon';
    calendarIcon.className = 'gwbw-calendar-icon';
    calendarIcon.innerHTML = createCalendarIconSVG();
    calendarIcon.title = 'Search by week';
    
    // Get site-specific icon size if available
    const iconSize = siteConfig.iconSize || config.calendarIconSize;

    // Add styles to the icon, with some site-specific adjustments
    calendarIcon.style.cssText = `
      cursor: pointer;
      width: ${iconSize};
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 4px;
      border-radius: 50%;
      transition: background-color 0.2s;
      vertical-align: middle;
      position: relative;
      z-index: 1000;
      pointer-events: auto;
    `;
    
    // Find the right spot to insert the icon based on the site
    let searchButton = null;
    
    if (searchForm) {
      searchButton = searchForm.querySelector(siteConfig.searchButtonSelector);
    }
    
    if (currentSite === 'twitter') {
      // For Twitter, position icon adjacent to the search input
      // First try to find the search input container
      const searchContainer = searchForm ? searchForm.parentNode : null;
      if (searchContainer) {
        // Reset previous styling
        calendarIcon.style.position = 'absolute';
        calendarIcon.style.right = '45px';
        calendarIcon.style.top = '50%';
        calendarIcon.style.transform = 'translateY(-50%)';
        calendarIcon.style.zIndex = '2000';
        
        // If searchForm is direct input, we need to work with its parent
        searchContainer.style.position = 'relative';
        
        if (calendarIcon.parentNode !== searchContainer) {
          // Move the icon to be a child of the search container for better positioning
          searchContainer.appendChild(calendarIcon);
        }
      }
    } else {
      // Standard positioning for Google and other sites
      if (searchButton && searchButton.parentNode) {
        searchButton.parentNode.insertBefore(calendarIcon, searchButton);
      } else if (searchForm) {
        // Fallback to append to the form
        searchForm.appendChild(calendarIcon);
      }
    }
    
    console.log(`Calendar icon injected on ${currentSite}`);
    return true;
  }
  
  /**
   * Create the SVG for the calendar icon
   */
  function createCalendarIconSVG() {
    // Get site-specific icon size if available
    const iconSize = currentSite && config.sites[currentSite].iconSize ? 
      config.sites[currentSite].iconSize : config.calendarIconSize;
      
    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${iconSize}" height="${iconSize}" 
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
   * Detect Twitter's theme (dark or light)
   * @returns {string} 'dark' or 'light'
   */
  function detectTwitterTheme() {
    // Check if we're on Twitter
    if (currentSite !== 'twitter') {
      return 'light'; // Default to light for non-Twitter sites
    }
    
    // Method 1: Check for dark mode by looking at the background color
    const bodyBgColor = window.getComputedStyle(document.body).backgroundColor;
    
    // Convert RGB to brightness
    if (bodyBgColor) {
      const rgb = bodyBgColor.match(/\d+/g);
      if (rgb && rgb.length >= 3) {
        // Calculate brightness (simple formula: (R+G+B)/3)
        const brightness = (parseInt(rgb[0]) + parseInt(rgb[1]) + parseInt(rgb[2])) / 3;
        if (brightness < 128) {
          return 'dark';
        }
      }
    }
    
    // Method 2: Look for dark theme indicators in classes or attributes
    const darkThemeIndicator = document.documentElement.getAttribute('data-theme') === 'dark' ||
                               document.body.classList.contains('dark') ||
                               document.querySelector('[data-nightmode="true"]');
                               
    if (darkThemeIndicator) {
      return 'dark';
    }
    
    // Default to light theme if no dark indicators found
    return 'light';
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
    
    // Get theme for Twitter
    const twitterTheme = currentSite === 'twitter' ? detectTwitterTheme() : 'light';
    const isTwitterDark = twitterTheme === 'dark';
    
    // Set colors based on theme
    const bgColor = isTwitterDark && currentSite === 'twitter' ? '#000' : 'white';
    const textColor = isTwitterDark && currentSite === 'twitter' ? '#e7e9ea' : '#202124';
    const borderColor = isTwitterDark && currentSite === 'twitter' ? '#333' : '#dfe1e5';
    const secondaryTextColor = isTwitterDark && currentSite === 'twitter' ? '#8899a6' : '#5f6368';
    const buttonBgColor = isTwitterDark && currentSite === 'twitter' ? '#192734' : '#f8f9fa';
    const buttonTextColor = isTwitterDark && currentSite === 'twitter' ? '#e7e9ea' : '#3c4043';
    
    // Set sizes for Twitter
    const fontSize = currentSite === 'twitter' ? '13px' : '14px';
    const inputHeight = currentSite === 'twitter' ? '32px' : '36px';
    const buttonHeight = currentSite === 'twitter' ? '30px' : '36px';
    const buttonPadding = currentSite === 'twitter' ? '6px 12px' : '8px 16px';
    const datePadding = currentSite === 'twitter' ? '12px' : '16px';
    
    // Add styles to the date picker
    datePicker.style.cssText = `
      position: absolute;
      z-index: 9999;
      background: ${bgColor};
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, ${isTwitterDark ? '0.5' : '0.2'});
      padding: ${datePadding};
      width: ${config.datePickerWidth};
      display: none;
      opacity: 0;
      transition: opacity ${config.animationDuration} ease-in-out;
      font-family: ${currentSite === 'twitter' ? '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' : 'Arial, sans-serif'};
      font-size: ${fontSize};
      color: ${textColor};
      border: 1px solid ${borderColor};
    `;
    
    // Get site-specific accent color
    const accentColor = currentSite ? config.sites[currentSite].activeIconColor : config.activeIconColor;
    
    // Create the content for the date picker
    datePicker.innerHTML = `
      <div style="margin-bottom: ${currentSite === 'twitter' ? '12px' : '16px'}; font-weight: bold; color: ${textColor};">
        Search ${currentSite ? currentSite.charAt(0).toUpperCase() + currentSite.slice(1) : ''} by Week
      </div>
      
      <div style="margin-bottom: ${currentSite === 'twitter' ? '12px' : '16px'};">
        <div style="margin-bottom: 6px; color: ${secondaryTextColor}; font-size: ${fontSize};">Start Date</div>
        <input type="date" id="gwbw-start-date" style="width: 100%; padding: ${currentSite === 'twitter' ? '6px' : '8px'}; 
          height: ${inputHeight}; border: 1px solid ${borderColor}; border-radius: 4px; background: ${bgColor}; color: ${textColor};">
      </div>
      
      <div style="margin-bottom: ${currentSite === 'twitter' ? '12px' : '16px'};">
        <div style="margin-bottom: 6px; color: ${secondaryTextColor}; font-size: ${fontSize};">End Date</div>
        <input type="date" id="gwbw-end-date" style="width: 100%; padding: ${currentSite === 'twitter' ? '6px' : '8px'}; 
          height: ${inputHeight}; border: 1px solid ${borderColor}; border-radius: 4px; background: ${bgColor}; color: ${textColor};">
      </div>
      
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <div style="display: flex; align-items: center;">
          <button id="gwbw-prev-week" style="background: ${buttonBgColor}; border: 1px solid ${borderColor}; 
            border-radius: 4px 0 0 4px; padding: 6px; color: ${buttonTextColor}; cursor: pointer; margin: 0; 
            display: flex; align-items: center; justify-content: center; height: ${buttonHeight};">
            ${createArrowSVG('left')}
          </button>
          <button id="gwbw-quick-week" style="background: ${buttonBgColor}; border: 1px solid ${borderColor}; 
            border-left: none; border-right: none; padding: ${buttonPadding}; 
            color: ${buttonTextColor}; cursor: pointer; margin: 0; height: ${buttonHeight}; font-size: ${fontSize};">
            Current Week
          </button>
          <button id="gwbw-next-week" style="background: ${buttonBgColor}; border: 1px solid ${borderColor}; 
            border-radius: 0 4px 4px 0; padding: 6px; color: ${buttonTextColor}; cursor: pointer; margin: 0; 
            display: flex; align-items: center; justify-content: center; height: ${buttonHeight};">
            ${createArrowSVG('right')}
          </button>
        </div>
        <button id="gwbw-apply" style="background: ${accentColor}; border: none; border-radius: 4px; 
          padding: ${buttonPadding}; color: white; cursor: pointer; height: ${buttonHeight}; font-size: ${fontSize};">Apply</button>
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
    
    // Get site-specific accent color
    const accentColor = currentSite ? 
      config.sites[currentSite].activeIconColor : config.activeIconColor;
      
    // Update the SVG color based on active state
    const svg = calendarIcon.querySelector('svg');
    if (svg) {
      svg.setAttribute('stroke', isActive ? accentColor : config.calendarIconColor);
    }
    
  }
  
  /**
   * Check for existing date parameters in the URL and set the date picker values
   */
  function checkForExistingDateParams() {
    const urlParams = new URLSearchParams(window.location.search);
    
    // Different sites use different URL parameter formats
    if (currentSite === 'google') {
      const tbs = urlParams.get('tbs');
      
      if (tbs) {
        // Parse the tbs parameter to extract date ranges
        // Format is usually "cdr:1,cd_min:MM/DD/YYYY,cd_max:MM/DD/YYYY"
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
          
          updateDateInputsWithDelay();
        }
      }
    } else if (currentSite === 'youtube') {
      const sp = urlParams.get('sp');
      
      // YouTube uses a parameter like sp=CAISBggCEAEYAQ%3D%3D for date filtering
      // Since this is encoded, we need to check if filter is active by looking at the UI
      const dateFilterActive = document.querySelector('ytd-search-filter-renderer yt-formatted-string:contains("Last hour"), ytd-search-filter-renderer yt-formatted-string:contains("Today")');
      
      if (dateFilterActive || (sp && sp.includes('CAI'))) {
        // Extract dates from UI or use current week if filter is active but we can't determine dates
        setCurrentWeek();
      }
    } else if (currentSite === 'twitter') {
      const since = urlParams.get('since');
      const until = urlParams.get('until');
      
      if (since && until) {
        // Twitter uses since:YYYY-MM-DD until:YYYY-MM-DD format
        selectedStartDate = since;
        selectedEndDate = until;
        
        updateDateInputsWithDelay();
      }
    }
    
    // Visual indicator that date filter is active
    if (selectedStartDate && selectedEndDate) {
      updateCalendarIconState(true);
    }
  }
  
  /**
   * Update date input fields with a delay to ensure they're in the DOM
   */
  function updateDateInputsWithDelay() {
    setTimeout(() => {
      const startDateInput = document.getElementById('gwbw-start-date');
      const endDateInput = document.getElementById('gwbw-end-date');
      
      if (startDateInput) startDateInput.value = selectedStartDate;
      if (endDateInput) endDateInput.value = selectedEndDate;
    }, 100);
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
   * Apply the date filter by modifying the search URL based on the current site
   */
  function applyDateFilter() {
    if (!selectedStartDate || !selectedEndDate) {
      console.error('Start and end dates must be selected');
      return;
    }
    
    // Get the current URL and parameters
    const url = new URL(window.location.href);
    const urlParams = new URLSearchParams(url.search);
    
    // Format dates for URL parameters (depends on site)
    const startDateFormatted = formatDateForSite(selectedStartDate);
    const endDateFormatted = formatDateForSite(selectedEndDate);
    
    if (currentSite === 'google') {
      // Google format: cdr:1,cd_min:MM/DD/YYYY,cd_max:MM/DD/YYYY
      urlParams.set('tbs', `cdr:1,cd_min:${startDateFormatted},cd_max:${endDateFormatted}`);
    } 
    else if (currentSite === 'youtube') {
      // YouTube uses a complex parameter format that's difficult to reproduce
      // We'll use their search tools directly by adding the query parameter
      const searchQuery = urlParams.get('search_query') || '';
      
      // Convert dates to YYYY-MM-DD format for YouTube
      const formattedStartDate = formatDateStandardized(selectedStartDate);
      const formattedEndDate = formatDateStandardized(selectedEndDate);
      
      // Add date filter to search query if not already present
      if (!searchQuery.includes('after:') && !searchQuery.includes('before:')) {
        urlParams.set('search_query', `${searchQuery} after:${formattedStartDate} before:${formattedEndDate}`.trim());
      }
      
      // Clear any existing filter params that might interfere
      if (urlParams.has('sp')) {
        urlParams.delete('sp');
      }
    } 
    else if (currentSite === 'twitter') {
      // Twitter format: since:YYYY-MM-DD until:YYYY-MM-DD
      // These are typically part of the q parameter
      const query = urlParams.get('q') || '';
      
      // Convert dates to YYYY-MM-DD format
      const formattedStartDate = formatDateStandardized(selectedStartDate);
      const formattedEndDate = formatDateStandardized(selectedEndDate);
      
      // Remove any existing date filters
      let newQuery = query.replace(/\s*(since|until):\d{4}-\d{2}-\d{2}/g, '').trim();
      
      // Add the new date filters
      newQuery = `${newQuery} since:${formattedStartDate} until:${formattedEndDate}`.trim();
      
      urlParams.set('q', newQuery);
    }
    
    // Update the URL with the new parameters
    url.search = urlParams.toString();
    
    // Navigate to the new URL
    window.location.href = url.toString();
  }
  
  /**
   * Format a date according to the current site's requirements
   */
  function formatDateForSite(dateStr) {
    if (currentSite === 'google') {
      // Google format: MM/DD/YYYY
      const date = new Date(dateStr);
      const month = (date.getMonth() + 1).toString();
      const day = date.getDate().toString();
      const year = date.getFullYear();
      return `${month}/${day}/${year}`;
    } 
    else if (currentSite === 'youtube' || currentSite === 'twitter') {
      // YouTube and Twitter use YYYY-MM-DD
      return formatDateStandardized(dateStr);
    }
    
    // Default format
    return dateStr;
  }
  
  /**
   * Format a date string as YYYY-MM-DD
   */
  function formatDateStandardized(dateStr) {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Observe URL changes to re-initialize the extension when navigating
   * between supported pages (handles SPA navigation)
   */
  function observeUrlChanges() {
    let lastUrl = location.href;
    
    // Create an observer instance
    const observer = new MutationObserver(function() {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        currentSite = detectSite();
        
        if (currentSite) {
          console.log(`URL changed to a ${currentSite} page, reinitializing`);
          setTimeout(initializeWeekByWeekSearch, 500);
        }
      }
    });
    
    // Start observing
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Also listen for popstate events for browser back/forward
    window.addEventListener('popstate', function() {
      currentSite = detectSite();
      if (currentSite) {
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