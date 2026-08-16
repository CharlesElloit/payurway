// ProfileScreen.tsx
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking } from 'react-native';
import { Ionicons, MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme/colors';
import { moderateScale } from '../utils/responsive';
import { user } from '../constants/mockData';
import LogoutModal from '../components/LogoutModal'; // Import the new custom modal

interface ProfileScreenProps {
    onLogout?: () => void;
}

export default function ProfileScreen({ onLogout }: ProfileScreenProps) {
    const [isLogoutModalVisible, setIsLogoutModalVisible] = useState(false);

    const handleOpenUrl = (url?: string) => {
        if (url) {
            Linking.openURL(url).catch((err) => console.error("Error opening URL:", err));
        }
    };

    const handleConfirmLogout = async () => {
        setIsLogoutModalVisible(false);
        try {
            await AsyncStorage.removeItem('pmb_has_registered');
            if (onLogout) {
                onLogout();
            }
        } catch (error) {
            console.error("Error clearing session during logout:", error);
        }
    };

    return (
        <View style={styles.container}>
            <ScrollView
                style={styles.scroll}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                {/* Profile Header */}
                <View style={styles.header}>
                    <Image source={{ uri: user.avatarUrl }} style={styles.avatar} />
                    <Text style={styles.name}>{user.name || 'Flatstudio LDA'}</Text>
                    <Text style={styles.email}>hi@flatstudio.co</Text>
                </View>

                {/* Account Security Section */}
                <Text style={styles.sectionHeader}>ACCOUNT SECURITY</Text>
                <View style={styles.card}>
                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="mail-outline" size={moderateScale(20)} color="#FFF" />
                            <Text style={styles.rowLabel}>Email</Text>
                        </View>
                        <View style={styles.rowRight}>
                            <Text style={styles.subText}>Connected via </Text>
                            <Ionicons name="logo-google" size={moderateScale(16)} color="#4285F4" />
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.row}>
                        <View style={styles.rowLeft}>
                            <Ionicons name="shield-checkmark-outline" size={moderateScale(20)} color="#FFF" />
                            <View style={styles.labelContainer}>
                                <Text style={styles.rowLabel}>Two-factor authentication</Text>
                                <Text style={styles.warningText}>Secure the account</Text>
                            </View>
                        </View>
                        <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
                            <Text style={styles.actionButtonText}>Turn on</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Other Options Section */}
                <Text style={styles.sectionHeader}>OTHER</Text>
                <View style={styles.card}>
                    {otherLinks.map((item, index) => {
                        const isLogout = item.id === 'logout';
                        return (
                            <React.Fragment key={item.id}>
                                <TouchableOpacity
                                    style={styles.row}
                                    activeOpacity={0.6}
                                    onPress={isLogout ? () => setIsLogoutModalVisible(true) : () => handleOpenUrl(item.url)}
                                >
                                    <View style={styles.rowLeft}>
                                        {item.icon}
                                        <Text style={[styles.rowLabel, isLogout && styles.logoutLabel]}>
                                            {item.title}
                                        </Text>
                                    </View>
                                    {item.external ? (
                                        <Feather name="arrow-up-right" size={moderateScale(18)} color="#666" />
                                    ) : (
                                        <Ionicons name="chevron-forward" size={moderateScale(18)} color="#666" />
                                    )}
                                </TouchableOpacity>
                                {index < otherLinks.length - 1 && <View style={styles.divider} />}
                            </React.Fragment>
                        );
                    })}
                </View>
            </ScrollView>

            {/* Modern Logout Confirmation Modal */}
            <LogoutModal
                visible={isLogoutModalVisible}
                onClose={() => setIsLogoutModalVisible(false)}
                onConfirm={handleConfirmLogout}
            />
        </View>
    );
}

const otherLinks = [
    { id: '1', title: 'Help articles', icon: <Ionicons name="book-outline" size={moderateScale(20)} color="#FFF" />, external: true, url: 'https://example.com' },
    { id: '2', title: 'Join Discord', icon: <MaterialCommunityIcons size={moderateScale(20)} color="#FFF" />, external: true, url: 'https://discord.gg' },
    { id: '3', title: 'Leave feedback', icon: <Ionicons name="chatbox-outline" size={moderateScale(20)} color="#FFF" />, external: false },
    { id: '4', title: 'Terms of service', icon: <Ionicons name="document-text-outline" size={moderateScale(20)} color="#FFF" />, external: false },
    { id: '5', title: 'Privacy policy', icon: <Ionicons name="lock-closed-outline" size={moderateScale(20)} color="#FFF" />, external: false },
    { id: 'logout', title: 'Log out', icon: <Ionicons name="log-out-outline" size={moderateScale(20)} color="#FF5252" />, external: false },
];

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    scroll: {
        flex: 1,
    },
    content: {
        paddingHorizontal: moderateScale(16),
        paddingTop: moderateScale(16),
        paddingBottom: moderateScale(120),
    },
    header: {
        alignItems: 'center',
        marginVertical: moderateScale(20),
    },
    avatar: {
        width: moderateScale(80),
        height: moderateScale(80),
        borderRadius: moderateScale(20),
        marginBottom: moderateScale(12),
    },
    name: {
        color: '#FFF',
        fontSize: moderateScale(20),
        fontWeight: 'bold',
    },
    email: {
        color: '#888',
        fontSize: moderateScale(14),
        marginTop: moderateScale(4),
    },
    sectionHeader: {
        color: '#666',
        fontSize: moderateScale(12),
        fontWeight: '600',
        marginBottom: moderateScale(8),
        marginLeft: moderateScale(4),
        letterSpacing: 0.5,
    },
    card: {
        backgroundColor: '#161618',
        borderRadius: moderateScale(16),
        paddingHorizontal: moderateScale(16),
        marginBottom: moderateScale(20),
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: moderateScale(14),
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    rowRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    labelContainer: {
        marginLeft: moderateScale(12),
        flex: 1,
    },
    rowLabel: {
        color: '#FFF',
        fontSize: moderateScale(15),
        fontWeight: '500',
        marginLeft: moderateScale(12),
    },
    logoutLabel: {
        color: '#FF5252',
    },
    subText: {
        color: '#888',
        fontSize: moderateScale(13),
    },
    warningText: {
        color: '#FF5252',
        fontSize: moderateScale(12),
        marginTop: moderateScale(2),
    },
    actionButton: {
        backgroundColor: '#2A2A2E',
        paddingHorizontal: moderateScale(14),
        paddingVertical: moderateScale(6),
        borderRadius: moderateScale(20),
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: moderateScale(13),
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#222224',
    },
});