// AsyncStorage es un módulo nativo: en jest no existe y cualquier store que
// use `persist` revienta al importarse. El paquete trae su propio mock.
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest'),
);
