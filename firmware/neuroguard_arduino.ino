#include <Wire.h>
#include <OneWire.h>
#include <DallasTemperature.h>

#define MPU 0x68

// -------- Pins --------
int emgPin = A0;
int heartPin = A1;

#define ONE_WIRE_BUS 2   // DS18B20 data pin

// -------- Temperature Setup --------
OneWire oneWire(ONE_WIRE_BUS);
DallasTemperature sensors(&oneWire);

// -------- Gyro --------
int16_t GyroX, GyroY, GyroZ;

void setup() {

  Serial.begin(9600);

  Wire.begin();
  sensors.begin();

  // Wake up MPU6050
  Wire.beginTransmission(MPU);
  Wire.write(0x6B);
  Wire.write(0);
  Wire.endTransmission(true);
}

void loop() {

  // -------- EMG --------
  int emgValue = analogRead(emgPin);

  // -------- Heart --------
  int heartValue = analogRead(heartPin);

  // -------- Gyroscope --------
  Wire.beginTransmission(MPU);
  Wire.write(0x43);
  Wire.endTransmission(false);
  Wire.requestFrom(MPU, 6, true);

  GyroX = Wire.read() << 8 | Wire.read();
  GyroY = Wire.read() << 8 | Wire.read();
  GyroZ = Wire.read() << 8 | Wire.read();

  // -------- Temperature --------
  sensors.requestTemperatures();
  float temperature = sensors.getTempCByIndex(0);

  // -------- Serial Output --------
  Serial.print("EMG:");
  Serial.print(emgValue);

  Serial.print(",Heart:");
  Serial.print(heartValue);

  Serial.print(",GyroX:");
  Serial.print(GyroX);

  Serial.print(",GyroY:");
  Serial.print(GyroY);

  Serial.print(",GyroZ:");
  Serial.print(GyroZ);

  Serial.print(",Temp:");
  Serial.println(temperature);

  delay(500);
}
