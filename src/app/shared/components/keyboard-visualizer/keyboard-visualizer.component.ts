import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-keyboard-visualizer',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './keyboard-visualizer.component.html',
  styleUrls: ['./keyboard-visualizer.component.scss']
})
export class KeyboardVisualizerComponent {
  @Input() visible = false;
  @Input() highlightKey: string | null = null;

  readonly rows: string[][] = [
    ['`', '1', '2', '3', '4', '5', '6', '7', '8', '9', '0', '-', '=', 'Backspace'],
    ['Tab', 'q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '[', ']', '\\'],
    ['CapsLock', 'a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', ';', "'", 'Enter'],
    ['Shift', 'z', 'x', 'c', 'v', 'b', 'n', 'm', ',', '.', '/', 'Shift'],
    ['Space']
  ];

  isHighlighted(key: string): boolean {
    if (!this.highlightKey) {
      return false;
    }
    const normalized = this.normalizeKey(this.highlightKey);
    return key.toLowerCase() === normalized.toLowerCase();
  }

  getKeyColor(key: string): string {
    return this.isHighlighted(key) ? '#1890ff' : '#e0e0e0';
  }

  getKeyWidth(key: string): string {
    switch (key) {
      case 'Backspace':
        return '80px';
      case 'Tab':
        return '70px';
      case 'CapsLock':
        return '80px';
      case 'Enter':
        return '80px';
      case 'Shift':
        return '100px';
      case 'Space':
        return '100%';
      default:
        return '36px';
    }
  }

  private normalizeKey(key: string): string {
    return key === ' ' ? 'Space' : key;
  }
}

