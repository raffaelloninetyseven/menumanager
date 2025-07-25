<?php
if (!defined('ABSPATH')) {
    exit;
}

require_once(ABSPATH . 'wp-admin/includes/file.php');

class MenuPDFGenerator {
    
    public function generate($menu_id) {
        $menu = MenuManager::get_menu($menu_id);
        if (!$menu) {
            return false;
        }
        
        $settings = json_decode($menu->settings, true);
        $upload_dir = wp_upload_dir();
        $menu_dir = $upload_dir['basedir'] . '/menu-manager';
        
        if (!file_exists($menu_dir)) {
            wp_mkdir_p($menu_dir);
        }
        
        $filename = 'menu-' . $menu_id . '-' . time() . '.pdf';
        $filepath = $menu_dir . '/' . $filename;
        $file_url = $upload_dir['baseurl'] . '/menu-manager/' . $filename;
        
        // Using TCPDF library
        if (!class_exists('TCPDF')) {
            require_once MENU_MANAGER_PATH . 'lib/tcpdf/tcpdf.php';
        }
        
        $pdf = new TCPDF(PDF_PAGE_ORIENTATION, PDF_UNIT, PDF_PAGE_FORMAT, true, 'UTF-8', false);
        
        // Set document information
        $pdf->SetCreator('Menu Manager');
        $pdf->SetAuthor('SilverStudioDM');
        $pdf->SetTitle($menu->name);
        
        // Set margins
        $pdf->SetMargins(15, 15, 15);
        $pdf->SetAutoPageBreak(TRUE, 15);
        
        // Remove default header/footer
        $pdf->setPrintHeader(false);
        $pdf->setPrintFooter(false);
        
        // Set font
        $font_family = $settings['font_family'] ?? 'Arial';
        $font_size = intval($settings['font_size'] ?? 12);
        
        // Add page
        $pdf->AddPage();
        
        // Set colors
        $bg_color = $this->hex_to_rgb($settings['bg_color'] ?? '#ffffff');
        $text_color = $this->hex_to_rgb($settings['text_color'] ?? '#333333');
        
        $pdf->SetFillColor($bg_color[0], $bg_color[1], $bg_color[2]);
        $pdf->SetTextColor($text_color[0], $text_color[1], $text_color[2]);
        
        // Set font
        $pdf->SetFont($font_family, '', $font_size);
        
        // Title
        $pdf->SetFont($font_family, 'B', $font_size + 4);
        $pdf->Cell(0, 10, $menu->name, 0, 1, 'C');
        $pdf->Ln(5);
        
        // Content
        $pdf->SetFont($font_family, '', $font_size);
        
        $content = $menu->custom_content;
        $lines = explode("\n", $content);
        
        foreach ($lines as $line) {
            $line = trim($line);
            if (empty($line)) {
                $pdf->Ln(3);
                continue;
            }
            
            // Check if line is a title (starts with uppercase and has specific patterns)
            if ($this->is_title($line)) {
                $pdf->SetFont($font_family, 'B', $font_size + 2);
                $pdf->Ln(3);
                $pdf->Cell(0, 8, $line, 0, 1, 'L');
                $pdf->Ln(2);
                $pdf->SetFont($font_family, '', $font_size);
            } else {
                // Regular content
                $pdf->MultiCell(0, 6, $line, 0, 'L');
                $pdf->Ln(1);
            }
        }
        
        // Save the PDF
        $pdf->Output($filepath, 'F');
        
        // Update database with PDF URL
        global $wpdb;
        $table_name = $wpdb->prefix . 'menu_manager_menus';
        $wpdb->update(
            $table_name,
            array('pdf_url' => $file_url),
            array('id' => $menu_id)
        );
        
        return $file_url;
    }
    
    private function hex_to_rgb($hex) {
        $hex = ltrim($hex, '#');
        if (strlen($hex) == 6) {
            return [
                hexdec(substr($hex, 0, 2)),
                hexdec(substr($hex, 2, 2)),
                hexdec(substr($hex, 4, 2))
            ];
        }
        return [255, 255, 255]; // Default white
    }
    
    private function is_title($line) {
        // Simple heuristic to detect titles
        $line = trim($line);
        
        // Check if line is all uppercase or starts with uppercase and has specific patterns
        if (strlen($line) < 50 && 
            (strtoupper($line) === $line || 
             preg_match('/^[A-Z][A-Z\s]*$/', $line) ||
             preg_match('/^[A-Z].*:$/', $line))) {
            return true;
        }
        
        return false;
    }
}