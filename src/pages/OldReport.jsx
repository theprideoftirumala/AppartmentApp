/**
 * Read-only old books: Summary tab grid plus handover totals.
 * Hash route: #/old
 */

import { useEffect, useState } from 'react';
import { BookOpen, ExternalLink } from 'lucide-react';
import Navbar from '../components/common/Navbar';
import Handover from './Handover';
import { getHistorySummaryGrid } from '../services/googleSheets';
import { getHistorySpreadsheetUrl } from '../services/googleDrive';
import { SHEET_FILE_NAME } from '../config/constants';

export default function OldReport() {
  const [grid, setGrid] = useState([]);
  const [error, setError] = useState('');
  const oldUrl = getHistorySpreadsheetUrl();

  useEffect(() => {
    let mounted = true;
    getHistorySummaryGrid()
      .then((rows) => {
        if (mounted) setGrid(rows);
      })
      .catch((err) => {
        if (mounted) setError(err.message || 'Could not read the old Summary tab');
      });
    return () => { mounted = false; };
  }, []);

  const colCount = grid.reduce((max, row) => Math.max(max, row.length), 0);

  return (
    <div className="main-content">
      <Navbar />
      <div className="page-header">
        <div>
          <h1 className="page-title">Old report</h1>
          <p className="page-subtitle">
            Read-only view of <strong>{SHEET_FILE_NAME}</strong> (Nov 2020–Aug 2026).
            Numbers come from the Summary tab as stored in Google Sheets. Sep 2026+ lives on The Pride of Tirumala-LIVE.
          </p>
        </div>
        {oldUrl && (
          <a className="btn btn-secondary" href={oldUrl} target="_blank" rel="noreferrer">
            <ExternalLink size={16} /> Open old sheet
          </a>
        )}
      </div>

      {error && <p className="text-danger">{error}</p>}

      <div className="card">
        <h3 className="card-title"><BookOpen size={18} /> Summary tab</h3>
        <p className="text-muted text-sm mb-4">
          Includes surplus/deficit and Sundry as they appear on the old workbook. This page does not write.
        </p>
        <div className="table-container" style={{ overflowX: 'auto' }}>
          <table>
            <tbody>
              {grid.map((row, ri) => (
                <tr key={`r-${ri}`}>
                  {Array.from({ length: colCount }, (_, ci) => (
                    <td key={`c-${ri}-${ci}`}>{row[ci] ?? ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {!grid.length && !error && <p className="text-muted">No Summary cells returned. Open the old sheet in Drive if this stays empty.</p>}
        </div>
      </div>

      <Handover embedded />
    </div>
  );
}
