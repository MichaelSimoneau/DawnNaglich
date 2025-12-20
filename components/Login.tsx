import React, { useState } from 'react';
import { StyleSheet, View, Text, TextInput, TouchableOpacity, Image, KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator } from 'react-native';
import { auth, isDemo } from '../firebaseConfig';
import { GoogleAuthProvider, signInWithPopup, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { ADMIN_EMAILS } from '../constants';
import { User, UserRole } from '../types';

interface LoginProps {
  onLoginComplete?: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLoginComplete }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDemoLogin = (role: UserRole) => {
    if (onLoginComplete) {
      onLoginComplete({
        id: 'demo-user',
        email: role === UserRole.ADMIN ? 'don.negligent@gmail.com' : 'client@example.com',
        name: role === UserRole.ADMIN ? 'Dawn Naglich' : 'Valued Client',
        role: role
      });
    }
  };

  const handleGoogleLogin = async () => {
    if (isDemo) {
      handleDemoLogin(UserRole.CLIENT);
      return;
    }
    
    setLoading(true);
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar');
    provider.addScope('https://www.googleapis.com/auth/calendar.events');

    try {
      if (auth) {
        await signInWithPopup(auth, provider);
      }
    } catch (error) {
      console.error("Google Auth Error:", error);
      alert("Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async () => {
    if (isDemo) {
      const isAdmin = ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase());
      handleDemoLogin(isAdmin ? UserRole.ADMIN : UserRole.CLIENT);
      return;
    }

    if (!email || !password) return;
    setLoading(true);
    try {
      if (auth) {
        if (isSignUp) {
          await createUserWithEmailAndPassword(auth, email, password);
        } else {
          await signInWithEmailAndPassword(auth, email, password);
        }
      }
    } catch (error: any) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.brandSection}>
          <View style={styles.logoBox}>
            <Text style={styles.logoEmoji}>🌿</Text>
          </View>
          <Text style={styles.brandName}>Dawn Naglich</Text>
          <Text style={styles.brandTagline}>WELLNESS & MUSCLE ACTIVATION</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardTitle}>{isSignUp ? 'Create an Account' : 'Secure Sign In'}</Text>

          {isDemo && (
            <View style={styles.demoSection}>
              <Text style={styles.demoLabel}>Demo Shortcuts</Text>
              <View style={styles.demoBtnRow}>
                <TouchableOpacity onPress={() => handleDemoLogin(UserRole.ADMIN)} style={styles.demoAdminBtn}>
                  <Text style={styles.demoBtnText}>Login as Dawn</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDemoLogin(UserRole.CLIENT)} style={styles.demoClientBtn}>
                  <Text style={styles.demoBtnText}>Login as Client</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          <TouchableOpacity 
            style={styles.googleBtn}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#064E3B" /> : (
              <>
                <Image 
                  source={{ uri: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg' }} 
                  style={styles.googleIcon} 
                />
                <Text style={styles.googleBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR EMAIL</Text>
            <View style={styles.dividerLine} />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>EMAIL ADDRESS</Text>
            <TextInput
              style={styles.input}
              placeholder="name@example.com"
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor="#94A3B8"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          <TouchableOpacity style={styles.submitBtn} onPress={handleEmailAuth} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : (
              <Text style={styles.submitBtnText}>{isSignUp ? 'Sign Up' : 'Sign In'}</Text>
            )}
          </TouchableOpacity>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}
            </Text>
            <TouchableOpacity onPress={() => setIsSignUp(!isSignUp)}>
              <Text style={styles.footerLink}>
                {isSignUp ? ' Sign In' : ' Create One'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#022C22' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 25 },
  brandSection: { alignItems: 'center', marginBottom: 40 },
  logoBox: { width: 80, height: 80, backgroundColor: '#10B981', borderRadius: 24, justifyContent: 'center', alignItems: 'center', transform: [{ rotate: '3deg' }], shadowColor: '#10B981', shadowOpacity: 0.2, shadowRadius: 15, marginBottom: 20 },
  logoEmoji: { fontSize: 32 },
  brandName: { fontSize: 36, fontWeight: '700', color: '#ECFDF5' },
  brandTagline: { fontSize: 10, fontWeight: '800', color: '#10B981', opacity: 0.6, letterSpacing: 2 },
  card: { backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 40, padding: 30, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardTitle: { fontSize: 24, fontWeight: '700', color: '#FFF', marginBottom: 25 },
  googleBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ECFDF5', borderRadius: 20, padding: 14, marginBottom: 25 },
  googleIcon: { width: 20, height: 20, marginRight: 12 },
  googleBtnText: { color: '#064E3B', fontWeight: '600', fontSize: 16 },
  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 25 },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.1)' },
  dividerText: { marginHorizontal: 15, color: '#10B981', fontSize: 10, fontWeight: '800', opacity: 0.5 },
  inputGroup: { marginBottom: 20 },
  label: { fontSize: 10, fontWeight: '800', color: '#10B981', marginBottom: 8, marginLeft: 4, opacity: 0.8 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 20, paddingHorizontal: 20, paddingVertical: 14, fontSize: 16, color: '#FFF' },
  submitBtn: { backgroundColor: '#10B981', borderRadius: 20, paddingVertical: 16, alignItems: 'center', shadowColor: '#10B981', shadowOpacity: 0.3, shadowRadius: 10, marginTop: 10 },
  submitBtnText: { color: '#022C22', fontSize: 18, fontWeight: '700' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 30 },
  footerText: { color: '#94A3B8', fontSize: 14 },
  footerLink: { color: '#10B981', fontWeight: '700', fontSize: 14 },
  demoSection: { marginBottom: 24, padding: 16, backgroundColor: 'rgba(16, 185, 129, 0.1)', borderRadius: 16, borderWidth: 1, borderColor: 'rgba(16, 185, 129, 0.2)' },
  demoLabel: { fontSize: 10, fontWeight: '900', color: '#10B981', textTransform: 'uppercase', marginBottom: 8 },
  demoBtnRow: { flexDirection: 'row', gap: 8 },
  demoAdminBtn: { flex: 1, backgroundColor: '#059669', paddingVertical: 8, borderRadius: 12 },
  demoClientBtn: { flex: 1, backgroundColor: '#10B981', paddingVertical: 8, borderRadius: 12 },
  demoBtnText: { color: '#FFF', textAlign: 'center', fontWeight: '700', fontSize: 12 },
});

export default Login;