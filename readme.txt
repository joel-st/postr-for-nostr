=== Postr For Nostr ===

Contributors: joelmelon
Donate link: https://postr-for-nostr.joelstuedle.ch/
Tags: Nostr, Social, Sharing, NIP-07
Requires PHP: 7.4
Tested up to: 6.3.2
Stable tag: 1.0.0
License: GPLv3 or later
License URI: https://www.gnu.org/licenses/gpl-3.0.html

Share your WordPress Posts to Nostr with Postr For Nostr 🫂

== Features ==

* This plugin **works only with NIP-07 browser extensions**. No need to save your private key in WordPress.
* Add your taxonomy terms to the note as tag type `t`.
* Manage relays before postring.

== Demo ==

A demo WordPress installation with Postr For Nostr is available [here](https://postr-for-nostr.joelstuedle.ch/).

== Installation ==

1. Upload the `postr-for-nostr` folder to the `/wp-content/plugins/` directory
2. Activate the plugin through the `Plugins` menu in WordPress.

== Usage ==

Logged in users will find a `Post to Nostr` button in the admin column actions (where the `Quick Edit` action is located).

If you want to provide Postr For Nostr to your visitors, simply place a button somewhere in your template. Make sure to add the `postr-for-nostr` class, `data-post-id` and `data-post-type` attribute as shown below.
```
<button type="button" class="postr-for-nostr" data-post-id="[ID]" data-post-type="[POST_TYPE]">Share</button>
```

== Filters ==

**Post Type Filter**

Per default `post`, `page` and all registered custom post types will be allowed to be nostr postred. The allowed post types are filterable with a filter hook:
```
add_filter( 'postr_for_nostr_post_types', function( $post_types ) { 
    // unset('post_type'); 
    return $post_types; 
}, 10, 1 );
```

== Vendors ==

* nbd-wtf/nostr-tools: https://github.com/nbd-wtf/nostr-tools

== Screenshots ==

1. A preview of postring to Nostr with Postr For Nostr.
2. The Post to Nostr button in the WordPress admin column actions.

== Changelog ==

= 1.0.0 =
* Initial version.

== License ==

Use this code freely, widely and for free. Provision of this code provides and implies no guarantee.
Please respect the GPL v3 licence, which is available via http://www.gnu.org/licenses/gpl-3.0.html
