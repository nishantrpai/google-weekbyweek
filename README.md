# Week by Week Search

A browser extension that enhances search functionality on Google, YouTube, and Twitter by adding the ability to search results by week, making it easier to find time-specific content.

## Features

- Adds a calendar icon to search interfaces on:
  - Google Search
  - YouTube Search
  - Twitter Search
- Allows selection of weekly date ranges using a date picker
- "Current Week" button to quickly set the current week's date range
- Previous/Next week navigation buttons
- Preserves your date range selection between searches
- Integrates smoothly with each platform's search interface
- Site-specific styling to match each platform's design

## Setup Instructions

1. Download the extension:
   - Clone this repository or download the `build` folder

2. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked" and select the `build` folder

3. Use the extension:
   - Go to Google, YouTube, or Twitter
   - Use the calendar icon next to the search box
   - Set your desired week date range
   - Click "Apply" to search within that week

## Platform-Specific Features

### Google Search

- Uses Google's native date range filtering parameters
- Formats dates as MM/DD/YYYY for compatibility with Google's filters

### YouTube Search

- Adds date filters directly to your search query using `after:` and `before:` parameters
- Works with YouTube's search system to filter videos by upload date

### Twitter (X)

- Adds `since:` and `until:` parameters to your search query
- Formats dates in YYYY-MM-DD format as required by Twitter's search API

## Development

To modify this extension:

```bash
# Install dependencies
npm install

# Watch for changes during development
npm run watch

# Build for production
npm run build
```

## How it works

This extension injects a calendar icon into search pages on Google, YouTube, and Twitter. When clicked, it reveals a date picker that allows you to set a start and end date for your search. The extension then modifies each platform's search parameters to filter results to that date range.

Each platform uses different URL parameter formats:

- Google: Uses the `tbs` URL parameter with the format `cdr:1,cd_min:MM/DD/YYYY,cd_max:MM/DD/YYYY`
- YouTube: Uses search query parameters like `after:YYYY-MM-DD before:YYYY-MM-DD`
- Twitter: Uses query parameters like `since:YYYY-MM-DD until:YYYY-MM-DD`
