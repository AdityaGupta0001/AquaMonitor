# AquaMonitor — Smart Water Tank Monitoring

[![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.o
[![Express](https://img.shields.io/badge/Express-4.18-000000?style=flat-square&logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-010101?style=flat-square&logo=socket.io&logoColor=white)](https://socket.io/)
[![MQTT](https://img.shields.io/badge/MQTT-HiveMQ-blue?style=flat-square&logo=mqtt)](https://www.hivemq.com/)
[![Chart.js](https://img.shields.io/badge/Chart.js-3.x-2b3e50?style=flat-square&logo=chart.js)](https://www.chartjs.org/)
[![Render](https://img.shields.io/badge/Deploy-Render-2bb6ed?style=flat-square&logo=render)](https://render.com/)
[![Arduino](https://img.shields.io/badge/Arduino-IDE-00979D?style=flat-square&logo=arduino)](https://www.arduino.cc/)
[![ESP8266](https://img.shields.io/badge/ESP8266-NodeMCU-orange?style=flat-square)](https://nodemcu.readthedocs.io/)

AquaMonitor is a backend service for a water-tank monitoring system. It ingests sensor data (temperature, level, turbidity, TDS, ambient conditions) from IoT devices via MQTT, serves a web dashboard, and provides real-time updates over WebSocket (Socket.IO).

## Key capabilities

- Real-time data streaming to a web dashboard (Socket.IO)
- MQTT ingestion (HiveMQ Cloud compatible)
- Last N historical readings stored per sensor
- Alerts for out-of-range values and tank integrity checks
- Individual sensor pages with trends and tables

## Monitored parameters

| Sensor | Parameter | Purpose |
|--------|-----------|---------|
| DS18B20 | Water temperature | Detect unsafe water temperatures |
| HC-SR04 | Water level | Prevent overflow / low-level conditions |
| Turbidity sensor | Water clarity | Detect contamination/sediment |
| TDS sensor | Dissolved solids | Assess water purity |
| DHT11 | Ambient temp & humidity | External environment monitoring |

## Technology stack

- Node.js + Express
- Socket.IO for real-time client updates
- MQTT (HiveMQ Cloud) for device telemetry
- Chart.js on the frontend for visualizations
- Arduino (UNO) and NodeMCU (ESP8266) for sensor collection and MQTT bridge
- Deployment target: Render

## Getting started

Prerequisites
- Node.js 18 or later
- Arduino IDE (for firmware)
- HiveMQ Cloud account (or other MQTT broker)
- Git

Clone and install
```bash
git clone https://github.com/AdityaGupta0001/aquamonitor.git
cd aquamonitor/backend
npm install
```

Configure environment variables
Create a `.env` file in the `backend` directory:
```env
MQTT_HOST=your-hivemq-cluster.s1.eu.hivemq.cloud
MQTT_PORT=1883
MQTT_PROTOCOL=mqtt
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password
PORT=3000
```

Upload Arduino code
1. Open `arduino/sensor_reader.ino` in Arduino IDE
2. Update sensor pin configurations if needed
3. Upload to Arduino UNO

Upload NodeMCU code
1. Open `nodemcu/mqtt_bridge.ino` in Arduino IDE
2. Update WiFi credentials:
   ```cpp
   const char* ssid = "Your_WiFi_Name";
   const char* password = "Your_WiFi_Password";
   ```
3. Update HiveMQ credentials:
   ```cpp
   const char* mqtt_server = "your-cluster.hivemq.cloud";
   const char* mqtt_user = "your-username";
   const char* mqtt_password = "your-password";
   ```
4. Upload to NodeMCU ESP8266

Run locally
```bash
npm start
```

Visit [http://localhost:3000](http://localhost:3000) to view the dashboard.

Deploy to Render
1. Push code to GitHub
2. Create a new Web Service on Render
3. Connect your repository
4. Add environment variables
5. Deploy!

## Usage

Accessing the dashboard
- Landing Page: `https://aquamonitor.onrender.com/`
- Main Dashboard: `https://aquamonitor.onrender.com/dashboard`
- Individual Sensors:
  `/sensor/temperature`, `/sensor/distance`, `/sensor/turbidity`, `/sensor/tds`, `/sensor/environment`

Configuration
Adjust thresholds in `server.js`:
```javascript
const config = {
  tankTotalVolume: 1000,    // Tank capacity in liters
  distanceFull: 1,          // Distance when tank is full (cm)
  distanceEmpty: 100,       // Distance when tank is empty (cm)
  turbidityThreshold: 1000, // Max turbidity (NTU)
  tdsMin: 50,               // Min TDS (ppm)
  tdsMax: 300,              // Max TDS (ppm)
  tempMin: 15,              // Min water temp (°C)
  tempMax: 30,              // Max water temp (°C)
  outsideTempMax: 45        // Max outside temp (°C)
};
```

## Features Overview

Main Dashboard
- Overview of all 5 sensors
- Real-time animated visualizations
- Status indicators for each parameter
- Alert notifications

Individual Sensor Pages
Each sensor has a dedicated page with:
- Current readings with visual widgets
- Trend graphs (last 50 readings)
- Historical data table (last 200 readings)
- Technical specifications
- Working principles
- Pin connection diagrams

Smart Alerts
Automatic pop-up notifications when:
- Water level drops below 20%
- Temperature exceeds safe range
- Turbidity indicates contamination
- TDS levels are unsafe
- Tank integrity is compromised

## Troubleshooting

NodeMCU Not Connecting to HiveMQ
- Verify WiFi credentials
- Check HiveMQ username/password
- Ensure port 1883 is accessible
- Check Serial Monitor for error codes

Dashboard Not Receiving Data
- Check Render logs for MQTT connection status
- Verify HiveMQ credentials in environment variables
- Test MQTT connection using HiveMQ Web Client
- Ensure NodeMCU is publishing to `sensor/data` topic

Sensor Readings Incorrect
- Calibrate sensors individually
- Check wiring connections
- Verify Arduino serial output
- Adjust sensor-specific configurations

## API Endpoints

| Endpoint        | Method | Description               |
| --------------- | ------ | ------------------------- |
| `/`             | GET    | Landing page              |
| `/dashboard`    | GET    | Main dashboard            |
| `/sensor/:type` | GET    | Individual sensor page    |
| `/api/latest`   | GET    | Latest sensor data (JSON) |
| `/health`       | GET    | Health check status       |

## Contributing

Contributions are welcome! Please follow these steps:
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Author

**Your Name**

* GitHub: [@AdityaGupta0001](https://github.com/yourusername)
* Project Link: [https://github.com/AdityaGupta0001/AquaMonitor](https://github.com/yourusername/aquamonitor)

## Acknowledgments

* HiveMQ Cloud for free MQTT broker
* Render for hosting platform
* Chart.js for beautiful visualizations
* ESP8266 community for excellent documentation

**Built with ❤️ for smart water management**