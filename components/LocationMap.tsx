import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Linking, Platform } from 'react-native';

const ADDRESS = "8430 Mayfield Rd., Chesterland, OH, 44024";
const MAPS_URL = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(ADDRESS)}`;

const LocationMap: React.FC<{ isInteractive: boolean }> = ({ isInteractive }) => {
  const handleGetDirections = () => {
    Linking.openURL(MAPS_URL);
  };

  return (
    <View style={styles.container}>
      <View 
        className={`absolute inset-0 transition-all duration-700 ${isInteractive ? 'opacity-100 pointer-events-auto' : 'opacity-60 pointer-events-none grayscale contrast-125'}`}
      >
        <iframe
          width="100%"
          height="100%"
          frameBorder="0"
          style={{ border: 0 }}
          src={`https://www.google.com/maps?q=${encodeURIComponent(ADDRESS)}&output=embed&z=15&t=m&hl=en`}
          allowFullScreen
        ></iframe>
      </View>
      
      {!isInteractive && (
        <View style={styles.overlay} pointerEvents="none">
          <View style={styles.markerCircle}>
            <Text className="fa-solid fa-location-dot text-emerald-400 text-3xl" />
          </View>
        </View>
      )}

      {/* Button only appears during/after interaction */}
      {isInteractive && (
        <View style={styles.controls}>
          <TouchableOpacity 
            onPress={handleGetDirections}
            style={styles.directionsBtn}
          >
            <Text className="fa-solid fa-diamond-turn-right text-emerald-950 mr-3" />
            <Text style={styles.btnText}>Get Directions</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#022C22',
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(2, 44, 34, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  markerCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    position: 'absolute',
    bottom: 120,
    alignSelf: 'center',
    zIndex: 50,
  },
  directionsBtn: {
    backgroundColor: '#10B981',
    paddingHorizontal: 30,
    paddingVertical: 18,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 10,
  },
  btnText: {
    color: '#022C22',
    fontWeight: '900',
    fontSize: 14,
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});

export default LocationMap;