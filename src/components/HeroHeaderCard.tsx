import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme/colors';
import { moderateScale } from '../utils/responsive';
import GreetingHeader from './GreetingHeader';
import WeekCalendarStrip from './WeekCalendarStrip';
import { DayItem } from '../constants/mockData';

interface HeroHeaderCardProps {
  name: string;
  id: string;
  avatarUrl: string;
  notificationCount: number;
  days: DayItem[];
  selectedDayId: string;
  onSelectDay?: (id: string) => void;
}

export default function HeroHeaderCard({
  name,
  id,
  avatarUrl,
  notificationCount,
  days,
  selectedDayId,
  onSelectDay,
}: HeroHeaderCardProps) {
  return (
    <LinearGradient
      colors={[colors.accent, colors.accentDark]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <GreetingHeader
        name={name}
        id={id}
        avatarUrl={avatarUrl}
        notificationCount={notificationCount}
      />
      <View style={styles.calendarWrap}>
        <WeekCalendarStrip days={days} selectedId={selectedDayId} onSelect={onSelectDay} />
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: moderateScale(10),
    padding: moderateScale(5),
    paddingBottom: moderateScale(5),
  },
  calendarWrap: {
    marginTop: moderateScale(4),
  },
});
