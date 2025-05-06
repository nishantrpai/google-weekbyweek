# Google Week by Week

A Chrome extension that enhances Google search by adding the ability to search results by week, making it easier to find time-specific content.

## Features

- Adds a calendar icon to Google search pages
- Allows selection of weekly date ranges using a date picker
- "Current Week" button to quickly set the current week's date range
- Preserves your date range selection between searches
- Integrates smoothly with Google's search interface

## Setup Instructions

1. Download the extension:
   - Clone this repository or download the `build` folder

2. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top right corner
   - Click "Load unpacked" and select the `build` folder

3. Use the extension:
   - Go to Google search
   - Use the calendar icon next to the search box
   - Set your desired week date range
   - Click "Apply" to search within that week

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

This extension injects a calendar icon into Google search pages. When clicked, it reveals a date picker that allows you to set a start and end date for your search. The extension then modifies Google's search parameters to filter results to that date range.

Google uses the `tbs` URL parameter with the format `cdr:1,cd_min:MM/DD/YYYY,cd_max:MM/DD/YYYY` to filter by date range, which this extension sets automatically.
