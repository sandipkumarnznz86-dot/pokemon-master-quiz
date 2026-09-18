import { Component } from '@angular/core';
import { AuthService } from '../../../auth.service';
import { LanguageService } from '../../../language.service';
import { NavigationService } from '../navigation.service';

@Component({
  selector: 'app-header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent {
  constructor(
    readonly authService: AuthService,
    readonly languageService: LanguageService,
    readonly navigationService: NavigationService,
  ) {}

  toggleNavigation(): void {
    this.navigationService.toggle();
  }

  getUserInitials(name: string): string {
    return name
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0))
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
}
