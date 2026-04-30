export const getWeather = async (request, env) => {
    try {
        const url = new URL(request.url);
        const lat = url.searchParams.get('lat');
        const lon = url.searchParams.get('lon');

        if (!lat || !lon) {
            return Response.json({ success: false, error: 'Latitude and Longitude are required' }, { status: 400 });
        }

        const setting = await env.DB.prepare("SELECT key_value FROM admin_settings WHERE key_name = 'weather_api_key'").first();
        if (!setting || !setting.key_value) {
            return Response.json({ success: false, error: 'Weather API key not found in settings' }, { status: 500 });
        }
        
        const apiKey = setting.key_value;

        const forecastRes = await fetch(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric`);
        
        if (!forecastRes.ok) {
             return Response.json({ success: false, error: 'Failed to fetch weather data' }, { status: forecastRes.status });
        }

        const data = await forecastRes.json();
        
        // OpenWeatherMap forecast returns 3-hour chunks for 5 days (40 items).
        // 1. Daily Forecast (5 Days)
        const dailyForecast = {};
        
        data.list.forEach(item => {
            const dateStr = item.dt_txt.split(' ')[0]; // YYYY-MM-DD
            if (!dailyForecast[dateStr]) {
                dailyForecast[dateStr] = {
                    temps: [],
                    icons: {},
                    conditions: {},
                    descriptions: {}
                };
            }
            dailyForecast[dateStr].temps.push(item.main.temp);
            
            const icon = item.weather[0].icon;
            const cond = item.weather[0].main;
            const desc = item.weather[0].description;
            
            dailyForecast[dateStr].icons[icon] = (dailyForecast[dateStr].icons[icon] || 0) + 1;
            dailyForecast[dateStr].conditions[cond] = (dailyForecast[dateStr].conditions[cond] || 0) + 1;
            dailyForecast[dateStr].descriptions[desc] = (dailyForecast[dateStr].descriptions[desc] || 0) + 1;
        });

        // Translate conditions to Bengali (simple mapping)
        const translateCondition = (cond) => {
            cond = cond.toLowerCase();
            if(cond.includes('rain')) return 'বৃষ্টি';
            if(cond.includes('cloud')) return 'মেঘলা';
            if(cond.includes('clear')) return 'পরিষ্কার';
            if(cond.includes('thunderstorm')) return 'বজ্রবৃষ্টি';
            if(cond.includes('drizzle')) return 'গুঁড়ি গুঁড়ি বৃষ্টি';
            if(cond.includes('snow')) return 'তুষারপাত';
            if(cond.includes('mist') || cond.includes('fog') || cond.includes('haze')) return 'কুয়াশা';
            return 'স্বাভাবিক';
        };

        const result = Object.keys(dailyForecast).slice(0, 5).map(dateStr => {
            const temps = dailyForecast[dateStr].temps;
            const maxTemp = Math.round(Math.max(...temps));
            const minTemp = Math.round(Math.min(...temps));
            
            const icons = dailyForecast[dateStr].icons;
            const mostFrequentIcon = Object.keys(icons).reduce((a, b) => icons[a] > icons[b] ? a : b);
            
            const conds = dailyForecast[dateStr].conditions;
            const mostFrequentCond = Object.keys(conds).reduce((a, b) => conds[a] > conds[b] ? a : b);

            return {
                date: dateStr,
                max_temp: maxTemp,
                min_temp: minTemp,
                icon: mostFrequentIcon,
                condition: mostFrequentCond,
                condition_bn: translateCondition(mostFrequentCond)
            };
        });

        // 2. Hourly Forecast (Next 8 chunks = 24 hours)
        const hourly = data.list.slice(0, 8).map(item => {
            return {
                dt: item.dt,
                dt_txt: item.dt_txt,
                temp: item.main.temp,
                icon: item.weather[0].icon,
                condition: item.weather[0].main,
                pop: item.pop // probability of precipitation (0 to 1)
            };
        });

        // 3. Current Weather (First chunk)
        const currentItem = data.list[0];
        const currentData = {
            temp: currentItem.main.temp,
            feels_like: currentItem.main.feels_like,
            icon: currentItem.weather[0].icon,
            condition: currentItem.weather[0].main,
            condition_bn: translateCondition(currentItem.weather[0].main),
            humidity: currentItem.main.humidity,
            wind_speed: currentItem.wind.speed, // in m/s
            clouds: currentItem.clouds.all
        };

        return Response.json({ 
            success: true, 
            current: currentData, 
            hourly: hourly,
            forecast: result 
        });

    } catch (err) {
        console.error("Get Weather Error:", err);
        return Response.json({ success: false, error: err.message }, { status: 500 });
    }
};
