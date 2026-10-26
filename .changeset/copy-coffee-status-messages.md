---
'@j0nathan-ll0yd/copy': minor
---

Add the coffee status badge messages and the connection badge accessibility template, so the iOS coffee reducer reads its status text through `CopyLoader` instead of hardcoded strings (atlas plan coffee-reconnect-and-finish-2026-10-26, review finding I2).

- `widgets.coffee.statusOffline`, `statusStreamPaused`, `statusReconnectFailed`, `statusReconnectFailedTracked`, `statusBluetoothUnavailable` and `statusBluetoothDenied`: the `errorMessage` text the status badge shows for each link state. Raw CoreBluetooth error text is never shown again.
- `a11y.coffee.connectionStatus`: the `Scale connection: {status}` VoiceOver template for every badge mode. It replaces a hardcoded literal in the badge.
- The `_meta` provenance of the coffee primary-action keys names the new call sites. No existing value changes.
