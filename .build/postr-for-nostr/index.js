/**
 * Scripts for postr for nostr
 */

import * as postr from './postr.jsx';

// query the postr for nostr element
const nostr_postr_element = document.getElementById('postr-for-nostr-app');

// initialize postr for nostr element
if (nostr_postr_element) {
    postr.init(nostr_postr_element);
}