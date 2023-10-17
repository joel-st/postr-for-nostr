<?php

namespace JoelMelon\Plugins\NostrPostr;

/**
 * Plugin Class
 *
 * Use elements in the front- and backend area with class .postr-for-nostr to trigger the Postr for Nostr window.
 * The Postr for Nostr window is a react component. All the postring works with javascript and the nostr_tools package.
 * There is a trigger script which is enqueued in the front- and backend to open a new window, where the react
 * component get initialized. The window is openend with necessary query vars to determine it on init.
 * Example of a Postr for Nostr window url: https://postr-for-nostr.local/?action=postr-for-nostr&post_id=1&post_type=page
 *
 * @author Joel Stüdle <joel.stuedle@gmail.com>
 * @since 1.0.0
 */

// https://www.php.net/manual/en/class.allowdynamicproperties.php
#[\AllowDynamicProperties]

class Plugin {

	private static $instance;
	public $plugin_header = '';
	public $domain_path   = '';
	public $name          = '';
	public $prefix        = '';
	public $version       = '';
	public $file          = '';
	public $plugin_url    = '';
	public $plugin_dir    = '';
	public $base_path     = '';
	public $text_domain   = '';
	public $debug         = '';
	public $post_types    = '';
	public $no_cache      = '';

	/**
	 * Creates an instance if one isn't already available,
	 * then return the current instance.
	 *
	 * @param string $file The file from which the class is being instantiated.
	 * @return object The class instance.
	 * @since 1.0.0
	 */
	public static function get_instance( $file ) {
		if ( ! isset( self::$instance ) && ! ( self::$instance instanceof Plugin ) ) {
			self::$instance = new Plugin();

			if ( ! function_exists( 'get_plugin_data' ) ) {
				include_once ABSPATH . 'wp-admin/includes/plugin.php';
			}

			self::$instance->plugin_header = get_plugin_data( $file );
			self::$instance->name          = self::$instance->plugin_header['Name'];
			self::$instance->domain_path   = basename( dirname( __DIR__ ) ) . self::$instance->plugin_header['DomainPath'];
			self::$instance->prefix        = 'postr-for-nostr';
			self::$instance->version       = self::$instance->plugin_header['Version'];
			self::$instance->file          = $file;
			self::$instance->plugin_url    = plugins_url( '', __DIR__ );
			self::$instance->plugin_dir    = dirname( __DIR__ );
			self::$instance->base_path     = self::$instance->prefix;
			self::$instance->text_domain   = self::$instance->plugin_header['TextDomain'];
			self::$instance->debug         = true;
			self::$instance->post_types    = array();
			self::$instance->no_cache      = isset( $_SERVER['HTTP_CACHE_CONTROL'] ) && 'no-cache' === $_SERVER['HTTP_CACHE_CONTROL'] ? true : false;

			if ( ! isset( $_SERVER['HTTP_HOST'] ) || strpos( $_SERVER['HTTP_HOST'], '.local' ) === false && ! in_array( $_SERVER['REMOTE_ADDR'], array( '127.0.0.1', '::1' ), true ) ) {
				self::$instance->debug = false;
			}

			self::$instance->run();
		}

		return self::$instance;
	}

	/**
	 * Execution function which is called after the class has been initialized.
	 * This contains hook and filter assignments, etc.
	 *
	 * @since 1.0.0
	 */
	public function run() {
		// Load classes
		$this->load_classes(
			array(
				\JoelMelon\Plugins\NostrPostr\Plugin\Assets::class,
			)
		);

		// load the textdomain
		add_action( 'plugins_loaded', array( $this, 'load_text_domain' ) );

		// set post types with low priority (over 9000!) to hopefully catch all registerd post types
		add_action( 'init', array( $this, 'set_post_types' ), 9001 );

		// the action to detect if current call is for postr-for-nostr, set priority bigger than set_post_types
		add_action( 'init', array( $this, 'postr_for_nostr_initialize' ), 9002 );

		// add a button to trigger postr-for-nostr to WordPress post columns
		add_filter( 'post_row_actions', array( $this, 'filter_row_actions' ), 10, 2 );
		add_filter( 'page_row_actions', array( $this, 'filter_row_actions' ), 10, 2 );
	}


	/**
	 * Loads and initializes the plugin classes.
	 *
	 * @param array of classes
	 * @since 1.0.0
	 */
	private function load_classes( $classes ) {
		foreach ( $classes as $class ) {
			$class_parts = explode( '\\', $class );
			$class_short = end( $class_parts );
			$class_set   = $class_parts[ count( $class_parts ) - 2 ];

			if ( ! isset( postr_for_nostr()->{$class_set} ) || ! is_object( postr_for_nostr()->{$class_set} ) ) {
				postr_for_nostr()->{$class_set} = new \stdClass();
			}

			if ( property_exists( postr_for_nostr()->{$class_set}, $class_short ) ) {
				/* translators: %1$s = already used class name, %2$s = plugin class */
				wp_die( sprintf( esc_html( _x( 'There was a problem with the Plugin. Only one class with name “%1$s” can be use used in “%2$s”.', 'Theme instance load_classes() error message', 'postr-for-nostr' ) ), $class_short, $class_set ), 500 );
			}

			postr_for_nostr()->{$class_set}->{$class_short} = new $class();

			if ( method_exists( postr_for_nostr()->{$class_set}->{$class_short}, 'run' ) ) {
				postr_for_nostr()->{$class_set}->{$class_short}->run();
			}
		}
	}

	/**
	 * Load the plugins textdomain
	 *
	 * @since 1.0.0
	 */
	public function load_text_domain() {
		load_plugin_textdomain( postr_for_nostr()->text_domain, false, postr_for_nostr()->domain_path );
	}

	/**
	 * Set post types on which postr-for-nostr should be available
	 * Per default, 'post', 'page' and all registered custom post types will be included
	 * The post type list is filterable with a filter hook:
	 * add_filter( 'postr_for_nostr_post_types', function( $post_types ) { unset('post_type'); return $post_types; }, 10, 1 );
	 *
	 * @since 1.0.0
	 */
	public function set_post_types() {
		$post              = get_post_type_object( 'post' );
		$page              = get_post_type_object( 'page' );
		$custom_post_types = get_post_types( array( '_builtin' => false ), 'object' );

		$this->post_types['post'] = array(
			'singular' => $post->labels->name,
			'plural'   => $post->labels->singular_name,
		);
		$this->post_types['page'] = array(
			'singular' => $page->labels->name,
			'plural'   => $page->labels->singular_name,
		);

		foreach ( $custom_post_types as $custom_post_type ) {
			$this->post_types[ $custom_post_type->name ] = array(
				'singular' => $custom_post_type->labels->name,
				'plural'   => $custom_post_type->labels->singular_name,
			);
		}

		$this->post_types = apply_filters( 'postr_for_nostr_post_types', $this->post_types );
	}

	/**
	 * On WordPress init, we check if the query var 'action' is set to postr-for-nostr
	 * If so, we output the app container and enqueue the plugin scripts and styles.
	 *
	 * @since 1.0.0
	 */
	public function postr_for_nostr_initialize() {
		if ( isset( $_GET ) && isset( $_GET['action'] ) && 'postr-for-nostr' === $_GET['action'] ) {
			echo '<title>' . esc_html( _x( 'Postr for Nostr', 'Postr for Nostr window meta title', 'postr-for-nostr' ) ) . '</title>';
			echo '<meta name="viewport" content="width=device-width, initial-scale=1" />';
			// enqueue postr-for-nostr assets and styles
			postr_for_nostr()->Plugin->Assets->enqueue_scripts_styles();
			do_action( 'wp_head' );
			echo '<body class="postr-for-nostr-app postr-for-nostr-app--initializing">';
			echo '<div class="postr-for-nostr-app__head">';
			echo '<img src="' . esc_url( postr_for_nostr()->plugin_url ) . '/assets/media/postr-for-nostr-app-head.png' . '" alt="Postr for Nostr Brand"/>';
			echo '</div>';
			echo '<div class="postr-for-nostr-app__content" id="postr-for-nostr-app">';
			echo '</div>';
			echo '</body>';
			do_action( 'wp_footer' );
			die;
		}
	}

	/**
	 * This function adds a "Post to Nostr" button in the admin post column actions
	 * This provides a quick way to give access to the Postr for Nostr window if logged in.
	 *
	 * @since 1.0.0
	 */
	public function filter_row_actions( $actions, $post ) {
		if ( isset( postr_for_nostr()->post_types[ $post->post_type ] ) && 'publish' === $post->post_status ) {
			$actions['postr_for_nostr'] = '<button type="button" class="button-link postr-for-nostr" data-post-id="' . esc_attr( $post->ID ) . '" data-post-type="' . esc_attr( $post->post_type ) . '" aria-label="' . esc_html( _x( 'Post to Nostr', 'Post Column Action', 'postr-for-nostr' ) ) . '" aria-expanded="false">' . esc_html( _x( 'Post to Nostr', 'Post Column Action', 'postr-for-nostr' ) ) . '</button>';
		}
		return $actions;
	}
}
