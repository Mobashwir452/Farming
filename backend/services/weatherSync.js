export const syncWeatherData = async (env, isManualTest = false) => {
    try {
        const testResults = { checkedFarms: 0, badWeatherFarms: 0, errors: [], keyFound: false };

        // 1. Get API Key from the dynamic settings store we injected
        const setting = await env.DB.prepare("SELECT key_value FROM admin_settings WHERE key_name = 'weather_api_key'").first();
        if (!setting || !setting.key_value) {
            console.log("WeatherSync aborted: No OpenWeatherMap API key found in Admin settings.");
            if(isManualTest) return { success: false, error: "কোনো API Key পাওয়া যায়নি, Admin Settings পেজ থেকে সেভ করুন!" };
            return;
        }
        testResults.keyFound = true;
        const apiKey = setting.key_value;

        // 2. Get active farms with recorded coordinates
        const { results: activeFarms } = await env.DB.prepare(`
            SELECT DISTINCT f.id, f.lat, f.lng 
            FROM farms f
            JOIN crops c ON c.farm_id = f.id
            WHERE c.status NOT IN ('Harvested', 'Weather Risk') AND f.lat IS NOT NULL AND f.lng IS NOT NULL
        `).all();

        testResults.checkedFarms = activeFarms.length;

        for (const farm of activeFarms) {
            try {
                const res = await fetch(`https://api.openweathermap.org/data/2.5/weather?lat=${farm.lat}&lon=${farm.lng}&appid=${apiKey}`);
                if(!res.ok) {
                    testResults.errors.push(`Farm ${farm.id} ওয়েদার API Error: ${res.statusText}`);
                    continue;
                }
                const data = await res.json();
                
                // Identify risky conditions 
                // Group 2xx: Thunderstorm, Group 7xx: Extreme atmosphere, Tornado etc.
                const isBadWeather = data.weather && data.weather.some(w => {
                    const conditionId = w.id;
                    return (conditionId >= 200 && conditionId < 300) || conditionId === 781;
                });
                
                if (isBadWeather) {
                    await env.DB.prepare("UPDATE crops SET status = 'Weather Risk' WHERE farm_id = ? AND status != 'Harvested'").bind(farm.id).run();
                    testResults.badWeatherFarms++;
                }
            } catch(e) {
                testResults.errors.push(`Network Error Farm ${farm.id}: ${e.message}`);
            }
        }
        console.log("WeatherSync Completed.", testResults);
        if(isManualTest) return { success: true, test_results: testResults };
    } catch (err) {
        console.error("Weather Sync Error:", err);
        if(isManualTest) return { success: false, error: err.message };
    }
};

export const testWeatherSync = async (request, env) => {
    const result = await syncWeatherData(env, true);
    return Response.json(result || { success: true, message: "Sync executed successfully" });
};
