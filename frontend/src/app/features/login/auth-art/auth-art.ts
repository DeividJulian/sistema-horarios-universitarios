import { Component, input } from '@angular/core';

/** Ink brand panel of the login and sign-up pages: blueprint grid, a composed week and the headline. */
@Component({
  selector: 'app-auth-art',
  templateUrl: './auth-art.html',
  styleUrl: './auth-art.css',
})
export class AuthArt {
  readonly variant = input<'login' | 'registro'>('login');
}
