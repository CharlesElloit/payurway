import React, { useRef, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, LayoutChangeEvent } from 'react-native';
import { colors } from '../theme/colors';
import { rf, moderateScale } from '../utils/responsive';

interface TabSwitcherProps {
  tabs: string[];
  activeTab: string;
  onChange: (tab: string) => void;
}

export default function TabSwitcher({ tabs, activeTab, onChange }: TabSwitcherProps) {
  const underlineX = useRef(new Animated.Value(0)).current;
  const [tabWidths, setTabWidths] = useState<Record<string, number>>({});
  const [tabOffsets, setTabOffsets] = useState<Record<string, number>>({});

  const handleLayout = (tab: string) => (e: LayoutChangeEvent) => {
    const { x, width } = e.nativeEvent.layout;
    setTabOffsets((prev) => ({ ...prev, [tab]: x }));
    setTabWidths((prev) => ({ ...prev, [tab]: width }));
  };

  const handlePress = (tab: string) => {
    onChange(tab);
    Animated.spring(underlineX, {
      toValue: tabOffsets[tab] ?? 0,
      useNativeDriver: true,
      friction: 8,
    }).start();
  };

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        {tabs.map((tab) => {
          const active = tab === activeTab;
          return (
            <TouchableOpacity
              key={tab}
              onLayout={handleLayout(tab)}
              onPress={() => handlePress(tab)}
              activeOpacity={0.7}
              style={styles.tabButton}
            >
              <Text style={[styles.tabLabel, active ? styles.tabLabelActive : styles.tabLabelInactive]}>
                {tab}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
      <Animated.View
        style={[
          styles.underline,
          {
            width: tabWidths[activeTab] ?? 0,
            transform: [{ translateX: underlineX }],
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  row: {
    flexDirection: 'row',
  },
  tabButton: {
    marginRight: moderateScale(24),
    paddingBottom: moderateScale(10),
  },
  tabLabel: {
    fontSize: rf(15),
    fontWeight: '700',
  },
  tabLabelActive: {
    color: colors.textPrimary,
  },
  tabLabelInactive: {
    color: colors.textMuted,
    fontWeight: '500',
  },
  underline: {
    height: 2,
    backgroundColor: colors.accent,
    borderRadius: 1,
  },
});
