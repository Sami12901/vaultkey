import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  BackHandler,
} from 'react-native';
import { useTheme } from '../../theme';
import { ShieldAlertIcon } from '../icons';

interface SecurityWarningModalProps {
  visible: boolean;
  threats: string[];
  onAcknowledge: () => void;
}

export const SecurityWarningModal: React.FC<SecurityWarningModalProps> = ({
  visible,
  threats,
  onAcknowledge,
}) => {
  const { colors } = useTheme();

  const getThreatLabel = (threat: string) => {
    switch (threat) {
      case 'ROOT_SU_BINARY':
        return 'Root superuser binary found (/system/bin/su)';
      case 'ROOT_MANAGEMENT_APP':
        return 'Root management framework installed (Magisk / KernelSU)';
      case 'TEST_KEYS_FIRMWARE':
        return 'Uncertified test-keys firmware build detected';
      case 'MAGISK_ZYGISK_MOUNT':
        return 'Magisk / Zygisk system overlays active in memory';
      case 'FRIDA_SERVER_PORT':
        return 'Frida instrumentation server active on localhost (Port 27042)';
      case 'FRIDA_HOOK_MEMORY':
        return 'Frida / Xposed dynamic hooking libraries loaded in app process';
      case 'DEBUGGER_CONNECTED':
        return 'Active debugger or dynamic tracer connected to app';
      case 'PTRACE_TRACER_ATTACHED':
        return 'ptrace process tracer attached (TracerPid != 0)';
      default:
        return threat;
    }
  };

  const handleExitApp = () => {
    BackHandler.exitApp();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onAcknowledge}>
      <View style={styles.overlay}>
        <View style={[styles.dialog, { backgroundColor: colors.surface, borderColor: '#EF4444' }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <ShieldAlertIcon size={26} color="#EF4444" />
            </View>
            <View style={styles.titleArea}>
              <Text style={styles.title}>Security Alert: Untrusted Device</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Potential device integrity compromise detected
              </Text>
            </View>
          </View>

          {/* Description */}
          <Text style={[styles.description, { color: colors.textSecondary }]}>
            VaultKey detected signs of root access, reverse-engineering tools, or hooking frameworks. Running a zero-knowledge password manager in this environment may compromise hardware keystores and allow external processes to inspect decrypted secrets.
          </Text>

          {/* Threats List */}
          <Text style={[styles.threatsLabel, { color: colors.text }]}>Detected Indicators:</Text>
          <ScrollView style={[styles.threatsBox, { backgroundColor: colors.background, borderColor: colors.border }]} nestedScrollEnabled>
            {threats.length > 0 ? (
              threats.map((t, idx) => (
                <View key={idx} style={styles.threatRow}>
                  <Text style={styles.bullet}>•</Text>
                  <Text style={[styles.threatText, { color: '#F87171' }]}>{getThreatLabel(t)}</Text>
                </View>
              ))
            ) : (
              <View style={styles.threatRow}>
                <Text style={styles.bullet}>•</Text>
                <Text style={[styles.threatText, { color: '#F87171' }]}>Root or dynamic instrumentation detected</Text>
              </View>
            )}
          </ScrollView>

          {/* Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.btnExit, { borderColor: '#EF4444' }]}
              onPress={handleExitApp}
            >
              <Text style={styles.btnExitText}>Exit App</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.btnProceed, { backgroundColor: '#EF4444' }]}
              onPress={onAcknowledge}
            >
              <Text style={styles.btnProceedText}>Proceed at Own Risk</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  dialog: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  titleArea: {
    flex: 1,
  },
  title: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  threatsLabel: {
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  threatsBox: {
    maxHeight: 120,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginBottom: 18,
  },
  threatRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  bullet: {
    color: '#EF4444',
    marginRight: 6,
    fontSize: 14,
  },
  threatText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
    fontWeight: '600',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  btnExit: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnExitText: {
    color: '#EF4444',
    fontSize: 13,
    fontWeight: '700',
  },
  btnProceed: {
    flex: 1.3,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnProceedText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
});
