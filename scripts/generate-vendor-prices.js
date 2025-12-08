const fs = require('fs');
const path = require('path');

const RAW_DATA_PATH = path.resolve(__dirname, '..', 'raw_data.json');
const OUTPUT_FILE = path.resolve(__dirname, '..', 'public', 'db', 'vendor_prices.json');

console.log('Generating vendor prices...');

if (!fs.existsSync(RAW_DATA_PATH)) {
    console.error(`Error: ${RAW_DATA_PATH} not found.`);
    process.exit(1);
}

const rawData = JSON.parse(fs.readFileSync(RAW_DATA_PATH, 'utf8'));

const vendorPrices = {};
let count = 0;

rawData.forEach(item => {
    // Check for unlimited stock
    if (item.stock === -1 || item.avail === -1) {
        // buyprice is usually for the stack size (item.stack)
        // Need to calculate price per unit
        // buyprice is in copper
        const price = item.buyprice;
        const stack = item.stack || 1;

        if (price > 0) {
            vendorPrices[item.id] = price / stack;
            count++;
        }
    }
});

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(vendorPrices, null, 0), 'utf8');

console.log(`✅ Generated ${OUTPUT_FILE}`);
console.log(`   Items with vendor prices: ${count}`);
