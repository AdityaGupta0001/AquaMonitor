import express from "express";
import http from "http";
import { Server } from "socket.io";
import mqtt from "mqtt";
import cors from "cors";

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.static('public'));

// Store sensor data with historical readings (up to 200)
const sensorData = {
  temperature_ds18b20: [],
  distance_ultrasonic: [],
  turbidity: [],
  tds: [],
  humidity_dht11: [],
  temperature_dht11: []
};

// Configuration thresholds
const config = {
  tankTotalVolume: 1000, // liters
  distanceFull: 1, // cm - tank is full
  distanceEmpty: 11, // cm - tank is empty
  turbidityThreshold: 1000, // NTU threshold
  tdsMin: 50, // ppm
  tdsMax: 300, // ppm
  tempMin: 15, // °C
  tempMax: 30, // °C
  outsideTempMax: 45 // °C
};

let latestData = {};

const MQTT_CONFIG = {
  host: process.env.MQTT_HOST || 'url-here', // REPLACE with YOUR HiveMQ host
  port: parseInt(process.env.MQTT_PORT) || 8883,
  protocol: process.env.MQTT_PROTOCOL || 'mqtts',
  username: process.env.MQTT_USERNAME || 'username-here', // REPLACE with YOUR HiveMQ username
  password: process.env.MQTT_PASSWORD || 'password-here', // REPLACE with YOUR HiveMQ password
  clean: true,
  reconnectPeriod: 1000,
};

// Connect to MQTT broker
const mqttClient = mqtt.connect(MQTT_CONFIG);

mqttClient.on("connect", () => {
  console.log("✅ Connected to MQTT Broker");
  mqttClient.subscribe("sensor/data", (err) => {
    if (err) console.error("❌ MQTT Subscribe Error:", err);
    else console.log("📡 Subscribed to topic: sensor/data");
  });
});

mqttClient.on("error", (error) => {
  console.error("❌ MQTT Connection Error:", error);
});

mqttClient.on("offline", () => {
  console.log("📴 MQTT Client is offline");
});

mqttClient.on("reconnect", () => {
  console.log("🔄 Attempting to reconnect to MQTT broker...");
});

mqttClient.on("message", (topic, message) => {
  if (topic === "sensor/data") {
    const msgString = message.toString();
    try {
      const parsed = JSON.parse(msgString);
      const timestamp = new Date();

      Object.keys(parsed).forEach(key => {
        if (sensorData[key]) {
          sensorData[key].push({ value: parsed[key], timestamp });
          if (sensorData[key].length > 200) {
            sensorData[key].shift();
          }
        }
      });

      latestData = { ...parsed, timestamp };
      
      io.emit("dataUpdate", {
        latest: latestData,
        historical: sensorData,
        config
      });

      console.log(`✅ Data updated at ${timestamp.toLocaleTimeString()}`);
    } catch (err) {
      console.error("❌ Error parsing MQTT message:", err);
    }
  }
});

// API endpoint for latest data
app.get("/api/latest", (req, res) => {
  res.json({ latest: latestData, historical: sensorData, config });
});

app.get("/health", (req, res) => {
  res.json({ 
    status: "ok", 
    mqttConnected: mqttClient.connected,
    timestamp: new Date().toISOString()
  });
});

// Landing Page
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AquaMonitor - Smart Water Tank System</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      overflow-x: hidden;
      background: #0a0e27;
      color: white;
    }

    .landing-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      position: relative;
      overflow: hidden;
    }

    .animated-bg {
      position: absolute;
      width: 100%;
      height: 100%;
      opacity: 0.1;
    }

    .bubble {
      position: absolute;
      bottom: -100px;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      animation: rise 15s infinite ease-in;
    }

    @keyframes rise {
      to {
        bottom: 110%;
        transform: translateX(100px);
      }
    }

    .landing-content {
      position: relative;
      z-index: 10;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 40px 20px;
      text-align: center;
    }

    .logo {
      font-size: 5rem;
      margin-bottom: 20px;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-20px); }
    }

    h1 {
      font-size: 4rem;
      margin-bottom: 20px;
      text-shadow: 3px 3px 6px rgba(0,0,0,0.3);
      animation: fadeIn 1s ease-in;
    }

    .tagline {
      font-size: 1.5rem;
      margin-bottom: 50px;
      opacity: 0.9;
      animation: fadeIn 1.5s ease-in;
    }

    .features {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 30px;
      max-width: 1200px;
      margin: 50px auto;
      animation: slideUp 1s ease-out;
    }

    .feature-card {
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 30px;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      border: 2px solid rgba(255, 255, 255, 0.2);
    }

    .feature-card:hover {
      transform: translateY(-10px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.3);
    }

    .feature-icon {
      font-size: 3rem;
      margin-bottom: 15px;
    }

    .feature-card h3 {
      font-size: 1.3rem;
      margin-bottom: 10px;
    }

    .feature-card p {
      font-size: 1rem;
      opacity: 0.9;
    }

    .cta-button {
      background: white;
      color: #667eea;
      padding: 20px 60px;
      font-size: 1.5rem;
      font-weight: bold;
      border: none;
      border-radius: 50px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      text-decoration: none;
      display: inline-block;
      margin-top: 30px;
      animation: pulse 2s infinite;
    }

    .cta-button:hover {
      transform: scale(1.1);
      box-shadow: 0 15px 40px rgba(0,0,0,0.4);
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(50px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    .stats {
      display: flex;
      justify-content: center;
      gap: 50px;
      margin: 40px 0;
      flex-wrap: wrap;
    }

    .stat-item {
      text-align: center;
    }

    .stat-number {
      font-size: 3rem;
      font-weight: bold;
      color: #fff;
    }

    .stat-label {
      font-size: 1.1rem;
      opacity: 0.8;
    }
  </style>
</head>
<body>
  <div class="landing-container">
    <div class="animated-bg" id="bubbles"></div>
    
    <div class="landing-content">
      <div class="logo">💧</div>
      <h1>AquaMonitor</h1>
      <p class="tagline">Smart IoT-Based Water Tank Monitoring System</p>

      <div class="stats">
        <div class="stat-item">
          <div class="stat-number">5</div>
          <div class="stat-label">Sensors</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">24/7</div>
          <div class="stat-label">Real-Time Monitoring</div>
        </div>
        <div class="stat-item">
          <div class="stat-number">200</div>
          <div class="stat-label">Data Points Tracked</div>
        </div>
      </div>

      <div class="features">
        <div class="feature-card">
          <div class="feature-icon">🌡️</div>
          <h3>Temperature Monitoring</h3>
          <p>Track water temperature in real-time with DS18B20 digital sensor</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">📏</div>
          <h3>Water Level Detection</h3>
          <p>Ultrasonic distance measurement with volume calculations</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🌊</div>
          <h3>Turbidity Analysis</h3>
          <p>Monitor water clarity and detect contamination</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">💧</div>
          <h3>TDS Measurement</h3>
          <p>Check water purity with total dissolved solids tracking</p>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🌦️</div>
          <h3>Environmental Monitor</h3>
          <p>Track ambient temperature and humidity with DHT11</p>
        </div>
      </div>

      <a href="/dashboard" class="cta-button">Enter Dashboard →</a>
    </div>
  </div>

  <script>
    // Create animated bubbles
    const bubblesContainer = document.getElementById('bubbles');
    for (let i = 0; i < 15; i++) {
      const bubble = document.createElement('div');
      bubble.className = 'bubble';
      const size = Math.random() * 100 + 50;
      bubble.style.width = size + 'px';
      bubble.style.height = size + 'px';
      bubble.style.left = Math.random() * 100 + '%';
      bubble.style.animationDelay = Math.random() * 5 + 's';
      bubble.style.animationDuration = (Math.random() * 10 + 10) + 's';
      bubblesContainer.appendChild(bubble);
    }
  </script>
</body>
</html>
  `);
});

// Dashboard Page
app.get("/dashboard", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - AquaMonitor</title>
  <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      display: flex;
      min-height: 100vh;
    }

    .sidebar {
      width: 280px;
      background: #2c3e50;
      color: white;
      padding: 30px 0;
      position: fixed;
      height: 100vh;
      overflow-y: auto;
      box-shadow: 4px 0 15px rgba(0,0,0,0.2);
    }

    .sidebar-header {
      padding: 0 30px 30px;
      border-bottom: 2px solid rgba(255,255,255,0.1);
      text-align: center;
    }

    .sidebar-header h2 {
      font-size: 1.8rem;
      margin-top: 10px;
    }

    .sidebar-header .logo {
      font-size: 3rem;
    }

    .nav-menu {
      list-style: none;
      padding: 20px 0;
    }

    .nav-item {
      padding: 15px 30px;
      cursor: pointer;
      transition: all 0.3s ease;
      border-left: 4px solid transparent;
    }

    .nav-item:hover {
      background: rgba(255,255,255,0.1);
      border-left-color: #667eea;
    }

    .nav-item.active {
      background: rgba(102, 126, 234, 0.2);
      border-left-color: #667eea;
    }

    .nav-item a {
      color: white;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 15px;
      font-size: 1.1rem;
    }

    .nav-icon {
      font-size: 1.5rem;
    }

    .main-content {
      margin-left: 280px;
      flex: 1;
      padding: 20px;
      width: calc(100% - 280px);
    }

    .header {
      text-align: center;
      color: white;
      margin-bottom: 30px;
      animation: fadeIn 0.5s ease-in;
    }

    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }

    .header .status {
      font-size: 1.1rem;
      opacity: 0.9;
    }

    .dashboard {
      display: flex;
      flex-wrap: wrap;
      gap: 25px;
      max-width: 1600px;
      margin: 0 auto;
      justify-content: center;
    }

    .sensor-card {
      background: white;
      border-radius: 15px;
      padding: 25px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      animation: slideUp 0.5s ease-out;
      transition: transform 0.3s ease;
      width: calc(50% - 12.5px);
      min-width: 500px;
    }

    .sensor-card:hover {
      transform: translateY(-5px);
    }

    .sensor-card h2 {
      color: #667eea;
      margin-bottom: 20px;
      font-size: 1.5rem;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }

    .widget {
      margin: 20px 0;
      padding: 20px;
      border-radius: 10px;
      text-align: center;
    }

    .temp-widget {
      height: 150px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2.5rem;
      font-weight: bold;
      color: white;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      transition: background-color 1s ease;
    }

    .water-tank {
      width: 200px;
      height: 300px;
      border: 4px solid #333;
      border-radius: 10px;
      position: relative;
      margin: 20px auto;
      background: linear-gradient(to bottom, #e0f7fa 0%, #b2ebf2 100%);
      overflow: hidden;
    }

    .water-level {
      position: absolute;
      bottom: 0;
      width: 100%;
      background: linear-gradient(to top, #0288d1 0%, #03a9f4 50%, #4fc3f7 100%);
      transition: height 1s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 1.2rem;
    }

    .water-level::before {
      content: '';
      position: absolute;
      top: -20px;
      left: -50%;
      width: 200%;
      height: 40px;
      background: rgba(255,255,255,0.3);
      border-radius: 45%;
      animation: wave 3s infinite linear;
    }

    @keyframes wave {
      0% { transform: translateX(0) translateY(0); }
      50% { transform: translateX(-25%) translateY(-10px); }
      100% { transform: translateX(0) translateY(0); }
    }

    .status-indicator {
      padding: 15px 30px;
      border-radius: 25px;
      font-size: 1.3rem;
      font-weight: bold;
      margin: 15px 0;
      text-align: center;
      transition: all 0.5s ease;
    }

    .safe {
      background: #4caf50;
      color: white;
    }

    .warning {
      background: #ff9800;
      color: white;
    }

    .danger {
      background: #f44336;
      color: white;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .chart-container {
      position: relative;
      height: 250px;
      margin: 20px 0;
    }

    .alert-popup {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 20px 30px;
      border-radius: 10px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.3);
      z-index: 1000;
      animation: slideInRight 0.5s ease;
      max-width: 400px;
    }

    .alert-popup h3 {
      margin-bottom: 10px;
      font-size: 1.3rem;
    }

    .alert-popup button {
      background: white;
      color: #f44336;
      border: none;
      padding: 8px 20px;
      border-radius: 5px;
      cursor: pointer;
      margin-top: 10px;
      font-weight: bold;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(30px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideInRight {
      from { 
        transform: translateX(400px);
        opacity: 0;
      }
      to { 
        transform: translateX(0);
        opacity: 1;
      }
    }

    .integrity-status {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 15px;
      margin: 15px 0;
    }

    .integrity-box {
      padding: 15px;
      border-radius: 10px;
      text-align: center;
      background: #f5f5f5;
    }

    .integrity-box h4 {
      margin-bottom: 10px;
      color: #666;
    }

    .integrity-box .value {
      font-size: 1.8rem;
      font-weight: bold;
      color: #667eea;
    }

    .volume-info {
      text-align: center;
      font-size: 1.2rem;
      margin-top: 10px;
      font-weight: bold;
      color: #0288d1;
    }
  </style>
</head>
<body>
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="logo">💧</div>
      <h2>AquaMonitor</h2>
    </div>
    <ul class="nav-menu">
      <li class="nav-item active">
        <a href="/dashboard">
          <span class="nav-icon">📊</span>
          <span>Dashboard</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="/sensor/temperature">
          <span class="nav-icon">🌡️</span>
          <span>Water Temperature</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="/sensor/distance">
          <span class="nav-icon">📏</span>
          <span>Water Level</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="/sensor/turbidity">
          <span class="nav-icon">🌊</span>
          <span>Turbidity</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="/sensor/tds">
          <span class="nav-icon">💧</span>
          <span>TDS Monitor</span>
        </a>
      </li>
      <li class="nav-item">
        <a href="/sensor/environment">
          <span class="nav-icon">🌦️</span>
          <span>Environment</span>
        </a>
      </li>
    </ul>
  </div>

  <div class="main-content">
    <div class="header">
      <h1>💧 Dashboard</h1>
      <div class="status" id="connection-status">Connecting...</div>
    </div>

    <div id="alert-container"></div>

    <div class="dashboard">
      <!-- Water Temperature Sensor (DS18B20) -->
      <div class="sensor-card">
        <h2>🌡️ Water Temperature (DS18B20)</h2>
        <div class="widget temp-widget" id="temp-water-widget">
          <span id="temp-water-value">--°C</span>
        </div>
        <div class="chart-container">
          <canvas id="temp-water-chart"></canvas>
        </div>
      </div>

      <!-- Distance/Water Level -->
      <div class="sensor-card">
        <h2>📏 Water Level Monitor</h2>
        <div class="water-tank">
          <div class="water-level" id="water-level">
            <span id="water-percentage">0%</span>
          </div>
        </div>
        <div class="volume-info" id="volume-info">0 / 0 L</div>
        <div class="chart-container">
          <canvas id="distance-chart"></canvas>
        </div>
      </div>

      <!-- Turbidity -->
      <div class="sensor-card">
        <h2>🌊 Water Turbidity</h2>
        <div class="status-indicator" id="turbidity-status">Checking...</div>
        <div class="chart-container">
          <canvas id="turbidity-chart"></canvas>
        </div>
      </div>

      <!-- TDS -->
      <div class="sensor-card">
        <h2>💧 Total Dissolved Solids (TDS)</h2>
        <div class="status-indicator" id="tds-status">Checking...</div>
        <div class="chart-container">
          <canvas id="tds-chart"></canvas>
        </div>
      </div>

      <!-- DHT11 - External Environment - Centered -->
      <div class="sensor-card" style="width: calc(100% - 50px); max-width: 1000px;">
        <h2>🏠 External Environment & Tank Integrity</h2>
        <div class="integrity-status">
          <div class="integrity-box">
            <h4>Outside Temperature</h4>
            <div class="value" id="outside-temp-value">--°C</div>
          </div>
          <div class="integrity-box">
            <h4>Humidity</h4>
            <div class="value" id="humidity-value">--%</div>
          </div>
        </div>
        <div class="status-indicator" id="integrity-status">Checking...</div>
        <div class="chart-container">
          <canvas id="dht-chart"></canvas>
        </div>
      </div>
    </div>
  </div>

  <script>
    const socket = io();
    
    let charts = {};
    let config = {};
    let alertsShown = new Set();

    function initCharts() {
      const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { beginAtZero: false } }
      };

      charts.tempWater = new Chart(document.getElementById('temp-water-chart'), {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Temperature', data: [], borderColor: '#ff6384', tension: 0.4, fill: true, backgroundColor: 'rgba(255, 99, 132, 0.1)' }] },
        options: chartOptions
      });

      charts.distance = new Chart(document.getElementById('distance-chart'), {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Distance', data: [], borderColor: '#36a2eb', tension: 0.4, fill: true, backgroundColor: 'rgba(54, 162, 235, 0.1)' }] },
        options: chartOptions
      });

      charts.turbidity = new Chart(document.getElementById('turbidity-chart'), {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'Turbidity', data: [], borderColor: '#ffce56', tension: 0.4, fill: true, backgroundColor: 'rgba(255, 206, 86, 0.1)' }] },
        options: chartOptions
      });

      charts.tds = new Chart(document.getElementById('tds-chart'), {
        type: 'line',
        data: { labels: [], datasets: [{ label: 'TDS', data: [], borderColor: '#4bc0c0', tension: 0.4, fill: true, backgroundColor: 'rgba(75, 192, 192, 0.1)' }] },
        options: chartOptions
      });

      charts.dht = new Chart(document.getElementById('dht-chart'), {
        type: 'line',
        data: { 
          labels: [], 
          datasets: [
            { label: 'Temperature', data: [], borderColor: '#ff6384', tension: 0.4 },
            { label: 'Humidity', data: [], borderColor: '#36a2eb', tension: 0.4 }
          ] 
        },
        options: { ...chartOptions, plugins: { legend: { display: true } }, scales: { x: { display: false }, y: { beginAtZero: true } } }
      });
    }

    function getTempColor(temp) {
      if (temp < 10) return '#0000ff';
      if (temp < 15) return '#00bfff';
      if (temp < 20) return '#00ff00';
      if (temp < 25) return '#ffff00';
      if (temp < 30) return '#ffa500';
      return '#ff0000';
    }

    function calculateVolume(distance, config) {
      const { distanceFull, distanceEmpty, tankTotalVolume } = config;
      if (distance <= distanceFull) return tankTotalVolume;
      if (distance >= distanceEmpty) return 0;
      const percentage = 1 - ((distance - distanceFull) / (distanceEmpty - distanceFull));
      return Math.round(percentage * tankTotalVolume);
    }

    function showAlert(message, type) {
      const alertKey = \`\${type}-\${message}\`;
      if (alertsShown.has(alertKey)) return;
      
      alertsShown.add(alertKey);
      setTimeout(() => alertsShown.delete(alertKey), 60000);

      const alertDiv = document.createElement('div');
      alertDiv.className = 'alert-popup';
      alertDiv.innerHTML = \`
        <h3>⚠️ Alert</h3>
        <p>\${message}</p>
        <button onclick="this.parentElement.remove()">Dismiss</button>
      \`;
      document.getElementById('alert-container').appendChild(alertDiv);
      
      setTimeout(() => alertDiv.remove(), 10000);
    }

    socket.on("dataUpdate", (data) => {
      const { latest, historical, config: cfg } = data;
      config = cfg;

      document.getElementById('connection-status').textContent = \`Last updated: \${new Date(latest.timestamp).toLocaleTimeString()}\`;

      if (latest.temperature_ds18b20 !== undefined) {
        const temp = parseFloat(latest.temperature_ds18b20);
        document.getElementById('temp-water-value').textContent = \`\${temp.toFixed(1)}°C\`;
        document.getElementById('temp-water-widget').style.backgroundColor = getTempColor(temp);
        
        if (temp < config.tempMin || temp > config.tempMax) {
          showAlert(\`Water temperature (\${temp.toFixed(1)}°C) is outside normal range!\`, 'temperature');
        }
      }

      if (latest.distance_ultrasonic !== undefined) {
        const distance = parseFloat(latest.distance_ultrasonic);
        const volume = calculateVolume(distance, config);
        const percentage = Math.round((volume / config.tankTotalVolume) * 100);
        
        document.getElementById('water-level').style.height = \`\${percentage}%\`;
        document.getElementById('water-percentage').textContent = \`\${percentage}%\`;
        document.getElementById('volume-info').textContent = \`\${volume} / \${config.tankTotalVolume} L\`;

        if (percentage < 20) {
          showAlert(\`Water level is low (\${percentage}%)!\`, 'water-level');
        }
      }

      if (latest.turbidity !== undefined) {
        const turbidity = parseFloat(latest.turbidity);
        const statusEl = document.getElementById('turbidity-status');
        
        if (turbidity > config.turbidityThreshold) {
          statusEl.textContent = '⚠️ Water is Turbid';
          statusEl.className = 'status-indicator danger';
          showAlert(\`High turbidity detected (\${turbidity.toFixed(1)} NTU)!\`, 'turbidity');
        } else {
          statusEl.textContent = '✓ Water is Clear';
          statusEl.className = 'status-indicator safe';
        }
      }

      if (latest.tds !== undefined) {
        const tds = parseFloat(latest.tds);
        const statusEl = document.getElementById('tds-status');
        
        if (tds < config.tdsMin || tds > config.tdsMax) {
          statusEl.textContent = \`⚠️ Water Quality Unsafe (\${tds.toFixed(0)} ppm)\`;
          statusEl.className = 'status-indicator danger';
          showAlert(\`TDS level (\${tds.toFixed(0)} ppm) is outside safe range!\`, 'tds');
        } else {
          statusEl.textContent = \`✓ Water is Safe (\${tds.toFixed(0)} ppm)\`;
          statusEl.className = 'status-indicator safe';
        }
      }

      if (latest.temperature_dht11 !== undefined && latest.humidity_dht11 !== undefined) {
        const outsideTemp = parseFloat(latest.temperature_dht11);
        const humidity = parseFloat(latest.humidity_dht11);
        const insideTemp = parseFloat(latest.temperature_ds18b20);

        document.getElementById('outside-temp-value').textContent = \`\${outsideTemp.toFixed(1)}°C\`;
        document.getElementById('humidity-value').textContent = \`\${humidity.toFixed(1)}%\`;

        const statusEl = document.getElementById('integrity-status');
        
        if (outsideTemp > config.outsideTempMax && insideTemp < config.tempMax) {
          statusEl.textContent = '✓ Tank Integrity: Good';
          statusEl.className = 'status-indicator safe';
        } else if (outsideTemp > config.outsideTempMax && insideTemp > config.tempMax) {
          statusEl.textContent = '⚠️ Tank Integrity: Compromised';
          statusEl.className = 'status-indicator danger';
          showAlert('Tank body integrity may be compromised due to high temperatures!', 'integrity');
        } else {
          statusEl.textContent = 'Tank Integrity: Normal';
          statusEl.className = 'status-indicator safe';
        }
      }

      updateChart('temperature_ds18b20', historical.temperature_ds18b20, charts.tempWater, 0);
      updateChart('distance_ultrasonic', historical.distance_ultrasonic, charts.distance, 0);
      updateChart('turbidity', historical.turbidity, charts.turbidity, 0);
      updateChart('tds', historical.tds, charts.tds, 0);
      updateDHTChart(historical);
    });

    function updateChart(key, data, chart, datasetIndex) {
      if (!data || data.length === 0) return;
      const chartData = data.slice(-50);
      chart.data.labels = chartData.map(item => new Date(item.timestamp).toLocaleTimeString());
      chart.data.datasets[datasetIndex].data = chartData.map(item => parseFloat(item.value));
      chart.update('none');
    }

    function updateDHTChart(historical) {
      if (!historical.temperature_dht11 || !historical.humidity_dht11) return;
      const chartData = historical.temperature_dht11.slice(-50);
      charts.dht.data.labels = chartData.map(item => new Date(item.timestamp).toLocaleTimeString());
      charts.dht.data.datasets[0].data = chartData.map(item => parseFloat(item.value));
      charts.dht.data.datasets[1].data = historical.humidity_dht11.slice(-50).map(item => parseFloat(item.value));
      charts.dht.update('none');
    }

    initCharts();
  </script>
</body>
</html>
  `);
});

// Individual Sensor Pages
// Temperature Sensor Page
app.get("/sensor/temperature", (req, res) => {
  res.send(getSensorPageHTML('temperature', {
    title: '🌡️ Water Temperature Monitor (DS18B20)',
    description: 'DS18B20 Digital Temperature Sensor',
    technical: `
      <h3>🔍 Purpose</h3>
      <p>Measures temperature inside the water tank (the water temperature itself). Helps determine if the water is too cold or too hot, and whether it's safe for storage or use.</p>
      
      <h3>⚙️ Working Principle</h3>
      <p>DS18B20 is a digital temperature sensor that uses the <strong>1-Wire communication protocol</strong>, meaning multiple sensors can share the same data line. It converts temperature to a digital signal internally—no need for an analog input.</p>
      
      <h3>🧠 Technical Specifications</h3>
      <table class="specs-table">
        <tr><td><strong>Operating Voltage</strong></td><td>3.0V to 5.5V</td></tr>
        <tr><td><strong>Temperature Range</strong></td><td>-55°C to +125°C</td></tr>
        <tr><td><strong>Accuracy</strong></td><td>±0.5°C (typical)</td></tr>
        <tr><td><strong>Interface</strong></td><td>Digital (1-Wire)</td></tr>
        <tr><td><strong>Resolution</strong></td><td>9 to 12-bit (configurable)</td></tr>
      </table>
      
      <h3>🪛 Pin Connections</h3>
      <table class="specs-table">
        <tr><th>DS18B20 Pin</th><th>Connects To</th><th>Description</th></tr>
        <tr><td>VCC</td><td>3.3V</td><td>Power supply</td></tr>
        <tr><td>GND</td><td>GND</td><td>Ground</td></tr>
        <tr><td>DQ</td><td>D2 (GPIO4)</td><td>Data line</td></tr>
        <tr><td>4.7kΩ resistor</td><td>Between DQ and VCC</td><td>Pull-up resistor for 1-Wire</td></tr>
      </table>
      
      <h3>💡 Role in System</h3>
      <p>Publishes readings like: <code>"temperature_ds18b20": 24.12</code></p>
      <p>Used in the UI for animated temperature widget with color gradient shifts from blue→red based on temperature, and graphs of temperature trends inside water over time.</p>
    `
  }));
});

app.get("/sensor/distance", (req, res) => {
  res.send(getSensorPageHTML('distance', {
    title: '📏 Water Level Monitor (HC-SR04)',
    description: 'HC-SR04 Ultrasonic Distance Sensor',
    technical: `
      <h3>🔍 Purpose</h3>
      <p>Measures distance from the sensor to the water surface — used to calculate tank water level. Helps monitor water volume and triggers alerts when low.</p>
      
      <h3>⚙️ Working Principle</h3>
      <p>Uses ultrasound pulses:</p>
      <ul>
        <li><strong>Trig pin</strong> sends a short 40 kHz pulse</li>
        <li><strong>Echo pin</strong> receives the reflected pulse from the water surface</li>
        <li>The time difference calculates distance</li>
        <li><strong>Formula:</strong> Distance = (Time × Speed of Sound) / 2</li>
      </ul>
      
      <h3>🧠 Technical Specifications</h3>
      <table class="specs-table">
        <tr><td><strong>Voltage</strong></td><td>5V</td></tr>
        <tr><td><strong>Measuring Range</strong></td><td>2cm – 400cm</td></tr>
        <tr><td><strong>Accuracy</strong></td><td>±3mm</td></tr>
        <tr><td><strong>Interface</strong></td><td>Digital (Trigger & Echo)</td></tr>
        <tr><td><strong>Frequency</strong></td><td>40 kHz</td></tr>
      </table>
      
      <h3>🪛 Pin Connections</h3>
      <table class="specs-table">
        <tr><th>HC-SR04 Pin</th><th>Connects To</th><th>Description</th></tr>
        <tr><td>VCC</td><td>5V</td><td>Power supply</td></tr>
        <tr><td>GND</td><td>GND</td><td>Ground</td></tr>
        <tr><td>TRIG</td><td>D5 (GPIO14)</td><td>Trigger pulse output</td></tr>
        <tr><td>ECHO</td><td>D6 (GPIO12)</td><td>Echo input (measured pulse)</td></tr>
      </table>
      
      <h3>💡 Role in System</h3>
      <p>Publishes readings like: <code>"distance_ultrasonic": 30.12</code></p>
      <p>UI visualization includes an animated water tank graphic displaying real-time level, volume, and percentage filled. Alerts trigger if tank is near empty/full.</p>
    `
  }));
});

app.get("/sensor/turbidity", (req, res) => {
  res.send(getSensorPageHTML('turbidity', {
    title: '🌊 Water Turbidity Monitor',
    description: 'Turbidity Sensor for Water Clarity',
    technical: `
      <h3>🔍 Purpose</h3>
      <p>Measures how clear or cloudy (turbid) the water is. Indicates contamination by particles, sediment, or impurities.</p>
      
      <h3>⚙️ Working Principle</h3>
      <p>Works using <strong>light scattering</strong>:</p>
      <ul>
        <li>Infrared LED emits light through water</li>
        <li>Photodiode on the other side detects light intensity</li>
        <li>If water is dirty → less light passes through → higher turbidity value</li>
        <li>If water is clear → more light passes through → lower turbidity value</li>
      </ul>
      
      <h3>🧠 Technical Specifications</h3>
      <table class="specs-table">
        <tr><td><strong>Voltage</strong></td><td>5V</td></tr>
        <tr><td><strong>Output Type</strong></td><td>Analog</td></tr>
        <tr><td><strong>Measuring Range</strong></td><td>0–1000 NTU</td></tr>
        <tr><td><strong>Interface</strong></td><td>Analog</td></tr>
        <tr><td><strong>Response Time</strong></td><td>&lt;500ms</td></tr>
      </table>
      
      <h3>🪛 Pin Connections</h3>
      <table class="specs-table">
        <tr><th>Turbidity Sensor Pin</th><th>Connects To</th><th>Description</th></tr>
        <tr><td>VCC</td><td>5V</td><td>Power</td></tr>
        <tr><td>GND</td><td>GND</td><td>Ground</td></tr>
        <tr><td>AO</td><td>A0</td><td>Analog output to read voltage</td></tr>
      </table>
      
      <h3>💡 Role in System</h3>
      <p>Publishes readings like: <code>"turbidity": -1370.39</code></p>
      <p>UI features include a graph showing water clarity trends, a status widget indicating "Clear" or "Turbid" with color-coded indication, and alerts if turbidity exceeds safe limits (e.g., >1000 NTU).</p>
    `
  }));
});

app.get("/sensor/tds", (req, res) => {
  res.send(getSensorPageHTML('tds', {
    title: '💧 TDS Water Quality Monitor',
    description: 'Total Dissolved Solids Sensor',
    technical: `
      <h3>🔍 Purpose</h3>
      <p>Measures purity of water — the concentration of dissolved salts, minerals, and metals. Indicates whether water is safe for drinking or usage.</p>
      
      <h3>⚙️ Working Principle</h3>
      <p>Measures <strong>electrical conductivity (EC)</strong>:</p>
      <ul>
        <li>Pure water has low conductivity</li>
        <li>More dissolved solids → higher conductivity</li>
        <li>Converts voltage reading into ppm (parts per million)</li>
        <li>TDS value indicates overall mineral content</li>
      </ul>
      
      <h3>🧠 Technical Specifications</h3>
      <table class="specs-table">
        <tr><td><strong>Voltage</strong></td><td>3.3V–5V</td></tr>
        <tr><td><strong>Measuring Range</strong></td><td>0–1000 ppm</td></tr>
        <tr><td><strong>Accuracy</strong></td><td>±10%</td></tr>
        <tr><td><strong>Interface</strong></td><td>Analog</td></tr>
        <tr><td><strong>Probe Material</strong></td><td>Stainless Steel</td></tr>
      </table>
      
      <h3>🪛 Pin Connections</h3>
      <table class="specs-table">
        <tr><th>TDS Sensor Pin</th><th>Connects To</th><th>Description</th></tr>
        <tr><td>VCC</td><td>3.3V</td><td>Power</td></tr>
        <tr><td>GND</td><td>GND</td><td>Ground</td></tr>
        <tr><td>AO</td><td>A0</td><td>Analog output (through multiplexer if shared)</td></tr>
      </table>
      
      <h3>💡 Water Quality Guidelines</h3>
      <table class="specs-table">
        <tr><th>TDS Range (ppm)</th><th>Water Quality</th></tr>
        <tr><td>0-50</td><td>Low mineral (not ideal)</td></tr>
        <tr><td>50-150</td><td>Excellent</td></tr>
        <tr><td>150-300</td><td>Good</td></tr>
        <tr><td>300-500</td><td>Fair</td></tr>
        <tr><td>&gt;500</td><td>Poor (not recommended)</td></tr>
      </table>
      
      <h3>💡 Role in System</h3>
      <p>Publishes readings like: <code>"tds": 345.2</code></p>
      <p>UI includes trend chart for TDS readings, a widget showing water quality status (Safe/Unsafe), and alerts if ppm exceeds thresholds.</p>
    `
  }));
});

app.get("/sensor/environment", (req, res) => {
  res.send(getSensorPageHTML('environment', {
    title: '🌦️ Environmental Monitor (DHT11)',
    description: 'DHT11 Temperature & Humidity Sensor',
    technical: `
      <h3>🔍 Purpose</h3>
      <p>Measures outside air temperature and humidity near the tank. Helps assess how external weather conditions affect the tank's structural integrity or water evaporation.</p>
      
      <h3>⚙️ Working Principle</h3>
      <p>Contains:</p>
      <ul>
        <li><strong>Thermistor</strong> for temperature measurement</li>
        <li><strong>Capacitive humidity sensor</strong> for relative humidity</li>
        <li>Outputs digital signal with both values</li>
        <li>Single-wire serial communication protocol</li>
      </ul>
      
      <h3>🧠 Technical Specifications</h3>
      <table class="specs-table">
        <tr><td><strong>Voltage</strong></td><td>3.3V–5V</td></tr>
        <tr><td><strong>Temperature Range</strong></td><td>0–50°C</td></tr>
        <tr><td><strong>Humidity Range</strong></td><td>20–90% RH</td></tr>
        <tr><td><strong>Temperature Accuracy</strong></td><td>±2°C</td></tr>
        <tr><td><strong>Humidity Accuracy</strong></td><td>±5% RH</td></tr>
        <tr><td><strong>Interface</strong></td><td>Digital (Single-wire serial)</td></tr>
        <tr><td><strong>Sampling Rate</strong></td><td>1 Hz (once per second)</td></tr>
      </table>
      
      <h3>🪛 Pin Connections</h3>
      <table class="specs-table">
        <tr><th>DHT11 Pin</th><th>Connects To</th><th>Description</th></tr>
        <tr><td>VCC</td><td>3.3V</td><td>Power</td></tr>
        <tr><td>GND</td><td>GND</td><td>Ground</td></tr>
        <tr><td>Data</td><td>D3 (GPIO0)</td><td>Data signal line</td></tr>
        <tr><td>10kΩ resistor</td><td>Between Data & VCC</td><td>Pull-up resistor</td></tr>
      </table>
      
      <h3>💡 Tank Integrity Assessment</h3>
      <p>The system compares external temperature (DHT11) with internal water temperature (DS18B20):</p>
      <ul>
        <li><strong>Good Integrity:</strong> Outside is very hot (>45°C) but water stays cool (<30°C) = Tank insulation is working</li>
        <li><strong>Compromised:</strong> Both outside and inside temperatures are high = Tank body cannot maintain proper insulation</li>
      </ul>
      
      <h3>💡 Role in System</h3>
      <p>Publishes readings like: <code>"humidity_dht11": 67.00, "temperature_dht11": 25.40</code></p>
      <p>UI features graphs for humidity and external temperature, a comparison widget between inside and outside temperatures, and alerts if outside temperature is too high (could damage tank).</p>
    `
  }));
});

function getSensorPageHTML(sensorType, pageData) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${pageData.title} - AquaMonitor</title>
  <script src="https://cdn.socket.io/4.7.5/socket.io.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #333;
      display: flex;
      min-height: 100vh;
    }

    .sidebar {
      width: 280px;
      background: #2c3e50;
      color: white;
      padding: 30px 0;
      position: fixed;
      height: 100vh;
      overflow-y: auto;
      box-shadow: 4px 0 15px rgba(0,0,0,0.2);
    }

    .sidebar-header {
      padding: 0 30px 30px;
      border-bottom: 2px solid rgba(255,255,255,0.1);
      text-align: center;
    }

    .sidebar-header h2 {
      font-size: 1.8rem;
      margin-top: 10px;
    }

    .sidebar-header .logo {
      font-size: 3rem;
    }

    .nav-menu {
      list-style: none;
      padding: 20px 0;
    }

    .nav-item {
      padding: 15px 30px;
      cursor: pointer;
      transition: all 0.3s ease;
      border-left: 4px solid transparent;
    }

    .nav-item:hover {
      background: rgba(255,255,255,0.1);
      border-left-color: #667eea;
    }

    .nav-item.active {
      background: rgba(102, 126, 234, 0.2);
      border-left-color: #667eea;
    }

    .nav-item a {
      color: white;
      text-decoration: none;
      display: flex;
      align-items: center;
      gap: 15px;
      font-size: 1.1rem;
    }

    .nav-icon {
      font-size: 1.5rem;
    }

    .main-content {
      margin-left: 280px;
      flex: 1;
      padding: 20px;
    }

    .header {
      text-align: center;
      color: white;
      margin-bottom: 30px;
      animation: fadeIn 0.5s ease-in;
    }

    .header h1 {
      font-size: 2.5rem;
      margin-bottom: 10px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
    }

    .header .subtitle {
      font-size: 1.2rem;
      opacity: 0.9;
    }

    .header .status {
      font-size: 1rem;
      opacity: 0.8;
      margin-top: 10px;
    }

    .content-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 25px;
      max-width: 1600px;
      margin: 0 auto;
    }

    .content-grid > div {
      display: flex;
      flex-direction: column;
      gap: 25px;  /* Spacing between cards in the same column */
    }

    .sensor-card {
      background: white;
      border-radius: 15px;
      padding: 30px;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
      animation: slideUp 0.5s ease-out;
    }

    .sensor-card h2 {
      color: #667eea;
      margin-bottom: 20px;
      font-size: 1.5rem;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }

    .sensor-card h3 {
      color: #555;
      margin: 20px 0 10px;
      font-size: 1.2rem;
    }

    .sensor-card p, .sensor-card ul, .sensor-card li {
      line-height: 1.8;
      margin-bottom: 15px;
      color: #666;
    }

    .sensor-card ul {
      padding-left: 25px;
    }

    .sensor-card code {
      background: #f5f5f5;
      padding: 2px 8px;
      border-radius: 4px;
      color: #e74c3c;
      font-family: 'Courier New', monospace;
    }

    .specs-table {
      width: 100%;
      border-collapse: collapse;
      margin: 15px 0;
      font-size: 0.95rem;
    }

    .specs-table th, .specs-table td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }

    .specs-table th {
      background: #667eea;
      color: white;
      font-weight: bold;
    }

    .specs-table tr:hover {
      background: #f9f9f9;
    }

    .widget {
      margin: 20px 0;
      padding: 25px;
      border-radius: 10px;
      text-align: center;
    }

    .temp-widget {
      height: 180px;
      border-radius: 15px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 3rem;
      font-weight: bold;
      color: white;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      transition: background-color 1s ease;
      position: relative;
    }

    .temp-widget .weather-icon {
      font-size: 4rem;
      margin-bottom: 10px;
      animation: float 3s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0px); }
      50% { transform: translateY(-10px); }
    }

    .water-tank {
      width: 250px;
      height: 350px;
      border: 4px solid #333;
      border-radius: 15px;
      position: relative;
      margin: 20px auto;
      background: linear-gradient(to bottom, #e0f7fa 0%, #b2ebf2 100%);
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.2);
    }

    .water-level {
      position: absolute;
      bottom: 0;
      width: 100%;
      background: linear-gradient(to top, #0288d1 0%, #03a9f4 50%, #4fc3f7 100%);
      transition: height 1s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: bold;
      font-size: 1.5rem;
    }

    .water-level::before {
      content: '';
      position: absolute;
      top: -20px;
      left: -50%;
      width: 200%;
      height: 40px;
      background: rgba(255,255,255,0.3);
      border-radius: 45%;
      animation: wave 3s infinite linear;
    }

    @keyframes wave {
      0% { transform: translateX(0) translateY(0); }
      50% { transform: translateX(-25%) translateY(-10px); }
      100% { transform: translateX(0) translateY(0); }
    }

    .status-indicator {
      padding: 20px 40px;
      border-radius: 30px;
      font-size: 1.5rem;
      font-weight: bold;
      margin: 20px 0;
      text-align: center;
      transition: all 0.5s ease;
    }

    .safe {
      background: #4caf50;
      color: white;
    }

    .warning {
      background: #ff9800;
      color: white;
    }

    .danger {
      background: #f44336;
      color: white;
      animation: pulse 1s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; }
      50% { opacity: 0.7; }
    }

    .chart-container {
      position: relative;
      height: 300px;
      margin: 25px 0;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 0.95rem;
    }

    .data-table thead {
      position: sticky;
      top: 0;
      background: #667eea;
      color: white;
      z-index: 10;
    }

    .data-table th, .data-table td {
      padding: 14px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }

    .data-table tbody {
      display: block;
      max-height: 400px;
      overflow-y: auto;
    }

    .data-table thead, .data-table tbody tr {
      display: table;
      width: 100%;
      table-layout: fixed;
    }

    .data-table tbody tr:hover {
      background: #f5f5f5;
    }

    .alert-popup {
      position: fixed;
      top: 20px;
      right: 20px;
      background: #f44336;
      color: white;
      padding: 20px 30px;
      border-radius: 10px;
      box-shadow: 0 5px 20px rgba(0,0,0,0.3);
      z-index: 1000;
      animation: slideInRight 0.5s ease;
      max-width: 400px;
    }

    .alert-popup h3 {
      margin-bottom: 10px;
      font-size: 1.3rem;
    }

    .alert-popup button {
      background: white;
      color: #f44336;
      border: none;
      padding: 8px 20px;
      border-radius: 5px;
      cursor: pointer;
      margin-top: 10px;
      font-weight: bold;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    @keyframes slideUp {
      from { 
        opacity: 0;
        transform: translateY(30px);
      }
      to { 
        opacity: 1;
        transform: translateY(0);
      }
    }

    @keyframes slideInRight {
      from { 
        transform: translateX(400px);
        opacity: 0;
      }
      to { 
        transform: translateX(0);
        opacity: 1;
      }
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
      margin: 20px 0;
    }

    .metric-box {
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .metric-box h4 {
      margin-bottom: 10px;
      font-size: 0.9rem;
      opacity: 0.9;
    }

    .metric-box .value {
      font-size: 2rem;
      font-weight: bold;
    }

    .volume-info {
      text-align: center;
      font-size: 1.4rem;
      margin-top: 15px;
      font-weight: bold;
      color: #0288d1;
    }

    .integrity-status {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin: 20px 0;
    }

    .integrity-box {
      padding: 25px;
      border-radius: 10px;
      text-align: center;
      background: #f5f5f5;
      border: 2px solid #ddd;
    }

    .integrity-box h4 {
      margin-bottom: 15px;
      color: #666;
      font-size: 1.1rem;
    }

    .integrity-box .value {
      font-size: 2.5rem;
      font-weight: bold;
      color: #667eea;
    }

    .full-width {
      grid-column: 1 / -1;
    }
  </style>
</head>
<body>
  <div class="sidebar">
    <div class="sidebar-header">
      <div class="logo">💧</div>
      <h2>AquaMonitor</h2>
    </div>
    <ul class="nav-menu">
      <li class="nav-item ${sensorType === 'dashboard' ? 'active' : ''}">
        <a href="/dashboard">
          <span class="nav-icon">📊</span>
          <span>Dashboard</span>
        </a>
      </li>
      <li class="nav-item ${sensorType === 'temperature' ? 'active' : ''}">
        <a href="/sensor/temperature">
          <span class="nav-icon">🌡️</span>
          <span>Water Temperature</span>
        </a>
      </li>
      <li class="nav-item ${sensorType === 'distance' ? 'active' : ''}">
        <a href="/sensor/distance">
          <span class="nav-icon">📏</span>
          <span>Water Level</span>
        </a>
      </li>
      <li class="nav-item ${sensorType === 'turbidity' ? 'active' : ''}">
        <a href="/sensor/turbidity">
          <span class="nav-icon">🌊</span>
          <span>Turbidity</span>
        </a>
      </li>
      <li class="nav-item ${sensorType === 'tds' ? 'active' : ''}">
        <a href="/sensor/tds">
          <span class="nav-icon">💧</span>
          <span>TDS Monitor</span>
        </a>
      </li>
      <li class="nav-item ${sensorType === 'environment' ? 'active' : ''}">
        <a href="/sensor/environment">
          <span class="nav-icon">🌦️</span>
          <span>Environment</span>
        </a>
      </li>
    </ul>
  </div>

  <div class="main-content">
    <div class="header">
      <h1>${pageData.title}</h1>
      <p class="subtitle">${pageData.description}</p>
      <div class="status" id="connection-status">Connecting...</div>
    </div>

    <div id="alert-container"></div>

    <div class="content-grid">
      <!-- Visualization Column -->
      <div>
        ${getSensorVisualization(sensorType)}
      </div>

      <!-- Technical Info Column -->
      <div>
        <div class="sensor-card">
          <h2>📖 Technical Information</h2>
          ${pageData.technical}
        </div>
      </div>
    </div>
  </div>

  <script>
    ${getSensorScript(sensorType)}
  </script>
</body>
</html>
  `;
}

function getSensorVisualization(sensorType) {
  switch(sensorType) {
    case 'temperature':
      return `
        <div class="sensor-card">
          <h2>🌡️ Current Reading</h2>
          <div class="widget temp-widget" id="temp-widget">
            <div class="weather-icon" id="weather-icon">☀️</div>
            <span id="temp-value">--°C</span>
          </div>
          <div class="status-indicator" id="status">Waiting for data...</div>
        </div>
        <div class="sensor-card">
          <h2>📊 Temperature Trend</h2>
          <div class="chart-container">
            <canvas id="main-chart"></canvas>
          </div>
        </div>
        <div class="sensor-card">
          <h2>📈 Historical Data (Last 200 Readings)</h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Temperature (°C)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="data-table"></tbody>
          </table>
        </div>
      `;
    
    case 'distance':
      return `
        <div class="sensor-card">
          <h2>📏 Water Level Visualization</h2>
          <div class="water-tank">
            <div class="water-level" id="water-level">
              <span id="water-percentage">0%</span>
            </div>
          </div>
          <div class="volume-info" id="volume-info">0 / 0 L</div>
          <div class="metrics-grid">
            <div class="metric-box">
              <h4>Distance</h4>
              <div class="value" id="distance-value">-- cm</div>
            </div>
            <div class="metric-box">
              <h4>Fill Level</h4>
              <div class="value" id="level-value">--%</div>
            </div>
            <div class="metric-box">
              <h4>Current Volume</h4>
              <div class="value" id="current-volume">-- L</div>
            </div>
          </div>
          <div class="status-indicator" id="status">Waiting for data...</div>
        </div>
        <div class="sensor-card">
          <h2>📊 Distance Trend</h2>
          <div class="chart-container">
            <canvas id="main-chart"></canvas>
          </div>
        </div>
        <div class="sensor-card">
          <h2>📈 Historical Data (Last 200 Readings)</h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Distance (cm)</th>
                <th>Volume (L)</th>
              </tr>
            </thead>
            <tbody id="data-table"></tbody>
          </table>
        </div>
      `;
    
    case 'turbidity':
      return `
        <div class="sensor-card">
          <h2>🌊 Current Reading</h2>
          <div class="metrics-grid">
            <div class="metric-box">
              <h4>Turbidity Level</h4>
              <div class="value" id="turbidity-value">-- NTU</div>
            </div>
            <div class="metric-box">
              <h4>Water Status</h4>
              <div class="value" id="water-clarity" style="font-size: 3rem;">💧</div>
            </div>
          </div>
          <div class="status-indicator" id="status">Waiting for data...</div>
        </div>
        <div class="sensor-card">
          <h2>📊 Turbidity Trend</h2>
          <div class="chart-container">
            <canvas id="main-chart"></canvas>
          </div>
        </div>
        <div class="sensor-card">
          <h2>📈 Historical Data (Last 200 Readings)</h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Turbidity (NTU)</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody id="data-table"></tbody>
          </table>
        </div>
      `;
    
    case 'tds':
      return `
        <div class="sensor-card">
          <h2>💧 Current Reading</h2>
          <div class="metrics-grid">
            <div class="metric-box">
              <h4>TDS Level</h4>
              <div class="value" id="tds-value">-- ppm</div>
            </div>
            <div class="metric-box">
              <h4>Water Quality</h4>
              <div class="value" id="quality-icon" style="font-size: 3rem;">💧</div>
            </div>
          </div>
          <div class="status-indicator" id="status">Waiting for data...</div>
        </div>
        <div class="sensor-card">
          <h2>📊 TDS Trend</h2>
          <div class="chart-container">
            <canvas id="main-chart"></canvas>
          </div>
        </div>
        <div class="sensor-card">
          <h2>📈 Historical Data (Last 200 Readings)</h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>TDS (ppm)</th>
                <th>Quality</th>
              </tr>
            </thead>
            <tbody id="data-table"></tbody>
          </table>
        </div>
      `;
    
    case 'environment':
      return `
        <div class="sensor-card">
          <h2>🌦️ Environmental Conditions</h2>
          <div class="integrity-status">
            <div class="integrity-box">
              <h4>Outside Temperature</h4>
              <div class="value" id="outside-temp">--°C</div>
              <div class="weather-icon" id="weather-icon" style="font-size: 3rem; margin-top: 10px;">☀️</div>
            </div>
            <div class="integrity-box">
              <h4>Relative Humidity</h4>
              <div class="value" id="humidity">--%</div>
              <div class="weather-icon" id="humidity-icon" style="font-size: 3rem; margin-top: 10px;">💧</div>
            </div>
          </div>
          <div class="status-indicator" id="status">Waiting for data...</div>
        </div>
        <div class="sensor-card">
          <h2>🏠 Tank Integrity Assessment</h2>
          <div class="metrics-grid">
            <div class="metric-box">
              <h4>Inside Temp (Water)</h4>
              <div class="value" id="inside-temp">--°C</div>
            </div>
            <div class="metric-box">
              <h4>Outside Temp (Air)</h4>
              <div class="value" id="outside-temp2">--°C</div>
            </div>
            <div class="metric-box">
              <h4>Temp Difference</h4>
              <div class="value" id="temp-diff">--°C</div>
            </div>
          </div>
          <div class="status-indicator" id="integrity-status">Checking...</div>
        </div>
        <div class="sensor-card">
          <h2>📊 Environmental Trends</h2>
          <div class="chart-container">
            <canvas id="main-chart"></canvas>
          </div>
        </div>
        <div class="sensor-card">
          <h2>📈 Historical Data (Last 200 Readings)</h2>
          <table class="data-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Temperature (°C)</th>
                <th>Humidity (%)</th>
              </tr>
            </thead>
            <tbody id="data-table"></tbody>
          </table>
        </div>
      `;
    
    default:
      return '<p>Sensor type not found</p>';
  }
}

function getSensorScript(sensorType) {
  const baseScript = `
    const socket = io();
    let chart;
    let config = {};
    let alertsShown = new Set();

    function initChart() {
      const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: ${sensorType === 'environment' ? 'true' : 'false'} } },
        scales: { x: { display: false }, y: { beginAtZero: ${sensorType === 'environment' ? 'true' : 'false'} } }
      };

      chart = new Chart(document.getElementById('main-chart'), {
        type: 'line',
        data: getChartData(),
        options: chartOptions
      });
    }

    function getChartData() {
      ${getChartDataByType(sensorType)}
    }

    function showAlert(message, type) {
      const alertKey = \`\${type}-\${message}\`;
      if (alertsShown.has(alertKey)) return;
      
      alertsShown.add(alertKey);
      setTimeout(() => alertsShown.delete(alertKey), 60000);

      const alertDiv = document.createElement('div');
      alertDiv.className = 'alert-popup';
      alertDiv.innerHTML = \`
        <h3>⚠️ Alert</h3>
        <p>\${message}</p>
        <button onclick="this.parentElement.remove()">Dismiss</button>
      \`;
      document.getElementById('alert-container').appendChild(alertDiv);
      
      setTimeout(() => alertDiv.remove(), 10000);
    }

    socket.on("dataUpdate", (data) => {
      const { latest, historical, config: cfg } = data;
      config = cfg;

      document.getElementById('connection-status').textContent = \`Last updated: \${new Date(latest.timestamp).toLocaleTimeString()}\`;

      ${getUpdateLogicByType(sensorType)}
    });

    initChart();
  `;

  return baseScript;
}

function getChartDataByType(sensorType) {
  switch(sensorType) {
    case 'temperature':
      return `
        return {
          labels: [],
          datasets: [{
            label: 'Water Temperature (°C)',
            data: [],
            borderColor: '#ff6384',
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(255, 99, 132, 0.1)'
          }]
        };
      `;
    
    case 'distance':
      return `
        return {
          labels: [],
          datasets: [{
            label: 'Distance (cm)',
            data: [],
            borderColor: '#36a2eb',
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(54, 162, 235, 0.1)'
          }]
        };
      `;
    
    case 'turbidity':
      return `
        return {
          labels: [],
          datasets: [{
            label: 'Turbidity (NTU)',
            data: [],
            borderColor: '#ffce56',
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(255, 206, 86, 0.1)'
          }]
        };
      `;
    
    case 'tds':
      return `
        return {
          labels: [],
          datasets: [{
            label: 'TDS (ppm)',
            data: [],
            borderColor: '#4bc0c0',
            tension: 0.4,
            fill: true,
            backgroundColor: 'rgba(75, 192, 192, 0.1)'
          }]
        };
      `;
    
    case 'environment':
      return `
        return {
          labels: [],
          datasets: [
            {
              label: 'Temperature (°C)',
              data: [],
              borderColor: '#ff6384',
              tension: 0.4
            },
            {
              label: 'Humidity (%)',
              data: [],
              borderColor: '#36a2eb',
              tension: 0.4
            }
          ]
        };
      `;
    
    default:
      return 'return { labels: [], datasets: [] };';
  }
}

function getUpdateLogicByType(sensorType) {
  switch(sensorType) {
    case 'temperature':
      return `
        if (latest.temperature_ds18b20 !== undefined) {
          const temp = parseFloat(latest.temperature_ds18b20);
          document.getElementById('temp-value').textContent = \`\${temp.toFixed(1)}°C\`;
          
          // Update widget background
          const widget = document.getElementById('temp-widget');
          widget.style.background = getTempColor(temp);
          
          // Update weather icon
          const icon = document.getElementById('weather-icon');
          if (temp < 15) icon.textContent = '❄️';
          else if (temp < 25) icon.textContent = '☀️';
          else icon.textContent = '🔥';
          
          // Update status
          const statusEl = document.getElementById('status');
          if (temp < config.tempMin) {
            statusEl.textContent = '⚠️ Water is Too Cold';
            statusEl.className = 'status-indicator warning';
            showAlert(\`Water temperature (\${temp.toFixed(1)}°C) is below minimum threshold!\`, 'temp');
          } else if (temp > config.tempMax) {
            statusEl.textContent = '⚠️ Water is Too Hot';
            statusEl.className = 'status-indicator danger';
            showAlert(\`Water temperature (\${temp.toFixed(1)}°C) exceeds maximum threshold!\`, 'temp');
          } else {
            statusEl.textContent = '✓ Temperature is Normal';
            statusEl.className = 'status-indicator safe';
          }
        }

        // Update chart and table
        if (historical.temperature_ds18b20 && historical.temperature_ds18b20.length > 0) {
          const chartData = historical.temperature_ds18b20.slice(-50);
          chart.data.labels = chartData.map(item => new Date(item.timestamp).toLocaleTimeString());
          chart.data.datasets[0].data = chartData.map(item => parseFloat(item.value));
          chart.update('none');

          const tbody = document.getElementById('data-table');
          tbody.innerHTML = historical.temperature_ds18b20.slice(-200).reverse().map(item => {
            const temp = parseFloat(item.value);
            const status = temp < config.tempMin ? 'Too Cold' : (temp > config.tempMax ? 'Too Hot' : 'Normal');
            return \`<tr>
              <td>\${new Date(item.timestamp).toLocaleString()}</td>
              <td>\${temp.toFixed(2)}</td>
              <td>\${status}</td>
            </tr>\`;
          }).join('');
        }

        function getTempColor(temp) {
          if (temp < 10) return 'linear-gradient(135deg, #0000ff, #4169e1)';
          if (temp < 15) return 'linear-gradient(135deg, #00bfff, #87ceeb)';
          if (temp < 20) return 'linear-gradient(135deg, #00ff00, #7fff00)';
          if (temp < 25) return 'linear-gradient(135deg, #ffff00, #ffd700)';
          if (temp < 30) return 'linear-gradient(135deg, #ffa500, #ff8c00)';
          return 'linear-gradient(135deg, #ff0000, #dc143c)';
        }
      `;
    
    case 'distance':
      return `
        if (latest.distance_ultrasonic !== undefined) {
          const distance = parseFloat(latest.distance_ultrasonic);
          const volume = calculateVolume(distance, config);
          const percentage = Math.round((volume / config.tankTotalVolume) * 100);
          
          document.getElementById('distance-value').textContent = \`\${distance.toFixed(1)} cm\`;
          document.getElementById('level-value').textContent = \`\${percentage}%\`;
          document.getElementById('current-volume').textContent = \`\${volume} L\`;
          document.getElementById('water-level').style.height = \`\${percentage}%\`;
          document.getElementById('water-percentage').textContent = \`\${percentage}%\`;
          document.getElementById('volume-info').textContent = \`\${volume} / \${config.tankTotalVolume} L\`;

          const statusEl = document.getElementById('status');
          if (percentage < 20) {
            statusEl.textContent = '⚠️ Water Level is Low';
            statusEl.className = 'status-indicator danger';
            showAlert(\`Water level is critically low (\${percentage}%)!\`, 'level');
          } else if (percentage < 50) {
            statusEl.textContent = '⚠️ Water Level is Moderate';
            statusEl.className = 'status-indicator warning';
          } else {
            statusEl.textContent = '✓ Water Level is Good';
            statusEl.className = 'status-indicator safe';
          }
        }

        if (historical.distance_ultrasonic && historical.distance_ultrasonic.length > 0) {
          const chartData = historical.distance_ultrasonic.slice(-50);
          chart.data.labels = chartData.map(item => new Date(item.timestamp).toLocaleTimeString());
          chart.data.datasets[0].data = chartData.map(item => parseFloat(item.value));
          chart.update('none');

          const tbody = document.getElementById('data-table');
          tbody.innerHTML = historical.distance_ultrasonic.slice(-200).reverse().map(item => {
            const dist = parseFloat(item.value);
            const vol = calculateVolume(dist, config);
            return \`<tr>
              <td>\${new Date(item.timestamp).toLocaleString()}</td>
              <td>\${dist.toFixed(2)}</td>
              <td>\${vol}</td>
            </tr>\`;
          }).join('');
        }

        function calculateVolume(distance, config) {
          const { distanceFull, distanceEmpty, tankTotalVolume } = config;
          if (distance <= distanceFull) return tankTotalVolume;
          if (distance >= distanceEmpty) return 0;
          const percentage = 1 - ((distance - distanceFull) / (distanceEmpty - distanceFull));
          return Math.round(percentage * tankTotalVolume);
        }
      `;
    
    case 'turbidity':
      return `
        if (latest.turbidity !== undefined) {
          const turbidity = parseFloat(latest.turbidity);
          document.getElementById('turbidity-value').textContent = \`\${turbidity.toFixed(1)} NTU\`;
          
          const statusEl = document.getElementById('status');
          const clarityIcon = document.getElementById('water-clarity');
          
          if (turbidity > config.turbidityThreshold) {
            statusEl.textContent = '⚠️ Water is Turbid - Not Safe';
            statusEl.className = 'status-indicator danger';
            clarityIcon.textContent = '🌫️';
            showAlert(\`High turbidity detected (\${turbidity.toFixed(1)} NTU)!\`, 'turbidity');
          } else if (turbidity > config.turbidityThreshold * 0.7) {
            statusEl.textContent = '⚠️ Water Clarity is Moderate';
            statusEl.className = 'status-indicator warning';
            clarityIcon.textContent = '💧';
          } else {
            statusEl.textContent = '✓ Water is Clear';
            statusEl.className = 'status-indicator safe';
            clarityIcon.textContent = '💎';
          }
        }

        if (historical.turbidity && historical.turbidity.length > 0) {
          const chartData = historical.turbidity.slice(-50);
          chart.data.labels = chartData.map(item => new Date(item.timestamp).toLocaleTimeString());
          chart.data.datasets[0].data = chartData.map(item => parseFloat(item.value));
          chart.update('none');

          const tbody = document.getElementById('data-table');
          tbody.innerHTML = historical.turbidity.slice(-200).reverse().map(item => {
            const turb = parseFloat(item.value);
            const status = turb > config.turbidityThreshold ? 'Turbid' : 'Clear';
            return \`<tr>
              <td>\${new Date(item.timestamp).toLocaleString()}</td>
              <td>\${turb.toFixed(2)}</td>
              <td>\${status}</td>
            </tr>\`;
          }).join('');
        }
      `;
    
    case 'tds':
      return `
        if (latest.tds !== undefined) {
          const tds = parseFloat(latest.tds);
          document.getElementById('tds-value').textContent = \`\${tds.toFixed(0)} ppm\`;
          
          const statusEl = document.getElementById('status');
          const qualityIcon = document.getElementById('quality-icon');
          
          if (tds < config.tdsMin) {
            statusEl.textContent = '⚠️ Low Mineral Content';
            statusEl.className = 'status-indicator warning';
            qualityIcon.textContent = '⬇️';
            showAlert(\`TDS level (\${tds.toFixed(0)} ppm) is too low!\`, 'tds');
          } else if (tds > config.tdsMax) {
            statusEl.textContent = '⚠️ High TDS - Water Not Safe';
            statusEl.className = 'status-indicator danger';
            qualityIcon.textContent = '⚠️';
            showAlert(\`TDS level (\${tds.toFixed(0)} ppm) exceeds safe limit!\`, 'tds');
          } else if (tds <= 150) {
            statusEl.textContent = '✓ Excellent Water Quality';
            statusEl.className = 'status-indicator safe';
            qualityIcon.textContent = '⭐';
          } else {
            statusEl.textContent = '✓ Good Water Quality';
            statusEl.className = 'status-indicator safe';
            qualityIcon.textContent = '✓';
          }
        }

        if (historical.tds && historical.tds.length > 0) {
          const chartData = historical.tds.slice(-50);
          chart.data.labels = chartData.map(item => new Date(item.timestamp).toLocaleTimeString());
          chart.data.datasets[0].data = chartData.map(item => parseFloat(item.value));
          chart.update('none');

          const tbody = document.getElementById('data-table');
          tbody.innerHTML = historical.tds.slice(-200).reverse().map(item => {
            const tdsVal = parseFloat(item.value);
            let quality;
            if (tdsVal < 50) quality = 'Low Mineral';
            else if (tdsVal <= 150) quality = 'Excellent';
            else if (tdsVal <= 300) quality = 'Good';
            else if (tdsVal <= 500) quality = 'Fair';
            else quality = 'Poor';
            
            return \`<tr>
              <td>\${new Date(item.timestamp).toLocaleString()}</td>
              <td>\${tdsVal.toFixed(2)}</td>
              <td>\${quality}</td>
            </tr>\`;
          }).join('');
        }
      `;
    
    case 'environment':
      return `
        if (latest.temperature_dht11 !== undefined && latest.humidity_dht11 !== undefined) {
          const outsideTemp = parseFloat(latest.temperature_dht11);
          const humidity = parseFloat(latest.humidity_dht11);
          const insideTemp = parseFloat(latest.temperature_ds18b20 || 0);

          document.getElementById('outside-temp').textContent = \`\${outsideTemp.toFixed(1)}°C\`;
          document.getElementById('outside-temp2').textContent = \`\${outsideTemp.toFixed(1)}°C\`;
          document.getElementById('humidity').textContent = \`\${humidity.toFixed(1)}%\`;
          document.getElementById('inside-temp').textContent = \`\${insideTemp.toFixed(1)}°C\`;
          
          const tempDiff = Math.abs(outsideTemp - insideTemp);
          document.getElementById('temp-diff').textContent = \`\${tempDiff.toFixed(1)}°C\`;

          // Weather icon
          const weatherIcon = document.getElementById('weather-icon');
          if (outsideTemp > 35) weatherIcon.textContent = '🔥';
          else if (outsideTemp > 25) weatherIcon.textContent = '☀️';
          else if (outsideTemp > 15) weatherIcon.textContent = '⛅';
          else weatherIcon.textContent = '❄️';

          // Humidity icon
          const humidityIcon = document.getElementById('humidity-icon');
          if (humidity > 80) humidityIcon.textContent = '💧💧💧';
          else if (humidity > 60) humidityIcon.textContent = '💧💧';
          else if (humidity > 40) humidityIcon.textContent = '💧';
          else humidityIcon.textContent = '☀️';

          // Environmental status
          const statusEl = document.getElementById('status');
          if (outsideTemp > config.outsideTempMax) {
            statusEl.textContent = '⚠️ High External Temperature';
            statusEl.className = 'status-indicator danger';
            showAlert(\`External temperature (\${outsideTemp.toFixed(1)}°C) is very high!\`, 'env');
          } else if (humidity > 80) {
            statusEl.textContent = '⚠️ High Humidity';
            statusEl.className = 'status-indicator warning';
          } else {
            statusEl.textContent = '✓ Normal Environmental Conditions';
            statusEl.className = 'status-indicator safe';
          }

          // Tank integrity
          const integrityEl = document.getElementById('integrity-status');
          if (outsideTemp > config.outsideTempMax && insideTemp < config.tempMax) {
            integrityEl.textContent = '✓ Tank Integrity: Excellent';
            integrityEl.className = 'status-indicator safe';
          } else if (outsideTemp > config.outsideTempMax && insideTemp > config.tempMax) {
            integrityEl.textContent = '⚠️ Tank Integrity: Compromised';
            integrityEl.className = 'status-indicator danger';
            showAlert('Tank body integrity may be compromised - both external and internal temperatures are high!', 'integrity');
          } else {
            integrityEl.textContent = 'Tank Integrity: Normal';
            integrityEl.className = 'status-indicator safe';
          }
        }

        if (historical.temperature_dht11 && historical.humidity_dht11 && 
            historical.temperature_dht11.length > 0 && historical.humidity_dht11.length > 0) {
          const chartData = historical.temperature_dht11.slice(-50);
          chart.data.labels = chartData.map(item => new Date(item.timestamp).toLocaleTimeString());
          chart.data.datasets[0].data = chartData.map(item => parseFloat(item.value));
          chart.data.datasets[1].data = historical.humidity_dht11.slice(-50).map(item => parseFloat(item.value));
          chart.update('none');

          const tbody = document.getElementById('data-table');
          const combined = historical.temperature_dht11.slice(-200).map((item, i) => ({
            timestamp: item.timestamp,
            temp: item.value,
            humidity: historical.humidity_dht11[i]?.value || 0
          }));

          tbody.innerHTML = combined.reverse().map(item => \`<tr>
            <td>\${new Date(item.timestamp).toLocaleString()}</td>
            <td>\${parseFloat(item.temp).toFixed(1)}</td>
            <td>\${parseFloat(item.humidity).toFixed(1)}</td>
          </tr>\`).join('');
        }
      `;
    
    default:
      return '';
  }
}

server.listen(3000, () => console.log("🌐 Server running on http://localhost:3000"));
