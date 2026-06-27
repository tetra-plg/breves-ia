import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerDMG } from '@electron-forge/maker-dmg';
import { VitePlugin } from '@electron-forge/plugin-vite';
import { FusesPlugin } from '@electron-forge/plugin-fuses';
import { FuseV1Options, FuseVersion } from '@electron/fuses';

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    appBundleId: 'com.tetra-plg.breves-ia',
    // electron-packager ajoute l'extension .icns sur macOS.
    icon: 'src/assets/icon',
    // Le SDK est externalisé (vite.main.config) et le plugin Forge-Vite supprime
    // node_modules du paquet → SDK introuvable au runtime. Il utilise aussi
    // import.meta.url + fork/spawn de fichiers siblings : il lui faut donc être
    // sur le vrai disque (hors asar). extraResource le copie dans
    // Contents/Resources/claude-agent-sdk. Le SDK n'a aucune dep transitive.
    extraResource: ['./node_modules/@anthropic-ai/claude-agent-sdk'],
    // Re-signe l'app (+ helpers + frameworks) APRÈS réécriture de l'Info.plist.
    // identity '-' = ad-hoc local (pas besoin de Developer ID). Sans ça,
    // la signature ad-hoc d'origine devient invalide et V8 crashe au boot
    // (EXC_BREAKPOINT) faute d'entitlement JIT sur Apple Silicon.
    osxSign: {
      identity: '-',
      // L'identité ad-hoc '-' n'est pas dans le keychain : sans ça, osx-sign
      // échoue à `security find-identity` et saute la signature en silence
      // (Forge force continueOnError), produisant une app non signée.
      identityValidation: false,
      optionsForFile: () => ({
        entitlements: 'build/entitlements.mac.plist',
        // PAS de hardened runtime : sur une signature ad-hoc (sans Team ID),
        // AMFI n'honore pas `allow-jit`. Le flag runtime restreindrait alors
        // le JIT de V8 → crash SIGTRAP au boot (sauf lancé depuis un terminal
        // en developer mode). Sans hardened runtime, le JIT est libre, comme
        // l'Electron de `npm start`. À réactiver le jour d'une vraie
        // signature Developer ID + notarisation.
        hardenedRuntime: false,
      }),
    },
  },
  rebuildConfig: {},
  makers: [new MakerDMG({}, ['darwin'])],
  plugins: [
    new VitePlugin({
      build: [
        { entry: 'src/main/index.ts', config: 'vite.main.config.ts', target: 'main' },
        { entry: 'src/preload/index.ts', config: 'vite.preload.config.ts', target: 'preload' },
      ],
      renderer: [{ name: 'main_window', config: 'vite.renderer.config.ts' }],
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
};

export default config;
