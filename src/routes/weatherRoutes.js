function registerWeatherRoutes(app) {
  app.get('/api/weather', async (req, res) => {
    const locations = [
      { name: 'Dhaka', lat: 23.8103, lon: 90.4125 },
      { name: 'Gazipur', lat: 23.9957, lon: 90.4152 },
      { name: 'Bogura', lat: 24.8465, lon: 89.3687 },
      { name: 'Rajshahi', lat: 24.3745, lon: 88.6042 },
      { name: 'Khulna', lat: 22.8456, lon: 89.5403 },
      { name: 'Chattogram', lat: 22.3569, lon: 91.7832 },
    ];

    const areaQuery = String(req.query.area || 'Dhaka').trim();
    const daysQuery = Number.parseInt(req.query.days, 10);
    const forecastDays = Number.isInteger(daysQuery) ? Math.min(Math.max(daysQuery, 7), 21) : 14;
    const selectedLocation = locations.find((location) => location.name.toLowerCase() === areaQuery.toLowerCase());

    if (!selectedLocation) {
      return res.status(400).json({
        message: 'Invalid area',
        availableAreas: locations.map((location) => location.name),
      });
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${selectedLocation.lat}&longitude=${selectedLocation.lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,precipitation&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max&forecast_days=${forecastDays}&timezone=Asia/Dhaka`;
      const response = await fetch(url);
      const json = await response.json();

      const conditions = {
        0: 'Clear',
        1: 'Mostly Clear',
        2: 'Partly Cloudy',
        3: 'Overcast',
        45: 'Foggy',
        48: 'Foggy',
        51: 'Light Drizzle',
        53: 'Drizzle',
        55: 'Heavy Drizzle',
        61: 'Rainy',
        63: 'Heavy Rain',
        65: 'Very Heavy Rain',
        80: 'Light Showers',
        81: 'Showers',
        82: 'Heavy Showers',
        95: 'Thunderstorm',
        96: 'Thunderstorm with Hail',
        99: 'Thunderstorm with Hail',
      };

      const daily = json.daily || {};
      const forecast = (daily.time || []).map((date, index) => ({
        date,
        maxTemp: Math.round(daily.temperature_2m_max[index]),
        minTemp: Math.round(daily.temperature_2m_min[index]),
        condition: conditions[daily.weather_code[index]] || 'Variable',
        rainfall: daily.precipitation_sum[index] || 0,
        windSpeed: Math.round(daily.wind_speed_10m_max[index] || 0),
      }));

      const current = json.current || {};

      res.json({
        area: selectedLocation.name,
        days: forecastDays,
        generatedAt: new Date().toISOString(),
        availableAreas: locations.map((location) => location.name),
        current: {
          temperature: Math.round(current.temperature_2m || 0),
          condition: conditions[current.weather_code] || 'Variable',
          humidity: current.relative_humidity_2m || 0,
          windSpeed: Math.round(current.wind_speed_10m || 0),
          rainfall: current.precipitation || 0,
        },
        forecast,
      });
    } catch (error) {
      console.error('Weather API error:', error.message);
      const today = new Date();
      const fallbackForecast = Array.from({ length: forecastDays }, (_, index) => {
        const day = new Date(today);
        day.setDate(today.getDate() + index);
        const isoDate = day.toISOString().slice(0, 10);
        return {
          date: isoDate,
          maxTemp: 30,
          minTemp: 23,
          condition: 'Partly Cloudy',
          rainfall: 2,
          windSpeed: 10,
        };
      });

      res.json({
        area: selectedLocation.name,
        days: forecastDays,
        generatedAt: new Date().toISOString(),
        availableAreas: locations.map((location) => location.name),
        current: {
          temperature: 27,
          condition: 'Partly Cloudy',
          humidity: 78,
          windSpeed: 10,
          rainfall: 2,
        },
        forecast: fallbackForecast,
      });
    }
  });
}

module.exports = registerWeatherRoutes;
