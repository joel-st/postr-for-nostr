/**
 * Scripts for postr for nostr
 */

import * as postr from './postr.jsx';

// query the postr for nostr element
const postr_for_nostr_element = document.getElementById('postr-for-nostr-app');

// initialize postr for nostr element
if (postr_for_nostr_element) {
    postr.init(postr_for_nostr_element);
}