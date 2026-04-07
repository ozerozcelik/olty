import React, { useMemo } from 'react';
import { StyleSheet, Text, View, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Defs, LinearGradient, Stop, Text as SvgText } from 'react-native-svg';

import type { TideData, TideEvent } from '@/types/app.types';

interface TideChartProps {
  tideData: TideData;
  width?: number;
  height?: number;
}

const COLORS = {
  water: '#2EC4B6',
  waterLight: 'rgba(46,196,182,0.3)',
  waterDark: '#1A8A7F',
  high: '#FF7A00',
  low: '#3B82F6',
  text: '#EAF4F4',
  textMuted: 'rgba(234,244,244,0.55)',
  grid: 'rgba(255,255,255,0.08)',
  currentTime: '#FF7A00',
};

const parseTime = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

const formatHour = (minutes: number): string => {
  const h = Math.floor(minutes / 60) % 24;
  return `${h.toString().padStart(2, '0')}:00`;
};

const generateTideCurve = (events: TideEvent[], width: number, height: number): string => {
  if (events.length < 2) return '';

  const padding = { top: 20, bottom: 30, left: 10, right: 10 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Sort events by time
  const sortedEvents = [...events].sort((a, b) => parseTime(a.time) - parseTime(b.time));
  
  // Find min/max heights
  const heights = sortedEvents.map(e => e.height);
  const minHeight = Math.min(...heights);
  const maxHeight = Math.max(...heights);
  const heightRange = maxHeight - minHeight || 1;

  // Find time range (assume 24 hour period if not evident)
  const times = sortedEvents.map(e => parseTime(e.time));
  const minTime = Math.min(...times);
  const maxTime = Math.max(...times);
  const timeRange = maxTime - minTime || 1440; // Default to 24 hours

  // Map events to coordinates
  const points = sortedEvents.map(event => {
    const x = padding.left + ((parseTime(event.time) - minTime) / timeRange) * chartWidth;
    const y = padding.top + (1 - (event.height - minHeight) / heightRange) * chartHeight;
    return { x, y, event };
  });

  // Generate smooth curve using quadratic bezier
  if (points.length < 2) return '';

  let path = `M ${points[0].x} ${points[0].y}`;
  
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    
    // Calculate control point for smooth curve
    const cx = (p0.x + p1.x) / 2;
    
    path += ` Q ${p0.x + (cx - p0.x) * 0.5} ${p0.y}, ${cx} ${(p0.y + p1.y) / 2}`;
    path += ` Q ${cx + (p1.x - cx) * 0.5} ${p1.y}, ${p1.x} ${p1.y}`;
  }

  return path;
};

const generateAreaPath = (curvePath: string, width: number, height: number): string => {
  if (!curvePath) return '';
  
  const padding = { bottom: 30, left: 10, right: 10 };
  const bottomY = height - padding.bottom;
  
  // Extract first and last x coordinates from path
  const firstMatch = curvePath.match(/M\s*([\d.]+)/);
  const lastMatch = curvePath.match(/[\d.]+\s+([\d.]+)\s*$/);
  
  if (!firstMatch || !lastMatch) return '';
  
  const firstX = parseFloat(firstMatch[1]);
  const lastX = width - padding.right;
  
  return `${curvePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
};

export const TideChart = ({ 
  tideData, 
  width = Dimensions.get('window').width - 32,
  height = 160 
}: TideChartProps): React.ReactElement | null => {
  const { events, currentState } = tideData;

  const chartData = useMemo(() => {
    if (events.length < 2) return null;

    const padding = { top: 20, bottom: 30, left: 10, right: 10 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    const sortedEvents = [...events].sort((a, b) => parseTime(a.time) - parseTime(b.time));
    
    const heights = sortedEvents.map(e => e.height);
    const minHeight = Math.min(...heights);
    const maxHeight = Math.max(...heights);
    const heightRange = maxHeight - minHeight || 1;

    const times = sortedEvents.map(e => parseTime(e.time));
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const timeRange = maxTime - minTime || 1440;

    const points = sortedEvents.map(event => ({
      x: padding.left + ((parseTime(event.time) - minTime) / timeRange) * chartWidth,
      y: padding.top + (1 - (event.height - minHeight) / heightRange) * chartHeight,
      event,
    }));

    const curvePath = generateTideCurve(events, width, height);
    const areaPath = generateAreaPath(curvePath, width, height);

    // Current time marker
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const currentX = padding.left + ((currentMinutes - minTime) / timeRange) * chartWidth;
    const isCurrentTimeVisible = currentX >= padding.left && currentX <= width - padding.right;

    // Time labels
    const timeLabels = [];
    const labelCount = 4;
    for (let i = 0; i <= labelCount; i++) {
      const time = minTime + (timeRange / labelCount) * i;
      const x = padding.left + (i / labelCount) * chartWidth;
      timeLabels.push({ x, label: formatHour(time) });
    }

    return {
      points,
      curvePath,
      areaPath,
      currentX: isCurrentTimeVisible ? currentX : null,
      timeLabels,
      padding,
      chartHeight,
    };
  }, [events, width, height]);

  if (!chartData) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>Gelgit verisi yetersiz</Text>
      </View>
    );
  }

  const { points, curvePath, areaPath, currentX, timeLabels, padding, chartHeight } = chartData;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🌊 Gelgit Grafiği</Text>
        <View style={styles.stateBadge}>
          <Text style={styles.stateEmoji}>
            {currentState === 'rising' ? '📈' : currentState === 'falling' ? '📉' : '➡️'}
          </Text>
          <Text style={styles.stateText}>
            {currentState === 'rising' ? 'Yükseliyor' : currentState === 'falling' ? 'Alçalıyor' : 'Durgun'}
          </Text>
        </View>
      </View>

      <Svg width={width} height={height}>
        <Defs>
          <LinearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={COLORS.water} stopOpacity={0.4} />
            <Stop offset="100%" stopColor={COLORS.water} stopOpacity={0.05} />
          </LinearGradient>
        </Defs>

        {/* Grid lines */}
        {[0, 0.5, 1].map((ratio, i) => (
          <Line
            key={i}
            x1={padding.left}
            y1={padding.top + ratio * chartHeight}
            x2={width - padding.right}
            y2={padding.top + ratio * chartHeight}
            stroke={COLORS.grid}
            strokeWidth={1}
          />
        ))}

        {/* Area fill */}
        {areaPath ? (
          <Path d={areaPath} fill="url(#tideGradient)" />
        ) : null}

        {/* Tide curve */}
        {curvePath ? (
          <Path
            d={curvePath}
            stroke={COLORS.water}
            strokeWidth={2.5}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ) : null}

        {/* Current time indicator */}
        {currentX !== null ? (
          <>
            <Line
              x1={currentX}
              y1={padding.top}
              x2={currentX}
              y2={height - padding.bottom}
              stroke={COLORS.currentTime}
              strokeWidth={2}
              strokeDasharray="4,4"
            />
            <Circle
              cx={currentX}
              cy={padding.top - 5}
              r={4}
              fill={COLORS.currentTime}
            />
          </>
        ) : null}

        {/* High/Low markers */}
        {points.map((point, i) => (
          <React.Fragment key={i}>
            <Circle
              cx={point.x}
              cy={point.y}
              r={6}
              fill={point.event.type === 'high' ? COLORS.high : COLORS.low}
              stroke="#0B1F2A"
              strokeWidth={2}
            />
            <SvgText
              x={point.x}
              y={point.y - 12}
              fill={COLORS.text}
              fontSize={10}
              fontWeight="600"
              textAnchor="middle"
            >
              {point.event.height.toFixed(1)}m
            </SvgText>
          </React.Fragment>
        ))}

        {/* Time labels */}
        {timeLabels.map((item, i) => (
          <SvgText
            key={i}
            x={item.x}
            y={height - 10}
            fill={COLORS.textMuted}
            fontSize={10}
            textAnchor="middle"
          >
            {item.label}
          </SvgText>
        ))}
      </Svg>

      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.high }]} />
          <Text style={styles.legendText}>Yüksek</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.low }]} />
          <Text style={styles.legendText}>Alçak</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendLine, { backgroundColor: COLORS.currentTime }]} />
          <Text style={styles.legendText}>Şimdi</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    color: COLORS.text,
    fontSize: 16,
    fontWeight: '600',
  },
  stateBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(46,196,182,0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  stateEmoji: {
    fontSize: 12,
  },
  stateText: {
    color: COLORS.water,
    fontSize: 12,
    fontWeight: '600',
  },
  noDataContainer: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 24,
    alignItems: 'center',
  },
  noDataText: {
    color: COLORS.textMuted,
    fontSize: 14,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 20,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLine: {
    width: 12,
    height: 2,
    borderRadius: 1,
  },
  legendText: {
    color: COLORS.textMuted,
    fontSize: 11,
  },
});
