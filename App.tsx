/**
 * Sample React Native App
 * https://github.com/facebook/react-native
 *
 * @format
 */

import { useState } from 'react';
import {
  Button,
  Image,
  SafeAreaView,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
import { initiateEkeyLogin, type EkeyLoginResult } from 'ekey-react-native-sdk';

const PHOTO_KEYS = new Set(['urn:oneid:ekyc:bhr:person_photo', 'urn:oneid:ekyc:bhr:signature_photo']);

function DataRow({ label, value }: { label: string; value: unknown }) {
  if (value == null || value === '') return null;

  if (PHOTO_KEYS.has(label) && typeof value === 'string') {
    return (
      <View style={styles.row}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Image source={{ uri: `data:image/jpeg;base64,${value}` }} style={styles.photo} resizeMode="contain" />
      </View>
    );
  }

  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{String(value)}</Text>
    </View>
  );
}

function DataSection({ title, data }: { title: string; data?: Record<string, unknown> }) {
  if (!data) return null;
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {Object.entries(data).map(([key, value]) => (
        <DataRow key={key} label={key} value={value} />
      ))}
    </View>
  );
}

function App() {
  const isDarkMode = useColorScheme() === 'dark';
  const [result, setResult] = useState<EkeyLoginResult | null>(null);

  const onPress = async () => {
    const loginResult = await initiateEkeyLogin();
    console.log('Ekey login result:', loginResult);
    setResult(loginResult);
  };

  if (result?.status === 'completed') {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Text style={styles.title}>eKYC Data</Text>
          <DataSection title="Identity (ID Token Claims)" data={result.claims} />
          <DataSection title="KYC Data" data={result.kycData} />
          {!result.claims && !result.kycData && (
            <Text style={styles.rowValue}>
              No claims/kycData in this result — codeVerifier: {result.codeVerifier}
            </Text>
          )}
          <View style={styles.buttonSpacer}>
            <Button title="Start Over" onPress={() => setResult(null)} />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
      <Text style={styles.title}>Hello, NEC testing Flow!</Text>
      <Button title="Initiate Ekey Flow" onPress={onPress} />
      {result && (
        <Text style={styles.rowValue}>
          {result.status}
          {result.error ? `: ${result.error}` : ''}
        </Text>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  scrollContent: {
    padding: 16,
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  section: {
    gap: 4,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ccc',
    paddingVertical: 6,
  },
  rowLabel: {
    fontSize: 11,
    color: '#777',
  },
  rowValue: {
    fontSize: 14,
  },
  photo: {
    width: 160,
    height: 100,
    marginTop: 4,
    backgroundColor: '#eee',
  },
  buttonSpacer: {
    marginTop: 16,
  },
});

export default App;
