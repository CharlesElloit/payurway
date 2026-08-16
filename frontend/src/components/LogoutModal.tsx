// src/components/LogoutModal.tsx
import React from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, TouchableWithoutFeedback } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { moderateScale } from '../utils/responsive';

interface LogoutModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export default function LogoutModal({ visible, onClose, onConfirm }: LogoutModalProps) {
    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onClose}
        >
            {/* Backdrop */}
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.overlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.container}>

                            {/* Top Warning Icon Header */}
                            <View style={styles.iconContainer}>
                                <View style={styles.iconCircle}>
                                    <Ionicons name="log-out-outline" size={moderateScale(28)} color="#FF5252" />
                                </View>
                            </View>

                            {/* Title & Description */}
                            <Text style={styles.title}>Log Out</Text>
                            <Text style={styles.description}>
                                Are you sure you want to log out? You will need to verify your details to log back in.
                            </Text>

                            {/* Actions */}
                            <View style={styles.buttonContainer}>
                                <TouchableOpacity
                                    style={[styles.button, styles.cancelButton]}
                                    onPress={onClose}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.cancelText}>Cancel</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.button, styles.logoutButton]}
                                    onPress={onConfirm}
                                    activeOpacity={0.8}
                                >
                                    <Text style={styles.logoutText}>Log Out</Text>
                                </TouchableOpacity>
                            </View>

                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
}

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: moderateScale(24),
    },
    container: {
        width: '100%',
        backgroundColor: '#1C1C1E',
        borderRadius: moderateScale(24),
        padding: moderateScale(24),
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#2C2C2E',
        // Shadow for iOS/Android depth
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    iconContainer: {
        marginBottom: moderateScale(16),
    },
    iconCircle: {
        width: moderateScale(60),
        height: moderateScale(60),
        borderRadius: moderateScale(30),
        backgroundColor: 'rgba(255, 82, 82, 0.12)',
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 82, 82, 0.25)',
    },
    title: {
        color: '#FFFFFF',
        fontSize: moderateScale(20),
        fontWeight: '700',
        marginBottom: moderateScale(8),
        textAlign: 'center',
    },
    description: {
        color: '#8E8E93',
        fontSize: moderateScale(14),
        textAlign: 'center',
        lineHeight: moderateScale(20),
        marginBottom: moderateScale(24),
    },
    buttonContainer: {
        flexDirection: 'row',
        gap: moderateScale(12),
        width: '100%',
    },
    button: {
        flex: 1,
        height: moderateScale(48),
        borderRadius: moderateScale(14),
        alignItems: 'center',
        justifyContent: 'center',
    },
    cancelButton: {
        backgroundColor: '#2C2C2E',
    },
    cancelText: {
        color: '#FFFFFF',
        fontSize: moderateScale(15),
        fontWeight: '600',
    },
    logoutButton: {
        backgroundColor: '#FF5252',
    },
    logoutText: {
        color: '#FFFFFF',
        fontSize: moderateScale(15),
        fontWeight: '600',
    },
});