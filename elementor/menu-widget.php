<?php
if (!defined('ABSPATH')) {
    exit;
}

class MenuManagerElementorWidget extends \Elementor\Widget_Base {

    public function get_name() {
        return 'menu-manager';
    }

    public function get_title() {
        return 'Menu Manager';
    }

    public function get_icon() {
        return 'eicon-book';
    }

    public function get_categories() {
        return ['general'];
    }

    protected function _register_controls() {
        $this->start_controls_section(
            'content_section',
            [
                'label' => 'Impostazioni Menu',
                'tab' => \Elementor\Controls_Manager::TAB_CONTENT,
            ]
        );

        // Get available menus
        $menus = MenuManager::get_menus();
        $menu_options = [];
        foreach ($menus as $menu) {
            $menu_options[$menu->id] = $menu->name;
        }

        $this->add_control(
            'selected_menu',
            [
                'label' => 'Seleziona Menu',
                'type' => \Elementor\Controls_Manager::SELECT,
                'options' => $menu_options,
                'default' => !empty($menu_options) ? array_key_first($menu_options) : '',
            ]
        );

        $this->add_control(
            'width',
            [
                'label' => 'Larghezza',
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px', '%'],
                'range' => [
                    'px' => [
                        'min' => 300,
                        'max' => 1200,
                        'step' => 10,
                    ],
                    '%' => [
                        'min' => 50,
                        'max' => 100,
                    ],
                ],
                'default' => [
                    'unit' => '%',
                    'size' => 100,
                ],
                'selectors' => [
                    '{{WRAPPER}} .menu-flipbook-container' => 'width: {{SIZE}}{{UNIT}};',
                ],
            ]
        );

        $this->add_control(
            'height',
            [
                'label' => 'Altezza',
                'type' => \Elementor\Controls_Manager::SLIDER,
                'size_units' => ['px'],
                'range' => [
                    'px' => [
                        'min' => 400,
                        'max' => 800,
                        'step' => 10,
                    ],
                ],
                'default' => [
                    'unit' => 'px',
                    'size' => 600,
                ],
                'selectors' => [
                    '{{WRAPPER}} .menu-flipbook' => 'height: {{SIZE}}{{UNIT}};',
                ],
            ]
        );

        $this->end_controls_section();

        // Style section
        $this->start_controls_section(
            'style_section',
            [
                'label' => 'Stile',
                'tab' => \Elementor\Controls_Manager::TAB_STYLE,
            ]
        );

        $this->add_control(
            'border_radius',
            [
                'label' => 'Border Radius',
                'type' => \Elementor\Controls_Manager::DIMENSIONS,
                'size_units' => ['px', '%'],
                'selectors' => [
                    '{{WRAPPER}} .menu-flipbook' => 'border-radius: {{TOP}}{{UNIT}} {{RIGHT}}{{UNIT}} {{BOTTOM}}{{UNIT}} {{LEFT}}{{UNIT}};',
                ],
            ]
        );

        $this->add_group_control(
            \Elementor\Group_Control_Box_Shadow::get_type(),
            [
                'name' => 'box_shadow',
                'label' => 'Box Shadow',
                'selector' => '{{WRAPPER}} .menu-flipbook',
            ]
        );

        $this->end_controls_section();
    }

    protected function render() {
        $settings = $this->get_settings_for_display();
        $menu_id = $settings['selected_menu'];

        if (!$menu_id) {
            echo '<p>Nessun menu selezionato</p>';
            return;
        }

        $menu = MenuManager::get_menu($menu_id);
        if (!$menu) {
            echo '<p>Menu non trovato</p>';
            return;
        }

        $unique_id = 'menu-flipbook-' . $menu_id . '-' . uniqid();
        ?>
        <div class="menu-flipbook-container">
            <div class="menu-flipbook" id="<?php echo $unique_id; ?>">
                <?php if ($menu->type === 'pdf' && $menu->pdf_url): ?>
                    <div class="pdf-container">
                        <iframe src="<?php echo esc_url($menu->pdf_url); ?>" width="100%" height="100%"></iframe>
                    </div>
                <?php else: ?>
                    <?php 
                    $settings_data = json_decode($menu->settings, true);
                    $content_pages = $this->split_content_to_pages($menu->custom_content);
                    ?>
                    <?php foreach ($content_pages as $index => $page_content): ?>
                        <div class="menu-page" style="
                            background-color: <?php echo esc_attr($settings_data['bg_color'] ?? '#ffffff'); ?>;
                            color: <?php echo esc_attr($settings_data['text_color'] ?? '#333333'); ?>;
                            font-family: <?php echo esc_attr($settings_data['font_family'] ?? 'Arial'); ?>;
                            font-size: <?php echo esc_attr($settings_data['font_size'] ?? '14'); ?>px;
                        ">
                            <div class="page-content">
                                <?php echo nl2br(esc_html($page_content)); ?>
                            </div>
                        </div>
                    <?php endforeach; ?>
                <?php endif; ?>
            </div>
        </div>

        <script>
        jQuery(document).ready(function($) {
            $('#<?php echo $unique_id; ?>').turn({
                width: '100%',
                height: '100%',
                elevation: 50,
                gradients: true,
                autoCenter: true,
                duration: 1000
            });
        });
        </script>
        <?php
    }

    private function split_content_to_pages($content, $chars_per_page = 2000) {
        $content = trim($content);
        if (empty($content)) {
            return ['Contenuto non disponibile'];
        }

        $pages = [];
        $lines = explode("\n", $content);
        $current_page = '';
        $current_length = 0;

        foreach ($lines as $line) {
            $line_length = strlen($line);
            
            if ($current_length + $line_length > $chars_per_page && !empty($current_page)) {
                $pages[] = trim($current_page);
                $current_page = $line . "\n";
                $current_length = $line_length;
            } else {
                $current_page .= $line . "\n";
                $current_length += $line_length;
            }
        }

        if (!empty($current_page)) {
            $pages[] = trim($current_page);
        }

        return empty($pages) ? ['Contenuto non disponibile'] : $pages;
    }

    protected function _content_template() {
        ?>
        <div class="menu-flipbook-container">
            <div class="menu-flipbook">
                <div class="menu-page">
                    <div class="page-content">
                        <p>Anteprima del menu selezionato</p>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }
}