/**
 * statusReminderService.js
 * Cloudflare worker service to check for sick/critical plants and send notifications.
 */

export async function checkAndSendPlantReminders(env, force = false) {
    try {
        console.log(`[CRON] Starting Sick & Critical Plant Reminder Service... (Force: ${force})`);
        
        // 1. Get all crop beds that have at least one plant
        const { results: beds } = await env.DB.prepare(
            `SELECT cb.id as bed_id, cb.crop_id, cb.bed_name, cb.plants_nodes_json, f.fcm_token, f.email, f.phone_number, c.crop_name 
             FROM crop_beds cb
             JOIN crops c ON c.id = cb.crop_id
             JOIN farms fm ON fm.id = c.farm_id
             JOIN farmers f ON f.id = fm.farmer_id
             WHERE cb.plants_nodes_json IS NOT NULL`
        ).all();

        if (!beds || beds.length === 0) return { status: 'no_beds_found' };

        const currentTime = Date.now();
        const DAY_MS = 24 * 60 * 60 * 1000;
        
        // Map to aggregate notifications by farmer/user
        const notificationsToSend = {};
        const updatedBeds = [];

        for (const bed of beds) {
            let plantData = [];
            try {
                plantData = JSON.parse(bed.plants_nodes_json);
            } catch (e) {
                continue;
            }

            let sickCount = 0;
            let criticalCount = 0;
            let bedChanged = false;

            for (const node of plantData) {
                if (node.state === 'S' || node.state === 'C') {
                    const lastUpdated = node.last_updated_at || 0; // if not present, triggers immediately
                    const timeSinceUpdate = currentTime - lastUpdated;
                    
                    const nodeCount = node.reminder_count || 0;
                    if (nodeCount >= 3) continue; // Escalation Cap (Ignored)

                    let requiredDays = 2; // Notice 1
                    if (nodeCount === 1) requiredDays = 5; // Notice 2
                    else if (nodeCount === 2) requiredDays = 10; // Final Warning
                    
                    if (timeSinceUpdate >= (requiredDays * DAY_MS) || force) {
                        node.reminder_count = nodeCount + 1;
                        bedChanged = true;

                        if (node.state === 'C') criticalCount++;
                        else sickCount++;
                    }
                } else if (node.reminder_count && node.reminder_count > 0) {
                    // Reset count if plant is no longer sick
                    node.reminder_count = 0;
                    bedChanged = true;
                }
            }
            
            if (bedChanged) {
                 updatedBeds.push({ id: bed.bed_id, json: plantData });
            }

            if (sickCount > 0 || criticalCount > 0) {
                const userKey = bed.fcm_token || bed.email || bed.phone_number || 'unknown'; // Grouping
                if (!notificationsToSend[userKey]) {
                    notificationsToSend[userKey] = {
                        fcm_token: bed.fcm_token,
                        email: bed.email, // If populated with correct user join
                        crop_id: bed.crop_id,
                        crop_name: bed.crop_name,
                        sick: 0,
                        critical: 0
                    };
                }
                notificationsToSend[userKey].sick += sickCount;
                notificationsToSend[userKey].critical += criticalCount;
            }
        }

        let sentPush = 0;
        let sentEmails = 0;

        // 2. Send Notifications
        for (const userKey in notificationsToSend) {
            const data = notificationsToSend[userKey];
            const totalIssues = data.sick + data.critical;
            
            if (totalIssues === 0) continue;

            const title = data.critical > 0 ? "🚨 জরুরী: গাছের অবস্থা বিপজ্জনক!" : "⚠️ গাছের আপডেট প্রয়োজন!";
            
            let messageText = "";
            if (data.critical > 0 && data.sick > 0) {
                messageText = `আপনার "${data.crop_name}" ব্লকে ${data.critical}টি গাছের অবস্থা বিপজ্জনক এবং ${data.sick}টি গাছ অসুস্থ। এদের বিশেষ যত্ন এবং স্ট্যাটাস আপডেট প্রয়োজন।`;
            } else if (data.critical > 0) {
                messageText = `আপনার "${data.crop_name}" ব্লকে ${data.critical}টি গাছের অবস্থা বিপজ্জনক। দ্রুত এদের স্ট্যাটাস আপডেট দিন।`;
            } else {
                messageText = `আপনার "${data.crop_name}" ব্লকে ${data.sick}টি গাছ অসুস্থ। এদের কী অবস্থা তা শীঘ্রই আপডেট করুন।`;
            }

            const body = messageText;

            // A. Send Push Notification (FCM HTTP v1)
            if (data.fcm_token && env.FCM_SERVICE_ACCOUNT) {
                try {
                    // Helper to Sign JWT and get OAuth Token using WebCrypto
                    const getFcmOauthToken = async (serviceAccountJson) => {
                        const sa = JSON.parse(serviceAccountJson);
                        const header = { alg: "RS256", typ: "JWT" };
                        const iat = Math.floor(Date.now() / 1000);
                        const payload = {
                            iss: sa.client_email,
                            scope: "https://www.googleapis.com/auth/firebase.messaging",
                            aud: "https://oauth2.googleapis.com/token",
                            exp: iat + 3600, iat
                        };
                        const encodeB64Url = (obj) => btoa(JSON.stringify(obj)).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
                        const unsignedJwt = `${encodeB64Url(header)}.${encodeB64Url(payload)}`;
                        
                        const pem = sa.private_key.replace(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----|\n|\r/g, "");
                        const binaryKey = Uint8Array.from(atob(pem), c => c.charCodeAt(0));
                        const cryptoKey = await crypto.subtle.importKey(
                            "pkcs8", binaryKey, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["sign"]
                        );
                        
                        const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, new TextEncoder().encode(unsignedJwt));
                        const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature))).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
                        const signedJwt = `${unsignedJwt}.${sigB64}`;
                        
                        const res = await fetch("https://oauth2.googleapis.com/token", {
                            method: "POST",
                            headers: { "Content-Type": "application/x-www-form-urlencoded" },
                            body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${signedJwt}`
                        });
                        return (await res.json()).access_token;
                    };

                    const oauthToken = await getFcmOauthToken(env.FCM_SERVICE_ACCOUNT);
                    const projectId = JSON.parse(env.FCM_SERVICE_ACCOUNT).project_id;
                    
                    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${oauthToken}`
                        },
                        body: JSON.stringify({
                            message: {
                                token: data.fcm_token,
                                notification: { title: title, body: body },
                                webpush: {
                                    fcm_options: { link: `https://smartkhamar.com/plant_tracker.html?crop_id=${data.crop_id}&highlight_sick=true` }
                                }
                            }
                        })
                    });
                    if (response.ok) sentPush++;
                    else console.error("FCM API Error:", await response.text());
                } catch (e) {
                    console.error("Failed to send FCM push", e);
                }
            }

            // B. Send Email Notification (GAS)
            if (data.email && env.GAS_EMAIL_URL) {
                try {
                    const emailResponse = await fetch(env.GAS_EMAIL_URL, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            to: data.email,
                            subject: title,
                            body: `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                <div style="background-color: ${data.critical > 0 ? '#ef4444' : '#f59e0b'}; padding: 24px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 24px;">${title}</h2>
                </div>
                <div style="padding: 32px 24px; background-color: #ffffff;">
                    <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-top: 0;">
                        সুপ্রিয় খামারি,
                    </p>
                    <p style="font-size: 16px; color: #374151; line-height: 1.6; font-weight: 500; padding: 16px; background-color: ${data.critical > 0 ? '#fef2f2' : '#fffbeb'}; border-left: 4px solid ${data.critical > 0 ? '#ef4444' : '#f59e0b'}; border-radius: 4px;">
                        ${messageText}
                    </p>
                    <p style="font-size: 15px; color: #6b7280; line-height: 1.5; margin-bottom: 32px;">
                        সঠিক সময়ে গাছের যত্ন নিলে ফলন বৃদ্ধি পায়। অনুগ্রহ করে নিচের বাটনে ক্লিক করে ড্যাশবোর্ডে যান এবং গাছের বর্তমান অবস্থা আমাদের জানান।
                    </p>
                    <div style="text-align: center;">
                        <a href="https://smartkhamar.com/plant_tracker.html?crop_id=${data.crop_id}&highlight_sick=true" style="display: inline-block; background-color: #059669; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(5, 150, 105, 0.3);">ড্যাশবোর্ড খুলুন</a>
                    </div>
                </div>
                <div style="background-color: #f8fafc; padding: 16px; text-align: center; border-top: 1px solid #e5e7eb;">
                    <p style="font-size: 13px; color: #94a3b8; margin: 0;">&copy; ${new Date().getFullYear()} Smart Khamar. All rights reserved.</p>
                </div>
            </div>`
                        })
                    });
                    if (emailResponse.ok) sentEmails++;
                } catch (e) {
                    console.error("Failed to send Email", e);
                }
            }
        }

        // 3. Persist Updated JSON Nodes
        let persistedCount = 0;
        if (updatedBeds.length > 0) {
            for (const b of updatedBeds) {
                try {
                    await env.DB.prepare('UPDATE crop_beds SET plants_nodes_json = ? WHERE id = ?')
                        .bind(JSON.stringify(b.json), b.id)
                        .run();
                    persistedCount++;
                } catch (e) {
                    console.error("Failed to persist escalated status for bed:", b.id, e);
                }
            }
        }

        console.log(`[CRON] Reminder Service completed. Sent PUSH: ${sentPush}, EMAILS: ${sentEmails}, Saved DB Beds: ${persistedCount}`);
        return { success: true, sentPush, sentEmails, persistedBeds: persistedCount };

    } catch (error) {
        console.error("[CRON] Reminder Service Error: ", error);
        return { success: false, error: error.message };
    }
}
