import { Component } from '@angular/core';
import { AuthService } from '../../../auth.service';
import { LanguageService } from '../../../language.service';
import { NavigationService } from '../navigation.service';

@Component({
  selector: 'app-side-menu',
  templateUrl: './side-menu.component.html',
  styleUrls: ['./side-menu.component.scss']
})
export class SideMenuComponent {
  constructor(
    readonly authService: AuthService,
    readonly languageService: LanguageService,
    readonly navigationService: NavigationService,
  ) {}

  close(): void {
    this.navigationService.close();
  }

  logout(): void {
    this.close();
    void this.authService.logout();
  }
}
