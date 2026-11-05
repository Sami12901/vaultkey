import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
} from 'react-native';
import { useTheme } from '../../theme';
import {
  CloseIcon,
  LockIcon,
  LaptopIcon,
  CloudUploadIcon,
} from '../icons';

interface CloudSyncGuideModalProps {
  visible: boolean;
  onClose: () => void;
}

export const CloudSyncGuideModal: React.FC<CloudSyncGuideModalProps> = ({
  visible,
  onClose,
}) => {
  const { colors } = useTheme();
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      step: '01 / 03',
      title: 'Zero-Knowledge Encryption',
      titleBn: '১০০% জিরো-নলেজ এনক্রিপশন',
      desc: 'Your credentials and 2FA codes are encrypted on your phone using AES-256-GCM before leaving the device. Even Google cannot see your passwords.',
      descBn: 'আপনার পাসওয়ার্ড এবং 2FA কোড আপনার ফোনেই লক করা হয়। গুগল ড্রাইভ কেবল হিজিবিজি ফাইল দেখবে, আপনার মাস্টার পাসওয়ার্ড ছাড়া এটি খোলা অসম্ভব!',
      icon: <LockIcon size={32} color="#10B981" />,
      graphicBg: 'rgba(16, 185, 129, 0.12)',
      graphicBorder: '#10B981',
      graphicLabel: 'Device Enclave [Encrypted AES-256]',
    },
    {
      step: '02 / 03',
      title: 'Instant Wi-Fi LAN Sync',
      titleBn: 'দ্রুত ওয়াই-ফাই লোকাল সিঙ্ক',
      desc: 'Sync directly between your phone and Windows PC over your local Wi-Fi network without sending any data over the public internet.',
      descBn: 'একই ওয়াইফাইতে থাকলে কোনো ইন্টারনেট ছাড়াই সরাসরি আপনার কম্পিউটার এবং মোবাইলের মধ্যে পাসওয়ার্ড ও কোড রিয়েল-টাইমে সিঙ্ক হবে।',
      icon: <LaptopIcon size={32} color="#3B82F6" />,
      graphicBg: 'rgba(59, 130, 246, 0.12)',
      graphicBorder: '#3B82F6',
      graphicLabel: 'Local P2P Handshake [No Cloud]',
    },
    {
      step: '03 / 03',
      title: 'Automated E2EE Cloud Recovery',
      titleBn: 'অটোমেটিক ক্লাউড রিকভারি',
      desc: 'If you ever switch phones or reinstall, import your master-password encrypted backup in 1-click and restore all your passwords and authenticators.',
      descBn: 'নতুন ফোন কিনলে বা উইন্ডোজ পিসিতে লগইন করলেই মাস্টার পাসওয়ার্ড দিয়ে নিমেষেই সমস্ত 2FA কোড ও পাসওয়ার্ড ফিরে পান।',
      icon: <CloudUploadIcon size={32} color="#8B5CF6" />,
      graphicBg: 'rgba(139, 92, 246, 0.12)',
      graphicBorder: '#8B5CF6',
      graphicLabel: 'E2EE .vaultkey Storage [Encrypted]',
    },
  ];

  const slide = slides[currentSlide];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: colors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.stepBadge}>
              <Text style={styles.stepBadgeText}>{slide.step}</Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <CloseIcon size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Graphic Animation Card */}
          <View
            style={[
              styles.graphicCard,
              {
                backgroundColor: slide.graphicBg,
                borderColor: slide.graphicBorder,
              },
            ]}
          >
            <View style={styles.graphicIconWrapper}>
              {slide.icon}
            </View>
            <View style={styles.pulseBar}>
              <View style={[styles.pulseDot, { backgroundColor: slide.graphicBorder }]} />
              <View style={[styles.pulseLine, { backgroundColor: slide.graphicBorder }]} />
              <View style={[styles.pulseDot, { backgroundColor: slide.graphicBorder }]} />
            </View>
            <Text style={[styles.graphicLabelText, { color: colors.text }]}>{slide.graphicLabel}</Text>
          </View>

          {/* Titles */}
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>{slide.title}</Text>
            <Text style={[styles.titleBn, { color: '#10B981' }]}>{slide.titleBn}</Text>

            <Text style={[styles.desc, { color: colors.textSecondary }]}>{slide.desc}</Text>
            <Text style={[styles.descBn, { color: colors.text }]}>{slide.descBn}</Text>
          </View>

          {/* Pagination Indicators */}
          <View style={styles.indicatorRow}>
            {slides.map((_, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => setCurrentSlide(idx)}
                style={[
                  styles.dot,
                  {
                    backgroundColor: idx === currentSlide ? colors.primary : 'rgba(255, 255, 255, 0.15)',
                    width: idx === currentSlide ? 22 : 6,
                  },
                ]}
              />
            ))}
          </View>

          {/* Footer Controls */}
          <View style={styles.footer}>
            {currentSlide > 0 ? (
              <TouchableOpacity
                style={[styles.btnSecondary, { borderColor: colors.border }]}
                onPress={() => setCurrentSlide(s => s - 1)}
              >
                <Text style={[styles.btnSecondaryText, { color: colors.textSecondary }]}>Previous</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flex: 1 }} />
            )}

            {currentSlide < slides.length - 1 ? (
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
                onPress={() => setCurrentSlide(s => s + 1)}
              >
                <Text style={styles.btnPrimaryText}>Next Step &rarr;</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.btnPrimary, { backgroundColor: colors.primary }]}
                onPress={onClose}
              >
                <Text style={styles.btnPrimaryText}>Got It • Close</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 18,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  stepBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  stepBadgeText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: 'Courier',
  },
  graphicCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  graphicIconWrapper: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  graphicBadgeText: {
    fontSize: 26,
  },
  pulseBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  pulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  pulseLine: {
    width: 60,
    height: 2,
    borderRadius: 1,
    opacity: 0.6,
  },
  graphicLabelText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  content: {
    marginBottom: 16,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 2,
  },
  titleBn: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  desc: {
    fontSize: 12.5,
    lineHeight: 18,
    marginBottom: 6,
  },
  descBn: {
    fontSize: 12,
    lineHeight: 17,
    opacity: 0.9,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    marginBottom: 18,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  btnSecondary: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontSize: 13,
    fontWeight: '600',
  },
  btnPrimary: {
    flex: 1.5,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
