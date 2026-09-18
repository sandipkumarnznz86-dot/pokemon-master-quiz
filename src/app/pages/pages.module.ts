import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { PagesRoutingModule } from './pages-routing.module';
import { PagesComponent } from './pages.component';
import { SharedModule } from './shared/shared.module';
import { HistoryComponent } from './history/history.component';
import { ProfileComponent } from './profile/profile.component';

@NgModule({
  declarations: [PagesComponent, HistoryComponent, ProfileComponent],
  imports: [CommonModule, FormsModule, PagesRoutingModule, SharedModule],
})
export class PagesModule {}
