# Production & Consumption Report Excel Analysis

## Overview
The "Production & Consumption Report August -2025.xlsx" is a comprehensive Excel workbook used by Gayatri Shakti Tissue Private Limited to track daily production, raw material consumption, and associated costs for their tissue manufacturing operations.

## File Structure

### Total Sheets: 15
1. **Production** - Master production summary
2. **Daily Sheets (02-08-2025 to 13-08-2025)** - Individual daily production reports
3. **Pulp & Chemical consumption** - Detailed consumption tracking with KPIs
4. **Consumption** - Consolidated raw material consumption and rates

---

## Sheet-by-Sheet Analysis

### 1. Production Sheet (Master Summary)
**Purpose**: Aggregated view of all production across the month

**Structure**:
- **Columns**: Date, S.N., Quality, GSM, M/C Deckle, M/C Reel Speed, M/C Prod., Avg. Speed, Avg. GSM, Production Loss Details, Time Loss, Remarks
- **Rows**: 111 rows covering August 1-13, 2025

**Key Data Points**:
- **Quality Types**: NT (Napkin Tissue), TOWEL, TT (Toilet Tissue)
- **GSM Grades**: 15, 17, 19 (grams per square meter)
- **Machine Deckle**: 2.85m (width of paper machine)
- **Production**: Measured in MT (Metric Tons)
- **Speed**: Measured in MPM (Meters Per Minute)

**Production Loss Categories**:
- Process (Yankee doctor blade changes, roll cleaning)
- Grade change
- Power (machine trips due to fluctuation)
- Sheet breaks

**Special Entries**:
- Rows 7-9 contain codes: MR-20-J, CT-16-J, EN-15-J (possibly batch/lot codes)

---

### 2. Daily Production Sheets (02-08-2025 to 13-08-2025)

**Purpose**: Detailed daily production reports with shift-wise breakdown

**Standard Structure for Each Day**:
```
Row 1: GAYATRISHALTI TISSUE PRIVATE LIMITED
Row 3: DAILY PRODUCTION REPORT OF TISSUE
Row 4: Date: [Date]
Row 6-7: Column headers
Row 9-21: Production entries
Row 22-23: Day totals
Row 25-27: Summary metrics
Row 29-34: Product codes (MR-20-J, CT-16-J, EN-15-J, etc.)
```

**Key Metrics Tracked**:
- Individual production runs with quality and GSM
- Production losses with time duration
- Day total production and average speed/GSM
- Cumulative production tracking
- Downtime in hours

**Insights**:
- Each sheet follows identical format for consistency
- Tracks both current day and cumulative metrics
- Includes moisture and brightness percentages
- Lists multiple product codes (possibly different product lines)

---

### 3. Pulp & Chemical Consumption Sheet

**Purpose**: Comprehensive tracking of all raw materials, chemicals, utilities, and KPIs

**Structure**: 124 rows × 76 columns (dates from 1st to 31st August)

**Main Sections**:

#### A. RAW MATERIAL (Rows 3-18)
**Pulp Types Tracked**:
1. Imported Softwood Pulps:
   - SODRA (AD) - ₹76,144/MT
   - STORA (AD) - ₹76,000/MT
   - METSA (AD) - ₹76,140/MT
   - Mercer (AD) - ₹76,000/MT
   - Laja (AD) - ₹78,000/MT
   - Pacifico (AD) - ₹78,000/MT
   - KOMI (AD) - ₹69,000/MT

2. Imported Hardwood Pulps:
   - Acacia April - ₹58,589.95/MT
   - Acacia Exman - ₹58,590/MT
   - CMPC Domestic - ₹67,410/MT
   - Baycel - ₹58,500/MT
   - Suzano (AD) - ₹58,500/MT

3. Other:
   - Wet strength white Tissue - ₹36,452/MT

#### B. Solenise Chemicals (Rows 19-49)
**30 different chemicals tracked including**:
- Wet Strength Resins (WSR): Kyemene 777LX, Kyemene 821 AP
- Dry Strength Resins (DSR): Hercobond 2515AP
- Yankee Coating: Creptrol 3718, Creptrol 9258 AP
- Yankee Release: Rezosol 150, Rezosol 1400
- Process Chemicals: Coagulants, flocculants, biocides
- Utilities: Caustic soda flakes, sodium hypochlorite

#### C. PACKING MATERIALS (Rows 50-53)
- Core pipes (Kg)
- Core Plugs (NOS)
- Stretch film (Kg)

#### D. MACHINE PRODUCTION (Row 55)
- Daily machine production in MT

#### E. FINISHED PRODUCTION TO WAREHOUSE (Row 56)
- Formula: Machine Production × 0.935 (93.5% yield)

#### F. Utility (Rows 58-68)
**Consumption Metrics**:
1. Steam consumption (MT)
2. LPG consumption (MT)
3. Water consumption (m³)
4. Down Time (HRS)
5. Pulp Ratio

**Efficiency Ratios Calculated**:
- Steam T/T (Tons steam per Ton production)
- LPG Kg/T
- Water m³/T
- Power KWH/T

#### G. KPI (Key Performance Indicators) (Rows 69-74)
- Production Compliance %
- Steam cost (Rs./T)
- LPG cost (Rs./T)
- Water cost (Rs./T)
- Power cost (Rs./T)

---

### 4. Consumption Sheet

**Purpose**: Consolidated view of raw material consumption with rates

**Structure**:
- Row 1: RAW MATERIAL header
- Row 2: Material names (columns)
- Row 3: Units (all in MT)
- Row 4: **Rates in INR per MT**
- Rows 5-57: Daily consumption data (August 1-31)
- Row 71: Total consumption formulas

**Key Features**:
- Direct correlation between consumption and production dates
- Pre-defined rates for cost calculation
- Running totals for month-end analysis

---

## Key Insights and Learnings

### 1. **Production Patterns**
- Three main product qualities: NT (Napkin), TOWEL, TT (Toilet Tissue)
- GSM variations: 15, 17, 19 (lower GSM = thinner tissue)
- Average daily production: 70-80 MT
- Machine efficiency: ~93.5% (warehouse receipt vs. production)

### 2. **Cost Structure**
- **Fiber costs vary significantly**:
  - Softwood pulps: ₹69,000-78,000/MT (more expensive)
  - Hardwood pulps: ₹58,500-67,410/MT (less expensive)
  - Recycled tissue: ₹36,452/MT (least expensive)
- Chemical costs are significant with 30+ different chemicals
- Utility costs tracked per ton of production

### 3. **Quality Control**
- Detailed tracking of production losses by category
- Time loss documentation for each incident
- Moisture and brightness percentages monitored

### 4. **Efficiency Metrics**
- Pulp ratio tracking (pulp consumed per ton produced)
- Utility consumption ratios (steam, water, power per ton)
- Production compliance percentage
- Detailed cost breakdown per ton

### 5. **Data Relationships**
```
Production Sheet → Daily Sheets (detailed breakdown)
                ↓
                → Pulp & Chemical Consumption (material usage)
                ↓
                → Consumption Sheet (cost calculation)
```

### 6. **Business Intelligence**
- The 93.5% yield factor (0.935) indicates ~6.5% production loss
- Multiple product codes suggest different product lines or customers
- Comprehensive chemical usage indicates sophisticated quality control
- Cost tracking enables real-time profitability analysis

### 7. **Operational Insights**
- **Downtime categories**: Process, Grade change, Power, Sheet breaks
- **Shift patterns**: Continuous 24-hour operation implied
- **Inventory**: Raw materials tracked daily for JIT management
- **Quality variations**: Different GSM for different market segments

## Recommendations for Dashboard Integration

1. **Cost Analysis Module**:
   - Import actual material rates from Row 4 of Consumption sheet
   - Calculate daily/monthly material costs
   - Track cost per ton trends

2. **Efficiency Metrics**:
   - Display pulp ratio trends
   - Show utility consumption patterns
   - Calculate and display production compliance

3. **Loss Analysis**:
   - Categorize and visualize production losses
   - Track downtime by category
   - Identify improvement opportunities

4. **Predictive Analytics**:
   - Use historical consumption patterns for forecasting
   - Identify optimal pulp mix for cost efficiency
   - Predict maintenance needs based on downtime patterns

5. **Real-time KPIs**:
   - Production vs. target
   - Cost per ton vs. budget
   - Efficiency ratios vs. benchmarks