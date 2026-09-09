module.exports = {
  preset: '@react-native/jest-preset',
  setupFiles: ['./jest.setup.js'],
  moduleNameMapper: {
    '^@react-native-async-storage/async-storage$': '@react-native-async-storage/async-storage/jest',
  },
  // Broad ESM-shipping RN package family (react-native-*, @react-native-*, @react-navigation/*
  // and their transitive deps like react-native-tab-view) needs Babel transformation too —
  // node_modules is otherwise skipped by default.
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native(-.*)?|@react-navigation|react-native-.*)/)',
  ],
};
