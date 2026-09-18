import { Injectable } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivate,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { catchError, from, Observable, map, of } from 'rxjs';

import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(
    private readonly authService: AuthService,
    private readonly router: Router,
  ) {}

  canActivate(
    _route: ActivatedRouteSnapshot,
    state: RouterStateSnapshot,
  ): Observable<boolean | UrlTree> {
    return from(this.authService.getAuthenticatedUser()).pipe(
      map((user) =>
        user
          ? true
          : this.router.createUrlTree(['/login'], {
              queryParams: { returnUrl: state.url },
            }),
      ),
      catchError((error: unknown) => {
        console.error('[authentication] guard check failed', error);
        return of(
          this.router.createUrlTree(['/login'], {
            queryParams: { returnUrl: state.url },
          }),
        );
      }),
    );
  }
}
