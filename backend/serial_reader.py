"""
NeuroGuard - PySerial Reader
Reads live sensor data from Arduino via serial port.
Format: pulse_voltage,temp_voltage,emg_voltage,gyro_x,gyro_y,gyro_z
"""

import os
import time
import threading
import random
import math
from typing import Optional

try:
    import serial
    import serial.tools.list_ports
    SERIAL_AVAILABLE = True
except ImportError:
    SERIAL_AVAILABLE = False
    print("[Serial] pyserial not installed, using simulated data")


class SerialReader:
    def __init__(self):
        self.port = os.getenv("SERIAL_PORT", "COM3")  # Change to /dev/ttyUSB0 on Linux
        self.baudrate = int(os.getenv("SERIAL_BAUDRATE", "9600"))
        self.serial_conn: Optional[object] = None
        self.last_data: Optional[dict] = None
        self.last_location: Optional[dict] = None
        self._lock = threading.Lock()
        self._sim_t = 0  # Simulation time counter
        self._connected = False

        if SERIAL_AVAILABLE:
            self._try_connect()

    def _try_connect(self):
        """Attempt to connect to serial port."""
        try:
            self.serial_conn = serial.Serial(
                port=self.port,
                baudrate=self.baudrate,
                timeout=1
            )
            self._connected = True
            print(f"[Serial] SUCCESS: Connected to {self.port} at {self.baudrate} baud")
        except Exception as e:
            print(f"[Serial] ERROR: Could not connect to {self.port}: {e}")
            print("[Serial] Simulation DISABLED. Waiting for real hardware connection...")
            self._connected = False

    def _auto_detect_port(self) -> Optional[str]:
        """Try to auto-detect Arduino port."""
        if not SERIAL_AVAILABLE:
            return None
        ports = serial.tools.list_ports.comports()
        for port in ports:
            # Check for common Arduino/USB-Serial chip names
            desc = port.description or ""
            if any(key in desc for key in ["Arduino", "CH340", "USB Serial", "Silicon Labs"]):
                return port.device
        return None

    def read_data(self) -> Optional[dict]:
        """Read one line of sensor data. No simulation fallback."""
        with self._lock:
            if self._connected and self.serial_conn:
                return self._read_serial()
            else:
                return None  # No real data, return None

    def _read_serial(self) -> Optional[dict]:
        """Read from actual Arduino serial."""
        try:
            if self.serial_conn.in_waiting > 0:
                line = self.serial_conn.readline().decode("utf-8").strip()
                return self._parse_line(line)
        except serial.SerialException as e:
            print(f"[Serial] Read error: {e}, attempting reconnect...")
            self._connected = False
            self._try_reconnect()
        return None

    def _try_reconnect(self):
        """Background reconnection attempt."""
        def reconnect():
            time.sleep(3)
            self._try_connect()
        threading.Thread(target=reconnect, daemon=True).start()

    def _parse_line(self, line: str) -> Optional[dict]:
        """
        Parse labeled sensor values from Arduino.
        Format: EMG:516,Heart:125,GyroX:148,GyroY:461,GyroZ:92,Temp:-127.00
        """
        try:
            # Split by comma
            parts = line.split(",")
            data = {}
            for part in parts:
                if ":" in part:
                    label, val_str = part.split(":", 1)
                    label = label.strip().lower()
                    try:
                        value = float(val_str.strip())
                        data[label] = value
                    except ValueError:
                        continue

            if len(data) >= 6:
                return {
                    "emg_voltage": data.get("emg", 0),
                    "pulse_raw": data.get("heart", 0),  # User sends BPM or raw? We'll check in main.py
                    "gyro_x": data.get("gyrox", 0),
                    "gyro_y": data.get("gyroy", 0),
                    "gyro_z": data.get("gyroz", 0),
                    "temp_voltage": data.get("temp", 0),
                }
        except Exception as e:
            print(f"[Serial] Parse error for line '{line}': {e}")
        return None

    def _simulate_data(self) -> dict:
        """Generate realistic simulated sensor data for demo/testing."""
        self._sim_t += 0.1

        # Simulate realistic pulse waveform (60-80 BPM)
        pulse = 512 + 200 * math.sin(self._sim_t * 1.2) + random.gauss(0, 10)
        pulse = max(0, min(1023, pulse))

        # Fixed temperature at 36.6°C (no variation)
        temp = 750

        # Simulate EMG with occasional spikes
        emg_base = 100 + 50 * abs(math.sin(self._sim_t * 3))
        emg = emg_base + random.gauss(0, 15)
        emg = max(0, min(1023, emg))

        # Simulate gyroscope
        gyro_x = 0.5 * math.sin(self._sim_t * 0.8) + random.gauss(0, 0.05)
        gyro_y = 0.3 * math.cos(self._sim_t * 0.6) + random.gauss(0, 0.05)
        gyro_z = 0.2 * math.sin(self._sim_t * 1.1) + random.gauss(0, 0.05)

        data = {
            "pulse_voltage": pulse,
            "temp_voltage": temp,
            "emg_voltage": emg,
            "gyro_x": round(gyro_x, 3),
            "gyro_y": round(gyro_y, 3),
            "gyro_z": round(gyro_z, 3),
        }
        self.last_data = data
        return data

    def is_connected(self) -> bool:
        return self._connected

    def close(self):
        if self.serial_conn:
            try:
                self.serial_conn.close()
            except Exception:
                pass
