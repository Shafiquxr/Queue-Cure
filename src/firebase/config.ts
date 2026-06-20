'use client';

/**
 * FIREBASE CONFIGURATION
 * 
 * If your app still says "API Key Not Valid", please paste the values 
 * from your Firebase Console (Project Settings > Your Apps) here.
 */

export const firebaseConfig = {
  // PASTE YOUR API KEY HERE
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "mock-api-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "studio-8955054813-249c0.firebaseapp.com",
  projectId: "studio-8955054813-249c0",
  storageBucket: "studio-8955054813-249c0.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "mock-sender-id",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "mock-app-id"
};
