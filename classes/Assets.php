<?php

namespace JoelMelon\Plugins\NostrPostr\Plugin;

/**
 * Assets Class
 *
 * Two script files and one style file are necessary for the plugin to work.
 *
 * postr-for-nostr.js => Postr for Nostr window react component
 * This script gets enqueued only in the Postr for Nostr window
 *
 * postr-for-nostr-trigger.js => Opens the Postr for Nostr window on click on elements with class .postr-for-nostr
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
	 * Postr for Nostr window react component
	 * This script gets enqueued only in the Postr for Nostr window
	 *
	 * @since    1.0.0
	 */
	public function enqueue_scripts_styles() {
		// js
		if ( file_exists( esc_url( postr_for_nostr()->plugin_dir ) . '/assets/scripts/postr-for-nostr.js' ) ) {
			$js = file_get_contents( esc_url( postr_for_nostr()->plugin_dir ) . '/assets/scripts/postr-for-nostr.js' );

			wp_register_script( 'postr-for-nostr-js', esc_url( postr_for_nostr()->plugin_url ) . '/assets/scripts/postr-for-nostr.js', array( 'wp-element' ), md5( $js ), true );
			wp_enqueue_script( 'postr-for-nostr-js' );

			$localize_script_data = $this->localize_script_data();

			wp_set_script_translations( 'postr-for-nostr-js', postr_for_nostr()->text_domain );
			wp_localize_script( 'postr-for-nostr-js', 'postr_for_nostr_localize', array( 'data' => $localize_script_data ) );
		}

		// css
		if ( file_exists( esc_url( postr_for_nostr()->plugin_dir ) . '/assets/styles/postr-for-nostr.css' ) ) {
			$css = file_get_contents( esc_url( postr_for_nostr()->plugin_dir ) . '/assets/styles/postr-for-nostr.css' );

			wp_register_style( 'postr-for-nostr-css', esc_url( postr_for_nostr()->plugin_url ) . '/assets/styles/postr-for-nostr.css', array( 'dashicons' ), md5( $css ) );
			wp_enqueue_style( 'postr-for-nostr-css' );
		}
	}

	/**
	 * Provides a data variable 'postr_for_nostr_localize' for the postr-for-nostr.js script
	 * with necessary data for the Postr for Nostr window
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
			'post_types'          => postr_for_nostr()->post_types,
			'no_cache'            => postr_for_nostr()->no_cache ? true : false,
			'post_id'             => $post_id,
			'post_type'           => $post_type,
			'post_data'           => $post_data,
			'profile_placeholder' => esc_url( postr_for_nostr()->plugin_url ) . '/assets/media/postr-for-nostr-profile-placeholder.jpg',
		);
	}

	/**
	 * Opens the Postr for Nostr window on click on elements with class .postr-for-nostr
	 * This script gets enqueued on init in front- and backend
	 *
	 * @since    1.0.0
	 */
	public function enqueue_trigger_script() {
		// js
		if ( file_exists( esc_url( postr_for_nostr()->plugin_dir ) . '/assets/scripts/postr-for-nostr-trigger.js' ) ) {
			$js = file_get_contents( esc_url( postr_for_nostr()->plugin_dir ) . '/assets/scripts/postr-for-nostr-trigger.js' );

			wp_register_script( 'postr-for-nostr-trigger-js', esc_url( postr_for_nostr()->plugin_url ) . '/assets/scripts/postr-for-nostr-trigger.js', array(), md5( $js ), true );
			wp_enqueue_script( 'postr-for-nostr-trigger-js' );
		}
	}
}
