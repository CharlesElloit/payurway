import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
} from 'react-native';

interface Account {
    id: string;
    name: string;
    balance: number;
}

interface Props {
    accounts: Account[];
    selectedAccount: string;
    onSelect: (accountId: string) => void;
}

export default function AccountSelector({
    accounts,
    selectedAccount,
    onSelect,
}: Props) {
    return (
        <View style={styles.container}>
            <Text style={styles.label}>Select Account</Text>

            {accounts.map(account => {
                const selected = selectedAccount === account.id;

                return (
                    <TouchableOpacity
                        key={account.id}
                        activeOpacity={0.8}
                        onPress={() => onSelect(account.id)}
                        style={[
                            styles.accountRow,
                            selected && styles.accountRowSelected,
                        ]}
                    >
                        <View>
                            <Text
                                style={[
                                    styles.accountName,
                                    selected && styles.accountNameSelected,
                                ]}
                            >
                                {account.name}
                            </Text>

                            <Text style={styles.accountBalance}>
                                UGX {account.balance.toLocaleString()}
                            </Text>
                        </View>

                        {selected && (
                            <View style={styles.checkBadge}>
                                <Text style={styles.checkText}>✓</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginTop: 20,
    },

    label: {
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 12,
        color: '#FFFFFF',
    },

    accountRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',

        backgroundColor: '#1D1F28',
        borderRadius: 16,

        paddingHorizontal: 16,
        paddingVertical: 16,

        marginBottom: 12,

        borderWidth: 1,
        borderColor: 'transparent',
    },

    accountRowSelected: {
        borderColor: '#21C063',
        backgroundColor: 'rgba(33,192,99,0.12)',
    },

    accountName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
    },

    accountNameSelected: {
        color: '#21C063',
    },

    accountBalance: {
        marginTop: 4,
        fontSize: 13,
        color: '#B0B6C3',
    },

    checkBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,

        backgroundColor: '#21C063',

        alignItems: 'center',
        justifyContent: 'center',
    },

    checkText: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
});