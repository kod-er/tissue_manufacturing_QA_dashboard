# PDF Report Features

The Tissue QA Dashboard now includes comprehensive PDF reports with enhanced visualizations.

## Report Contents

### 1. Header Section
- Company logo (Gayatri Shakti)
- Report title and generation date
- Production date being reported

### 2. Production Information
- Shift details
- Lab Executive and Machine Shift Incharge
- Lot, Roll, and Spool numbers
- Quality grade

### 3. Quality Metrics Table
- Core parameters with actual values
- Control limits (LCL/UCL)
- Pass/Fail status with color coding
- Parameters include:
  - GSM (Grammage)
  - Thickness
  - Bulk
  - Tensile Strength (MD/CD)
  - Brightness
  - Moisture Content
  - Opacity (if available)

### 4. Additional Strength Metrics
- MD/CD Ratio
- Stretch/Elongation
- Wet Tensile
- Wet/Dry Tensile Ratio
- Gross Mean Strength
- Machine Creep Percentage

### 5. Machine Parameters
- Machine Speed
- Pope Reel Speed
- MC Draw
- Blade settings
- Press Load
- Coating parameters

### 6. Fiber Composition
- HW/SW Grade information
- Short/Long Fiber percentages
- Broke percentage
- Consistency values
- Consumption rates (WSR/DSR)

### 7. Visual Performance Summary
- **Quality Performance Table**: Shows each parameter with:
  - Actual value with units
  - Target range
  - Performance percentage (0-100%)
  - Status (Excellent/Good/Fair/Out of Spec)
  - Color-coded cells for quick visual assessment

### 8. Trend Analysis Summary
- **7-Day Trend Table**: For each key parameter shows:
  - Current value
  - 7-day average
  - Trend indicator (↑/↓/→)
  - Variation percentage
  
### 9. Overall Quality Score
- Single overall quality score (0-100%)
- Color-coded based on performance:
  - Green: ≥90% (Excellent)
  - Orange: 70-89% (Good)
  - Red: <70% (Needs Improvement)

### 10. Remarks Section
- Any production remarks
- Break information
- Special observations

## Visual Enhancements

1. **Color Coding Throughout**:
   - Green for in-spec/excellent performance
   - Orange for marginal/fair performance
   - Red for out-of-spec/poor performance

2. **Professional Formatting**:
   - Clean table layouts with alternating colors
   - Clear section headers
   - Consistent spacing and alignment

3. **Performance Metrics**:
   - Performance calculated as distance from optimal center of spec range
   - Visual indicators make it easy to spot issues at a glance

## Usage

### From Daily Report Tab
1. Select the date you want to report on
2. Click "Download Report" button
3. PDF will be generated and downloaded automatically

### From Speed Dial (Floating Action Button)
1. Click the floating action button in bottom-right
2. Select "Export Report"
3. PDF for the most recent date will be generated

## File Naming
Reports are automatically named with the date: `QA_Report_YYYY-MM-DD.pdf`

## Benefits
- Complete quality snapshot in a single document
- Easy to share with management and quality teams
- Historical record keeping
- Visual performance indicators for quick assessment
- Trend analysis for continuous improvement
- No need for manual report creation