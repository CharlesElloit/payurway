import { Platform } from 'react-native';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import * as Notifications from 'expo-notifications';

const ANDROID_CHANNEL_ID = 'transactions';

// On Android, expo-notifications' setup (channel/handler registration) touches
// push/FCM infrastructure that Expo Go can no longer provide as of SDK 53 —
// calling into it there throws, not just degrades. Every exported function
// below checks this first and no-ops before touching the Notifications API at all.
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

/**
 * Call once at app startup (e.g. in App.tsx). Configures how notifications
 * behave while the app is in the foreground, and sets up the Android
 * notification channel required on Android 8+ for a proper heads-up banner
 * (high importance + vibration + accent light color = the "modern" look).
 * Safe to call in Expo Go — it just does nothing there.
 */
export async function configureNotifications(): Promise<void> {
    if (isExpoGo) return;

    try {
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowBanner: true,
                shouldShowList: true,
                shouldPlaySound: true,
                shouldSetBadge: false,
            }),
        });

        if (Platform.OS === 'android') {
            await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
                name: 'Transactions',
                importance: Notifications.AndroidImportance.HIGH,
                vibrationPattern: [0, 150, 80, 150],
                lightColor: '#D4FF3F',
                sound: 'default',
            });
        }
    } catch (error) {
        console.warn('[notifications] Failed to configure notifications:', error);
    }
}

/** Requests notification permission if not already granted. Returns whether it's usable. */
export async function ensureNotificationPermission(): Promise<boolean> {
    if (isExpoGo) return false;

    try {
        const current = await Notifications.getPermissionsAsync();
        if (current.granted) return true;
        if (!current.canAskAgain) return false;

        const requested = await Notifications.requestPermissionsAsync();
        return requested.granted;
    } catch (error) {
        console.warn('[notifications] Failed to request permission:', error);
        return false;
    }
}

interface TransactionNotificationParams {
    amountLabel: string; // pre-formatted, e.g. "UGX 20,000.00"
    accountName: string;
    narration?: string;
}

/**
 * Fires a local notification immediately. Returns whether it actually went
 * out — false in Expo Go (expected; the in-app success screen is still the
 * primary confirmation there) or if permission was denied.
 */
export async function sendTransactionSuccessNotification({
    amountLabel,
    accountName,
    narration,
}: TransactionNotificationParams): Promise<boolean> {
    if (isExpoGo) return false;

    try {
        const granted = await ensureNotificationPermission();
        if (!granted) return false;

        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Payment successful ✅',
                body: narration
                    ? `${amountLabel} sent from ${accountName} — ${narration}`
                    : `${amountLabel} sent from ${accountName}`,
                sound: 'default',
                ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null),
                data: { type: 'transaction_success' },
            },
            trigger: null, // fire immediately
        });
        return true;
    } catch (error) {
        console.warn('[notifications] Failed to send transaction notification:', error);
        return false;
    }
}


/**
 * Delivers a one-time verification code as a local notification, simulating
 * how a real backend's SMS/push would arrive. Returns whether it actually
 * went out — false in Expo Go or if permission is denied, in which case the
 * caller should fall back to simulating arrival after a short delay (see
 * RegistrationScreen/OtpVerificationScreen).
 */
export async function sendOtpNotification(code: string): Promise<boolean> {
    if (isExpoGo) return false;

    try {
        const granted = await ensureNotificationPermission();
        if (!granted) return false;

        await Notifications.scheduleNotificationAsync({
            content: {
                title: 'Your verification code',
                body: `${code} is your PayMyBills verification code.`,
                sound: 'default',
                ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : null),
                data: { type: 'otp_code', code },
            },
            trigger: null,
        });
        return true;
    } catch (error) {
        console.warn('[notifications] Failed to send OTP notification:', error);
        return false;
    }
}

/**
 * Subscribes to incoming notifications and calls onCode whenever one carries
 * an OTP payload. Returns an unsubscribe function — call it in a useEffect cleanup.
 */
export function listenForOtpNotification(onCode: (code: string) => void): () => void {
    const subscription = Notifications.addNotificationReceivedListener((notification) => {
        const data = notification.request.content.data as { type?: string; code?: string } | undefined;
        if (data?.type === 'otp_code' && typeof data.code === 'string') {
            onCode(data.code);
        }
    });
    return () => subscription.remove();
}