<?php
/**
 * Plugin Name: Menu Manager
 * Description: Plugin per la gestione del menù di un ristorante con visualizzazione a pagine sfogliabili
 * Version: 0.1.4
 * Author: SilverStudioDM
 */

if (!defined('ABSPATH')) {
    exit;
}

define('MENU_MANAGER_PATH', plugin_dir_path(__FILE__));
define('MENU_MANAGER_URL', plugin_dir_url(__FILE__));

class MenuManager {
    
    public function __construct() {
        add_action('init', array($this, 'init'));
        add_action('wp_enqueue_scripts', array($this, 'enqueue_scripts'));
        add_action('admin_enqueue_scripts', array($this, 'admin_enqueue_scripts'));
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('wp_ajax_save_menu_settings', array($this, 'save_menu_settings'));
        add_action('wp_ajax_upload_pdf', array($this, 'upload_pdf'));
        add_action('wp_ajax_generate_pdf', array($this, 'generate_pdf'));
        add_action('wp_ajax_delete_menu', array($this, 'delete_menu'));
        add_action('wp_ajax_delete_pdf', array($this, 'delete_pdf'));
        add_action('elementor/widgets/widgets_registered', array($this, 'register_elementor_widget'));
        
        register_activation_hook(__FILE__, array($this, 'activate'));
        register_deactivation_hook(__FILE__, array($this, 'deactivate'));
    }
    
    public function init() {
        $this->create_tables();
    }
    
    public function enqueue_scripts() {
        wp_enqueue_script('turn-js', MENU_MANAGER_URL . 'assets/js/turn.min.js', array('jquery'), '1.0.0', true);
        wp_enqueue_script('menu-manager-frontend', MENU_MANAGER_URL . 'assets/js/frontend.js', array('jquery', 'turn-js'), '1.0.0', true);
        wp_enqueue_style('menu-manager-frontend', MENU_MANAGER_URL . 'assets/css/frontend.css', array(), '1.0.0');
    }
    
    public function admin_enqueue_scripts($hook) {
        if (strpos($hook, 'menu-manager') !== false) {
            wp_enqueue_media();
            wp_enqueue_script('menu-manager-admin', MENU_MANAGER_URL . 'assets/js/admin.js', array('jquery', 'wp-color-picker'), '1.0.0', true);
            wp_enqueue_style('wp-color-picker');
            wp_enqueue_style('menu-manager-admin', MENU_MANAGER_URL . 'assets/css/admin.css', array(), '1.0.0');
            
            wp_localize_script('menu-manager-admin', 'menuManagerAjax', array(
                'ajaxurl' => admin_url('admin-ajax.php'),
                'nonce' => wp_create_nonce('menu_manager_nonce')
            ));
        }
    }
    
    public function add_admin_menu() {
        add_menu_page(
            'Menu Manager',
            'Menu Manager',
            'manage_options',
            'menu-manager',
            array($this, 'admin_page'),
            'dashicons-book-alt',
            30
        );
    }
    
    public function admin_page() {
        include MENU_MANAGER_PATH . 'admin/admin-page.php';
    }
    
    public function create_tables() {
        global $wpdb;
        
        $table_name = $wpdb->prefix . 'menu_manager_menus';
        
        $charset_collate = $wpdb->get_charset_collate();
        
        $sql = "CREATE TABLE $table_name (
            id mediumint(9) NOT NULL AUTO_INCREMENT,
            name varchar(255) NOT NULL,
            type enum('custom','pdf') NOT NULL DEFAULT 'custom',
            pdf_url varchar(500) DEFAULT NULL,
            custom_content longtext DEFAULT NULL,
            settings longtext DEFAULT NULL,
            created_at datetime DEFAULT CURRENT_TIMESTAMP,
            updated_at datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id)
        ) $charset_collate;";
        
        require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
        dbDelta($sql);
    }
    
    public function save_menu_settings() {
        check_ajax_referer('menu_manager_nonce', 'nonce');
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'menu_manager_menus';
        
        $menu_id = intval($_POST['menu_id']);
        $name = sanitize_text_field($_POST['name']);
        $type = sanitize_text_field($_POST['type']);
        $settings = wp_json_encode($_POST['settings']);
        $custom_content = wp_kses_post($_POST['custom_content']);
        
        if ($menu_id > 0) {
            $wpdb->update(
                $table_name,
                array(
                    'name' => $name,
                    'type' => $type,
                    'custom_content' => $custom_content,
                    'settings' => $settings
                ),
                array('id' => $menu_id)
            );
        } else {
            $wpdb->insert(
                $table_name,
                array(
                    'name' => $name,
                    'type' => $type,
                    'custom_content' => $custom_content,
                    'settings' => $settings
                )
            );
            $menu_id = $wpdb->insert_id;
        }
        
        wp_send_json_success(array('menu_id' => $menu_id));
    }
    
    public function upload_pdf() {
        check_ajax_referer('menu_manager_nonce', 'nonce');
        
        if (!function_exists('wp_handle_upload')) {
            require_once(ABSPATH . 'wp-admin/includes/file.php');
        }
        
        $uploaded_file = wp_handle_upload($_FILES['pdf_file'], array('test_form' => false));
        
        if (isset($uploaded_file['error'])) {
            wp_send_json_error($uploaded_file['error']);
        }
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'menu_manager_menus';
        $menu_id = intval($_POST['menu_id']);
        
        $wpdb->update(
            $table_name,
            array('pdf_url' => $uploaded_file['url']),
            array('id' => $menu_id)
        );
        
        wp_send_json_success(array('pdf_url' => $uploaded_file['url']));
    }
    
    public function generate_pdf() {
        check_ajax_referer('menu_manager_nonce', 'nonce');
        
        require_once MENU_MANAGER_PATH . 'includes/pdf-generator.php';
        
        $menu_id = intval($_POST['menu_id']);
        $generator = new MenuPDFGenerator();
        $pdf_url = $generator->generate($menu_id);
        
        if ($pdf_url) {
            wp_send_json_success(array('pdf_url' => $pdf_url));
        } else {
            wp_send_json_error('Errore nella generazione del PDF');
        }
    }
    
    public function delete_menu() {
        check_ajax_referer('menu_manager_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permessi insufficienti');
        }
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'menu_manager_menus';
        $menu_id = intval($_POST['menu_id']);
        
        // Get menu data to delete associated files
        $menu = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE id = %d", $menu_id));
        
        if ($menu) {
            // Delete PDF file if exists
            if ($menu->pdf_url) {
                $this->delete_file_from_url($menu->pdf_url);
            }
            
            // Delete from database
            $deleted = $wpdb->delete($table_name, array('id' => $menu_id), array('%d'));
            
            if ($deleted) {
                wp_send_json_success();
            } else {
                wp_send_json_error('Errore nell\'eliminazione dal database');
            }
        } else {
            wp_send_json_error('Menu non trovato');
        }
    }
    
    public function delete_pdf() {
        check_ajax_referer('menu_manager_nonce', 'nonce');
        
        if (!current_user_can('manage_options')) {
            wp_send_json_error('Permessi insufficienti');
        }
        
        global $wpdb;
        $table_name = $wpdb->prefix . 'menu_manager_menus';
        $menu_id = intval($_POST['menu_id']);
        $pdf_url = esc_url_raw($_POST['pdf_url']);
        
        // Delete physical file
        if ($this->delete_file_from_url($pdf_url)) {
            // Update database
            $updated = $wpdb->update(
                $table_name,
                array('pdf_url' => null),
                array('id' => $menu_id),
                array('%s'),
                array('%d')
            );
            
            if ($updated !== false) {
                wp_send_json_success();
            } else {
                wp_send_json_error('Errore nell\'aggiornamento del database');
            }
        } else {
            wp_send_json_error('Errore nell\'eliminazione del file');
        }
    }
    
    private function delete_file_from_url($file_url) {
        $upload_dir = wp_upload_dir();
        $file_path = str_replace($upload_dir['baseurl'], $upload_dir['basedir'], $file_url);
        
        if (file_exists($file_path)) {
            return unlink($file_path);
        }
        
        return true; // File doesn't exist, consider it "deleted"
    }
    
    public function register_elementor_widget() {
        require_once MENU_MANAGER_PATH . 'elementor/menu-widget.php';
        \Elementor\Plugin::instance()->widgets_manager->register_widget_type(new \MenuManagerElementorWidget());
    }
    
    public function activate() {
        $this->create_tables();
        
        $upload_dir = wp_upload_dir();
        $menu_dir = $upload_dir['basedir'] . '/menu-manager';
        if (!file_exists($menu_dir)) {
            wp_mkdir_p($menu_dir);
        }
    }
    
    public function deactivate() {
        // Cleanup se necessario
    }
    
    public static function get_menus() {
        global $wpdb;
        $table_name = $wpdb->prefix . 'menu_manager_menus';
        return $wpdb->get_results("SELECT * FROM $table_name ORDER BY updated_at DESC");
    }
    
    public static function get_menu($id) {
        global $wpdb;
        $table_name = $wpdb->prefix . 'menu_manager_menus';
        return $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE id = %d", $id));
    }
}

new MenuManager();