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
                'default' => 'flipbook',
                'options' => [
                    'flipbook' => 'Flipbook Sfogliabile',
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
            'fallback_text',
            [
                'label' => 'Testo quando nessun menu è disponibile',
                'type' => \Elementor\Controls_Manager::TEXT,
                'default' => 'Menu non disponibile al momento',
            ]
        );
        
        $this->end_controls_section();
        
        $this->start_controls_section(
            'style_section',
            [
                'label' => 'Stile',
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
                        'min' => 300,
                        'max' => 1000,
                    ],
                ],
                'default' => [
                    'unit' => 'px',
                    'size' => 600,
                ],
                'selectors' => [
                    '{{WRAPPER}} .menu-viewer-container' => 'height: {{SIZE}}{{UNIT}};',
                ],
            ]
        );
        
        $this->add_control(
            'background_color',
            [
                'label' => 'Colore Sfondo',
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#f8f9fa',
                'selectors' => [
                    '{{WRAPPER}} .menu-viewer-container' => 'background-color: {{VALUE}};',
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
                        'max' => 50,
                    ],
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
            'controls_style_section',
            [
                'label' => 'Controlli',
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
                'condition' => [
                    'display_mode' => 'flipbook',
                ],
            ]
        );
        
        $this->add_control(
            'show_controls',
            [
                'label' => 'Mostra Controlli',
                'type' => \Elementor\Controls_Manager::SWITCHER,
                'default' => 'yes',
            ]
        );
        
        $this->add_control(
            'controls_color',
            [
                'label' => 'Colore Controlli',
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#333',
                'selectors' => [
                    '{{WRAPPER}} .menu-controls button' => 'color: {{VALUE}};',
                ],
                'condition' => [
                    'show_controls' => 'yes',
                ],
            ]
        );
        
        $this->add_control(
            'controls_bg_color',
            [
                'label' => 'Sfondo Controlli',
                'type' => \Elementor\Controls_Manager::COLOR,
                'default' => '#fff',
                'selectors' => [
                    '{{WRAPPER}} .menu-controls button' => 'background-color: {{VALUE}};',
                ],
                'condition' => [
                    'show_controls' => 'yes',
                ],
            ]
        );
        
        $this->end_controls_section();
    }
    
    protected function render() {
        $settings = $this->get_settings_for_display();
        $menu_manager = new MenuManager();
        $active_menu = $menu_manager->get_active_menu();
        
        echo '<div class="menu-manager-widget">';
        
        if ($active_menu) {
            if ($settings['show_title'] === 'yes') {
                echo '<h3 class="menu-title">' . esc_html($active_menu->name) . '</h3>';
            }
            
            echo '<div class="menu-viewer-container" data-mode="' . esc_attr($settings['display_mode']) . '">';
            
            switch ($settings['display_mode']) {
                case 'flipbook':
                    $this->render_flipbook($active_menu, $settings);
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
            echo '<p>' . esc_html($settings['fallback_text']) . '</p>';
            echo '</div>';
        }
        
        echo '</div>';
    }
    
    private function render_flipbook($menu, $settings) {
        echo '<div id="menu-flipbook" data-pdf="' . esc_url($menu->pdf_url) . '">';
        echo '<div class="loading-spinner">Caricamento menu...</div>';
        echo '</div>';
        
        if ($settings['show_controls'] === 'yes') {
            echo '<div class="menu-controls">';
            echo '<button id="prev-page" class="control-btn">‹ Precedente</button>';
            echo '<span id="page-info">Pagina <span id="current-page">1</span> di <span id="total-pages">1</span></span>';
            echo '<button id="next-page" class="control-btn">Successiva ›</button>';
            echo '<button id="zoom-in" class="control-btn">+</button>';
            echo '<button id="zoom-out" class="control-btn">-</button>';
            echo '<button id="fullscreen" class="control-btn">⛶</button>';
            echo '</div>';
        }
    }
    
    private function render_embed($menu) {
        echo '<embed src="' . esc_url($menu->pdf_url) . '" type="application/pdf" width="100%" height="100%">';
    }
    
    private function render_download($menu) {
        echo '<div class="download-menu">';
        echo '<a href="' . esc_url($menu->pdf_url) . '" download class="download-btn">';
        echo '<span class="download-icon">⬇</span>';
        echo 'Scarica Menu';
        echo '</a>';
        echo '</div>';
    }
}