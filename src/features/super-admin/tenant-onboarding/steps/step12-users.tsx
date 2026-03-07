/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Text } from '@/components/ui';

import { AddButton, ChipSelector, DeleteButton, FormInput } from '../atoms';
import { S } from '../shared-styles';
import type { UserItem } from '../types';

const USER_ROLES = [
    'Company Admin', 'HR Manager', 'Finance Manager', 'Operations Manager',
    'HR Executive', 'Payroll Executive', 'Plant Supervisor', 'Attendance Operator',
    'Quality Inspector', 'Auditor',
];

export function Step12Users({
    users,
    setUsers,
    errors,
}: {
    users: UserItem[];
    setUsers: (u: UserItem[]) => void;
    errors?: Record<string, string>;
}) {
    const addUser = () => {
        setUsers([
            ...users,
            {
                id: Date.now().toString(),
                fullName: '',
                username: '',
                password: '',
                role: 'Company Admin',
                email: '',
                mobile: '',
                department: '',
            },
        ]);
    };

    const update = (id: string, updates: Partial<UserItem>) => {
        setUsers(users.map((u) => (u.id === id ? { ...u, ...updates } : u)));
    };

    const remove = (id: string) => {
        setUsers(users.filter((u) => u.id !== id));
    };

    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            <View style={S.infoCard}>
                <Text className="font-inter text-sm text-neutral-600">
                    Create the initial set of users for this tenant. The Company Admin user is
                    required to allow the tenant to log in and complete their own configuration.
                </Text>
            </View>

            {users.map((user, idx) => (
                <Animated.View key={user.id} entering={FadeIn.duration(250)} style={S.itemCard}>
                    <View style={S.itemCardHeader}>
                        <View style={S.itemCardBadge}>
                            <Text className="font-inter text-xs font-bold text-primary-700">
                                User {idx + 1}
                                {user.role === 'Company Admin' ? ' — Admin' : ''}
                            </Text>
                        </View>
                        <DeleteButton onPress={() => remove(user.id)} />
                    </View>

                    <FormInput
                        label="Full Name"
                        placeholder="Full name"
                        value={user.fullName}
                        onChangeText={(v) => update(user.id, { fullName: v })}
                        required
                        autoCapitalize="words"
                        error={errors?.[`fullName_${idx}`]}
                    />
                    <FormInput
                        label="Username / Email"
                        placeholder="admin@company.com"
                        value={user.username}
                        onChangeText={(v) => update(user.id, { username: v })}
                        required
                        keyboardType="email-address"
                        autoCapitalize="none"
                        error={errors?.[`username_${idx}`]}
                    />
                    <FormInput
                        label="Password"
                        placeholder="Set initial password"
                        value={user.password}
                        onChangeText={(v) => update(user.id, { password: v })}
                        required
                        autoCapitalize="none"
                        secureTextEntry
                        hint="Employee must reset on first login"
                        error={errors?.[`password_${idx}`]}
                    />
                    <ChipSelector
                        label="Role"
                        options={USER_ROLES}
                        selected={user.role}
                        onSelect={(v) => update(user.id, { role: v })}
                        required
                        error={errors?.[`role_${idx}`]}
                    />
                    <FormInput
                        label="Email"
                        placeholder="user@company.com"
                        value={user.email}
                        onChangeText={(v) => update(user.id, { email: v })}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        error={errors?.[`email_${idx}`]}
                    />
                    <FormInput
                        label="Mobile"
                        placeholder="+91 98765 43210"
                        value={user.mobile}
                        onChangeText={(v) => update(user.id, { mobile: v })}
                        keyboardType="phone-pad"
                        error={errors?.[`mobile_${idx}`]}
                    />
                    <FormInput
                        label="Department"
                        placeholder="HR, Finance, IT"
                        value={user.department}
                        onChangeText={(v) => update(user.id, { department: v })}
                        autoCapitalize="words"
                    />
                </Animated.View>
            ))}

            <AddButton onPress={addUser} label="Add User" />
        </Animated.View>
    );
}
