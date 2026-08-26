import AsyncStorage from '@react-native-async-storage/async-storage';

export type BiometricType = 'fingerprint' | 'face' | 'voice';

export interface BiometricPrefs {
  enabled: boolean;
  type: BiometricType;
  isDefault: boolean;
  credentialId?: string | null;
}

export const BIOMETRIC_PREFS_KEY = 'pmb_biometric_prefs';
export const BIOMETRIC_CREDENTIAL_KEY = 'pmb_biometric_credential';

const DEFAULT_PREFS: BiometricPrefs = {
  enabled: false,
  type: 'fingerprint',
  isDefault: false,
  credentialId: null,
};

export async function getBiometricPrefs(): Promise<BiometricPrefs> {
  try {
    const raw = await AsyncStorage.getItem(BIOMETRIC_PREFS_KEY);
    if (!raw) return { ...DEFAULT_PREFS };
    const parsed = JSON.parse(raw) as Partial<BiometricPrefs>;
    return {
      enabled: !!parsed.enabled,
      type: (parsed.type as BiometricType) || 'fingerprint',
      isDefault: !!parsed.isDefault,
      credentialId: parsed.credentialId ?? null,
    };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export async function setBiometricPrefs(prefs: BiometricPrefs): Promise<void> {
  await AsyncStorage.setItem(BIOMETRIC_PREFS_KEY, JSON.stringify(prefs));
}

export async function updateBiometricPrefs(
  patch: Partial<BiometricPrefs>
): Promise<BiometricPrefs> {
  const current = await getBiometricPrefs();
  const next = { ...current, ...patch };
  await setBiometricPrefs(next);
  return next;
}

export async function clearBiometricPrefs(): Promise<void> {
  await AsyncStorage.multiRemove([BIOMETRIC_PREFS_KEY, BIOMETRIC_CREDENTIAL_KEY]);
}

export function getBiometricIconName(
  type: BiometricType
): 'finger-print' | 'scan-outline' | 'mic-outline' {
  switch (type) {
    case 'face':
      return 'scan-outline';
    case 'voice':
      return 'mic-outline';
    default:
      return 'finger-print';
  }
}

export function getBiometricLabel(type: BiometricType): string {
  switch (type) {
    case 'face':
      return 'Face';
    case 'voice':
      return 'Voice';
    default:
      return 'Fingerprint';
  }
}
