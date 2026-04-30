/**
 * taskReminderService.js
 * Cloudflare worker service to check for due/overdue tasks and send notifications.
 */

export async function checkAndSendTaskReminders(env, force = false) {
    try {
        console.log(`[CRON] Starting Task Reminder Service... (Force: ${force})`);
        
        // 1. Get all active crops
        const { results: crops } = await env.DB.prepare(
            `SELECT c.id as crop_id, c.crop_name, c.tasks_state_json, f.fcm_token, f.email, f.phone_number 
             FROM crops c
             JOIN farms fm ON fm.id = c.farm_id
             JOIN farmers f ON f.id = fm.farmer_id
             WHERE c.status NOT IN ('Harvested', 'Completed') 
             AND c.tasks_state_json IS NOT NULL`
        ).all();

        if (!crops || crops.length === 0) return { status: 'no_crops_found' };

        const now = new Date();
        now.setHours(0, 0, 0, 0); // Start of today for date comparison
        const todayMs = now.getTime();
        const DAY_MS = 24 * 60 * 60 * 1000;
        
        const notificationsToSend = {};
        const updatedCrops = [];

        for (const crop of crops) {
            let tasks = [];
            try {
                tasks = JSON.parse(crop.tasks_state_json);
            } catch (e) {
                continue;
            }

            let cropChanged = false;
            let dueTodayCount = 0;
            let overdueCount = 0;
            let taskDetails = []; // For email body

            for (const task of tasks) {
                const isTaskCompleted = task.status === 'completed' || task.is_completed;
                if (!isTaskCompleted && task.status !== 'cancelled' && task.due_date) {
                    const dueDate = new Date(task.due_date);
                    dueDate.setHours(0, 0, 0, 0);
                    const dueMs = dueDate.getTime();
                    
                    const timeDiff = todayMs - dueMs;
                    
                    let isDueToday = timeDiff === 0;
                    let isOverdue = timeDiff > 0;
                    
                    if (isDueToday || isOverdue) {
                        const lastRemindedMs = task.reminder_sent_date ? new Date(task.reminder_sent_date).getTime() : 0;
                        
                        // Check if we already sent a reminder today
                        const timeSinceReminder = Date.now() - lastRemindedMs;
                        // Only remind once per day (or if forced)
                        if (timeSinceReminder >= DAY_MS || force) {
                            task.reminder_sent_date = new Date().toISOString();
                            cropChanged = true;
                            
                            if (isOverdue) overdueCount++;
                            else dueTodayCount++;
                            
                            taskDetails.push({
                                title: task.title,
                                isOverdue: isOverdue,
                                dateStr: task.due_date
                            });
                        }
                    }
                }
            }
            
            if (cropChanged) {
                 updatedCrops.push({ id: crop.crop_id, json: tasks });
            }

            if (dueTodayCount > 0 || overdueCount > 0) {
                const userKey = crop.fcm_token || crop.email || crop.phone_number || 'unknown';
                if (!notificationsToSend[userKey]) {
                    notificationsToSend[userKey] = {
                        fcm_token: crop.fcm_token,
                        email: crop.email,
                        crop_id: crop.crop_id,
                        crop_name: crop.crop_name,
                        dueToday: 0,
                        overdue: 0,
                        tasks: []
                    };
                }
                notificationsToSend[userKey].dueToday += dueTodayCount;
                notificationsToSend[userKey].overdue += overdueCount;
                notificationsToSend[userKey].tasks.push(...taskDetails);
            }
        }

        let sentPush = 0;
        let sentEmails = 0;

        // 2. Send Notifications
        for (const userKey in notificationsToSend) {
            const data = notificationsToSend[userKey];
            const totalIssues = data.dueToday + data.overdue;
            
            if (totalIssues === 0) continue;

            const title = data.overdue > 0 ? "🚨 জরুরী: আপনার কিছু টাস্ক মিস হয়েছে!" : "📅 আজকের টাস্ক রিমাইন্ডার!";
            
            let messageText = "";
            if (data.overdue > 0 && data.dueToday > 0) {
                messageText = `আপনার "${data.crop_name}" এর জন্য ${data.overdue}টি মিস হওয়া এবং ${data.dueToday}টি আজকের টাস্ক বাকি আছে।`;
            } else if (data.overdue > 0) {
                messageText = `আপনার "${data.crop_name}" এর জন্য ${data.overdue}টি টাস্ক মিস হয়েছে। দয়া করে দ্রুত সম্পন্ন করুন।`;
            } else {
                messageText = `আপনার "${data.crop_name}" এর জন্য আজকে ${data.dueToday}টি টাস্ক রয়েছে।`;
            }

            let taskListHtml = data.tasks.map(t => 
                `<li style="margin-bottom: 8px; padding: 12px; background: ${t.isOverdue ? '#fef2f2' : '#f8fafc'}; border-left: 3px solid ${t.isOverdue ? '#ef4444' : '#3b82f6'}; border-radius: 4px;">
                    <strong style="color: #1e293b;">${t.title}</strong><br>
                    <span style="font-size: 13px; color: ${t.isOverdue ? '#ef4444' : '#64748b'};">${t.isOverdue ? 'মিস হয়েছে' : 'আজকে'} (${t.dateStr})</span>
                </li>`
            ).join('');

            // A. Send Push Notification (FCM HTTP v1)
            if (data.fcm_token && env.FCM_SERVICE_ACCOUNT) {
                try {
                    // Helper to Sign JWT
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
                                notification: { title: title, body: messageText },
                                webpush: {
                                    fcm_options: { link: `https://smartkhamar.com/plant_tracker.html?crop_id=${data.crop_id}&tab=tasks` }
                                }
                            }
                        })
                    });
                    if (response.ok) sentPush++;
                } catch (e) {
                    console.error("Failed to send FCM push for tasks", e);
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
                <div style="background-color: ${data.overdue > 0 ? '#ef4444' : '#3b82f6'}; padding: 24px; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 24px;">${title}</h2>
                </div>
                <div style="padding: 32px 24px; background-color: #ffffff;">
                    <p style="font-size: 16px; color: #374151; line-height: 1.6; margin-top: 0;">
                        সুপ্রিয় খামারি,
                    </p>
                    <p style="font-size: 16px; color: #374151; line-height: 1.6; font-weight: 500; padding: 16px; background-color: ${data.overdue > 0 ? '#fef2f2' : '#eff6ff'}; border-left: 4px solid ${data.overdue > 0 ? '#ef4444' : '#3b82f6'}; border-radius: 4px;">
                        ${messageText}
                    </p>
                    
                    <h3 style="color: #475569; font-size: 16px; margin-top: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 8px;">আপনার টাস্কসমূহ:</h3>
                    <ul style="list-style-type: none; padding: 0; margin: 0 0 32px 0;">
                        ${taskListHtml}
                    </ul>

                    <p style="font-size: 15px; color: #6b7280; line-height: 1.5; margin-bottom: 32px;">
                        সঠিক সময়ে টাস্ক সম্পন্ন করলে ফসলের ফলন বৃদ্ধি পায়। অনুগ্রহ করে নিচের বাটনে ক্লিক করে ড্যাশবোর্ডে যান এবং টাস্ক আপডেট করুন।
                    </p>
                    <div style="text-align: center;">
                        <a href="https://smartkhamar.com/plant_tracker.html?crop_id=${data.crop_id}&tab=tasks" style="display: inline-block; background-color: #0ea5e9; color: #ffffff; text-decoration: none; padding: 14px 28px; font-size: 16px; font-weight: 600; border-radius: 8px; box-shadow: 0 2px 4px rgba(14, 165, 233, 0.3);">টাস্ক দেখুন</a>
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
                    console.error("Failed to send Task Email", e);
                }
            }
        }

        // 3. Persist Updated JSON Nodes
        let persistedCount = 0;
        if (updatedCrops.length > 0) {
            for (const c of updatedCrops) {
                try {
                    await env.DB.prepare('UPDATE crops SET tasks_state_json = ? WHERE id = ?')
                        .bind(JSON.stringify(c.json), c.id)
                        .run();
                    persistedCount++;
                } catch (e) {
                    console.error("Failed to persist task reminder state for crop:", c.id, e);
                }
            }
        }

        console.log(`[CRON] Task Reminder Service completed. Sent PUSH: ${sentPush}, EMAILS: ${sentEmails}, Saved DB Crops: ${persistedCount}`);
        return { success: true, sentPush, sentEmails, persistedCrops: persistedCount };

    } catch (error) {
        console.error("[CRON] Task Reminder Service Error: ", error);
        return { success: false, error: error.message };
    }
}
