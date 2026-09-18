import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';

import { PagesComponent } from './pages.component';
import { AuthService } from '../auth.service';
import { DatabaseService } from '../database.service';
import { LanguageService } from '../language.service';

const authServiceStub = {
  user$: of(null),
};
const databaseServiceStub = {
  getQuizSummary: () => Promise.resolve(null),
};

describe('PagesComponent', () => {
  let component: PagesComponent;
  let fixture: ComponentFixture<PagesComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [PagesComponent],
      imports: [CommonModule, FormsModule],
      providers: [
        { provide: AuthService, useValue: authServiceStub },
        { provide: DatabaseService, useValue: databaseServiceStub },
        { provide: LanguageService, useValue: { language: 'en' } },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
    fixture = TestBed.createComponent(PagesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
