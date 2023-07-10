/**
 * Scripts for nostr postr
 */

import * as postr from './postr.jsx';

// query the nostr postr element
const nostr_postr_element = document.getElementById('nostr-postr-app');

// initialize nostr postr element
if (nostr_postr_element) {
    postr.init(nostr_postr_element);
}