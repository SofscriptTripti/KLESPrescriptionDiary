import React from 'react';
import { Image, StyleSheet } from 'react-native';
import { radius } from '../theme';

const maleIcon = require('../assets/images/male_icon.png');
const femaleIcon = require('../assets/images/female_icon.png');

interface GenderAvatarProps {
  gender: string;
  size?: number;
}

/** Matches PatientModel.Photo — male_icon.png / female_icon.png by PATIENT_GENDER. */
export function GenderAvatar({ gender, size = 56 }: GenderAvatarProps) {
  const source = gender === 'M' ? maleIcon : femaleIcon;
  return (
    <Image
      source={source}
      style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  avatar: { borderRadius: radius.pill },
});
