import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';

export type TabKey = 'Home' | 'Transactions' | 'Pay' | 'Budgets' | 'Profile';

interface BottomTabBarProps {
  activeTab: TabKey;
  onChange: (tab: TabKey) => void;
}

const tabs: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { key: 'Home', label: 'Home', icon: 'home' },
  { key: 'Transactions', label: 'Transactions', icon: 'swap-horizontal' },
  { key: 'Pay', label: 'Pay', icon: 'scan-outline' },
  { key: 'Budgets', label: 'Budgets', icon: 'pie-chart-outline' },
  { key: 'Profile', label: 'Profile', icon: 'person-outline' },
];

export default function BottomTabBar({ activeTab, onChange }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, moderateScale(10)) }]}>
      {tabs.map((tab) => {
        const active = tab.key === activeTab;

        if (tab.key === 'Pay') {
          return (
            <TouchableOpacity key={tab.key} style={styles.centerButton} onPress={() => onChange(tab.key)} activeOpacity={0.85}>
              <Ionicons name={tab.icon} size={rf(24)} color={colors.onAccent} />
            </TouchableOpacity>
          );
        }

        return (
          <TouchableOpacity key={tab.key} style={styles.tabButton} onPress={() => onChange(tab.key)} activeOpacity={0.7}>
            <Ionicons name={tab.icon} size={rf(20)} color={active ? colors.accent : colors.textMuted} />
            <Text style={[styles.label, { color: active ? colors.accent : colors.textMuted }]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: colors.background,
    paddingTop: moderateScale(10),
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  label: {
    fontSize: rf(10),
    marginTop: 4,
    fontWeight: '500',
  },
  centerButton: {
    width: moderateScale(52),
    height: moderateScale(52),
    borderRadius: moderateScale(26),
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: moderateScale(-24),
  },
});
