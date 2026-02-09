// Google Sheets integration via Replit connector + Excel file parsing
import * as XLSX from 'xlsx';

let connectionSettings: any;

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings?.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  const response = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=google-sheet',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  );
  const data = await response.json();
  connectionSettings = data.items?.[0];

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings?.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('Google Sheet no conectado. Verificá la conexión en la configuración.');
  }
  return accessToken;
}

export async function getSpreadsheetSheets(spreadsheetId: string) {
  const accessToken = await getAccessToken();
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const status = response.status;
    const errMsg = err?.error?.message || '';
    console.error('[google-sheets] Error fetching sheets:', status, JSON.stringify(err));
    
    if (status === 400 && errMsg.includes('not supported')) {
      throw new Error('EXCEL_FILE:Este archivo es un Excel subido a Drive, no un Google Sheets nativo. Convertilo a Google Sheets (Archivo → Guardar como Google Sheets) o usá la opción "Subir archivo" para importar directamente.');
    }
    if (status === 404) {
      throw new Error('No se encontró la hoja de cálculo. Verificá la URL.');
    }
    if (status === 403) {
      throw new Error('Sin permiso para acceder a esta hoja. Asegurate de que esté compartida con tu cuenta de Google.');
    }
    throw new Error(errMsg || `Error al acceder a la hoja (${status})`);
  }
  
  const data = await response.json();
  return (data.sheets || []).map((s: any) => ({
    sheetId: s.properties?.sheetId,
    title: s.properties?.title
  }));
}

export async function readSheetData(spreadsheetId: string, range: string) {
  const accessToken = await getAccessToken();
  
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}`;
  const response = await fetch(url, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    console.error('[google-sheets] Error reading data:', response.status, JSON.stringify(err));
    throw new Error(err?.error?.message || `Error al leer datos (${response.status})`);
  }
  
  const data = await response.json();
  return data.values || [];
}

export function parseExcelBuffer(buffer: Buffer): { sheets: string[]; data: Record<string, string[][]> } {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const result: Record<string, string[][]> = {};
  
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    result[sheetName] = rows.filter(row => row.some(cell => cell !== '' && cell != null));
  }
  
  return { sheets: workbook.SheetNames, data: result };
}
