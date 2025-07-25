<?php
if (!defined('ABSPATH')) {
    exit;
}

class MenuManager_Elementor_Widget extends \Elementor\Widget_Base {
    
    public function get_name() {
        return 'menu_manager';
    }
    
    public function get_title() {
        return 'Menu Ristorante';
    }
    
    public function get_icon() {
        return 'eicon-document-file';
    }
    
    public function get_categories() {
        return ['general'];
    }
    
    protected function register_controls() {
        
        $this->start_controls_section(
            'content_section',
            [
                'label' => 'Contenuto',
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );
        
        $this->add_control(
            'display_mode',
            [
                'label' => 'Modalità Visualizzazione',
                'type' => \Elementor\Controls_Manager::SELECT,
                'default' => 'single',
                'options' => [
                    'single' => 'Pagina Singola',
                    'double' => 'Due Pagine Affiancate',
                    'embed' => 'PDF Incorporato',
                    'download' => 'Solo Download',
                ],
            ]
        );
        
        $this->add_control(
            'show_title',
            [
                'label' => 'Mostra Titolo',
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'show_controls',
            [
                'label' => 'Mostra Controlli',
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'default' => 'yes',
                'condition' => [
                    'display_mode' => ['single', 'double'],
                ],
            ]
        );
        
        $this->end_controls_section();
        
        $this->start_controls_section(
            'style_container',
            [
                'label' => 'Container',
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );
        
        $this->add_control(
            'container_height',
            [
                'label' => 'Altezza Container',
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', 'vh'],
                'range' => [
                    'px' => [
                        'min' => 400,
                        'max' => 1200,
                    ],
                ],
                'default' => [
                    'unit' => 'px',
                    'size' => 700,
                ],
                'selectors' => [
                    '{{WRAPPER}} .menu-viewer-container' => 'height: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'container_bg',
            [
                'label' => 'Sfondo Container',
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#f8fafc',
                'selectors' => [
                    '{{WRAPPER}} .menu-flipbook-container' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'border_radius',
            [
                'label' => 'Bordi Arrotondati',
                'type' => \Elementor\Controls_Manager::SLIDER,
                'range' => [
                    'px' => [
                        'min' => 0,
                        'max' => 30,
                    ],
                ],
                'default' => [
                    'size' => 12,
                ],
                'selectors' => [
                    '{{WRAPPER}} .menu-viewer-container' => 'border-radius: {{SIZE}}px;',
                ],
            ]
        );
        
        $this->add_group_control(
            \Elementor\Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'container_shadow',
                'selector' => '{{WRAPPER}} .menu-viewer-container',
            ]
        );
        
        $this->end_controls_section();
        
        $this->start_controls_section(
            'style_controls',
            [
                'label' => 'Controlli',
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                'condition' => [
                    'show_controls' => 'yes',
                    'display_mode' => ['single', 'double'],
                ],
            ]
        );
        
        $this->add_control(
            'controls_bg',
            [
                'label' => 'Sfondo Controlli',
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .menu-controls' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'controls_text_color',
            [
                'label' => 'Colore Testo',
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#374151',
                'selectors' => [
                    '{{WRAPPER}} .page-info' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_bg',
            [
                'label' => 'Sfondo Pulsanti',
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#ffffff',
                'selectors' => [
                    '{{WRAPPER}} .control-btn' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_color',
            [
                'label' => 'Colore Pulsanti',
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#64748b',
                'selectors' => [
                    '{{WRAPPER}} .control-btn' => 'color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'button_border',
            [
                'label' => 'Bordo Pulsanti',
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#e2e8f0',
                'selectors' => [
                    '{{WRAPPER}} .control-btn' => 'border-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'primary_color',
            [
                'label' => 'Colore Primario',
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#2563eb',
                'selectors' => [
                    '{{WRAPPER}} .page-progress' => 'background-color: {{VALUE}};',
                    '{{WRAPPER}} .page-slider::-webkit-slider-thumb' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->add_control(
            'slider_track_color',
            [
                'label' => 'Colore Track Slider',
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#e2e8f0',
                'selectors' => [
                    '{{WRAPPER}} .page-slider' => 'background-color: {{VALUE}};',
                    '{{WRAPPER}} .page-progress-track' => 'background-color: {{VALUE}};',
                ],
            ]
        );
        
        $this->end_controls_section();
    }
    
    protected function render() {
        $settings = $this->get_settings_for_display();
        $menu_manager = new MenuManager();
        $active_menu = $menu_manager->get_active_menu();
        
        // Debug per admin
        if (current_user_can('administrator')) {
            echo '<!-- Menu Manager Debug: ';
            if ($active_menu) {
                echo 'Menu trovato: ' . esc_html($active_menu->name) . ', PDF: ' . esc_html($active_menu->pdf_url);
            } else {
                echo 'Nessun menu attivo trovato';
            }
            echo ' -->';
        }
        
        echo '<div class="menu-manager-widget">';
        
        if ($active_menu && !empty($active_menu->pdf_url)) {
            if ($settings['show_title'] === 'yes') {
                echo '<h3 class="menu-title">' . esc_html($active_menu->name) . '</h3>';
            }
            
            echo '<div class="menu-viewer-container" data-mode="' . esc_attr($settings['display_mode']) . '">';
            
            switch ($settings['display_mode']) {
                case 'single':
                case 'double':
                    $this->render_viewer($active_menu, $settings);
                    break;
                case 'embed':
                    $this->render_embed($active_menu);
                    break;
                case 'download':
                    $this->render_download($active_menu);
                    break;
            }
            
            echo '</div>';
        } else {
            echo '<div class="no-menu-message">';
            echo '<div class="no-menu-icon">📄</div>';
            echo '<p>Menu non disponibile al momento</p>';
            if (current_user_can('administrator')) {
                global $wpdb;
                $table_name = $wpdb->prefix . 'menu_manager_menus';
                $count = $wpdb->get_var("SELECT COUNT(*) FROM $table_name WHERE is_active = 1");
                echo '<p style="font-size: 12px; color: #999;">Debug Admin: ';
                if ($active_menu) {
                    echo 'Menu trovato ma PDF mancante';
                } else {
                    echo "Nessun menu attivo ($count menu attivi totali)";
                }
                echo '</p>';
            }
            echo '</div>';
        }
        
        echo '</div>';
    }
    
    private function render_viewer($menu, $settings) {
        $pdf_url = esc_url($menu->pdf_url);
        $unique_id = 'menu_' . uniqid();
        $is_double = $settings['display_mode'] === 'double';
        
        echo '<div class="pdf-viewer-wrapper">';
        echo '<div id="' . $unique_id . '" class="menu-flipbook-container" data-pdf="' . $pdf_url . '">';
        echo '<div class="loading-container">';
        echo '<div class="loading-spinner"></div>';
        echo '<div class="loading-text">Caricamento menu...</div>';
        echo '</div>';
        echo '</div>';
        
        if ($settings['show_controls'] === 'yes') {
            echo '<div class="menu-controls">';
            echo '<button class="control-btn prev-page" title="Precedente">';
            echo '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41L14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>';
            echo '</button>';
            
            echo '<div class="controls-center">';
            echo '<div class="page-info">';
            echo '<span class="current-page">1</span>';
            if ($is_double) {
                echo '<span class="page-separator">-</span>';
                echo '<span class="current-page-end">2</span>';
            }
            echo '<span class="page-divider"> / </span>';
            echo '<span class="total-pages">1</span>';
            echo '</div>';
            echo '<div class="slider-container">';
            echo '<input type="range" class="page-slider" min="1" max="1" value="1" step="1">';
            echo '<div class="page-progress-track"><div class="page-progress"></div></div>';
            echo '</div>';
            echo '</div>';
            
            echo '<button class="control-btn next-page" title="Successiva">';
            echo '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8.59 16.59L10 18l6-6-6-6-1.41 1.41L13.17 12z"/></svg>';
            echo '</button>';
            echo '</div>';
        }
        echo '</div>';
        
        ?>
        <script type="text/javascript">
        jQuery(document).ready(function($) {
            console.log('Elementor widget script iniziato per: <?php echo $pdf_url; ?>');
            
            function initWidget() {
                if (typeof pdfjsLib === 'undefined') {
                    console.log('PDF.js non ancora caricato, attesa...');
                    setTimeout(initWidget, 200);
                    return;
                }
                
                console.log('PDF.js caricato, inizializzazione viewer...');
                
                const container = $('#<?php echo $unique_id; ?>').closest('.menu-viewer-container');
                console.log('Trovato container:', container.length);
                
                if (container.length && typeof window.initMenuViewer === 'function') {
                    console.log('Inizializzazione viewer da Elementor widget');
                    try {
                        window.initMenuViewer(container, '<?php echo $pdf_url; ?>', <?php echo $is_double ? 'true' : 'false'; ?>);
                    } catch(error) {
                        console.error('Errore inizializzazione viewer:', error);
                        $('#<?php echo $unique_id; ?>').html(`
                            <div class="loading-container">
                                <div style="font-size: 48px; margin-bottom: 16px; color: #ef4444;">❌</div>
                                <div class="loading-text">Errore: ${error.message}</div>
                                <div style="margin-top: 10px;">
                                    <a href="<?php echo $pdf_url; ?>" target="_blank">Apri PDF direttamente</a>
                                </div>
                            </div>
                        `);
                    }
                } else {
                    console.log('initMenuViewer non disponibile, retry...');
                    setTimeout(initWidget, 300);
                }
            }
            
            initWidget();
        });
        </script>
        <?php
    }
    
    private function render_embed($menu) {
        $pdf_url = esc_url($menu->pdf_url);
        echo '<object data="' . $pdf_url . '" type="application/pdf" width="100%" height="100%">';
        echo '<p>Il tuo browser non supporta la visualizzazione PDF. ';
        echo '<a href="' . $pdf_url . '" target="_blank">Clicca qui per aprire il PDF</a></p>';
        echo '</object>';
    }
    
    private function render_download($menu) {
        echo '<div class="download-menu">';
        echo '<div class="download-content">';
        echo '<div class="download-icon">📋</div>';
        echo '<h4>Scarica il Menu</h4>';
        echo '<a href="' . esc_url($menu->pdf_url) . '" download class="download-btn">';
        echo '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">';
        echo '<path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>';
        echo '</svg>';
        echo 'Scarica Menu PDF';
        echo '</a>';
        echo '</div>';
        echo '</div>';
    }
}