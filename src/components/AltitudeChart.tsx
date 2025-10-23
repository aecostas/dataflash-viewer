import React, { useEffect, useRef } from "react";
import ReactECharts from "echarts-for-react";
import type { TrackPointsList } from "../types";

interface AltitudeChartProps {
  trackPoints: TrackPointsList;
  missionColor?: string;
}

const AltitudeChart: React.FC<AltitudeChartProps> = ({
  trackPoints,
  missionColor = "#ff5500",
}) => {
  const chartRef = useRef<ReactECharts>(null);
  const { alt, time_boot_ms } = trackPoints;

  // Limpiar el componente cuando se desmonte
  useEffect(() => {
    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.getEchartsInstance()?.dispose();
        } catch (error) {
          console.warn("Error disposing ECharts instance:", error);
        }
      }
    };
  }, []);

  // Si no hay datos de altura o tiempo, no mostrar la gráfica
  if (!alt || !time_boot_ms || alt.length === 0 || time_boot_ms.length === 0) {
    return (
      <div
        style={{
          height: "300px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f5f5",
          border: "1px solid #ddd",
          borderRadius: "8px",
          color: "#666",
        }}
      >
        No hay datos de altura disponibles
      </div>
    );
  }

  // Validar que los arrays tengan la misma longitud
  const minLength = Math.min(alt.length, time_boot_ms.length);
  if (minLength === 0) {
    return (
      <div
        style={{
          height: "300px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#f5f5f5",
          border: "1px solid #ddd",
          borderRadius: "8px",
          color: "#666",
        }}
      >
        No hay datos válidos para mostrar
      </div>
    );
  }

  // Preparar los datos para la gráfica
  const validTimeData = time_boot_ms.slice(0, minLength);
  const validAltData = alt.slice(0, minLength);

  const minTime = Math.min(...validTimeData);

  // Crear datos en formato correcto para ECharts
  const timeData = validTimeData.map((time) => (time - minTime) / 1000); // Convertir a segundos desde el inicio
  const altitudeData = validAltData.map((altitude) => altitude / 100); // Convertir de cm a metros

  // Asegurar que los datos son arrays regulares de JavaScript
  const safeTimeData = [...timeData];
  const safeAltitudeData = [...altitudeData];

  const option = {
    title: {
      text: "Altura del Vuelo",
      left: "center",
      textStyle: {
        fontSize: 16,
        fontWeight: "bold",
      },
    },
    tooltip: {
      trigger: "axis",
      /* formatter: (params: any) => {
        if (params && params.length > 0) {
          const data = params[0];
          return `Tiempo: ${data.axisValue.toFixed(
            1
          )}s<br/>Altura: ${data.value.toFixed(1)}m`;
        }
        return "";
      },*/
    },
    grid: {
      left: "3%",
      right: "4%",
      bottom: "3%",
      containLabel: true,
    },
    xAxis: {
      type: "category",
      data: safeTimeData,
      name: "Tiempo (s)",
      nameLocation: "middle",
      nameGap: 30,
      axisLabel: {
        formatter: "{value}s",
      },
    },
    yAxis: {
      type: "value",
      name: "Altura (m)",
      nameLocation: "middle",
      nameGap: 50,
      axisLabel: {
        formatter: "{value}m",
      },
    },
    series: [
      {
        name: "Altura",
        type: "line",
        data: safeAltitudeData,
        smooth: true,
        lineStyle: {
          color: missionColor,
          width: 2,
        },
        itemStyle: {
          color: missionColor,
        },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              {
                offset: 0,
                color: `${missionColor}40`, // 25% opacity
              },
              {
                offset: 1,
                color: `${missionColor}10`, // 6% opacity
              },
            ],
          },
        },
      },
    ],
  };

  return (
    <div style={{ width: "100%", height: "300px" }}>
      <ReactECharts
        ref={chartRef}
        option={option}
        style={{ height: "100%", width: "100%" }}
        opts={{ renderer: "canvas" }}
        notMerge={true}
      />
    </div>
  );
};

export default AltitudeChart;
