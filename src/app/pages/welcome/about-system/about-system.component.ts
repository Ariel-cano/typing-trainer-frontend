import { Component } from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import { NzAnchorModule } from 'ng-zorro-antd/anchor';
import { NzFloatButtonModule } from 'ng-zorro-antd/float-button';
import { NzCardModule } from 'ng-zorro-antd/card';

@Component({
  selector: 'app-about-system',
  imports: [CommonModule, NzCardModule, NzAnchorModule, NzFloatButtonModule, NgOptimizedImage],
  templateUrl: './about-system.component.html',
  styleUrl: './about-system.component.scss',
  standalone: true
})
export class AboutSystemComponent {

}
