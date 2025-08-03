# Multi-Shift and Quality Grade Support

The Tissue QA Dashboard now supports multiple production shifts and quality grades per day, allowing for comprehensive tracking of all production runs.

## Key Features

### 1. Multiple Records Per Day
- The system can handle multiple quality records for the same date
- Each record can have different:
  - Time stamps
  - Shift identifiers (e.g., Morning, Evening, Night)
  - Quality grades (e.g., Premium, Standard, Export)
  - Production parameters and test results

### 2. Enhanced Daily Report View
- **Date Selection**: Select any date to view all records for that day
- **Shift Filter**: When multiple shifts exist for a date, filter by specific shift
- **Quality Filter**: When multiple quality grades exist, filter by specific grade
- **Info Banner**: Shows total records found for the selected date
- **Time Display**: Each record shows its timestamp for better identification

### 3. Data Table Improvements
- **Shift Column**: Shows shift information for each record
- **Quality Column**: Shows quality grade for each record
- **Time Column**: Shows time of production/testing
- **Advanced Filtering**: 
  - Filter by shift across all dates
  - Filter by quality grade across all dates
  - Combined with existing search functionality

### 4. PDF Report Enhancements
- Production information section now includes:
  - Date and Time
  - Shift identifier
  - Quality grade
- Reports clearly identify which specific production run is being reported

### 5. CSV Export Updates
- Export includes all metadata:
  - Date
  - Time
  - Shift
  - Quality Grade
  - All quality parameters

## Usage Examples

### Scenario 1: Multiple Shifts
A factory running 3 shifts per day:
- Morning Shift (6 AM - 2 PM)
- Evening Shift (2 PM - 10 PM)
- Night Shift (10 PM - 6 AM)

Each shift's quality data is recorded separately with proper shift identification.

### Scenario 2: Multiple Quality Grades
Production of different quality grades on the same day:
- Premium Grade tissue
- Standard Grade tissue
- Export Quality tissue

Each grade has its own quality parameters and control limits.

### Scenario 3: Combined Shift and Quality
- Morning Shift produces Premium Grade
- Evening Shift produces Standard Grade
- Night Shift produces Export Quality

All combinations are tracked and can be filtered independently.

## Benefits

1. **Complete Production Visibility**: No data is lost or overwritten when multiple production runs occur on the same day

2. **Shift Performance Analysis**: Compare quality metrics across different shifts to identify patterns

3. **Quality Grade Tracking**: Monitor performance for different product grades separately

4. **Detailed Reporting**: Generate reports for specific shift/quality combinations

5. **Historical Analysis**: Track trends for specific shifts or quality grades over time

## Data Structure
Each record in the Excel file should include:
- Date (required)
- Time (optional but recommended)
- Shift (optional but recommended)
- Quality Grade (optional)
- All quality parameters with their values and control limits

## Best Practices

1. **Consistent Naming**: Use consistent shift names (e.g., always "Morning" not sometimes "AM")

2. **Time Format**: Include time in a consistent format (e.g., "14:30" or "2:30 PM")

3. **Quality Grades**: Standardize quality grade names across all records

4. **Data Entry**: Ensure each production run is entered as a separate row in the Excel file

5. **Complete Records**: Include shift and quality information for better tracking and analysis