import React, { useState } from 'react';
import {
  Paper,
  Typography,
  Box,
  TextField,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  InputAdornment,
  MenuItem
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import DownloadIcon from '@mui/icons-material/Download';
import dayjs from 'dayjs';
import { QualityData } from '../types';

interface DataTableProps {
  data: QualityData[];
  fileName: string;
}

const DataTable: React.FC<DataTableProps> = ({ data, fileName }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchTerm, setSearchTerm] = useState('');
  const [shiftFilter, setShiftFilter] = useState<string>('all');
  const [qualityFilter, setQualityFilter] = useState<string>('all');
  const [gsmFilter, setGsmFilter] = useState<string>('all');
  
  // Get available shifts, qualities, and GSM grades
  const availableShifts = Array.from(new Set(data.map(d => d.shift).filter(Boolean)));
  const availableQualities = Array.from(new Set(data.map(d => d.quality).filter(Boolean)));
  const availableGSMs = Array.from(new Set(data.map(d => d.gsmGrade).filter(Boolean)));

  const filteredData = data.filter(row => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = searchTerm === '' || (
      row.date.includes(searchTerm) ||
      Object.values(row).some(val => 
        val !== undefined && val !== null && val.toString().toLowerCase().includes(searchLower)
      )
    );
    
    const matchesShift = shiftFilter === 'all' || row.shift === shiftFilter;
    const matchesQuality = qualityFilter === 'all' || row.quality === qualityFilter;
    const matchesGSM = gsmFilter === 'all' || row.gsmGrade === gsmFilter;
    
    return matchesSearch && matchesShift && matchesQuality && matchesGSM;
  });

  const exportToCSV = () => {
    const headers = [
      'Date',
      'Time',
      'Shift',
      'Quality',
      'GSM Grade',
      'GSM (g/m²)', 'GSM LCL', 'GSM UCL',
      'Thickness', 'Thickness LCL', 'Thickness UCL',
      'Tensile MD', 'Tensile MD LCL', 'Tensile MD UCL',
      'Tensile CD', 'Tensile CD LCL', 'Tensile CD UCL',
      'Bulk', 'Bulk LCL', 'Bulk UCL',
      'Brightness', 'Brightness LCL', 'Brightness UCL',
      'Moisture', 'Moisture LCL', 'Moisture UCL'
    ];

    const rows = filteredData.map(row => [
      row.date,
      row.time || '',
      row.shift || '',
      row.quality || '',
      row.gsmGrade || '',
      row.gsm, row.gsmLcl, row.gsmUcl,
      row.thickness, row.thicknessLcl, row.thicknessUcl,
      row.tensileStrengthMD, row.tensileStrengthMDLcl, row.tensileStrengthMDUcl,
      row.tensileStrengthCD, row.tensileStrengthCDLcl, row.tensileStrengthCDUcl,
      row.bulk, row.bulkLcl, row.bulkUcl,
      row.brightness, row.brightnessLcl, row.brightnessUcl,
      row.moistureContent, row.moistureContentLcl, row.moistureContentUcl
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QA_Report_${dayjs().format('YYYY-MM-DD')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const isOutOfSpec = (value: number, lcl: number, ucl: number) => {
    return value < lcl || value > ucl;
  };

  const getCellColor = (value: number, lcl: number, ucl: number) => {
    return isOutOfSpec(value, lcl, ucl) ? 'error.main' : 'text.primary';
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5">
          Quality Data Table
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
          
          {availableShifts.length > 0 && (
            <TextField
              select
              size="small"
              value={shiftFilter}
              onChange={(e) => setShiftFilter(e.target.value)}
              sx={{ minWidth: 120 }}
              label="Shift"
            >
              <MenuItem value="all">All Shifts</MenuItem>
              {availableShifts.map((shift) => (
                <MenuItem key={shift} value={shift}>
                  {shift}
                </MenuItem>
              ))}
            </TextField>
          )}
          
          {availableQualities.length > 0 && (
            <TextField
              select
              size="small"
              value={qualityFilter}
              onChange={(e) => setQualityFilter(e.target.value)}
              sx={{ minWidth: 150 }}
              label="Quality"
            >
              <MenuItem value="all">All Qualities</MenuItem>
              {availableQualities.map((quality) => (
                <MenuItem key={quality} value={quality}>
                  {quality}
                </MenuItem>
              ))}
            </TextField>
          )}
          
          {availableGSMs.length > 0 && (
            <TextField
              select
              size="small"
              value={gsmFilter}
              onChange={(e) => setGsmFilter(e.target.value)}
              sx={{ minWidth: 120 }}
              label="GSM"
            >
              <MenuItem value="all">All GSM</MenuItem>
              {availableGSMs.map((gsm) => (
                <MenuItem key={gsm} value={gsm}>
                  {gsm}
                </MenuItem>
              ))}
            </TextField>
          )}
          
          <Button
            variant="contained"
            startIcon={<DownloadIcon />}
            onClick={exportToCSV}
          >
            Export CSV
          </Button>
        </Box>
      </Box>

      <TableContainer sx={{ maxHeight: 600 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell>
              <TableCell>Time</TableCell>
              <TableCell>Shift</TableCell>
              <TableCell>Quality</TableCell>
              <TableCell>GSM Grade</TableCell>
              <TableCell align="center" colSpan={3}>GSM (g/m²)</TableCell>
              <TableCell align="center" colSpan={3}>Thickness (mm)</TableCell>
              <TableCell align="center" colSpan={3}>Tensile MD (N/m)</TableCell>
              <TableCell align="center" colSpan={3}>Tensile CD (N/m)</TableCell>
              <TableCell align="center" colSpan={3}>Bulk (cm³/g)</TableCell>
              <TableCell align="center" colSpan={3}>Brightness (%)</TableCell>
              <TableCell align="center" colSpan={3}>Moisture (%)</TableCell>
            </TableRow>
            <TableRow>
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell />
              <TableCell />
              {Array(7).fill(null).map((_, i) => (
                <React.Fragment key={i}>
                  <TableCell align="center">Value</TableCell>
                  <TableCell align="center">LCL</TableCell>
                  <TableCell align="center">UCL</TableCell>
                </React.Fragment>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row, index) => (
                <TableRow key={index} hover>
                  <TableCell>{dayjs(row.date).format('MM/DD/YYYY')}</TableCell>
                  <TableCell>{row.time || '-'}</TableCell>
                  <TableCell>{row.shift || '-'}</TableCell>
                  <TableCell>{row.quality || '-'}</TableCell>
                  <TableCell>{row.gsmGrade || '-'}</TableCell>
                  
                  <TableCell align="center" sx={{ color: getCellColor(row.gsm, row.gsmLcl, row.gsmUcl) }}>
                    {row.gsm.toFixed(2)}
                  </TableCell>
                  <TableCell align="center">{row.gsmLcl.toFixed(2)}</TableCell>
                  <TableCell align="center">{row.gsmUcl.toFixed(2)}</TableCell>
                  
                  <TableCell align="center" sx={{ color: getCellColor(row.thickness, row.thicknessLcl, row.thicknessUcl) }}>
                    {row.thickness.toFixed(2)}
                  </TableCell>
                  <TableCell align="center">{row.thicknessLcl.toFixed(2)}</TableCell>
                  <TableCell align="center">{row.thicknessUcl.toFixed(2)}</TableCell>
                  
                  <TableCell align="center" sx={{ color: getCellColor(row.tensileStrengthMD, row.tensileStrengthMDLcl, row.tensileStrengthMDUcl) }}>
                    {row.tensileStrengthMD.toFixed(2)}
                  </TableCell>
                  <TableCell align="center">{row.tensileStrengthMDLcl.toFixed(2)}</TableCell>
                  <TableCell align="center">{row.tensileStrengthMDUcl.toFixed(2)}</TableCell>
                  
                  <TableCell align="center" sx={{ color: getCellColor(row.tensileStrengthCD, row.tensileStrengthCDLcl, row.tensileStrengthCDUcl) }}>
                    {row.tensileStrengthCD.toFixed(2)}
                  </TableCell>
                  <TableCell align="center">{row.tensileStrengthCDLcl.toFixed(2)}</TableCell>
                  <TableCell align="center">{row.tensileStrengthCDUcl.toFixed(2)}</TableCell>
                  
                  <TableCell align="center" sx={{ color: getCellColor(row.bulk, row.bulkLcl, row.bulkUcl) }}>
                    {row.bulk.toFixed(2)}
                  </TableCell>
                  <TableCell align="center">{row.bulkLcl.toFixed(2)}</TableCell>
                  <TableCell align="center">{row.bulkUcl.toFixed(2)}</TableCell>
                  
                  <TableCell align="center" sx={{ color: getCellColor(row.brightness, row.brightnessLcl, row.brightnessUcl) }}>
                    {row.brightness.toFixed(2)}
                  </TableCell>
                  <TableCell align="center">{row.brightnessLcl.toFixed(2)}</TableCell>
                  <TableCell align="center">{row.brightnessUcl.toFixed(2)}</TableCell>
                  
                  <TableCell align="center" sx={{ color: getCellColor(row.moistureContent, row.moistureContentLcl, row.moistureContentUcl) }}>
                    {row.moistureContent.toFixed(2)}
                  </TableCell>
                  <TableCell align="center">{row.moistureContentLcl.toFixed(2)}</TableCell>
                  <TableCell align="center">{row.moistureContentUcl.toFixed(2)}</TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        rowsPerPageOptions={[5, 10, 25, 50]}
        component="div"
        count={filteredData.length}
        rowsPerPage={rowsPerPage}
        page={page}
        onPageChange={(_, newPage) => setPage(newPage)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
      />
    </Paper>
  );
};

export default DataTable;