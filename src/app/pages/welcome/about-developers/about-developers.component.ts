import { Component } from '@angular/core';
import {NzCardComponent} from 'ng-zorro-antd/card';
import {NgOptimizedImage} from '@angular/common';

@Component({
  selector: 'app-about-developers',
  imports: [
    NzCardComponent,
    NgOptimizedImage
  ],
  templateUrl: './about-developers.component.html',
  styleUrl: './about-developers.component.scss',
  standalone: true
})
export class AboutDevelopersComponent {

}
