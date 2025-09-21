# GSTPL Tissue Quality Control - Next.js App

This is a React-based Next.js application for Tissue Quality Control - Rewinder Daily Report, converted from the original HTML file.

## Features

- Excel file upload and processing (.xlsx, .xlsm)
- Daily quality control reports for two rewinders
- Trend analysis with interactive charts
- Export functionality (CSV, Excel, PDF)
- Customizable date filtering
- Logo upload support

## Getting Started

### Prerequisites

- Node.js 14.0 or higher
- npm or yarn package manager

### Installation

1. Clone or download this repository:
```bash
cd gstpl-nextjs
```

2. Install dependencies:
```bash
npm install
```

3. Add your logo file (optional):
   - Place your `GSTPL_logo.jpg` file in the `public` directory
   - Or use the logo upload feature in the app

### Running the Application

For development:
```bash
npm run dev
```

For production build:
```bash
npm run build
npm start
```

The app will be available at [http://localhost:3000](http://localhost:3000)

## Usage

1. **Upload Excel File**: Click "Upload Excel" and select your workbook containing:
   - Rewinder-1 data sheet
   - Rewinder-2 data sheet 
   - Specifications sheet

2. **Select Sheets**: The app will auto-detect sheets, but you can manually select the correct ones

3. **Filter by Date** (optional): Use the date range filters to limit the report data

4. **Generate Report**: Click "Generate Report" to process the data

5. **Export Options**:
   - Download CSV: Export report as CSV file
   - Download Excel: Export report as Excel file
   - COA (PDF): Generate Certificate of Analysis PDF for a specific date
   - Trends: View interactive trend analysis charts

## Project Structure

```
gstpl-nextjs/
├── app/                    # Next.js app directory
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Main page component
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── Header.tsx         # Company header
│   ├── Controls.tsx       # File upload and controls
│   ├── Report.tsx         # Report display
│   └── TrendPanel.tsx     # Trend analysis panel
├── lib/                   # Utilities and helpers
│   ├── types.ts          # TypeScript types
│   ├── constants.ts      # App constants
│   ├── utils.ts          # Utility functions
│   ├── dataProcessing.ts # Data processing logic
│   ├── trendUtils.ts     # Trend analysis utilities
│   └── pdfExport.ts      # PDF export functionality
├── public/               # Static files
└── package.json          # Dependencies and scripts
```

## Key Technologies

- **Next.js 14**: React framework
- **TypeScript**: Type safety
- **Chart.js**: Data visualization
- **SheetJS (xlsx)**: Excel file processing
- **jsPDF & html2canvas**: PDF generation

## Data Requirements

Your Excel workbook should contain:

### Rewinder Sheets
- Date column
- Quality/Grade column
- GSM/Ply column
- Various metric columns (Thickness, Bulk, Tensile MD/CD, etc.)

### Specifications Sheet
- Quality column
- GSM/Ply column
- Specification values for metrics
- Tolerance values (optional)

## Browser Compatibility

The app works best in modern browsers:
- Chrome/Edge (recommended)
- Firefox
- Safari

## Troubleshooting

1. **Excel file not loading**: Ensure it's a valid .xlsx or .xlsm file
2. **No data showing**: Check date filters and sheet selection
3. **Charts not displaying**: Ensure browser supports Canvas API

## License

This project is for internal use by GAYATRISHAKTI TISSUE.