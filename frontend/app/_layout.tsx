import React, { useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, StyleSheet } from 'react-native';
import BetaGate, { hasBetaAccess } from './components/BetaGate';

export default function RootLayout() {
  const [hasAccess, setHasAccess] = useState(() => hasBetaAccess());

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      {hasAccess ? (
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: '#0A0A0A' },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="chat" />
          <Stack.Screen name="projects" />
          <Stack.Screen name="project-detail" />
          <Stack.Screen name="gallery" />
          <Stack.Screen name="gallery-detail" />
          <Stack.Screen name="messages" />
          <Stack.Screen name="contact" />
          <Stack.Screen name="patterns" />
          <Stack.Screen name="pattern-detail" />
          <Stack.Screen name="tools" />
          <Stack.Screen name="lexique" />
          <Stack.Screen name="tutorials" />
          <Stack.Screen name="tutorial-detail" />
          <Stack.Screen name="size-guide" />
          <Stack.Screen name="admin" />
        </Stack>
      ) : (
        <BetaGate onAccess={() => setHasAccess(true)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
});
