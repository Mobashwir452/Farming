// backend/services/limitResetter.js

export const resetMonthlyLimits = async (env) => {
    try {
        // Get current date in Bangladesh Timezone
        const bdTime = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
        
        // Check if today is the 1st of the month
        if (bdTime.getDate() !== 1) {
            return { message: "Not the 1st day of the month in BD. Skipped." };
        }

        // Fetch the free package limits
        const packageQuery = `SELECT * FROM subscription_packages WHERE name = 'AgriTech Free' LIMIT 1`;
        const freePackage = await env.DB.prepare(packageQuery).first();
        
        if (!freePackage) return { error: "Free package not found in database." };

        // Reset limits for all Active 'free' users
        const resetQuery = `
            UPDATE farmers 
            SET remaining_scans = ?, 
                remaining_timelines = ?, 
                remaining_chats = ?
            WHERE subscription_status = 'free' AND is_active = 1
        `;

        const result = await env.DB.prepare(resetQuery).bind(
            freePackage.scan_limit,
            freePackage.timeline_limit,
            freePackage.chat_limit
        ).run();

        console.log(`Monthly limit reset successful. Rows updated: ${result.meta?.changes}`);
        return { success: true, rowsUpdated: result.meta?.changes || 0 };
    } catch (e) {
        console.error("Error resetting limits:", e);
        return { error: e.message };
    }
};
