import './src/polyfills'; // must stay first
import { registerRootComponent } from 'expo';

import Root from './src/Root';

// registerRootComponent calls AppRegistry.registerComponent('main', () => Root);
// Root loads App and shows any startup error on screen instead of closing.
registerRootComponent(Root);
