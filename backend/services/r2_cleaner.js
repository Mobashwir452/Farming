export const cleanOldCropScanImages = async (env) => {
    try {
        console.log("Starting Crop Doctor R2 Image Cleanup Cron...");
        
        // Find rows where created_at is older than 7 days and image_url starts with crop-scans/
        // SQLite date logic using datetime()
        const query = `
            SELECT id, image_url 
            FROM crop_scans 
            WHERE created_at < datetime('now', '-7 days') 
            AND image_url IS NOT NULL 
            AND image_url LIKE 'crop-scans/%'
        `;
        const { results } = await env.DB.prepare(query).all();

        if (!results || results.length === 0) {
            console.log("No old crop scan images to clean up.");
            return;
        }

        const keysToDelete = results.map(row => row.image_url);
        if (env.IMAGE_BUCKET) {
            await env.IMAGE_BUCKET.delete(keysToDelete);
            console.log(`Deleted ${keysToDelete.length} images from R2.`);
        }

        // Now remove the image references from the database to avoid orphan links
        // We keep the scan JSON but clear the image_url to save space.
        const ids = results.map(row => row.id);
        const placeholders = ids.map(() => '?').join(',');
        
        const updateQuery = `UPDATE crop_scans SET image_url = 'expired_removed' WHERE id IN (${placeholders})`;
        await env.DB.prepare(updateQuery).bind(...ids).run();
        
        console.log("Database updated: Old image references marked as expired.");

    } catch (error) {
        console.error("Error in cleanOldCropScanImages:", error);
    }
};
