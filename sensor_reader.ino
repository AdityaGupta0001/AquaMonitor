#include <OneWire.h>
#include <DallasTemperature.h>
#include "DHT.h"

// ------------------- DS18B20 Sensor -------------------
#define ONE_WIRE_BUS 2
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// ------------------- HC-SR04 Sensor -------------------
const int trigPin = 9;
const int echoPin = 10;

// ------------------- Turbidity Sensor -------------------
const int turbidityPin = A0;

// ------------------- TDS Sensor -------------------
#define TdsSensorPin A1
#define VREF 5.0
#define SCOUNT 30
int analogBuffer[SCOUNT];
int analogBufferTemp[SCOUNT];
int analogBufferIndex = 0;
float averageVoltage = 0, tdsValue = 0, temperatureForTDS = 25; // assumed temp

// ------------------- DHT Sensor -------------------
#define DHTPIN 4
#define DHTTYPE DHT11
DHT dht(DHTPIN, DHTTYPE);

// ------------------- Setup -------------------
void setup() {
  Serial.begin(9600);
  Serial.println("Multi-Sensor System Initialized");
  Serial.println("---------------------------------");

  sensors.begin();           // DS18B20
  dht.begin();               // DHT11
  pinMode(trigPin, OUTPUT);  // HC-SR04
  pinMode(echoPin, INPUT);
  pinMode(turbidityPin, INPUT);
  pinMode(TdsSensorPin, INPUT);
}

void loop() {
  // ------------------- DS18B20 -------------------
  sensors.requestTemperatures();
  float tempC = sensors.getTempCByIndex(0);

  // ------------------- HC-SR04 -------------------
  long duration;
  float distanceCm;
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  duration = pulseIn(echoPin, HIGH);
  distanceCm = duration * 0.034 / 2;

  // ------------------- Turbidity Sensor -------------------
  int sensorValue = analogRead(turbidityPin);
  float voltage = sensorValue * (5.0 / 1023.0);
  float ntu = -1120.4 * voltage * voltage + 5742.3 * voltage - 4352.9;

  // ------------------- TDS Sensor -------------------
  static unsigned long analogSampleTimepoint = millis();
  if (millis() - analogSampleTimepoint > 40U) {
    analogSampleTimepoint = millis();
    analogBuffer[analogBufferIndex] = analogRead(TdsSensorPin);
    analogBufferIndex++;
    if (analogBufferIndex == SCOUNT) analogBufferIndex = 0;
  }

  for (int i = 0; i < SCOUNT; i++) analogBufferTemp[i] = analogBuffer[i];
  averageVoltage = getMedianNum(analogBufferTemp, SCOUNT) * (float)VREF / 1024.0;
  float compensationCoefficient = 1.0 + 0.02 * (temperatureForTDS - 25.0);
  float compensationVoltage = averageVoltage / compensationCoefficient;
  float ecValue = (133.42 * pow(compensationVoltage, 3)
                 - 255.86 * pow(compensationVoltage, 2)
                 + 857.39 * compensationVoltage);
  tdsValue = ecValue * 0.5;

  // ------------------- DHT Sensor -------------------
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();
  float temperatureF = dht.readTemperature(true);

  // // ------------------- Print human-readable data -------------------
  // Serial.println("---------- SENSOR READINGS ----------");
  // Serial.print("DS18B20 Temperature: "); Serial.print(tempC); Serial.println(" °C");
  // Serial.print("HC-SR04 Distance: "); Serial.print(distanceCm); Serial.println(" cm");
  // Serial.print("Turbidity: "); Serial.print(ntu); Serial.println(" NTU");
  // Serial.print("TDS Value: "); Serial.print(tdsValue); Serial.println(" ppm");
  // Serial.print("DHT11 Humidity: "); Serial.print(humidity);
  // Serial.print("% | Temp: "); Serial.print(temperature); Serial.println(" °C");
  // Serial.println("-------------------------------------");

  // ------------------- Send JSON to NodeMCU -------------------
  Serial.print("{");
  Serial.print("\"temperature_ds18b20\":"); Serial.print(tempC); Serial.print(",");
  Serial.print("\"distance_ultrasonic\":"); Serial.print(distanceCm); Serial.print(",");
  Serial.print("\"turbidity\":"); Serial.print(ntu); Serial.print(",");
  Serial.print("\"tds\":"); Serial.print(tdsValue); Serial.print(",");
  Serial.print("\"humidity_dht11\":"); Serial.print(humidity); Serial.print(",");
  Serial.print("\"temperature_dht11\":"); Serial.print(temperature);
  Serial.println("}");

  delay(2000); // delay before next cycle
}

// ------------------- Helper Function for Median Filter -------------------
int getMedianNum(int bArray[], int iFilterLen) {
  int bTemp[iFilterLen];
  for (byte i = 0; i < iFilterLen; i++) bTemp[i] = bArray[i];
  for (int j = 0; j < iFilterLen - 1; j++) {
    for (int i = 0; i < iFilterLen - j - 1; i++) {
      if (bTemp[i] > bTemp[i + 1]) {
        int bTempVal = bTemp[i];
        bTemp[i] = bTemp[i + 1];
        bTemp[i + 1] = bTempVal;
      }
    }
  }
  if ((iFilterLen & 1) > 0)
    return bTemp[(iFilterLen - 1) / 2];
  else
    return (bTemp[iFilterLen / 2] + bTemp[iFilterLen / 2 - 1]) / 2;
}
