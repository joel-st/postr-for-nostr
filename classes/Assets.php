<?php

namespace JoelMelon\Plugins\NostrPostr\Plugin;

/**
 * Assets Class
 *
 * Two script files and one style file are necessary for the plugin to work.
 * 
 * nostr-postr.js => Nostr Postr window react component
 * This script gets enqueued only in the Nostr Postr window
 * 
 * nostr-postr-trigger.js => Opens the Nostr Postr window on click on elements with class .nostr-postr
 * This script gets enqueued on init in front- and backend
 *
 * @author Joel Stüdle <joel.stuedle@gmail.com>
 * @since 1.0.0
 */
class Assets {

	/**
	 * Execution function which is called after the class has been initialized.
	 * This contains hook and filter assignments, etc.
	 *
	 * @since 1.0.0
	 */
	public function run() {
		// load the trigger script in frontend and admin
		add_action( 'wp_enqueue_scripts', array( $this, 'enqueue_trigger_script' ) );
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_trigger_script' ) );
	}

	/**
	 * Nostr Postr window react component
     * This script gets enqueued only in the Nostr Postr window
	 *
	 * @since    1.0.0
	 */
	public function enqueue_scripts_styles() {
		// js
		if ( file_exists( nostr_postr()->plugin_dir . '/assets/scripts/nostr-postr.js' ) ) {
			$js = file_get_contents( nostr_postr()->plugin_dir . '/assets/scripts/nostr-postr.js' );

			wp_register_script( 'nostr-postr-js', nostr_postr()->plugin_url . '/assets/scripts/nostr-postr.js', array( 'wp-element' ), md5( $js ), true );
			wp_enqueue_script( 'nostr-postr-js' );

			$localize_script_data = $this->localize_script_data();

			wp_set_script_translations( 'nostr-postr-js', nostr_postr()->text_domain );
			wp_localize_script( 'nostr-postr-js', 'nostr_postr_localize', array( 'data' => $localize_script_data ) );
		}

		// css
		if ( file_exists( nostr_postr()->plugin_dir . '/assets/styles/nostr-postr.css' ) ) {
			$css = file_get_contents( nostr_postr()->plugin_dir . '/assets/styles/nostr-postr.css' );

			wp_register_style( 'nostr-postr-css', nostr_postr()->plugin_url . '/assets/styles/nostr-postr.css', array( 'dashicons' ), md5( $css ) );
			wp_enqueue_style( 'nostr-postr-css' );
		}
	}

	/**
	 * Provides a data variable 'nostr_postr_localize' for the nostr-postr.js script 
     * with necessary data for the Nostr Postr window
	 *
	 * @since    1.0.0
	 */
	public function localize_script_data() {
		$post_id   = isset( $_GET ) && isset( $_GET['post_id'] ) && get_post( absint( $_GET['post_id'] ) ) ? (int) absint( $_GET['post_id'] ) : false;
		$post_type = isset( $_GET ) && isset( $_GET['post_type'] ) && post_type_exists( sanitize_key( $_GET['post_type'] ) ) ? sanitize_key( $_GET['post_type'] ) : false;
		$post_data = false;

		if ( $post_id && $post_type ) {
			$post = get_posts(
				array(
					'post_type' => $post_type,
					'include'   => array( $post_id ),
				)
			);

			if ( ! empty( $post ) ) {
				$taxonomies = get_object_taxonomies( get_post_type( $post[0]->ID ), 'objects' );

				foreach ( $taxonomies as $taxonomy ) {
					$taxonomies[ $taxonomy->name ] = array(
						'name'  => $taxonomy->label,
						'terms' => array(),
					);
					$terms                         = wp_get_post_terms( $post[0]->ID, $taxonomy->name, array( 'orderby' => 'name' ) );
					foreach ( $terms as $key => $term ) {
						$taxonomies[ $taxonomy->name ]['terms'][ $term->slug ] = $term->name;
					}
				}

				$post_data = array(
					'excerpt'    => get_the_excerpt( $post[0] ),
					'title'      => get_the_title( $post[0] ),
					'permalink'  => get_permalink( $post[0] ),
					'taxonomies' => $taxonomies,
				);
			}
		}

		return array(
			'post_types'          => nostr_postr()->post_types,
			'no_cache'            => nostr_postr()->no_cache ? true : false,
			'post_id'             => $post_id,
			'post_type'           => $post_type,
			'post_data'           => $post_data,
			'profile_placeholder' => nostr_postr()->plugin_url . '/assets/media/nostr-postr-profile-placeholder.jpg',
		);
	}

	/**
	 * Opens the Nostr Postr window on click on elements with class .nostr-postr
     * This script gets enqueued on init in front- and backend
	 *
	 * @since    1.0.0
	 */
	public function enqueue_trigger_script() {
		// js
		if ( file_exists( nostr_postr()->plugin_dir . '/assets/scripts/nostr-postr-trigger.js' ) ) {
			$js = file_get_contents( nostr_postr()->plugin_dir . '/assets/scripts/nostr-postr-trigger.js' );

			wp_register_script( 'nostr-postr-trigger-js', nostr_postr()->plugin_url . '/assets/scripts/nostr-postr-trigger.js', array(), md5( $js ), true );
			wp_enqueue_script( 'nostr-postr-trigger-js' );
		}
	}
}
