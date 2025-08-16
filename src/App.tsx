import React, { useState, useMemo, useEffect } from 'react';
import { 
  ThemeProvider, 
  CssBaseline,
  Container, 
  Typography, 
  Box,
  Tabs,
  Tab,
  IconButton,
  AppBar,
  Toolbar,
  Fade,
  Zoom,
  LinearProgress,
  Alert,
  Snackbar,
  SpeedDial,
  SpeedDialAction,
  SpeedDialIcon,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemButton,
  Divider,
  Badge,
  Chip
} from '@mui/material';
import {
  DarkMode,
  LightMode,
  Dashboard as DashboardIcon,
  Assessment,
  TableChart,
  Upload,
  Menu as MenuIcon,
  FileDownload,
  Print,
  Share,
  Analytics,
  TrendingUp,
  Warning,
  CurrencyRupee
} from '@mui/icons-material';
import UnifiedFileUpload from './components/UnifiedFileUpload';
import DailyReport from './components/DailyReport';
import TrendAnalysis from './components/TrendAnalysis';
import AdvancedMetrics from './components/AdvancedMetrics';
import DataTable from './components/DataTable';
import Costing from './components/Costing';
import { CostingData } from './utils/parseCostingData';
import { QualityData } from './types';
import { getTheme } from './theme';
import './App.css';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`tabpanel-${index}`}
      aria-labelledby={`tab-${index}`}
      {...other}
    >
      {value === index && (
        <Fade in={true} timeout={500}>
          <Box sx={{ pt: 3 }}>
            {children}
          </Box>
        </Fade>
      )}
    </div>
  );
}

function App() {
  const [data, setData] = useState<QualityData[]>([]);
  const [costingData, setCostingData] = useState<CostingData[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [tabValue, setTabValue] = useState(0);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{open: boolean; message: string; severity: 'success' | 'error' | 'info' | 'warning'}>({
    open: false,
    message: '',
    severity: 'info'
  });

  const isMobile = useMediaQuery('(max-width:600px)');
  const theme = useMemo(() => getTheme(darkMode ? 'dark' : 'light'), [darkMode]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const handleQualityDataParsed = (parsedData: QualityData[], file: string) => {
    setLoading(true);
    setTimeout(() => {
      setData(parsedData);
      setFileName(file);
      setLoading(false);
      setNotification({
        open: true,
        message: `Successfully loaded ${parsedData.length} quality records from ${file}`,
        severity: 'success'
      });
      if (parsedData.length > 0) {
        setTabValue(1); // Switch to Daily Report tab
      }
    }, 1000);
  };

  const handleCostingDataParsed = (parsedData: CostingData[]) => {
    setCostingData(parsedData);
    if (parsedData.length > 0) {
      setNotification({
        open: true,
        message: `Successfully loaded ${parsedData.length} days of costing data`,
        severity: 'success'
      });
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const speedDialActions = [
    { 
      icon: <FileDownload />, 
      name: 'Export Report', 
      action: async () => {
        if (data.length > 0) {
          const { generatePDFReport } = await import('./utils/reportGenerator');
          await generatePDFReport({ 
            data: data[0],
            historicalData: data,
            includeCharts: true
          });
        }
      } 
    },
    { icon: <Print />, name: 'Print', action: () => window.print() },
    { icon: <Share />, name: 'Share', action: () => console.log('Share') },
  ];

  // Calculate some statistics for the header
  const stats = useMemo(() => {
    if (data.length === 0) return null;
    
    const latestData = data[0];
    const outOfSpecCount = Object.entries(latestData).filter(([key, value]) => {
      if (key.includes('Lcl') || key.includes('Ucl') || key === 'date' || typeof value !== 'number') return false;
      const lcl = latestData[`${key}Lcl` as keyof QualityData] as number;
      const ucl = latestData[`${key}Ucl` as keyof QualityData] as number;
      return lcl && ucl && (value < lcl || value > ucl);
    }).length;

    return {
      totalRecords: data.length,
      latestDate: latestData.date,
      outOfSpec: outOfSpecCount,
      hasIssues: outOfSpecCount > 0
    };
  }, [data]);

  const navigationItems = [
    { icon: <Upload />, label: 'Upload Data', value: 0 },
    { icon: <DashboardIcon />, label: 'Daily Report', value: 1, disabled: data.length === 0 },
    { icon: <TrendingUp />, label: 'Trend Analysis', value: 2, disabled: data.length === 0 },
    { icon: <Analytics />, label: 'Advanced Analytics', value: 3, disabled: data.length === 0 },
    { icon: <TableChart />, label: 'Data Table', value: 4, disabled: data.length === 0 },
    { icon: <CurrencyRupee />, label: 'Costing', value: 5, disabled: costingData.length === 0 },
  ];

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* App Bar */}
        <AppBar position="fixed" elevation={0} sx={{ backdropFilter: 'blur(8px)', backgroundColor: 'rgba(255,255,255,0.8)', ...theme.palette.mode === 'dark' && { backgroundColor: 'rgba(0,0,0,0.8)' } }}>
          <Toolbar>
            {isMobile && (
              <IconButton
                edge="start"
                color="inherit"
                aria-label="menu"
                onClick={() => setDrawerOpen(true)}
                sx={{ mr: 2 }}
              >
                <MenuIcon />
              </IconButton>
            )}
            
            <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1, gap: 2 }}>
              <img 
                src="/gayatrishakti_logo-curve-02.png" 
                alt="Gayatri Shakti Logo" 
                style={{ 
                  height: 40, 
                  width: 'auto',
                  filter: darkMode ? 'brightness(1.2)' : 'none'
                }} 
              />
              <Typography variant="h6" component="div" sx={{ fontWeight: 600, color: 'text.primary' }}>
                Tissue Manufacturing QA Dashboard
              </Typography>
            </Box>
            
            {stats && (
              <Box sx={{ display: 'flex', gap: 2, mr: 2 }}>
                <Chip label={`${stats.totalRecords} Records`} size="small" />
                {stats.hasIssues && (
                  <Badge badgeContent={stats.outOfSpec} color="error">
                    <Chip 
                      icon={<Warning />} 
                      label="Issues" 
                      size="small" 
                      color="error" 
                      variant="outlined"
                    />
                  </Badge>
                )}
              </Box>
            )}
            
            <IconButton onClick={toggleDarkMode} color="inherit">
              {darkMode ? <LightMode /> : <DarkMode />}
            </IconButton>
          </Toolbar>
          
          {!isMobile && data.length > 0 && (
            <Tabs
              value={tabValue}
              onChange={handleTabChange}
              variant="scrollable"
              scrollButtons="auto"
              sx={{ 
                borderTop: 1, 
                borderColor: 'divider',
                '& .MuiTab-root': {
                  minHeight: 48,
                  textTransform: 'none',
                  fontWeight: 500,
                }
              }}
            >
              {navigationItems.map((item, index) => (
                <Tab 
                  key={index}
                  icon={item.icon}
                  iconPosition="start"
                  label={item.label}
                  disabled={item.disabled}
                />
              ))}
            </Tabs>
          )}
        </AppBar>

        {/* Mobile Drawer */}
        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
        >
          <Box sx={{ width: 250 }}>
            <List>
              <ListItem sx={{ py: 2, justifyContent: 'center' }}>
                <img 
                  src="/gayatrishakti_logo-curve-02.png" 
                  alt="Gayatri Shakti Logo" 
                  style={{ 
                    height: 50, 
                    width: 'auto',
                    filter: darkMode ? 'brightness(1.2)' : 'none'
                  }} 
                />
              </ListItem>
              <Divider />
              {navigationItems.map((item, index) => (
                <ListItemButton
                  key={index}
                  onClick={() => {
                    setTabValue(item.value);
                    setDrawerOpen(false);
                  }}
                  disabled={item.disabled}
                  selected={tabValue === item.value}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              ))}
            </List>
          </Box>
        </Drawer>

        {/* Main Content */}
        <Container 
          maxWidth="xl" 
          sx={{ 
            mt: isMobile ? 8 : (data.length > 0 ? 14 : 10), 
            mb: 4,
            px: { xs: 2, sm: 3, md: 4 }
          }}
        >
          {loading && <LinearProgress sx={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 9999 }} />}
          
          {data.length === 0 && !loading && (
            <Zoom in={true} timeout={500}>
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <img 
                  src="/gayatrishakti_logo-curve-02.png" 
                  alt="Gayatri Shakti Logo" 
                  style={{ 
                    height: 80, 
                    width: 'auto',
                    marginBottom: 24,
                    filter: darkMode ? 'brightness(1.2)' : 'none'
                  }} 
                />
                <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
                  Welcome to Tissue QA Dashboard
                </Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                  Upload your Excel files to get started
                </Typography>
                <UnifiedFileUpload 
                  onQualityDataParsed={handleQualityDataParsed}
                  onCostingDataParsed={handleCostingDataParsed}
                  qualityData={data}
                  costingData={costingData}
                />
              </Box>
            </Zoom>
          )}

          {data.length > 0 && (
            <>
              <TabPanel value={tabValue} index={0}>
                <UnifiedFileUpload 
                  onQualityDataParsed={handleQualityDataParsed}
                  onCostingDataParsed={handleCostingDataParsed}
                  qualityData={data}
                  costingData={costingData}
                />
              </TabPanel>
              
              <TabPanel value={tabValue} index={1}>
                <DailyReport data={data} />
              </TabPanel>
              
              <TabPanel value={tabValue} index={2}>
                <TrendAnalysis data={data} />
              </TabPanel>
              
              <TabPanel value={tabValue} index={3}>
                <AdvancedMetrics data={data} />
              </TabPanel>
              
              <TabPanel value={tabValue} index={4}>
                <DataTable data={data} fileName={fileName} />
              </TabPanel>
              
              <TabPanel value={tabValue} index={5}>
                <Costing data={costingData} />
              </TabPanel>
            </>
          )}
        </Container>

        {/* Speed Dial for actions */}
        {data.length > 0 && !isMobile && (
          <SpeedDial
            ariaLabel="Actions"
            sx={{ position: 'fixed', bottom: 16, right: 16 }}
            icon={<SpeedDialIcon />}
          >
            {speedDialActions.map((action) => (
              <SpeedDialAction
                key={action.name}
                icon={action.icon}
                tooltipTitle={action.name}
                onClick={action.action}
              />
            ))}
          </SpeedDial>
        )}

        {/* Notification Snackbar */}
        <Snackbar
          open={notification.open}
          autoHideDuration={6000}
          onClose={() => setNotification({ ...notification, open: false })}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        >
          <Alert 
            onClose={() => setNotification({ ...notification, open: false })} 
            severity={notification.severity}
            sx={{ width: '100%' }}
          >
            {notification.message}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;