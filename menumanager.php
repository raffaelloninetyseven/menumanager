<?php
/**
 * Plugin Name: Menu Manager
 * Description: Plugin per la gestione avanzata del menu ristorante con widget Elementor e visualizzazione PDF sfogliabile
 * Version: 0.3.2
 * Author: SilverStudioDM
 */

if (!defined('ABSPATH')) {
    exit;
}

define('MENU_MANAGER_URL', plugin_dir_url(__FILE__));
define('MENU_MANAGER_PATH', plugin_dir_path(__FILE__));

class MenuManager {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('admin_menu', array($this, 'admin_menu'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
        add_action('wp_ajax_upload_menu', array($this, 'handle_upload'));
        add_action('wp_ajax_save_menu_config', array($this, 'save_menu_config'));
        add_action('wp_ajax_delete_menu', array($this, 'delete_menu'));
        add_action('wp_ajax_get_menu_data', array($this, 'get_menu_data'));
        add_action('wp_ajax_save_settings', array($this, 'save_settings'));
        add_action('elementor/widgets/widgets_registered', array($this, 'register_elementor_widget'));
        add_action('plugins_loaded', array($this, 'load_textdomain'));
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    public function init() {
        $this->create_tables();
        $this->create_upload_dir();
    }
    
    public function activate() {
        $this->create_tables();
        $this->create_upload_dir();
        
        // Imposta valori di default per le impostazioni
        if (!get_option('menu_manager_settings')) {
            add_option('menu_manager_settings', array(
                'allowed_roles' => array('administrator'),
                'menu_capability' => 'manage_options'
            ));
        }
        
        flush_rewrite_rules();
    }
    
    public function deactivate() {
        flush_rewrite_rules();
    }
    
    public function load_textdomain() {
        load_plugin_textdomain('menu-manager', false, dirname(plugin_basename(__FILE__)) . '/languages');
    }
    
    private function create_upload_dir() {
        $upload_dir = wp_upload_dir();
        $menu_dir = $upload_dir['basedir'] . '/menu-manager';
        
        if (!file_exists($menu_dir)) {
            wp_mkdir_p($menu_dir);
            
            $htaccess_content = "Options -Indexes\n";
            $htaccess_content .= "<Files *.pdf>\n";
            $htaccess_content .= "ForceType application/octet-stream\n";
            $htaccess_content .= "Header set Content-Disposition attachment\n";
            $htaccess_content .= "</Files>\n";
            
            file_put_contents($menu_dir . '/.htaccess', $htaccess_content);
        }
    }
    
    private function create_tables() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'menu_manager_menus';
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            name varchar(255) NOT NULL,
            pdf_url varchar(500) DEFAULT NULL,
            start_date datetime DEFAULT NULL,
            end_date datetime DEFAULT NULL,
            is_active tinyint(1) DEFAULT 1,
            priority int(11) DEFAULT 0,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_active_priority (is_active, priority),
            KEY idx_dates (start_date, end_date)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    public function admin_menu() {
        $settings = get_option('menu_manager_settings', array());
        $capability = isset($settings['menu_capability']) ? $settings['menu_capability'] : 'manage_options';
        
        // Menu principale - Dashboard
        add_menu_page(
            'Menu Manager',
            'Menu Manager', 
            $capability,
            'menu-manager',
            array($this, 'dashboard_page'),
            'dashicons-food',
            30
        );
        
        // Sottomenu Dashboard
        add_submenu_page(
            'menu-manager',
            'Dashboard',
            'Dashboard',
            $capability,
            'menu-manager',
            array($this, 'dashboard_page')
        );
        
        // Sottomenu Settings (solo per amministratori)
        add_submenu_page(
            'menu-manager',
            'Impostazioni',
            'Impostazioni',
            'manage_options',
            'menu-manager-settings',
            array($this, 'settings_page')
        );
    }
    
    public function enqueue_scripts() {
        // Carica PDF.js per primo
        wp_enqueue_script('pdf-js', 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.min.js', array(), '2.11.338', false);
        
        // Carica gli altri script
        wp_enqueue_script('turn-js', MENU_MANAGER_URL . 'assets/js/turn.min.js', array('jquery'), '1.0.0', true);
        wp_enqueue_script('menu-manager-frontend', MENU_MANAGER_URL . 'assets/js/frontend.js', array('jquery', 'pdf-js'), '1.0.1', true);
        wp_enqueue_style('menu-manager-frontend', MENU_MANAGER_URL . 'assets/css/frontend.css', array(), '1.0.1');
        
        wp_localize_script('menu-manager-frontend', 'menuManager', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('menu_manager_nonce'),
            'pdf_worker' => 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js'
        ));
    }
    
    public function admin_enqueue_scripts($hook) {
        if (strpos($hook, 'menu-manager') === false) return;
        
        wp_enqueue_media();
        wp_enqueue_script('menu-manager-admin', MENU_MANAGER_URL . 'assets/js/admin.js', array('jquery'), '1.0.2', true);
        wp_enqueue_style('menu-manager-admin', MENU_MANAGER_URL . 'assets/css/admin.css', array(), '1.0.2');
        
        wp_localize_script('menu-manager-admin', 'menuManagerAdmin', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('menu_manager_admin_nonce'),
            'plugin_url' => MENU_MANAGER_URL
        ));
    }
    
    public function dashboard_page() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'menu_manager_menus';
        $menus = $wpdb->get_results("SELECT * FROM $table_name ORDER BY priority DESC, created_at DESC");
        
        include MENU_MANAGER_PATH . 'templates/dashboard-page.php';
    }
    
    public function settings_page() {
        $settings = get_option('menu_manager_settings', array());
        include MENU_MANAGER_PATH . 'templates/settings-page.php';
    }
    
    public function handle_upload() {
        check_ajax_referer('menu_manager_admin_nonce', 'nonce');
        
        $settings = get_option('menu_manager_settings', array());
        $capability = isset($settings['menu_capability']) ? $settings['menu_capability'] : 'manage_options';
        
        if (!current_user_can($capability)) {
            wp_send_json_error('Unauthorized');
        }
        
        if (!isset($_FILES['pdf_file'])) {
            wp_send_json_error('Nessun file ricevuto');
        }
        
        $uploaded_file = $_FILES['pdf_file'];
        
        if ($uploaded_file['error'] !== UPLOAD_ERR_OK) {
            wp_send_json_error('Errore nel caricamento del file');
        }
        
        if ($uploaded_file['type'] !== 'application/pdf') {
            wp_send_json_error('Solo file PDF sono permessi');
        }
        
        $max_size = 10 * 1024 * 1024;
        if ($uploaded_file['size'] > $max_size) {
            wp_send_json_error('Il file è troppo grande. Massimo 10MB.');
        }
        
        add_filter('upload_dir', array($this, 'custom_upload_dir'));
        $upload = wp_handle_upload($uploaded_file, array('test_form' => false));
        remove_filter('upload_dir', array($this, 'custom_upload_dir'));
        
        if (isset($upload['error'])) {
            wp_send_json_error($upload['error']);
        }
        
        wp_send_json_success(array('url' => $upload['url']));
    }
    
    public function custom_upload_dir($dir) {
        return array(
            'path'   => $dir['basedir'] . '/menu-manager',
            'url'    => $dir['baseurl'] . '/menu-manager',
            'subdir' => '/menu-manager',
        ) + $dir;
    }
    
    public function save_menu_config() {
        check_ajax_referer('menu_manager_admin_nonce', 'nonce');
        
        $settings = get_option('menu_manager_settings', array());
        $capability = isset($settings['menu_capability']) ? $settings['menu_capability'] : 'manage_options';
        
        if (!current_user_can($capability)) {
            wp_send_json_error('Unauthorized');
        }
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'menu_manager_menus';
        
        $name = sanitize_text_field($_POST['name']);
        $pdf_url = isset($_POST['pdf_url']) ? esc_url_raw($_POST['pdf_url']) : '';
        $start_date = $_POST['start_date'] ? sanitize_text_field($_POST['start_date']) : null;
        $end_date = $_POST['end_date'] ? sanitize_text_field($_POST['end_date']) : null;
        $is_active = isset($_POST['is_active']) ? 1 : 0;
        $priority = isset($_POST['priority']) ? intval($_POST['priority']) : 0;
        
        if (empty($name)) {
            wp_send_json_error('Nome è obbligatorio');
        }
        
        if (empty($pdf_url)) {
            wp_send_json_error('PDF è obbligatorio');
        }
        
        $data = array(
            'name' => $name,
            'pdf_url' => $pdf_url,
            'start_date' => $start_date,
            'end_date' => $end_date,
            'is_active' => $is_active,
            'priority' => $priority
        );
        
        if (isset($_POST['menu_id']) && $_POST['menu_id']) {
            $result = $wpdb->update(
                $table_name,
                $data,
                array('id' => intval($_POST['menu_id']))
            );
        } else {
            $result = $wpdb->insert($table_name, $data);
        }
        
        if ($result !== false) {
            wp_send_json_success('Menu salvato con successo');
        } else {
            wp_send_json_error('Errore nel salvare il menu');
        }
    }
    
    public function get_menu_data() {
        check_ajax_referer('menu_manager_admin_nonce', 'nonce');
        
        $settings = get_option('menu_manager_settings', array());
        $capability = isset($settings['menu_capability']) ? $settings['menu_capability'] : 'manage_options';
        
        if (!current_user_can($capability)) {
            wp_send_json_error('Unauthorized');
        }
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'menu_manager_menus';
        
        $menu_id = intval($_POST['menu_id']);
        $menu = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE id = %d", $menu_id));
        
        if ($menu) {
            wp_send_json_success($menu);
        } else {
            wp_send_json_error('Menu non trovato');
        }
    }
    
    public function delete_menu() {
        check_ajax_referer('menu_manager_admin_nonce', 'nonce');
        
        $settings = get_option('menu_manager_settings', array());
        $capability = isset($settings['menu_capability']) ? $settings['menu_capability'] : 'manage_options';
        
        if (!current_user_can($capability)) {
            wp_send_json_error('Unauthorized');
        }
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'menu_manager_menus';
        
        $menu_id = intval($_POST['menu_id']);
        
        $menu = $wpdb->get_row($wpdb->prepare("SELECT pdf_url FROM $table_name WHERE id = %d", $menu_id));
        
        if ($menu && $menu->pdf_url) {
            $file_path = str_replace(wp_upload_dir()['baseurl'], wp_upload_dir()['basedir'], $menu->pdf_url);
            if (file_exists($file_path)) {
                unlink($file_path);
            }
        }
        
        $result = $wpdb->delete($table_name, array('id' => $menu_id));
        
        if ($result !== false) {
            wp_send_json_success('Menu eliminato');
        } else {
            wp_send_json_error('Errore nell\'eliminare il menu');
        }
    }
    
    public function save_settings() {
        check_ajax_referer('menu_manager_admin_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Unauthorized');
        }
        
        $allowed_roles = isset($_POST['allowed_roles']) ? array_map('sanitize_text_field', $_POST['allowed_roles']) : array();
        $menu_capability = sanitize_text_field($_POST['menu_capability']);
        
        $settings = array(
            'allowed_roles' => $allowed_roles,
            'menu_capability' => $menu_capability
        );
        
        $result = update_option('menu_manager_settings', $settings);
        
        if ($result) {
            wp_send_json_success('Impostazioni salvate con successo');
        } else {
            wp_send_json_error('Errore nel salvare le impostazioni');
        }
    }
    
    public function register_elementor_widget() {
        if (!did_action('elementor/loaded')) {
            return;
        }
        
        $widget_file = MENU_MANAGER_PATH . 'widgets/elementor-menu-widget.php';
        if (file_exists($widget_file)) {
            require_once $widget_file;
            \Elementor\Plugin::instance()->widgets_manager->register_widget_type(new \MenuManager_Elementor_Widget());
        }
    }
    
    public static function get_menu($menu_id) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'menu_manager_menus';
        return $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE id = %d", $menu_id));
    }
    
    public function get_active_menu() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'menu_manager_menus';
        
        $current_time = current_time('mysql');
        
        $query = "SELECT * FROM $table_name WHERE is_active = 1";
        $query .= " AND (start_date IS NULL OR start_date <= '$current_time')";
        $query .= " AND (end_date IS NULL OR end_date >= '$current_time')";
        $query .= " AND pdf_url IS NOT NULL AND pdf_url != ''";
        $query .= " ORDER BY priority DESC, created_at DESC LIMIT 1";
        
        $result = $wpdb->get_row($query);
        
        // Debug per amministratori
        if (current_user_can('administrator') && WP_DEBUG) {
            error_log('Menu Manager Debug - Query: ' . $query);
            error_log('Menu Manager Debug - Result: ' . print_r($result, true));
        }
        
        return $result;
    }
}

new MenuManager();