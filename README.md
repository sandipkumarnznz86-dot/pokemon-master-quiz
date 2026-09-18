# AngularWebSample

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 16.2.16.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Firebase Firestore

The app uses Firebase Authentication and Cloud Firestore. After creating or opening
the Firebase project configured in `src/app/firebase.ts`:

1. Open **Firestore Database** in the Firebase console and create a database.
2. Enable **Authentication → Sign-in method → Email/Password**.
3. Add rules that allow each signed-in user to access only their own records:

```text
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      match /quizResults/{resultId} {
        allow read, write: if request.auth != null && request.auth.uid == userId;
      }
    }
  }
}
```

Completed quizzes are stored under `users/{uid}/quizResults`, and the user's
highest score is stored in `users/{uid}.bestScore`.

Profile photos are stored in Firebase Storage under
`users/{uid}/profile/`. Deploy both Firestore and Storage rules before testing
photo uploads:

```bash
firebase deploy --only firestore:rules,storage
```

The Storage rules only allow an authenticated user to read or upload their
own JPG, PNG, or WebP profile images up to 5 MB.

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
