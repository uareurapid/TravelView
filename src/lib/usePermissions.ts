import { useEffect, useState, useCallback } from 'react';
import * as MediaLibrary from 'expo-media-library';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERMISSION_REQUESTED_KEY = '@permissions_requested';

interface PermissionState {
  photoPermission: MediaLibrary.PermissionStatus | null;
  hasRequestedOnce: boolean;
  isLoading: boolean;
}

export function usePhotoPermissions() {
  const [state, setState] = useState<PermissionState>({
    photoPermission: null,
    hasRequestedOnce: false,
    isLoading: true,
  });

  // Check current permission status and if we've requested before
  const checkPermissions = useCallback(async () => {
    const [permissionResponse, requestedBefore] = await Promise.all([
      MediaLibrary.getPermissionsAsync(),
      AsyncStorage.getItem(PERMISSION_REQUESTED_KEY),
    ]);

    setState({
      photoPermission: permissionResponse.status,
      hasRequestedOnce: requestedBefore === 'true',
      isLoading: false,
    });

    return {
      status: permissionResponse.status,
      hasRequestedOnce: requestedBefore === 'true',
    };
  }, []);

  // Request photo permissions
  const requestPhotoPermission = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));

    const permissionResponse = await MediaLibrary.requestPermissionsAsync();

    // Mark that we've requested permissions at least once
    await AsyncStorage.setItem(PERMISSION_REQUESTED_KEY, 'true');

    setState({
      photoPermission: permissionResponse.status,
      hasRequestedOnce: true,
      isLoading: false,
    });

    return permissionResponse.status;
  }, []);

  // Initialize on mount
  useEffect(() => {
    checkPermissions();
  }, [checkPermissions]);

  return {
    ...state,
    isGranted: state.photoPermission === 'granted',
    isDenied: state.photoPermission === 'denied',
    requestPhotoPermission,
    checkPermissions,
  };
}
