# 💧 AquaMonitor - Smart Water Tank Monitoring System

A real-time IoT-based water tank monitoring system that tracks water quality, temperature, level, and environmental conditions using multiple sensors and provides live visualization through a modern web dashboard.

---

## 🌟 Features

- **Live Monitoring**: Real-time sensor data updates via WebSocket (Socket.IO)
- **5 Sensor Integration**: Temperature, water level, turbidity, TDS, and environmental monitoring
- **Smart Alerts**: Automatic notifications when readings exceed safe thresholds
- **Historical Data**: Tracks and displays last 200 readings per sensor
- **Modern UI**: Beautiful, responsive dashboard with animated visualizations
- **Tank Integrity Assessment**: Compares internal and external temperatures
- **Cloud-Based**: Deployed on Render with HiveMQ Cloud MQTT broker
- **Detailed Analytics**: Individual sensor pages with technical information and trends

---

## 📊 Monitored Parameters

| Sensor | Parameter | Purpose |
|--------|------------|----------|
| **DS18B20** | Water Temperature | Monitor if water is too hot/cold for storage |
| **HC-SR04** | Water Level | Track volume and prevent overflow/shortage |
| **Turbidity Sensor** | Water Clarity | Detect contamination and sediment |
| **TDS Sensor** | Water Purity | Measure dissolved solids for safety |
| **DHT11** | Ambient Conditions | Monitor external temperature & humidity |

---

## 🛠️ Technology Stack

### **Hardware**
- **NodeMCU ESP8266** – WiFi-enabled microcontroller  
- **Arduino UNO** – Sensor data collection  
- **DS18B20** – Digital temperature sensor (1-Wire)  
- **HC-SR04** – Ultrasonic distance sensor  
- **Turbidity Sensor** – Water clarity measurement  
- **TDS Sensor** – Total dissolved solids meter  
- **DHT11** – Temperature & humidity sensor  

### **Software**
- **Backend**: Node.js, Express.js  
- **Real-Time Communication**: Socket.IO  
- **MQTT Broker**: HiveMQ Cloud  
- **Frontend**: Vanilla JavaScript, Chart.js  
- **Deployment**: Render (Backend), HiveMQ Cloud (MQTT)  

---

## 📦 Installation

### **Prerequisites**
- Node.js 18+ installed  
- Arduino IDE with ESP8266 board support  
- HiveMQ Cloud account  
- Git  

### **1. Clone the Repository**
```bash
git clone https://github.com/AdityaGupta0001/aquamonitor.git
cd aquamonitor
````

### **2. Install Dependencies**

```bash
npm install
```

### **3. Configure Environment Variables**

Create a `.env` file in the root directory:

```env
MQTT_HOST=your-hivemq-cluster.s1.eu.hivemq.cloud
MQTT_PORT=1883
MQTT_PROTOCOL=mqtt
MQTT_USERNAME=your-username
MQTT_PASSWORD=your-password
PORT=3000
```

### **4. Upload Arduino Code**

1. Open `arduino/sensor_reader.ino` in Arduino IDE
2. Update sensor pin configurations if needed
3. Upload to Arduino UNO

### **5. Upload NodeMCU Code**

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

### **6. Run Locally**

```bash
npm start
```

Visit [http://localhost:3000](http://localhost:3000) to view the dashboard.

### **7. Deploy to Render**

1. Push code to GitHub
2. Create a new Web Service on Render
3. Connect your repository
4. Add environment variables
5. Deploy!

---

## 🎯 Usage

### **Accessing the Dashboard**

* **Landing Page**: `https://aquamonitor.onrender.com/`
* **Main Dashboard**: `https://aquamonitor.onrender.com/dashboard`
* **Individual Sensors**:
  `/sensor/temperature`, `/sensor/distance`, `/sensor/turbidity`, `/sensor/tds`, `/sensor/environment`

### **Configuration**

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

---

## 📱 Features Overview

### **Main Dashboard**

* Overview of all 5 sensors
* Real-time animated visualizations
* Status indicators for each parameter
* Alert notifications

### **Individual Sensor Pages**

Each sensor has a dedicated page with:

* Current readings with visual widgets
* Trend graphs (last 50 readings)
* Historical data table (last 200 readings)
* Technical specifications
* Working principles
* Pin connection diagrams

### **Smart Alerts**

Automatic pop-up notifications when:

* Water level drops below 20%
* Temperature exceeds safe range
* Turbidity indicates contamination
* TDS levels are unsafe
* Tank integrity is compromised

---

## 🔧 Troubleshooting

### **NodeMCU Not Connecting to HiveMQ**

* Verify WiFi credentials
* Check HiveMQ username/password
* Ensure port 1883 is accessible
* Check Serial Monitor for error codes

### **Dashboard Not Receiving Data**

* Check Render logs for MQTT connection status
* Verify HiveMQ credentials in environment variables
* Test MQTT connection using HiveMQ Web Client
* Ensure NodeMCU is publishing to `sensor/data` topic

### **Sensor Readings Incorrect**

* Calibrate sensors individually
* Check wiring connections
* Verify Arduino serial output
* Adjust sensor-specific configurations

---

## 📄 API Endpoints

| Endpoint        | Method | Description               |
| --------------- | ------ | ------------------------- |
| `/`             | GET    | Landing page              |
| `/dashboard`    | GET    | Main dashboard            |
| `/sensor/:type` | GET    | Individual sensor page    |
| `/api/latest`   | GET    | Latest sensor data (JSON) |
| `/health`       | GET    | Health check status       |

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 👨‍💻 Author

**Your Name**

* GitHub: [@AdityaGupta0001](https://github.com/yourusername)
* Project Link: [https://github.com/AdityaGupta0001/AquaMonitor](https://github.com/yourusername/aquamonitor)

---

## 🙏 Acknowledgments

* HiveMQ Cloud for free MQTT broker
* Render for hosting platform
* Chart.js for beautiful visualizations
* ESP8266 community for excellent documentation

---

**Built with ❤️ for smart water management**