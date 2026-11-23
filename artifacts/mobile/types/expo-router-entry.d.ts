/**
 * Type declaration for `expo-router/entry`.
 *
 * `expo-router` ships `entry.js` without a matching `entry.d.ts` (verified
 * against the published 6.0.24 tarball), so any file importing the subpath
 * fails with TS7016 under `noImplicitAny`. `App.tsx` is the only importer and
 * is bypassed at runtime because `package.json#main` points directly at
 * `expo-router/entry`.
 */
declare module "expo-router/entry" {
  import type { ComponentType } from "react";

  const Entry: ComponentType;
  export default Entry;
}
