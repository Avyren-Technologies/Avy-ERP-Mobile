/* eslint-disable better-tailwindcss/no-unknown-classes */
import * as React from 'react';
import { View } from 'react-native';
import Animated, { FadeIn, FadeInUp } from 'react-native-reanimated';

import { Text } from '@/components/ui';

import {
    AddButton,
    ChipSelector,
    DeleteButton,
    FormInput,
    PhoneInput,
} from '../atoms';
import { CONTACT_TYPES } from '../constants';
import { S } from '../shared-styles';
import type { Contact } from '../types';

export function Step6Contacts({
    contacts,
    setContacts,
    errors,
}: {
    contacts: Contact[];
    setContacts: (c: Contact[]) => void;
    errors?: Record<string, string>;
}) {
    const addContact = () => {
        setContacts([
            ...contacts,
            {
                id: Date.now().toString(),
                name: '',
                designation: '',
                department: '',
                countryCode: '+91',
                mobile: '',
                email: '',
                type: 'Primary',
                linkedin: '',
            },
        ]);
    };

    const update = (id: string, updates: Partial<Contact>) => {
        setContacts(contacts.map((c) => (c.id === id ? { ...c, ...updates } : c)));
    };

    const remove = (id: string) => {
        setContacts(contacts.filter((c) => c.id !== id));
    };

    return (
        <Animated.View entering={FadeInUp.duration(300)}>
            {contacts.map((contact, idx) => (
                <Animated.View
                    key={contact.id}
                    entering={FadeIn.duration(250)}
                    style={S.itemCard}
                >
                    <View style={S.itemCardHeader}>
                        <View style={S.itemCardBadge}>
                            <Text className="font-inter text-xs font-bold text-primary-700">
                                Contact {idx + 1}
                            </Text>
                        </View>
                        <DeleteButton onPress={() => remove(contact.id)} />
                    </View>

                    <FormInput
                        label="Contact Name"
                        placeholder="Full name"
                        value={contact.name}
                        onChangeText={(v) => update(contact.id, { name: v })}
                        required
                        autoCapitalize="words"
                        error={errors?.[`name_${idx}`]}
                    />

                    <View style={S.twoColumn}>
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="Designation"
                                placeholder="CEO, CHRO, CFO"
                                value={contact.designation}
                                onChangeText={(v) => update(contact.id, { designation: v })}
                                autoCapitalize="words"
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <FormInput
                                label="Department"
                                placeholder="HR, Finance, IT"
                                value={contact.department}
                                onChangeText={(v) => update(contact.id, { department: v })}
                                autoCapitalize="words"
                            />
                        </View>
                    </View>

                    <PhoneInput
                        label="Mobile Number"
                        countryCode={contact.countryCode}
                        phone={contact.mobile}
                        onCountryCodeChange={(c) => update(contact.id, { countryCode: c })}
                        onPhoneChange={(p) => update(contact.id, { mobile: p })}
                        required
                        error={errors?.[`mobile_${idx}`]}
                    />

                    <FormInput
                        label="Email Address"
                        placeholder="contact@company.com"
                        value={contact.email}
                        onChangeText={(v) => update(contact.id, { email: v })}
                        required
                        keyboardType="email-address"
                        autoCapitalize="none"
                        error={errors?.[`email_${idx}`]}
                    />

                    <ChipSelector
                        label="Contact Type"
                        options={CONTACT_TYPES}
                        selected={contact.type}
                        onSelect={(v) => update(contact.id, { type: v })}
                    />

                    <FormInput
                        label="LinkedIn Profile"
                        placeholder="https://linkedin.com/in/username"
                        value={contact.linkedin}
                        onChangeText={(v) => update(contact.id, { linkedin: v })}
                        keyboardType="url"
                        autoCapitalize="none"
                        error={errors?.[`linkedin_${idx}`]}
                    />
                </Animated.View>
            ))}

            <AddButton onPress={addContact} label="Add Contact" />
        </Animated.View>
    );
}
