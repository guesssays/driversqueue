# Print Agent - Bluetooth ESC/POS Printer Service

Optional local service for printing tickets to Bluetooth thermal printers.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
export API_BASE_URL="https://your-site.netlify.app"
export PRINT_SERVICE_SECRET="your-secret-key"
export PRINTER_BLUETOOTH_ADDRESS="00:11:22:33:44:55"  # Optional
```

3. Pair your Bluetooth printer with the device

4. Run the service:
```bash
npm start
```

## Supported Printers

- Xprinter XP-P300 / XP-P323
- Rongta RP-P300
- Gprinter GP-M322
- Other ESC/POS compatible printers

## Notes

- The print agent is optional - the system works with browser printing (`window.print()`) without it
- Adjust printer initialization code based on your specific printer model
- For network printers, update the interface URL in `initPrinter()`
