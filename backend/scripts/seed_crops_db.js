const fs = require('fs');
const path = require('path');

const csvFilePath = path.join(__dirname, 'crops.csv');
const sqlFilePath = path.join(__dirname, '..', 'schema', 'seed_crops.sql');

function processCSV() {
    console.log("উপাত্ত পড়া হচ্ছে crops.csv থেকে...");
    
    if (!fs.existsSync(csvFilePath)) {
        console.error("Error: crops.csv ফাইলটি scripts ফোল্ডারে পাওয়া যায়নি!");
        return;
    }

    const csvData = fs.readFileSync(csvFilePath, 'utf8');
    const lines = csvData.split(/\r?\n/).filter(line => line.trim() !== '');
    
    if (lines.length <= 1) {
        console.log("CSV ফাইলটিতে শুধুমাত্র হেডার (Header) আছে বা ফাঁকা।");
        return;
    }

    // Initialize SQL with DELETE command to clear old baseline data when updating
    let sqlStatements = `-- Auto-generated DB Seed File for crops_master_data\nDELETE FROM crops_master_data;\n\n`;

    let successCount = 0;

    // Skip the first line (headers)
    for (let i = 1; i < lines.length; i++) {
        // Simple comma split
        const parts = lines[i].split(',');
        
        if (parts.length < 10) {
            console.log(`স্কিপ করা হয়েছে লাইন ${i + 1} (অসম্পূর্ণ ডাটা): ${lines[i]}`);
            continue;
        }

        // Clean & Escape single quotes for SQL insertion
        const category = parts[0].trim().replace(/'/g, "''");
        const crop = parts[1].trim().replace(/'/g, "''");
        const variety = parts[2].trim().replace(/'/g, "''");
        const region = parts[3].trim().replace(/'/g, "''");
        const soil = parts[4].trim().replace(/'/g, "''");
        const yieldKg = (parseFloat(parts[5].trim()) || 0) / 100; // Scaled down to 1 Shotangsho
        const duration = parseInt(parts[6].trim()) || 0;
        const resistance = parts[7].trim().replace(/'/g, "''");
        const features = parts[8].trim().replace(/'/g, "''");
        const source = parts[9].trim().replace(/'/g, "''");

        sqlStatements += `INSERT INTO crops_master_data (crop_category, crop_name, variety_name, suitable_regions, soil_type, base_yield_per_shotangsho_kg, avg_duration_days, disease_resistance, special_features, data_source) VALUES ('${category}', '${crop}', '${variety}', '${region}', '${soil}', ${yieldKg}, ${duration}, '${resistance}', '${features}', '${source}');\n`;
        successCount++;
    }

    fs.writeFileSync(sqlFilePath, sqlStatements);
    console.log(`\nসফলভাবে ${successCount} টি ফসলের জাতের SQL ফাইল জেনারেট হয়েছে: /backend/schema/seed_crops.sql`);
    console.log("\n==================================");
    console.log("🚀 এবার নিচের কমান্ডটি টার্মিনালে রান করুন ডাটাবেস ভরার জন্য:");
    console.log("npx wrangler d1 execute agritech-db --local --file=./schema/seed_crops.sql");
    console.log("npx wrangler d1 execute agritech-db --remote --file=./schema/seed_crops.sql");
    console.log("==================================\n");
}

processCSV();
