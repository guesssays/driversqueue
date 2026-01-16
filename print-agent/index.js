/**
 * Print Agent - Local service for Bluetooth ESC/POS printing
 * 
 * This service polls the Netlify function for pending print jobs
 * and prints them to a Bluetooth thermal printer.
 * 
 * Requirements:
 * - Node.js installed
 * - Bluetooth thermal printer paired with the device
 * - PRINT_SERVICE_SECRET environment variable set
 * - API_BASE_URL environment variable set (your Netlify site URL)
 */

import { ThermalPrinter, PrinterTypes, CharacterSet, BreakLine } from 'node-thermal-printer';
import BluetoothSerialPort from '@abandonware/bluetooth-serial-port';

const API_BASE = process.env.API_BASE_URL || '';
const PRINT_SECRET = process.env.PRINT_SERVICE_SECRET || '';
const PRINTER_ADDRESS = process.env.PRINTER_BLUETOOTH_ADDRESS || '';
const POLL_INTERVAL = 5000; // 5 seconds

if (!API_BASE || !PRINT_SECRET) {
  console.error('Missing required environment variables: API_BASE_URL, PRINT_SERVICE_SECRET');
  process.exit(1);
}

let printer = null;

async function initPrinter() {
  try {
    // For Bluetooth printers, you'll need to configure based on your printer model
    // This is a simplified example - adjust based on your printer's requirements
    
    printer = new ThermalPrinter({
      type: PrinterTypes.EPSON, // or STAR, depending on your printer
      interface: 'tcp://192.168.1.100:9100', // Adjust for your printer
      characterSet: CharacterSet.PC852_LATIN2,
      removeSpecialCharacters: false,
      lineCharacter: '-',
      breakLine: BreakLine.WORD,
      options: {
        timeout: 3000,
      },
    });

    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      console.warn('Printer not connected. Please check connection.');
    }
  } catch (error) {
    console.error('Printer initialization error:', error);
  }
}

async function fetchNextJob() {
  try {
    const response = await fetch(`${API_BASE}/.netlify/functions/printjobs-next`, {
      headers: {
        'X-Print-Secret': PRINT_SECRET,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        return null; // No jobs
      }
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.job;
  } catch (error) {
    console.error('Error fetching print job:', error);
    return null;
  }
}

async function acknowledgeJob(jobId, success) {
  try {
    const response = await fetch(`${API_BASE}/.netlify/functions/printjobs-ack`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Print-Secret': PRINT_SECRET,
      },
      body: JSON.stringify({ jobId, success }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
  } catch (error) {
    console.error('Error acknowledging job:', error);
  }
}

async function printTicket(payload) {
  try {
    if (!printer) {
      await initPrinter();
    }

    const ticketData = JSON.parse(Buffer.from(payload.payload_base64, 'base64').toString());
    
    printer.clear();
    printer.alignCenter();
    printer.setTextSize(1, 1);
    printer.println('ЭЛЕКТРОННАЯ ОЧЕРЕДЬ');
    printer.drawLine();
    printer.newLine();
    
    printer.setTextSize(2, 2);
    printer.println(ticketData.queueType === 'REG' ? 'РЕГИСТРАЦИЯ' : 'ТЕХНИЧЕСКИЕ ВОПРОСЫ');
    printer.newLine();
    
    printer.setTextSize(3, 3);
    printer.println(ticketData.ticketNumber);
    printer.newLine();
    
    printer.setTextSize(1, 1);
    printer.alignLeft();
    printer.println(`Дата: ${ticketData.date}`);
    printer.println(`Время: ${ticketData.time}`);
    printer.newLine();
    
    printer.alignCenter();
    printer.println('Ожидайте вызова');
    printer.println('на экране');
    printer.newLine();
    printer.newLine();
    
    printer.cut();
    
    await printer.execute();
    return true;
  } catch (error) {
    console.error('Print error:', error);
    return false;
  }
}

async function processJobs() {
  const job = await fetchNextJob();
  
  if (!job) {
    return; // No jobs available
  }

  console.log(`Processing print job ${job.id}...`);
  
  const success = await printTicket(job);
  await acknowledgeJob(job.id, success);
  
  if (success) {
    console.log(`Successfully printed job ${job.id}`);
  } else {
    console.error(`Failed to print job ${job.id}`);
  }
}

// Initialize printer on startup
initPrinter().then(() => {
  console.log('Print agent started. Polling for jobs...');
  
  // Poll for jobs every POLL_INTERVAL milliseconds
  setInterval(processJobs, POLL_INTERVAL);
  
  // Also process immediately
  processJobs();
});
