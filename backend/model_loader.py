"""
NeuroGuard - ML Model Loader
Loads lgblarge_scaler.pkl which contains the feature column spec
['heart_rate', 'temperature', 'spo2', 'vibration_intensity']
for the LightGBM seizure prediction model.
Falls back to rule-based detection if model not found.
"""

import os
import math
import pickle
import numpy as np
from typing import Optional, List


class SeizurePredictor:
    def __init__(self):
        self.model = None
        self.feature_names: Optional[List[str]] = None
        self.model_path = os.getenv("MODEL_PATH", "lgblarge_scaler.pkl")
        self._loaded = False

    def load_model(self):
        """Load the ML model / feature spec from pickle file."""
        try:
            # Resolve path relative to this file so it works regardless of cwd
            base_dir = os.path.dirname(os.path.abspath(__file__))
            resolved_path = os.path.join(base_dir, self.model_path)

            with open(resolved_path, "rb") as f:
                data = pickle.load(f)

            # ── Case 1: feature-name array (what lgblarge_scaler.pkl contains) ──
            if isinstance(data, np.ndarray) and data.dtype == object:
                self.feature_names = list(data)
                self.model = None          # no model weights present in this file
                self._loaded = True
                print(f"[Model] Feature spec loaded from {resolved_path}")
                print(f"[Model] Features: {self.feature_names}")

            # ── Case 2: dict with model (and optional scaler) ──
            elif isinstance(data, dict):
                self.model = data.get("model")
                scaler_or_names = data.get("scaler") or data.get("feature_names")
                if isinstance(scaler_or_names, (list, np.ndarray)):
                    self.feature_names = list(scaler_or_names)
                self._loaded = True
                print(f"[Model] Loaded dict model from {resolved_path}")

            # ── Case 3: (model, scaler) tuple ──
            elif isinstance(data, tuple) and len(data) == 2:
                self.model, _ = data
                self._loaded = True
                print(f"[Model] Loaded tuple model from {resolved_path}")

            # ── Case 4: raw model object ──
            else:
                self.model = data
                self._loaded = True
                print(f"[Model] Loaded raw model from {resolved_path}")

        except FileNotFoundError:
            print(f"[Model] {self.model_path} not found. Using rule-based detection.")
            self._loaded = False
        except PermissionError:
            print(f"[Model] Permission denied access to {self.model_path}. File might be locked.")
            self._loaded = False
        except Exception as e:
            print(f"[Model] Error loading {self.model_path}: {e}")
            self._loaded = False

    def predict(self, sensor_data: dict) -> str:
        """
        Predict seizure from processed sensor data.
        Returns 'Seizure Detected' or 'Normal'.
        """
        features = self._extract_features(sensor_data)

        if self._loaded and self.model is not None:
            return self._ml_predict(features)
        else:
            # Fall back to rule-based (also used when only feature spec loaded)
            return self._rule_based_predict(sensor_data)

    def _extract_features(self, data: dict) -> np.ndarray:
        """
        Extract feature vector aligned with pkl feature spec:
          ['heart_rate', 'temperature', 'spo2', 'vibration_intensity']

        Mappings from sensor data:
          heart_rate        <- pulse_bpm
          temperature       <- temperature_c
          spo2              <- spo2 (default 98.0 when not available)
          vibration_intensity <- sqrt(gyro_x² + gyro_y² + gyro_z²)
        """
        heart_rate = float(data.get("pulse_bpm", 75))
        temperature = float(data.get("temperature_c", 36.5))
        spo2 = float(data.get("spo2", 98.0))
        gyro_x = float(data.get("gyro_x", 0))
        gyro_y = float(data.get("gyro_y", 0))
        gyro_z = float(data.get("gyro_z", 0))
        vibration_intensity = math.sqrt(gyro_x ** 2 + gyro_y ** 2 + gyro_z ** 2)

        return np.array([[heart_rate, temperature, spo2, vibration_intensity]])

    def _ml_predict(self, features: np.ndarray) -> str:
        """Use ML model for prediction."""
        try:
            pred = self.model.predict(features)
            # 1 = seizure, 0 = normal
            return "Seizure Detected" if pred[0] == 1 else "Normal"
        except Exception as e:
            print(f"[Model] Prediction error: {e}")
            return "Normal"

    def _rule_based_predict(self, data: dict) -> str:
        """
        Rule-based fallback seizure detection using the 4-feature schema.
        Seizure indicators:
          - Abnormal heart rate (< 45 or > 150 BPM)
          - High vibration intensity (> 5 °/s RMS)
          - Low SpO2 (< 90 %)
          - High temperature (> 38.5 °C)
        """
        heart_rate = data.get("pulse_bpm", 75)
        temperature = data.get("temperature_c", 36.5)
        spo2 = data.get("spo2", 98.0)
        gyro_x = abs(data.get("gyro_x", 0))
        gyro_y = abs(data.get("gyro_y", 0))
        gyro_z = abs(data.get("gyro_z", 0))
        vibration_intensity = math.sqrt(gyro_x ** 2 + gyro_y ** 2 + gyro_z ** 2)
        emg = data.get("emg_mv", 0)

        seizure_score = 0
        if heart_rate < 45 or heart_rate > 150:
            seizure_score += 2
        if vibration_intensity > 5.0:
            seizure_score += 3
        if spo2 < 90:
            seizure_score += 3
        if temperature > 38.5:
            seizure_score += 1
        if emg > 2.0:
            seizure_score += 3

        return "Seizure Detected" if seizure_score >= 4 else "Normal"

    def is_loaded(self) -> bool:
        return self._loaded

    def get_feature_names(self) -> Optional[List[str]]:
        """Return feature column names from the pkl if available."""
        return self.feature_names
