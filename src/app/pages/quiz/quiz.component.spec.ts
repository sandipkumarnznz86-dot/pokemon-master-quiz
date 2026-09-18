import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { convertToParamMap } from '@angular/router';

import { QuizComponent } from './quiz.component';
import { DataService } from '../../data.service';
import { DatabaseService } from '../../database.service';
import { GameService } from './game.service';
import { AuthService } from '../../auth.service';
import { LanguageService } from '../../language.service';

describe('QuizComponent', () => {
  let component: QuizComponent;
  let fixture: ComponentFixture<QuizComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [QuizComponent],
      imports: [ReactiveFormsModule],
      providers: [
        { provide: DataService, useValue: {} },
        { provide: DatabaseService, useValue: {} },
        { provide: GameService, useValue: {} },
        {
          provide: AuthService,
          useValue: { getAuthenticatedUser: () => Promise.resolve(null) },
        },
        { provide: LanguageService, useValue: { language: 'en' } },
        {
          provide: ActivatedRoute,
          useValue: { queryParamMap: of(convertToParamMap({})) },
        },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    });
    fixture = TestBed.createComponent(QuizComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
