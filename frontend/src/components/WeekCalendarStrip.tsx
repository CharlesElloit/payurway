import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, useWindowDimensions } from 'react-native';
import { colors } from '../theme/colors';
import { rf, moderateScale, isTablet } from '../utils/responsive';
import { DayItem } from '../constants/mockData';

interface WeekCalendarStripProps {
  days: DayItem[];
  selectedId: string;
  onSelect?: (id: string) => void;
}

export default function WeekCalendarStrip({ days, selectedId, onSelect }: WeekCalendarStripProps) {
  const [activeId, setActiveId] = useState(selectedId);
  const { width } = useWindowDimensions();

  const handleSelect = (id: string) => {
    setActiveId(id);
    onSelect?.(id);
  };

  // On very small screens or many items, allow horizontal scroll instead of squeezing.
  const tablet = isTablet();
  const cardWidth = tablet ? moderateScale(72) : Math.min(moderateScale(56), (width - 64) / days.length - 6);

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.scroll}
    >
      {days.map((day) => {
        const active = day.id === activeId;
        return (
          <TouchableOpacity
            key={day.id}
            onPress={() => handleSelect(day.id)}
            activeOpacity={0.8}
            style={[
              styles.card,
              { width: cardWidth },
              active ? styles.cardActive : styles.cardInactive,
            ]}
          >
            <Text style={[styles.label, active ? styles.labelActive : styles.labelInactive]}>{day.label}</Text>
            <Text style={[styles.date, active ? styles.dateActive : styles.dateInactive]}>{day.date}</Text>
            <Text style={[styles.month, active ? styles.monthActive : styles.monthInactive]}>{day.month}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    marginTop: moderateScale(5),
    backgroundColor: colors.surface,
    padding: moderateScale(5),
    borderRadius: moderateScale(10)
  },
  row: {
    gap: 8,
    paddingRight: 8,
  },
  card: {
    paddingVertical: moderateScale(5),
    borderRadius: moderateScale(10),
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActive: {
    backgroundColor: colors.accent,
  },
  cardInactive: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderWidth: 1
  },
  label: {
    fontSize: rf(12),
    marginBottom: 2,
  },
  labelActive: {
    color: colors.onAccent,
    opacity: 0.8,
  },
  labelInactive: {
    color: colors.textSecondary,
  },
  date: {
    fontSize: rf(20),
    fontWeight: '700',
  },
  dateActive: {
    color: colors.onAccent,
  },
  dateInactive: {
    color: colors.textPrimary,
  },
  month: {
    fontSize: rf(12),
    fontWeight: '600',
    marginTop: 2,
  },
  monthActive: {
    color: colors.onAccent,
  },
  monthInactive: {
    color: colors.textSecondary,
  },
});
