import { DeviceEventEmitter, type EmitterSubscription } from 'react-native';

export const EventBus = {
  emit: (event: string, data?: unknown): void => {
    DeviceEventEmitter.emit(event, data);
  },
  on: (event: string, cb: (data: unknown) => void): EmitterSubscription => {
    return DeviceEventEmitter.addListener(event, cb);
  },
};
