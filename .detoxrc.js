/** @type {Detox.DetoxConfig} */
module.exports = {
  logger: {
    level: process.env.CI ? 'debug' : 'info',
  },

  testRunner: {
    $0: 'jest',
    args: {
      config: 'e2e/jest.config.ts',
      _: ['e2e'],
    },
    jest: {
      setupTimeout: 300000,
      teardownTimeout: 30000,
      reportSpecs: true,
      reportWorkerAssign: true,
    },
  },

  apps: {
    // iOS Debug — built via expo prebuild + xcodebuild
    'ios.debug': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Debug-iphonesimulator/avyerpapp.app',
      build: [
        'cd ios &&',
        'xcodebuild',
        '-workspace avyerpapp.xcworkspace',
        '-scheme avyerpapp',
        '-configuration Debug',
        '-sdk iphonesimulator',
        '-derivedDataPath build',
        '-quiet',
      ].join(' '),
    },

    // iOS Release
    'ios.release': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/avyerpapp.app',
      build: [
        'cd ios &&',
        'xcodebuild',
        '-workspace avyerpapp.xcworkspace',
        '-scheme avyerpapp',
        '-configuration Release',
        '-sdk iphonesimulator',
        '-derivedDataPath build',
        '-quiet',
      ].join(' '),
    },

    // Android Debug
    'android.debug': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/debug/app-debug.apk',
      build: 'cd android && ./gradlew assembleDebug assembleAndroidTest -DtestBuildType=debug -x lint',
      reversePorts: [3030],
    },

    // Android Release
    'android.release': {
      type: 'android.apk',
      binaryPath: 'android/app/build/outputs/apk/release/app-release.apk',
      build: 'cd android && ./gradlew assembleRelease assembleAndroidTest -DtestBuildType=release -x lint',
    },
  },

  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 16',
      },
    },
    emulator: {
      type: 'android.emulator',
      device: {
        avdName: 'Pixel_7_API_34',
      },
    },
    attached: {
      type: 'android.attached',
      device: {
        adbName: '.*',
      },
    },
  },

  configurations: {
    // Primary: iOS debug on simulator
    'ios.sim.debug': {
      device: 'simulator',
      app: 'ios.debug',
    },
    'ios.sim.release': {
      device: 'simulator',
      app: 'ios.release',
    },
    // Android debug on emulator
    'android.emu.debug': {
      device: 'emulator',
      app: 'android.debug',
    },
    'android.emu.release': {
      device: 'emulator',
      app: 'android.release',
    },
    // Android debug on attached device
    'android.att.debug': {
      device: 'attached',
      app: 'android.debug',
    },
  },

  artifacts: {
    rootDir: 'e2e/artifacts',
    plugins: {
      screenshot: {
        shouldTakeAutomaticSnapshots: true,
        keepOnlyFailedTestsArtifacts: true,
        takeWhen: {
          testStart: false,
          testDone: true,
        },
      },
      log: 'failing',
      video: 'failing',
    },
  },

  behavior: {
    init: {
      exposeGlobals: true,
    },
    cleanup: {
      shutdownDevice: false,
    },
  },
};
