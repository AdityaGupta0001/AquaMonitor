#include <ESP8266WiFi.h>
#include <PubSubClient.h>

// --- Wi-Fi credentials ---
const char* ssid = "<SSID>";
const char* password = "<Password>";

// --- HiveMQ Cloud MQTT broker details ---
const char* mqtt_server = "<MQTT Server IP>";  // Replace with your Windows PC IP (from ipconfig)
const int mqtt_port = "<MQTT Port>";  // Use 1883 for unencrypted
const char* mqtt_user = "<MQTT Username>";  // REPLACE with YOUR HiveMQ username
const char* mqtt_password = "<MQTT Password>";  // REPLACE with YOUR HiveMQ password
const char* mqtt_topic = "<MQTT Topic>";

// --- MQTT setup with TLS ---
WiFiClientSecure espClient;
PubSubClient client(espClient);

unsigned long lastReconnectAttempt = 0;

void setup_wifi() {
  delay(10);
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(ssid);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }

  Serial.println("");
  Serial.println("✓ WiFi connected!");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
}

boolean reconnect() {
  Serial.print("Attempting MQTT connection (TLS)...");
  
  String clientId = "NodeMCU-";
  clientId += String(ESP.getChipId(), HEX);
  
  if (client.connect(clientId.c_str(), mqtt_user, mqtt_password)) {
    Serial.println(" ✓ CONNECTED!");
    return true;
  } else {
    Serial.print(" ✗ FAILED, rc=");
    Serial.println(client.state());
    return false;
  }
}

void setup() {
  Serial.begin(9600);
  delay(1000);
  
  Serial.println("NodeMCU Bridge with HiveMQ Cloud (TLS)");
  
  setup_wifi();
  
  // Use insecure mode (doesn't verify certificate)
  // This is simpler but less secure
  espClient.setInsecure();
  
  client.setServer(mqtt_server, mqtt_port);
  client.setKeepAlive(60);
  
  delay(1000);
}

void loop() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi lost! Reconnecting...");
    setup_wifi();
    delay(5000);
    return;
  }

  if (!client.connected()) {
    unsigned long now = millis();
    if (now - lastReconnectAttempt > 5000) {
      lastReconnectAttempt = now;
      if (reconnect()) {
        lastReconnectAttempt = 0;
      }
    }
  } else {
    client.loop();
  }

  if (Serial.available()) {
    String data = Serial.readStringUntil('\n');
    data.trim();

    if (data.length() > 0 && client.connected()) {
      Serial.print("Publishing: ");
      Serial.println(data);

      if (client.publish(mqtt_topic, data.c_str())) {
        Serial.println("✓ Published!");
      } else {
        Serial.println("✗ Publish failed!");
      }
    }
  }
}
