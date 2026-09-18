import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import {
  User,
  UserCredential,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import {
  Observable,
  distinctUntilChanged,
  map,
  ReplaySubject,
  shareReplay,
} from 'rxjs';

import { firebaseAuth, firebaseDb, firebaseStorage } from './firebase';
import { getRank } from './ranking';

export interface GameUser {
  name: string;
  photo: string;
  birthday: string;
  age: number | null;
  rank: string;
  rankPoints: number;
  email: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly authReady = firebaseAuth.authStateReady();
  private readonly authUserSubject = new ReplaySubject<User | null>(1);
  private readonly gameUserSubject = new ReplaySubject<GameUser | null>(1);
  private currentUser: User | null = null;
  private currentGameUser: GameUser | null = null;
  private authStateVersion = 0;

  readonly authState$: Observable<User | null> =
    this.authUserSubject.asObservable();
  readonly isAuthenticated$: Observable<boolean> = this.authState$.pipe(
    map((user) => user !== null),
    distinctUntilChanged(),
    shareReplay({ bufferSize: 1, refCount: true }),
  );
  readonly user$: Observable<GameUser | null> =
    this.gameUserSubject.asObservable();

  constructor(private readonly router: Router) {
    console.info('[firebase] Authentication state listener registered');
    onAuthStateChanged(firebaseAuth, (user) => {
      void this.handleAuthStateChanged(user);
    });
  }

  get user(): GameUser | null {
    return this.currentGameUser;
  }

  async getAuthenticatedUser(): Promise<User | null> {
    await this.authReady;
    return firebaseAuth.currentUser;
  }

  async refreshGameUser(): Promise<void> {
    const user = await this.getAuthenticatedUser();
    this.currentUser = user;
    this.currentGameUser = await this.loadGameUser(user);
    this.gameUserSubject.next(this.currentGameUser);
  }

  async login(email: string, password: string): Promise<UserCredential> {
    console.info('[authentication] login started', { email: email.trim() });
    const credential = await signInWithEmailAndPassword(
      firebaseAuth,
      email.trim(),
      password,
    );
    console.info('[authentication] login successful', {
      uid: credential.user.uid,
    });

    await this.ensureUserDocument(credential.user);
    this.currentUser = credential.user;
    this.currentGameUser = await this.loadGameUser(credential.user);
    this.authUserSubject.next(credential.user);
    this.gameUserSubject.next(this.currentGameUser);
    console.info('[authentication] user profile loaded', {
      uid: credential.user.uid,
    });
    return credential;
  }

  resetPassword(email: string): Promise<void> {
    return sendPasswordResetEmail(firebaseAuth, email.trim());
  }

  async register(
    email: string,
    password: string,
    name: string,
    age: number,
    photoFile: File | null,
  ): Promise<UserCredential> {
    console.info('[authentication] signup started', { email: email.trim() });
    const credential = await createUserWithEmailAndPassword(
      firebaseAuth,
      email.trim(),
      password,
    );
    console.info('[authentication] authentication account created', {
      uid: credential.user.uid,
    });

    let photoURL = '';
    if (photoFile) {
      try {
        photoURL = await this.uploadProfilePhoto(credential.user, photoFile);
      } catch (error) {
        this.logFirebaseError('[authentication] profile photo upload failed', error);
        // A profile photo is optional. Do not discard a valid Auth account
        // because Storage has not been enabled or its rules are not deployed.
      }
    }

    await updateProfile(credential.user, {
      displayName: name.trim(),
      photoURL: photoURL || null,
    });
    await this.saveProfile(credential.user, name.trim(), age, photoURL);
    this.currentUser = credential.user;
    this.currentGameUser = await this.loadGameUser(credential.user);
    this.authUserSubject.next(credential.user);
    this.gameUserSubject.next(this.currentGameUser);
    console.info('[authentication] Firestore user document created/updated', {
      uid: credential.user.uid,
    });
    return credential;
  }

  async logout(): Promise<void> {
    console.info('[authentication] logout started');
    await signOut(firebaseAuth);
    this.currentUser = null;
    this.currentGameUser = null;
    this.authUserSubject.next(null);
    this.gameUserSubject.next(null);
    console.info('[authentication] logout successful');
    await this.router.navigate(['/login']);
  }

  async updateUserProfile(
    name: string,
    age: number,
    photoFile: File | null,
    existingPhotoURL = '',
  ): Promise<void> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      throw new Error('auth-session-missing');
    }

    let photoURL = existingPhotoURL || user.photoURL || '';
    if (photoFile) {
      photoURL = await this.uploadProfilePhoto(user, photoFile);
    }

    try {
      await updateProfile(user, {
        displayName: name.trim(),
        photoURL: photoURL || null,
      });
      await setDoc(
        doc(firebaseDb, 'users', user.uid),
        {
          uid: user.uid,
          fullName: name.trim(),
          name: name.trim(),
          age,
          photoURL,
          photo: photoURL,
          email: user.email ?? '',
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );

      this.currentUser = user;
      this.currentGameUser = await this.loadGameUser(user);
      this.gameUserSubject.next(this.currentGameUser);
      console.info('[authentication] Firestore user document updated', {
        uid: user.uid,
      });
    } catch (error) {
      this.logFirebaseError('[authentication] profile update failed', error);
      throw error;
    }
  }

  private async handleAuthStateChanged(user: User | null): Promise<void> {
    const version = ++this.authStateVersion;
    this.currentUser = user;
    this.authUserSubject.next(user);

    try {
      this.currentGameUser = await this.loadGameUser(user);
      if (version === this.authStateVersion) {
        this.gameUserSubject.next(this.currentGameUser);
      }
    } catch (error) {
      this.logFirebaseError('[authentication] user profile synchronization failed', error);
      if (version === this.authStateVersion) {
        this.currentGameUser = user ? this.fallbackGameUser(user) : null;
        this.gameUserSubject.next(this.currentGameUser);
      }
    }
  }

  private async loadGameUser(user: User | null): Promise<GameUser | null> {
    if (!user) {
      return null;
    }

    await this.ensureUserDocument(user);
    try {
      const snapshot = await getDoc(doc(firebaseDb, 'users', user.uid));
      console.info('[authentication] user document retrieved', { uid: user.uid });
      const data = snapshot.data() ?? {};
      const storedAge = data['age'];
      const birthday = data['birthday'];
      const storedPhoto = data['photoURL'] || data['photo'];
      const storedRankPoints =
        typeof data['rankPoints'] === 'number'
          ? data['rankPoints']
          : 0;
      const name =
        data['fullName'] ||
        data['name'] ||
        user.displayName ||
        '';

      return {
        name,
        photo: user.photoURL || (typeof storedPhoto === 'string' ? storedPhoto : ''),
        birthday: typeof birthday === 'string' ? birthday : '',
        age:
          typeof storedAge === 'number'
            ? storedAge
            : typeof birthday === 'string'
              ? this.calculateAge(birthday)
              : null,
        rank:
          typeof data['rank'] === 'string'
            ? data['rank']
            : getRank(storedRankPoints).name,
        rankPoints: storedRankPoints,
        email: user.email || '',
      };
    } catch (error) {
      this.logFirebaseError('[authentication] user document read failed', error);
      throw error;
    }
  }

  private async ensureUserDocument(user: User): Promise<void> {
    const userRef = doc(firebaseDb, 'users', user.uid);
    try {
      const snapshot = await getDoc(userRef);
      if (!snapshot.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          fullName: user.displayName ?? '',
          name: user.displayName ?? '',
          email: user.email ?? '',
          photoURL: user.photoURL ?? '',
          photo: user.photoURL ?? '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        console.info('[authentication] Firestore user document created', {
          uid: user.uid,
        });
      }
    } catch (error) {
      this.logFirebaseError('[authentication] user document synchronization failed', error);
      throw error;
    }
  }

  private fallbackGameUser(user: User): GameUser {
    return {
      name: user.displayName ?? '',
      photo: user.photoURL ?? '',
      birthday: '',
      age: null,
      rank: getRank(0).name,
      rankPoints: 0,
      email: user.email ?? '',
    };
  }

  private async saveProfile(
    user: User,
    name: string,
    age: number,
    photo: string,
  ): Promise<void> {
    try {
      await setDoc(
        doc(firebaseDb, 'users', user.uid),
        {
          uid: user.uid,
          fullName: name,
          name,
          age,
          photoURL: photo,
          photo,
          email: user.email ?? '',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    } catch (error) {
      this.logFirebaseError('[authentication] database write failed', error);
      throw error;
    }
  }

  private async uploadProfilePhoto(
    user: User,
    photoFile: File | null,
  ): Promise<string> {
    if (!photoFile) {
      return '';
    }

    try {
      const extension = photoFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const photoRef = ref(
        firebaseStorage,
        `users/${user.uid}/profile/profile-image-${Date.now()}.${extension}`,
      );
      await uploadBytes(photoRef, photoFile, {
        contentType: photoFile.type,
      });
      const url = await getDownloadURL(photoRef);
      console.info('[authentication] profile photo uploaded', { uid: user.uid });
      return url;
    } catch (error) {
      const wrapped = Object.assign(new Error('Profile photo upload failed'), {
        code: 'profile-photo-upload-failed',
        cause: error,
      });
      throw wrapped;
    }
  }

  private logFirebaseError(message: string, error: unknown): void {
    const safeError = error as { code?: string; message?: string };
    console.error(message, {
      code: safeError?.code ?? 'unknown',
      message: safeError?.message ?? 'Unknown Firebase error',
    });
  }

  private calculateAge(birthday: string): number | null {
    const birthDate = new Date(`${birthday}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) {
      return null;
    }

    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const beforeBirthday =
      today.getMonth() < birthDate.getMonth() ||
      (today.getMonth() === birthDate.getMonth() &&
        today.getDate() < birthDate.getDate());

    if (beforeBirthday) {
      age -= 1;
    }

    return age >= 0 ? age : null;
  }
}
