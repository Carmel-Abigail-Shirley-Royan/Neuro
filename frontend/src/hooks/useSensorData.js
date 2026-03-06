import { useEffect, useRef, useState, useCallback } from 'react';

const WS_URL = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws/sensor';
const MAX_HISTORY = 60; // Keep 60 data points for charts

export function useSensorData() {
  const [sensorData, setSensorData] = useState(null);
  const [connected, setConnected] = useState(false);
  const [prediction, setPrediction] = useState('Normal');
  const [chartData, setChartData] = useState({
    emg: Array(MAX_HISTORY).fill({ t: 0, v: 0 }),
    pulse: Array(MAX_HISTORY).fill({ t: 0, v: 0 }),
  });

  const wsRef = useRef(null);
  const reconnectTimer = useRef(null);
  const tickRef = useRef(0);

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnected(true);
        console.log('[WS] Connected');
        clearTimeout(reconnectTimer.current);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setSensorData(data);
          setPrediction(data.prediction || 'Normal');

          tickRef.current += 1;
          const tick = tickRef.current;

          setChartData(prev => ({
            emg: [...prev.emg.slice(-MAX_HISTORY + 1), { t: tick, v: data.emg_mv || 0 }],
            pulse: [...prev.pulse.slice(-MAX_HISTORY + 1), { t: tick, v: data.pulse_bpm || 0 }],
          }));
        } catch (e) {
          console.error('[WS] Parse error:', e);
        }
      };

      ws.onerror = (err) => {
        console.error('[WS] Error:', err);
      };

      ws.onclose = () => {
        setConnected(false);
        console.log('[WS] Disconnected, reconnecting in 3s...');
        reconnectTimer.current = setTimeout(connect, 3000);
      };
    } catch (e) {
      console.error('[WS] Connection failed:', e);
      reconnectTimer.current = setTimeout(connect, 3000);
    }
  }, []);

  const sendLocation = useCallback((lat, lng) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'location', lat, lng }));
    }
  }, []);

  useEffect(() => {
    connect();
    return () => {
      clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connect]);

  return { sensorData, connected, prediction, chartData, sendLocation };
}
