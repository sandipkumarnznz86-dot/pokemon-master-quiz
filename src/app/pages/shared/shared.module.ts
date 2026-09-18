import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

import { HeaderComponent } from './header/header.component';
import { SideMenuComponent } from './side-menu/side-menu.component';
import { FooterComponent } from './footer/footer.component';

@NgModule({
  declarations: [HeaderComponent, SideMenuComponent, FooterComponent],
  imports: [CommonModule, RouterModule],
  exports: [HeaderComponent, SideMenuComponent, FooterComponent],
})
export class SharedModule {}
