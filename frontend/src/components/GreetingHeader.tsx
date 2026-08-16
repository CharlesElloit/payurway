import React from 'react';
import { View, Text, Image, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { moderateScale, rf } from '../utils/responsive';

interface GreetingHeaderProps {
  name: string;
  id: string;
  avatarUrl: string;
  notificationCount?: number;
  onPressNotifications?: () => void;
  onPressCopyId?: () => void;
}

export default function GreetingHeader({
  name,
  id,
  avatarUrl,
  notificationCount = 0,
  onPressNotifications,
  onPressCopyId,
}: GreetingHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Image source={{ uri: avatarUrl }} style={styles.avatar} />
        <View style={styles.textBlock}>
          <Text style={styles.greeting} numberOfLines={1}>
            Hola, <Text style={styles.name}>{name}</Text>
          </Text>
          <TouchableOpacity style={styles.idRow} onPress={onPressCopyId} activeOpacity={0.7}>
            <Text style={styles.idText}>ID: {id}</Text>
            <Ionicons name="copy-outline" size={rf(14)} color={colors.onAccent} style={{ marginLeft: 6 }} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity onPress={onPressNotifications} style={styles.bellWrap} activeOpacity={0.7}>
        <View style={styles.bellCircle}>
          <Ionicons name="notifications" size={rf(18)} color={colors.accent} />
        </View>
        {notificationCount > 0 && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{notificationCount > 99 ? '99+' : notificationCount}</Text>
          </View>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  left: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 1,
  },
  avatar: {
    width: moderateScale(52),
    height: moderateScale(52),
    borderRadius: moderateScale(26),
    marginRight: moderateScale(12),
    backgroundColor: colors.surface,
  },
  textBlock: {
    flexShrink: 1,
  },
  greeting: {
    fontSize: rf(18),
    fontWeight: '400',
    color: colors.onAccent,
  },
  name: {
    fontWeight: '800',
  },
  idRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  idText: {
    fontSize: rf(13),
    color: colors.onAccent,
    opacity: 0.75,
  },
  bellWrap: {
    marginLeft: 8,
  },
  bellCircle: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 3,
    borderRadius: 9,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.accent,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.onAccent,
  },
});
